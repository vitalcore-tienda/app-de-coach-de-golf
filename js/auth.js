/**
 * GolfCoach Pro - acceso por correo con Supabase Auth.
 *
 * Esta capa sólo gestiona identidad y rol remoto. El modo local de IndexedDB
 * sigue funcionando sin conexión y no se mezcla con la identidad de un
 * golfista hasta que exista una sincronización cloud explícita.
 */

class AuthEngine {
  static supabaseUrl = 'https://kesbwmurxuncddirlbyt.supabase.co';
  // Las publishable keys son deliberadamente públicas: RLS protege los datos.
  // Nunca agregar aquí una service_role o una clave secreta.
  static publishableKey = 'sb_publishable_jIPYKOKfM6MXj1_WZGuAIw_3sepLmiK';
  static redirectUrl = 'https://vitalcore-tienda.github.io/app-de-coach-de-golf/';

  static client = null;
  static user = null;
  static profile = null;
  static initialized = false;
  static initPromise = null;

  static init() {
    if (!AuthEngine.initPromise) {
      AuthEngine.initPromise = AuthEngine.initialize();
    }
    return AuthEngine.initPromise;
  }

  static async initialize() {
    AuthEngine.initialized = true;

    if (!window.supabase?.createClient) {
      AuthEngine.updateAccessButton();
      console.warn('El cliente de Supabase no está disponible; se mantiene el modo local.');
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
          storageKey: 'golfcoach-pro-auth-v1'
        }
      }
    );

    // El callback debe ser liviano: el SDK mantiene un bloqueo interno de
    // sesión y las consultas remotas se ejecutan en el siguiente turno.
    AuthEngine.client.auth.onAuthStateChange((event, session) => {
      window.setTimeout(() => AuthEngine.handleAuthEvent(event, session), 0);
    });

    try {
      await AuthEngine.refreshIdentity();
      AuthEngine.clearAuthCallbackArtifacts();
    } catch (error) {
      console.warn('No se pudo restaurar la sesión cloud:', error);
    }

    AuthEngine.updateAccessButton();
  }

  static async handleAuthEvent(event, session) {
    if (event === 'SIGNED_OUT' || !session) {
      AuthEngine.user = null;
      AuthEngine.profile = null;
      AuthEngine.updateAccessButton();
      return;
    }

    try {
      await AuthEngine.refreshIdentity();
      AuthEngine.clearAuthCallbackArtifacts();
      if (event === 'SIGNED_IN') {
        AuthEngine.toast('✅ Sesión iniciada.');
      }
    } catch (error) {
      console.warn('No se pudo actualizar la sesión cloud:', error);
      AuthEngine.updateAccessButton();
    }
  }

  static async refreshIdentity() {
    if (!AuthEngine.client) return;

    const { data: sessionData } = await AuthEngine.client.auth.getSession();
    const session = sessionData?.session;

    if (!session) {
      AuthEngine.user = null;
      AuthEngine.profile = null;
      AuthEngine.updateAccessButton();
      return;
    }

    // La app no invalida una sesión local simplemente porque el dispositivo
    // está offline. RLS se seguirá aplicando al volver a consultar la nube.
    if (navigator.onLine === false) {
      const localUser = session.user || AuthEngine.user;
      // Nunca reutilizar el rol de otra sesión que pudo haber quedado en el
      // almacenamiento del navegador.
      if (AuthEngine.profile?.id !== localUser?.id) {
        AuthEngine.profile = null;
      }
      AuthEngine.user = localUser;
      AuthEngine.updateAccessButton();
      return;
    }

    const { data: userData, error: userError } = await AuthEngine.client.auth.getUser();
    if (userError || !userData?.user) {
      if (AuthEngine.isNetworkError(userError)) {
        AuthEngine.user = session.user || AuthEngine.user;
        AuthEngine.updateAccessButton();
        return;
      }

      AuthEngine.user = null;
      AuthEngine.profile = null;
      AuthEngine.updateAccessButton();
      return;
    }

    AuthEngine.user = userData.user;
    const { data: profile, error: profileError } = await AuthEngine.client
      .from('profiles')
      .select('id, email, display_name, account_role')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileError) {
      console.warn('No se pudo leer el perfil cloud:', profileError);
      AuthEngine.profile = null;
    } else {
      AuthEngine.profile = profile || null;
    }

    AuthEngine.updateAccessButton();
  }

  static clearAuthCallbackArtifacts() {
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

  static roleLabel() {
    if (AuthEngine.isCoach()) return 'Entrenador';
    if (AuthEngine.profile?.account_role === 'player') return 'Golfista';
    return 'Cuenta en preparación';
  }

  static updateAccessButton() {
    const button = document.getElementById('auth-access-btn');
    if (!button) return;

    if (!AuthEngine.client) {
      button.textContent = '✉️';
      button.title = 'El acceso por email no está disponible ahora';
      button.setAttribute('aria-label', button.title);
      return;
    }

    if (AuthEngine.user) {
      button.textContent = AuthEngine.isCoach() ? '👤' : '✉️';
      button.title = `${AuthEngine.roleLabel()}: abrir cuenta`;
      button.setAttribute('aria-label', button.title);
      return;
    }

    button.textContent = '✉️';
    button.title = 'Acceder por email';
    button.setAttribute('aria-label', button.title);
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
        <p>La aplicación sigue disponible en modo local. Volvé a intentarlo cuando haya conexión.</p>
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
        <span>🔐</span><span>El acceso protege la cuenta cloud. Las fichas guardadas sólo en este navegador siguen locales hasta que se active la sincronización.</span>
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
      AuthEngine.user = null;
      AuthEngine.profile = null;
      AuthEngine.updateAccessButton();
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
