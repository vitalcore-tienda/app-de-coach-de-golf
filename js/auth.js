/**
 * GolfCoach Pro - acceso por correo con Supabase Auth.
 *
 * Esta capa gestiona identidad y rol remoto. IndexedDB sigue funcionando sin
 * conexión, pero cada workspace local queda bloqueado por identidad.
 */

class AuthEngine {
  static PROFILE_CACHE_PREFIX = 'auth-profile-cache:';
  static PROFILE_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  static supabaseUrl = 'https://qfcvoenhnxxonemqsvmy.supabase.co';
  // Las publishable keys son deliberadamente públicas: RLS protege los datos.
  // Nunca agregar aquí una service_role o una clave secreta.
  static publishableKey = 'sb_publishable_rpsQPcuk_QFHef8manp3WQ_LHB3Nd4M';
  static redirectUrl = 'https://vitalcore-tienda.github.io/app-de-coach-de-golf/';

  static client = null;
  static user = null;
  static profile = null;
  static initialized = false;
  static initPromise = null;
  static retryPromise = null;
  static identityGeneration = 0;
  static authEventQueue = Promise.resolve();

  static init() {
    if (!AuthEngine.initPromise) {
      AuthEngine.initPromise = AuthEngine.initialize();
    }
    return AuthEngine.initPromise;
  }

  static async initialize() {
    AuthEngine.initialized = true;

    if (!window.supabase?.createClient) {
      StorageManager.lockWorkspace();
      AuthEngine.updateAccessButton();
      console.warn('El cliente de Supabase no está disponible; el workspace permanece bloqueado.');
      return;
    }

    AuthEngine.client = window.supabase.createClient(
      AuthEngine.supabaseUrl,
      AuthEngine.publishableKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          storageKey: 'golfcoach-pro-auth-qfcvoenhnxxonemqsvmy-v1'
        }
      }
    );

    // El callback debe ser liviano: el SDK mantiene un bloqueo interno de
    // sesión y las consultas remotas se ejecutan en el siguiente turno.
    AuthEngine.client.auth.onAuthStateChange((event, session) => {
      const generation = ++AuthEngine.identityGeneration;
      window.setTimeout(() => {
        AuthEngine.authEventQueue = AuthEngine.authEventQueue
          .catch(() => undefined)
          .then(() => AuthEngine.handleAuthEvent(event, session, generation));
      }, 0);
    });
    window.addEventListener('online', () => {
      if (AuthEngine.user) {
        AuthEngine.retryIdentity({ silent: true });
      }
    }, { passive: true });

    try {
      await AuthEngine.refreshIdentity();
      if (AuthEngine.user) AuthEngine.clearAuthCallbackArtifacts();
    } catch (error) {
      console.warn('No se pudo restaurar la sesión cloud:', error);
    }

    AuthEngine.updateAccessButton();
    window.CloudSync?.onAuthStateChanged?.();
    await window.PlayerPortal?.onAuthStateChanged?.();
  }

  static async handleAuthEvent(event, session, generation = ++AuthEngine.identityGeneration) {
    if (event === 'SIGNED_OUT' || !session) {
      await AuthEngine.commitIdentity(null, null, generation);
      await window.CloudSync?.onAuthStateChanged?.();
      await window.PlayerPortal?.onAuthStateChanged?.();
      return;
    }

    try {
      const applied = await AuthEngine.refreshIdentity({ generation });
      if (!applied) return;
      if (AuthEngine.user) AuthEngine.clearAuthCallbackArtifacts();
      await window.CloudSync?.onAuthStateChanged?.();
      await window.PlayerPortal?.onAuthStateChanged?.();
      if (event === 'SIGNED_IN') {
        AuthEngine.toast('✅ Sesión iniciada.');
      }
    } catch (error) {
      console.warn('No se pudo actualizar la sesión cloud:', error);
      AuthEngine.updateAccessButton();
      await window.PlayerPortal?.onAuthStateChanged?.();
    }
  }

  static async commitIdentity(user, profile, generation) {
    if (generation !== AuthEngine.identityGeneration) return false;
    AuthEngine.user = user || null;
    AuthEngine.profile = profile || null;

    if (AuthEngine.user?.id && AuthEngine.profile?.account_role === 'coach') {
      await StorageManager.unlockWorkspace(AuthEngine.user.id);
    } else {
      StorageManager.lockWorkspace();
    }

    if (generation !== AuthEngine.identityGeneration) return false;
    AuthEngine.updateAccessButton();
    await window.App?.onWorkspaceAccessChanged?.();
    return true;
  }

  static async refreshIdentity({ generation = ++AuthEngine.identityGeneration } = {}) {
    if (!AuthEngine.client) return;

    const { data: sessionData } = await AuthEngine.client.auth.getSession();
    const session = sessionData?.session;

    if (!session) {
      return AuthEngine.commitIdentity(null, null, generation);
    }

    let nextUser = session.user || null;
    let nextProfile = null;

    // La app no invalida una sesión local simplemente porque el dispositivo
    // está offline. RLS se seguirá aplicando al volver a consultar la nube.
    if (navigator.onLine === false) {
      nextProfile = AuthEngine.profile?.id === nextUser?.id
        ? AuthEngine.profile
        : await AuthEngine.readCachedProfile(nextUser?.id);
      return AuthEngine.commitIdentity(nextUser, nextProfile, generation);
    }

    const { data: userData, error: userError } = await AuthEngine.client.auth.getUser();
    if (userError || !userData?.user) {
      if (AuthEngine.isNetworkError(userError)) {
        nextProfile = AuthEngine.profile?.id === nextUser?.id
          ? AuthEngine.profile
          : await AuthEngine.readCachedProfile(nextUser?.id);
        return AuthEngine.commitIdentity(nextUser, nextProfile, generation);
      }

      return AuthEngine.commitIdentity(null, null, generation);
    }

    nextUser = userData.user;
    const { data: profile, error: profileError } = await AuthEngine.client
      .from('profiles')
      .select('id, email, display_name, account_role')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileError) {
      console.warn('No se pudo leer el perfil cloud:', profileError);
      // Solo una falla real de conectividad habilita el rol previamente
      // verificado. Errores de permisos o servidor bloquean el workspace.
      if (AuthEngine.isNetworkError(profileError)) {
        nextProfile = await AuthEngine.readCachedProfile(userData.user.id);
      } else {
        await AuthEngine.clearCachedProfile(userData.user.id);
        nextProfile = null;
      }
    } else {
      nextProfile = profile || null;
      if (nextProfile) await AuthEngine.saveCachedProfile(nextProfile);
      else await AuthEngine.clearCachedProfile(userData.user.id);
    }

    return AuthEngine.commitIdentity(nextUser, nextProfile, generation);
  }

  static retryIdentity({ silent = false } = {}) {
    if (!AuthEngine.client) return Promise.resolve();
    if (AuthEngine.retryPromise) return AuthEngine.retryPromise;

    const button = document.getElementById('auth-retry-identity-btn');
    if (button) {
      button.disabled = true;
      button.textContent = 'Verificando…';
    }

    const retry = (async () => {
      try {
        await AuthEngine.refreshIdentity();
        await window.CloudSync?.onAuthStateChanged?.();
        await window.PlayerPortal?.onAuthStateChanged?.();
        if (!silent && AuthEngine.user && !AuthEngine.profile) {
          AuthEngine.toast('No pudimos confirmar el tipo de cuenta. Revisá tu conexión y reintentá.');
        }
      } catch (error) {
        console.warn('No se pudo reintentar la validación de la cuenta:', error);
        await window.PlayerPortal?.onAuthStateChanged?.();
        if (!silent) AuthEngine.toast('No se pudo verificar la cuenta en este momento.');
      }
    })();

    AuthEngine.retryPromise = retry.finally(() => {
      AuthEngine.retryPromise = null;
      const currentButton = document.getElementById('auth-retry-identity-btn');
      if (currentButton) {
        currentButton.disabled = false;
        currentButton.textContent = 'Reintentar verificación';
      }
    });
    return AuthEngine.retryPromise;
  }

  static clearAuthCallbackArtifacts() {
    if (!AuthEngine.user) return;
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));
    const callbackKeys = [
      'access_token', 'refresh_token', 'token_type', 'expires_in', 'expires_at',
      'provider_token', 'provider_refresh_token', 'code', 'error', 'error_code',
      'error_description'
    ];
    const hasCallbackHash = callbackKeys.some((key) => hash.has(key));
    const hasCallbackQuery = callbackKeys.some((key) => url.searchParams.has(key));
    if (!hasCallbackHash && !hasCallbackQuery) return;

    // Supabase procesa antes la respuesta implicit/PKCE. Recién después de
    // restaurar la sesión se quitan tokens, códigos y errores de la URL.
    callbackKeys.forEach((key) => url.searchParams.delete(key));
    if (hasCallbackHash) url.hash = '';
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }

  static isCoach() {
    return AuthEngine.profile?.account_role === 'coach';
  }

  static profileCacheId(userId) {
    return `${AuthEngine.PROFILE_CACHE_PREFIX}${userId || 'unknown'}`;
  }

  static async saveCachedProfile(profile) {
    if (!profile?.id || !window.GolfDatabase?.isAvailable) return;
    try {
      await GolfDatabase.put(GOLF_DATABASE.STORES.SETTINGS, {
        id: AuthEngine.profileCacheId(profile.id),
        value: profile,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.warn('No se pudo guardar el rol para el acceso offline:', error);
    }
  }

  static async readCachedProfile(userId) {
    if (!userId || !window.GolfDatabase?.isAvailable) return null;
    try {
      const cached = await GolfDatabase.get(GOLF_DATABASE.STORES.SETTINGS, AuthEngine.profileCacheId(userId));
      const verifiedAt = Date.parse(cached?.updatedAt || '');
      const cacheIsCurrent = Number.isFinite(verifiedAt)
        && Date.now() - verifiedAt <= AuthEngine.PROFILE_CACHE_MAX_AGE_MS;
      return cached?.value?.id === userId && cacheIsCurrent ? cached.value : null;
    } catch (error) {
      return null;
    }
  }

  static async clearCachedProfile(userId) {
    if (!userId || !window.GolfDatabase?.isAvailable) return;
    try {
      await GolfDatabase.delete(GOLF_DATABASE.STORES.SETTINGS, AuthEngine.profileCacheId(userId));
    } catch (error) {
      console.warn('No se pudo invalidar el rol guardado:', error);
    }
  }

  static roleLabel() {
    if (AuthEngine.isCoach()) return 'Entrenador';
    if (AuthEngine.profile?.account_role === 'player') return 'Golfista';
    return 'Cuenta en preparación';
  }

  static updateAccessButton() {
    const button = document.getElementById('auth-access-btn');
    window.App?.updateWorkspaceContext?.();
    if (!button) {
      window.CloudSync?.updateButton?.();
      return;
    }

    const icon = button.querySelector('.topbar-action-icon');
    const setIcon = (value) => {
      if (icon) icon.textContent = value;
      else button.textContent = value;
    };

    if (!AuthEngine.client) {
      setIcon('✉️');
      button.title = 'El acceso por email no está disponible ahora';
      button.setAttribute('aria-label', button.title);
    } else if (AuthEngine.user) {
      setIcon(AuthEngine.isCoach() ? '👤' : '✉️');
      button.title = `${AuthEngine.roleLabel()}: abrir cuenta`;
      button.setAttribute('aria-label', button.title);
    } else {
      setIcon('✉️');
      button.title = 'Acceder por email';
      button.setAttribute('aria-label', button.title);
    }
    window.CloudSync?.updateButton?.();
  }

  static async openAccessModal() {
    await AuthEngine.init();

    if (!AuthEngine.client) {
      AuthEngine.renderModal(`
        <div class="modal-handle-bar"></div>
        <div class="modal-header">
          <div><span class="badge badge-gold">Acceso</span><h3 style="margin-top:0.3rem;">Acceso no disponible</h3></div>
          <button class="modal-close" onclick="App.closeModal()">&times;</button>
        </div>
        <p>Para proteger las fichas locales, el espacio permanece bloqueado hasta que podamos verificar tu cuenta. Volvé a intentarlo cuando haya conexión.</p>
      `);
      return;
    }

    await AuthEngine.refreshIdentity();
    if (AuthEngine.user) {
      AuthEngine.renderSignedInModal();
    } else {
      AuthEngine.renderSignInModal();
    }
  }

  static renderSignInModal() {
    AuthEngine.renderModal(`
      <div class="modal-handle-bar"></div>
      <div class="modal-header">
        <div>
          <span class="badge badge-gold">Acceso seguro</span>
          <h3 style="margin-top:0.3rem;">Ingresar por correo</h3>
        </div>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <p style="color:var(--text-muted); line-height:1.55; margin-top:-0.45rem;">Te enviaremos un enlace de un solo uso. No necesitás crear ni recordar una contraseña.</p>
      <div class="form-group" style="margin-top:1.2rem;">
        <label class="form-label" for="auth-email-input">Correo electrónico</label>
        <input class="form-control" id="auth-email-input" type="email" autocomplete="email" inputmode="email" placeholder="nombre@email.com">
      </div>
      <div id="auth-status" role="status" aria-live="polite" style="min-height:1.25rem; font-size:0.84rem; color:var(--text-muted);"></div>
      <button class="btn btn-primary" id="auth-send-link-btn" style="width:100%; min-height:46px; margin-top:1rem;" onclick="AuthEngine.sendMagicLink()">Enviar enlace de acceso</button>
      <div class="offline-info-card" style="margin-top:1rem;">
        <span>🔐</span><span>El acceso protege tanto la cuenta cloud como las fichas guardadas en este dispositivo. Luego podrás trabajar sin conexión con esta misma sesión.</span>
      </div>
    `);

    window.setTimeout(() => document.getElementById('auth-email-input')?.focus(), 0);
  }

  static renderSignedInModal() {
    const email = AuthEngine.escapeHTML(AuthEngine.user?.email || AuthEngine.profile?.email || 'Cuenta autenticada');
    const name = AuthEngine.escapeHTML(AuthEngine.profile?.display_name || 'Tu cuenta');
    const profilePending = !AuthEngine.profile;
    const roleBadge = AuthEngine.isCoach() ? 'badge-green' : 'badge-gold';

    AuthEngine.renderModal(`
      <div class="modal-handle-bar"></div>
      <div class="modal-header">
        <div>
          <span class="badge ${roleBadge}">${AuthEngine.roleLabel()}</span>
          <h3 style="margin-top:0.3rem;">${name}</h3>
        </div>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <div class="offline-info-card">
        <span>✉️</span><span>${email}</span>
      </div>
      ${profilePending ? `
        <p style="margin-top:1rem; color:var(--text-muted); line-height:1.5;">Estamos terminando de asociar tu perfil. Esperá unos segundos y volvé a abrir esta ventana antes de usar un código de activación.</p>
      ` : ''}
      ${!AuthEngine.isCoach() && !profilePending ? `
        <button class="btn btn-secondary" style="width:100%; min-height:44px; margin-top:1rem;" onclick="AuthEngine.showInitialCoachCodeForm()">Tengo el código del primer entrenador</button>
      ` : ''}
      ${AuthEngine.isCoach() ? `
        <button class="btn btn-secondary" style="width:100%; min-height:44px; margin-top:1rem;" onclick="CloudSync.openSyncModal()">☁️ Respaldo y sincronización cloud</button>
      ` : ''}
      <button class="btn btn-primary" style="width:100%; min-height:44px; margin-top:0.75rem;" onclick="AuthEngine.signOut()">Cerrar sesión en este dispositivo</button>
    `);
  }

  static showInitialCoachCodeForm() {
    if (!AuthEngine.user || AuthEngine.isCoach()) return;

    AuthEngine.renderModal(`
      <div class="modal-handle-bar"></div>
      <div class="modal-header">
        <div>
          <span class="badge badge-gold">Configuración inicial</span>
          <h3 style="margin-top:0.3rem;">Activar primer entrenador</h3>
        </div>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <p style="color:var(--text-muted); line-height:1.55; margin-top:-0.45rem;">Ingresá el código único que recibió la persona responsable. Se consume al activarse y no se guarda en este dispositivo.</p>
      <div class="form-group" style="margin-top:1.2rem;">
        <label class="form-label" for="auth-initial-coach-code">Código de activación</label>
        <input class="form-control" id="auth-initial-coach-code" type="password" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="GOLF-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX">
      </div>
      <div id="auth-status" role="status" aria-live="polite" style="min-height:1.25rem; font-size:0.84rem; color:var(--text-muted);"></div>
      <button class="btn btn-primary" id="auth-claim-coach-btn" style="width:100%; min-height:46px; margin-top:1rem;" onclick="AuthEngine.claimInitialCoach()">Activar cuenta de entrenador</button>
    `);

    window.setTimeout(() => document.getElementById('auth-initial-coach-code')?.focus(), 0);
  }

  static async sendMagicLink() {
    if (!AuthEngine.client) return;

    const input = document.getElementById('auth-email-input');
    const button = document.getElementById('auth-send-link-btn');
    const email = input?.value?.trim().toLowerCase() || '';

    if (!AuthEngine.isValidEmail(email)) {
      AuthEngine.setStatus('Ingresá un correo electrónico válido.', 'error');
      input?.focus();
      return;
    }

    if (navigator.onLine === false) {
      AuthEngine.setStatus('Necesitás conexión para enviar el enlace.', 'error');
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = 'Enviando…';
    }
    AuthEngine.setStatus('');

    try {
      const { error } = await AuthEngine.client.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: AuthEngine.redirectUrl
        }
      });
      if (error) throw error;

      AuthEngine.setStatus('Revisá tu correo y abrí el enlace desde este dispositivo.', 'success');
    } catch (error) {
      AuthEngine.setStatus(AuthEngine.readableError(error, 'send-link'), 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Enviar enlace de acceso';
      }
    }
  }

  static async claimInitialCoach() {
    if (!AuthEngine.client || !AuthEngine.user) return;

    const input = document.getElementById('auth-initial-coach-code');
    const button = document.getElementById('auth-claim-coach-btn');
    const setupCode = input?.value?.trim().toUpperCase() || '';

    if (setupCode.length < 12 || setupCode.length > 128) {
      AuthEngine.setStatus('Ingresá el código completo.', 'error');
      input?.focus();
      return;
    }

    if (navigator.onLine === false) {
      AuthEngine.setStatus('Necesitás conexión para activar la cuenta.', 'error');
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = 'Activando…';
    }
    AuthEngine.setStatus('');

    try {
      const { error } = await AuthEngine.client.rpc('claim_initial_coach', {
        p_setup_code: setupCode
      });
      if (error) throw error;

      await AuthEngine.refreshIdentity();
      if (!AuthEngine.isCoach()) {
        throw new Error('La activación no pudo confirmarse.');
      }

      if (input) input.value = '';
      AuthEngine.renderSignedInModal();
      await window.CloudSync?.onAuthStateChanged?.();
      await window.PlayerPortal?.onAuthStateChanged?.();
      AuthEngine.toast('🏌️ Cuenta de entrenador activada.');
    } catch (error) {
      // Nunca mostrar ni registrar el código introducido.
      AuthEngine.setStatus(AuthEngine.readableError(error, 'claim-coach'), 'error');
    } finally {
      if (input) input.value = '';
      if (button) {
        button.disabled = false;
        button.textContent = 'Activar cuenta de entrenador';
      }
    }
  }

  static async signOut() {
    if (!AuthEngine.client) return;

    try {
      // Limpiar este dispositivo es posible aun si la sesión remota ya no está disponible.
      await AuthEngine.client.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.warn('No se pudo cerrar la sesión remota:', error);
    } finally {
      const generation = ++AuthEngine.identityGeneration;
      await AuthEngine.commitIdentity(null, null, generation);
      await window.CloudSync?.onAuthStateChanged?.();
      await window.PlayerPortal?.onAuthStateChanged?.();
      window.App?.closeModal();
      AuthEngine.toast('Sesión cerrada en este dispositivo.');
    }
  }

  static renderModal(content) {
    const modalContent = document.getElementById('global-modal-content');
    if (!modalContent || !window.App) return;
    modalContent.innerHTML = content;
    App.openModal();
  }

  static setStatus(message, type = 'neutral') {
    const status = document.getElementById('auth-status');
    if (!status) return;
    status.textContent = message;
    status.style.color = type === 'error'
      ? '#ef9a9a'
      : type === 'success'
        ? 'var(--primary-300)'
        : 'var(--text-muted)';
  }

  static readableError(error, context) {
    const message = String(error?.message || '').toLowerCase();
    if (AuthEngine.isNetworkError(error)) return 'No se pudo conectar. Revisá tu conexión e intentá nuevamente.';
    if (message.includes('rate limit') || message.includes('security purposes')) return 'Esperá unos segundos antes de solicitar otro enlace.';
    if (message.includes('redirect') || message.includes('not allowed')) return 'Falta habilitar la URL de esta aplicación en la configuración de Auth.';
    if (context === 'claim-coach') {
      if (message.includes('already been configured')) return 'El primer entrenador ya fue configurado.';
      if (message.includes('invalid setup code')) return 'El código no es válido o ya fue utilizado.';
      if (message.includes('not been configured')) return 'El código de activación aún no fue configurado.';
      return 'No se pudo activar la cuenta. Verificá el código e intentá nuevamente.';
    }
    return 'No se pudo enviar el enlace. Intentá nuevamente en unos minutos.';
  }

  static isNetworkError(error) {
    const message = String(error?.message || error || '').toLowerCase();
    return message.includes('failed to fetch') || message.includes('network') || message.includes('offline');
  }

  static isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  static toast(message) {
    if (window.App?.showToast) App.showToast(message);
  }
}

window.AuthEngine = AuthEngine;
