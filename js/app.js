/**
 * GolfCoach Pro - Core Application Orchestrator
 * Navigation, Mobile Bottom Bar, Themes, Modals, Toasts, Dashboard Rendering
 */

class App {
  static currentView = 'dashboard';
  static currentTheme = 'dark';
  static ready = false;
  static modalCleanup = null;
  static claimingLegacyData = false;
  static startingDemo = false;

  static async init() {
    // 1. Preparar la base local sin exponer fichas hasta conocer la identidad.
    await StorageManager.initialize();

    // 1.1 Resolver la sesión antes de desbloquear el workspace correspondiente.
    if (window.AuthEngine) {
      try {
        await AuthEngine.init();
      } catch (error) {
        console.warn('No se pudo iniciar el acceso cloud:', error);
      }
    }

    // 2. Setup Theme
    App.currentTheme = StorageManager.get(STORAGE_KEYS.THEME, 'dark');
    document.documentElement.setAttribute('data-theme', App.currentTheme);
    App.updateThemeIcon();

    // 3. Setup Desktop Sidebar Navigation
    document.querySelectorAll('.sidebar .nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const targetView = item.getAttribute('data-view');
        if (targetView) {
          App.navigateTo(targetView);
        }
      });
    });

    // 4. Render Initial Dashboard View & Player Profile
    App.updateProfileDisplay();
    App.renderDashboard();
    App.updateWorkspaceVisibility();

    // 5. Activar la experiencia instalable/offline una vez que la app ya
    // está lista para mostrar sus avisos y abrir accesos directos de PWA.
    if (window.PWAEngine) {
      PWAEngine.init();
      PWAEngine.handleLaunchShortcut();
    }

    App.ready = true;
    document.body.classList.remove('auth-resolving');
  }

  static async onWorkspaceAccessChanged() {
    if (!App.ready) return;
    App.updateWorkspaceVisibility();
    App.updateProfileDisplay();

    if (!StorageManager.isWorkspaceUnlocked()) {
      App.clearPrivateViewContent();
      App.closeModal();
      App.currentView = 'dashboard';
      document.querySelectorAll('.view-panel').forEach((panel) => panel.classList.remove('active'));
      document.getElementById('dashboard-panel')?.classList.add('active');
      const title = document.getElementById('current-page-title');
      if (title) title.textContent = 'Acceso seguro';
      App.renderDashboard();
      return;
    }

    if (window.PlayerPortal?.active) return;

    App.renderDashboard();
    if (App.currentView === 'players' && window.PlayerEngine) await PlayerEngine.renderPlayersView();
    if (App.currentView === 'messages' && window.PlayerPortal) await PlayerPortal.renderCoachMessagesHub();
  }

  static updateWorkspaceVisibility() {
    const unlocked = StorageManager.isWorkspaceUnlocked();
    const hasPlayer = Boolean(StorageManager.getActivePlayerId());
    document.body.classList.toggle('workspace-locked', !unlocked);
    document.body.classList.toggle('workspace-empty', unlocked && !hasPlayer);

    const profileButton = document.getElementById('profile-settings-btn');
    const roundButton = document.getElementById('topbar-new-round-btn');
    if (profileButton) profileButton.hidden = !hasPlayer;
    if (roundButton) roundButton.hidden = !hasPlayer;
    App.updateDemoModeIndicator();
  }

  static updateDemoModeIndicator() {
    const active = StorageManager.isWorkspaceUnlocked()
      && StorageManager.isDemoPlayer(StorageManager.getProfile());
    const indicator = document.getElementById('demo-mode-indicator');
    document.body.classList.toggle('demo-mode-active', active);
    if (indicator) indicator.hidden = !active;
  }

  static renderEmptyWorkspaceOnboarding(legacyCount = StorageManager.unclaimedLegacyCount) {
    const account = App.getAccountIdentity();
    const coachName = App.escapeHTML(account.name || 'Entrenador');
    return `
      <div class="card card-gold-glow empty-workspace-card onboarding-shell">
        <div class="onboarding-hero">
          <div class="onboarding-eyebrow">
            <span class="badge badge-green">Espacio listo y vacío</span>
            <span style="font-size:0.78rem; color:var(--text-subtle);">1 de 3 · Configuración inicial</span>
          </div>
          <h2 style="margin-top:0.8rem;">Empecemos, ${coachName}</h2>
          <p style="max-width:650px; color:var(--text-muted); line-height:1.6;">
            No cargamos golfistas ni estadísticas de ejemplo automáticamente. Podés empezar con una ficha real o recorrer una demostración claramente identificada y sin sincronización.
          </p>
          <div class="onboarding-actions">
            <button class="btn btn-primary" style="min-height:48px;" onclick="PlayerEngine.openNewPlayerModal()">Agregar primer golfista</button>
            <button class="btn btn-secondary" id="explore-demo-btn" style="min-height:48px;" onclick="App.startDemoMode()">🧪 Explorar una demostración</button>
            ${legacyCount ? `<button class="btn btn-secondary" style="min-height:48px;" onclick="App.claimLegacyData()">Revisar ${legacyCount} ficha${legacyCount === 1 ? '' : 's'} anterior${legacyCount === 1 ? '' : 'es'}</button>` : ''}
          </div>
          <div class="form-status" id="demo-start-status" role="status" aria-live="polite"></div>
          ${legacyCount ? '<p style="font-size:0.8rem; color:var(--text-subtle); margin-top:0.85rem;">Las fichas anteriores siguen intactas y solo se vinculan si lo confirmás.</p>' : ''}
        </div>
        <div class="onboarding-steps" aria-label="Pasos de configuración">
          <div class="onboarding-step complete">
            <span class="onboarding-step-number">✓</span>
            <span><strong>Cuenta protegida</strong><small>Tu sesión de entrenador ya está verificada.</small></span>
          </div>
          <div class="onboarding-step active">
            <span class="onboarding-step-number">2</span>
            <span><strong>Crear la ficha</strong><small>Nombre y hándicap son suficientes para empezar.</small></span>
          </div>
          <div class="onboarding-step">
            <span class="onboarding-step-number">3</span>
            <span><strong>Empezar el seguimiento</strong><small>Luego agregás diagnóstico, metas y rondas reales.</small></span>
          </div>
        </div>
      </div>
    `;
  }

  static async startDemoMode() {
    if (App.startingDemo) return;
    const button = document.getElementById('explore-demo-btn');
    const status = document.getElementById('demo-start-status');
    App.startingDemo = true;
    if (button) {
      button.disabled = true;
      button.textContent = 'Preparando demostración…';
    }
    if (status) status.textContent = 'Creando datos simulados separados de tus fichas reales…';

    try {
      await StorageManager.createDemoWorkspace();
      App.updateWorkspaceVisibility();
      App.updateProfileDisplay();
      App.renderDashboard();
      App.showToast('🧪 Modo demo activo. Estos datos no se sincronizan.');
    } catch (error) {
      console.error('No se pudo iniciar la demostración:', error);
      if (status) {
        status.textContent = error.message || 'No se pudo preparar la demostración.';
        status.classList.add('error');
      }
      if (button) {
        button.disabled = false;
        button.textContent = '🧪 Explorar una demostración';
      }
    } finally {
      App.startingDemo = false;
    }
  }

  static renderPlayerOnboarding(profile, assessment, rounds, goals) {
    const items = [
      { complete: Boolean(profile?.name) && profile?.handicap !== null && profile?.handicap !== undefined, title: 'Ficha básica', detail: 'Nombre y hándicap', action: '' },
      { complete: Boolean(assessment?.completed), title: 'Diagnóstico 360°', detail: 'Punto de partida', action: "AssessmentEngine.startQuiz()" },
      { complete: goals.length > 0, title: 'Primera meta', detail: 'Objetivo de trabajo', action: "App.navigateTo('mentor')" },
      { complete: rounds.length > 0, title: 'Primera ronda', detail: 'Resultado real', action: "RoundsEngine.openNewRoundModal()" }
    ];
    const completed = items.filter((item) => item.complete).length;
    if (completed === items.length) return '';
    const next = items.find((item) => !item.complete && item.action);
    return `
      <div class="card" style="margin-bottom:1.5rem; border-color:rgba(212,175,55,0.3);">
        <div class="card-header" style="align-items:flex-start; gap:1rem;">
          <div>
            <span class="badge badge-gold">Primeros pasos · ${completed}/${items.length}</span>
            <h3 style="margin-top:0.55rem;">Prepará el seguimiento de ${App.escapeHTML(profile?.name || 'este golfista')}</h3>
            <p style="margin-top:0.25rem; color:var(--text-muted);">Completá estos pasos a tu ritmo. Ningún dato se inventa ni se completa automáticamente.</p>
          </div>
          ${next ? `<button class="btn btn-primary btn-sm" onclick="${next.action}">Continuar</button>` : ''}
        </div>
        <div class="onboarding-checklist">
          ${items.map((item) => `
            <div class="onboarding-check ${item.complete ? 'complete' : ''}">
              <span class="onboarding-check-icon">${item.complete ? '✓' : '○'}</span>
              <span class="onboarding-check-copy"><strong>${item.title}</strong><small>${item.detail}</small></span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  static clearPrivateViewContent() {
    [
      'player-portal-container',
      'players-container',
      'messages-container',
      'assessment-container',
      'drills-container',
      'mental-container',
      'tactics-container',
      'rounds-container',
      'mentor-container'
    ].forEach((id) => document.getElementById(id)?.replaceChildren());

    if (window.RoundsEngine) {
      RoundsEngine.holeData = [];
      RoundsEngine.roundPlayerContext = null;
    }
    if (window.PlayerPortal) {
      PlayerPortal.data = null;
      PlayerPortal.coachContext = null;
    }
  }

  static navigateTo(viewId) {
    App.closeMobileTopbarActions();

    // Las cuentas de golfista tienen una única experiencia enfocada. Aunque
    // algún atajo antiguo intente abrir una vista del entrenador, se mantiene
    // el portal activo (la seguridad de los datos también se aplica con RLS).
    if (window.PlayerPortal?.active && viewId !== 'player-portal') {
      if (PlayerPortal.isPlayerAccount?.()) {
        PlayerPortal.activate();
      } else {
        PlayerPortal.activateIdentityPending?.();
      }
      return;
    }

    if (!StorageManager.isWorkspaceUnlocked()) {
      App.currentView = 'dashboard';
      App.renderDashboard();
      AuthEngine.openAccessModal();
      return;
    }

    if (!StorageManager.getActivePlayerId() && !['dashboard', 'players'].includes(viewId)) {
      App.showToast('Primero creá o seleccioná un golfista.');
      viewId = 'players';
    }

    App.currentView = viewId;

    // 1. Update Desktop Sidebar Active Class
    document.querySelectorAll('.sidebar .nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // 2. Update Mobile Bottom Nav Active Class
    document.querySelectorAll('.coach-bottom-nav .bottom-nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewId) {
        item.classList.add('active');
        item.setAttribute('aria-current', 'page');
      } else {
        item.classList.remove('active');
        item.removeAttribute('aria-current');
      }
    });

    // 3. Update View Panels
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    const activePanel = document.getElementById(`${viewId}-panel`);
    if (activePanel) {
      activePanel.classList.add('active');
    }

    // 4. Update Topbar Title
    const titles = {
      dashboard: 'Dashboard 360°',
      players: 'Golfistas',
      messages: 'Mensajes con Golfistas',
      assessment: 'Diagnóstico Integral 360°',
      drills: 'Planes de Entrenamiento & Drills',
      mental: 'Juego Mental & Rutina',
      tactics: 'Caddy Táctico & Estrategia',
      rounds: 'Scorecard & Estadísticas',
      mentor: 'Centro de Mentoría & Metas',
      'player-portal': 'Mi golf'
    };

    const titleEl = document.getElementById('current-page-title');
    if (titleEl) {
      titleEl.innerText = titles[viewId] || 'GolfCoach Pro';
    }

    // 5. Trigger Module Renderers
    if (viewId === 'dashboard') App.renderDashboard();
    if (viewId === 'players' && window.PlayerEngine) PlayerEngine.renderPlayersView();
    if (viewId === 'messages' && window.PlayerPortal) PlayerPortal.renderCoachMessagesHub();
    if (viewId === 'assessment' && window.AssessmentEngine) AssessmentEngine.renderDiagnosticView();
    if (viewId === 'drills' && window.DrillsEngine) DrillsEngine.renderDrillsView();
    if (viewId === 'mental' && window.MentalEngine) MentalEngine.renderMentalView();
    if (viewId === 'tactics' && window.TacticsEngine) TacticsEngine.renderTacticsView();
    if (viewId === 'rounds' && window.RoundsEngine) RoundsEngine.renderRoundsView();
    if (viewId === 'mentor' && window.MentorEngine) MentorEngine.renderMentorView();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  static toggleMobileDrawer() {
    App.closeMobileTopbarActions();
    const drawer = document.getElementById('mobile-drawer-overlay');
    if (drawer) {
      drawer.classList.toggle('active');
    }
  }

  static closeMobileDrawer(event) {
    if (event && event.target && event.target.id !== 'mobile-drawer-overlay') {
      return;
    }
    const drawer = document.getElementById('mobile-drawer-overlay');
    if (drawer) {
      drawer.classList.remove('active');
    }
  }

  static toggleMobileTopbarActions() {
    const menu = document.getElementById('topbar-actions');
    const button = document.getElementById('mobile-topbar-actions-btn');
    if (!menu || !button) return;

    const isOpen = menu.classList.toggle('mobile-actions-open');
    button.setAttribute('aria-expanded', String(isOpen));
    button.setAttribute('aria-label', isOpen ? 'Cerrar acciones' : 'Abrir acciones');
  }

  static closeMobileTopbarActions({ restoreFocus = false } = {}) {
    const menu = document.getElementById('topbar-actions');
    const button = document.getElementById('mobile-topbar-actions-btn');
    if (!menu || !button) return;

    const wasOpen = menu.classList.contains('mobile-actions-open');
    menu.classList.remove('mobile-actions-open');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Abrir acciones');
    if (restoreFocus && wasOpen) button.focus();
  }

  static renderDashboard() {
    const container = document.getElementById('dashboard-container');
    if (!container) return;

    if (!StorageManager.isWorkspaceUnlocked()) {
      container.innerHTML = `
        <div class="card card-gold-glow secure-entry-card">
          <span class="badge badge-green">Datos protegidos</span>
          <h2 style="margin-top:0.75rem;">Ingresá para abrir tu espacio de entrenador</h2>
          <p style="max-width:620px; color:var(--text-muted); line-height:1.6;">
            Las fichas guardadas en este dispositivo están bloqueadas. Accedé con el correo del entrenador para continuar; después podrás trabajar sin conexión con esta misma sesión.
          </p>
          <button class="btn btn-primary" style="margin-top:1rem; min-height:46px;" onclick="AuthEngine.openAccessModal()">Ingresar por correo</button>
        </div>
      `;
      return;
    }

    if (!StorageManager.getActivePlayerId()) {
      container.innerHTML = App.renderEmptyWorkspaceOnboarding();
      return;
    }

    const profile = StorageManager.getProfile();
    const assessment = StorageManager.getAssessment();
    const rounds = StorageManager.getRounds();
    const goals = StorageManager.getGoals();
    const scores = window.AssessmentEngine?.normalizeScores
      ? AssessmentEngine.normalizeScores(assessment?.scores)
      : { swing: 50, shortGame: 50, strategy: 50, mental: 50, fitness: 50 };

    const lastRound = rounds[0] || null;
    const avgScore = rounds.length > 0
      ? Math.round(rounds.reduce((sum, round) => sum + App.safeNumber(round.totalScore), 0) / rounds.length)
      : '-';
    const profileName = App.escapeHTML(profile.name || 'Golfista');
    const isDemoProfile = StorageManager.isDemoPlayer(profile);
    const handicap = App.safeNumber(profile.handicap, 0);
    const targetHandicap = profile.targetHandicap === null || profile.targetHandicap === undefined
      ? '—'
      : App.safeNumber(profile.targetHandicap, 0);
    const playerCategory = App.escapeHTML(profile.playerCategory || '—');
    const homeClub = App.escapeHTML(profile.homeClub || '—');
    const lastRoundScore = lastRound ? App.safeNumber(lastRound.totalScore, 0) : '-';
    const lastRoundDiff = lastRound ? App.escapeHTML(lastRound.scoreDiff || '—') : '';
    const lastRoundCourse = lastRound ? App.escapeHTML(lastRound.course || '—') : 'Sin rondas';

    container.innerHTML = `
      ${App.renderPlayerOnboarding(profile, assessment, rounds, goals)}
      ${isDemoProfile ? `
        <div class="demo-mode-notice">
          <span class="demo-mode-notice-icon" aria-hidden="true">🧪</span>
          <span><strong>Modo demo.</strong> Todos los nombres, rondas, diagnósticos y metas de esta ficha son simulados y nunca se sincronizan con la nube.</span>
          <button class="btn btn-secondary btn-sm" onclick="PlayerEngine.openNewPlayerModal()">Agregar golfista real</button>
        </div>
      ` : ''}
      <!-- Coach workspace hero -->
      <div class="card card-gold-glow" style="margin-bottom: 1.5rem; background: radial-gradient(circle at 10% 20%, rgba(24, 92, 59, 0.4) 0%, rgba(18, 25, 21, 0.95) 80%);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.25rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="badge badge-gold">Panel del entrenador</span>
              <span class="badge badge-green">Ficha seleccionada</span>
            </div>
            <h2>Resumen de ${profileName}</h2>
            <p style="font-size: 0.88rem; max-width: 600px;">
              Estás trabajando sobre la ficha deportiva de <strong style="color: var(--text-main);">${profileName}</strong>. Todo lo que cargues quedará asociado a este golfista.
            </p>
          </div>
          <div style="display: flex; gap: 0.5rem; width: 100%; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" style="flex: 1; min-height: 42px;" onclick="AssessmentEngine.startQuiz()">
              📋 Diagnóstico 360°
            </button>
            <button class="btn btn-secondary btn-sm" style="flex: 1; min-height: 42px;" onclick="RoundsEngine.openNewRoundModal()">
              ➕ Registrar Ronda
            </button>
          </div>
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="grid-4 dashboard-kpi-grid">
        <div class="card stat-card">
          <div class="stat-label">Hándicap Actual</div>
          <div class="stat-value dashboard-kpi-value dashboard-kpi-value-gold">${handicap}</div>
          <div class="stat-sub gold">🎯 Meta: ${targetHandicap}</div>
        </div>

        <div class="card stat-card">
          <div class="stat-label">Promedio Score</div>
          <div class="stat-value dashboard-kpi-value">${avgScore}</div>
          <div class="stat-sub positive">⛳ ${rounds.length} rondas</div>
        </div>

        <div class="card stat-card">
          <div class="stat-label">Última Ronda</div>
          <div class="stat-value dashboard-kpi-value dashboard-kpi-value-round">${lastRound ? `${lastRoundScore} (${lastRoundDiff})` : '-'}</div>
          <div class="stat-sub dashboard-kpi-detail">${lastRoundCourse}</div>
        </div>

        <div class="card stat-card">
          <div class="stat-label">Perfil de Jugador</div>
          <div class="stat-value dashboard-kpi-value dashboard-kpi-value-profile">
            ${playerCategory}
          </div>
          <div class="stat-sub gold dashboard-kpi-detail">🏌️ Club: ${homeClub}</div>
        </div>
      </div>

      <!-- Main Dashboard Grid -->
      <div class="grid-2" style="margin-bottom: 1.5rem;">
        <!-- Radar Chart Widget -->
        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <div class="card-icon">📊</div>
              <h3 class="card-title">Balance de los 5 Pilares</h3>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="${assessment.completed ? "App.navigateTo('assessment')" : 'AssessmentEngine.startQuiz()'}">${assessment.completed ? 'Detalles' : 'Comenzar'}</button>
          </div>
          ${assessment.completed ? `
            <div class="radar-container">
              ${AssessmentEngine.generateRadarSVG(scores)}
            </div>
            <div style="display: flex; justify-content: space-around; text-align: center; border-top: 1px solid var(--border-subtle); padding-top: 0.85rem; margin-top: 0.5rem;">
            <div>
              <span style="font-size: 0.72rem; color: var(--text-subtle);">Swing</span>
              <div style="font-weight: 700; color: var(--gold-400); font-size: 0.95rem;">${scores.swing}%</div>
            </div>
            <div>
              <span style="font-size: 0.72rem; color: var(--text-subtle);">Corto</span>
              <div style="font-weight: 700; color: var(--gold-400); font-size: 0.95rem;">${scores.shortGame}%</div>
            </div>
            <div>
              <span style="font-size: 0.72rem; color: var(--text-subtle);">Estrategia</span>
              <div style="font-weight: 700; color: var(--gold-400); font-size: 0.95rem;">${scores.strategy}%</div>
            </div>
            <div>
              <span style="font-size: 0.72rem; color: var(--text-subtle);">Mente</span>
              <div style="font-weight: 700; color: var(--gold-400); font-size: 0.95rem;">${scores.mental}%</div>
            </div>
            <div>
              <span style="font-size: 0.72rem; color: var(--text-subtle);">Físico</span>
              <div style="font-weight: 700; color: var(--gold-400); font-size: 0.95rem;">${scores.fitness}%</div>
            </div>
            </div>
          ` : `
            <div class="empty-state-panel" style="padding:1.25rem 0.5rem;">
              <p style="color:var(--text-muted); line-height:1.5;">Todavía no hay una evaluación. El gráfico aparecerá cuando se complete el diagnóstico; no mostramos valores estimados.</p>
              <button class="btn btn-primary btn-sm" style="margin-top:0.75rem;" onclick="AssessmentEngine.startQuiz()">Iniciar diagnóstico 360°</button>
            </div>
          `}
        </div>

        <!-- Recommended Daily Drill & Quick Actions -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <!-- Drill of the Day -->
          <div class="card" style="border-left: 4px solid var(--gold-400);">
            <div class="card-header">
              <span class="badge badge-gold">Drill Recomendado</span>
              <span class="badge badge-blue">⏱️ 20 min</span>
            </div>
            <h3 style="margin-bottom: 0.4rem; font-size: 1.05rem;">Drill del Reloj / Estrella a 1 Metro</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.85rem;">
              Enfocado en eliminar tripateos y construir confianza inquebrantable bajo presión.
            </p>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="DrillsEngine.startDrillWithTimer('d_putt_2', 20)">
                ▶ Pomodoro (20m)
              </button>
              <button class="btn btn-secondary btn-sm" onclick="App.navigateTo('drills')">
                Ver Todos
              </button>
            </div>
          </div>

          <!-- Active Goals Summary -->
          <div class="card">
            <div class="card-header">
              <div class="card-title-group">
                <div class="card-icon">🎯</div>
                <h3 class="card-title">Metas Activas</h3>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="App.navigateTo('mentor')">Ver</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${goals.length ? goals.slice(0, 2).map(g => {
                const progress = App.clampNumber(g.progress, 0, 100, 0);
                return `
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.25rem;">
                    <span style="font-weight: 600;">${App.escapeHTML(g.title || 'Meta sin título')}</span>
                    <span style="color: var(--gold-400); font-weight: 700;">${progress}%</span>
                  </div>
                  <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${progress}%;"></div>
                  </div>
                </div>
              `;
              }).join('') : '<p style="color:var(--text-muted); font-size:0.86rem;">Todavía no hay metas cargadas. Creá la primera desde Mentoría.</p>'}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static async claimLegacyData() {
    if (App.claimingLegacyData || !StorageManager.hasUnclaimedLegacyData()) return;
    const accepted = window.confirm('Se vincularán las fichas locales anteriores a la cuenta de entrenador que está abierta. Cualquier ficha de demostración quedará marcada como ejemplo y no se subirá a la nube. ¿Querés continuar?');
    if (!accepted) return;

    App.claimingLegacyData = true;
    try {
      const claimed = await StorageManager.claimLegacyWorkspace();
      App.updateWorkspaceVisibility();
      App.updateProfileDisplay();
      App.renderDashboard();
      if (App.currentView === 'players' && window.PlayerEngine) await PlayerEngine.renderPlayersView();
      App.showToast(`${claimed} ficha${claimed === 1 ? '' : 's'} vinculada${claimed === 1 ? '' : 's'} a tu cuenta.`);
    } catch (error) {
      console.error('No se pudieron vincular los datos locales:', error);
      App.showToast('No se pudieron vincular las fichas anteriores. Tus datos no fueron eliminados.');
    } finally {
      App.claimingLegacyData = false;
    }
  }

  static toggleTheme() {
    App.currentTheme = App.currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', App.currentTheme);
    StorageManager.set(STORAGE_KEYS.THEME, App.currentTheme);
    App.updateThemeIcon();
  }

  static updateThemeIcon() {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      const icon = btn.querySelector('.topbar-action-icon');
      if (icon) icon.textContent = App.currentTheme === 'dark' ? '☀️' : '🌙';
      else btn.textContent = App.currentTheme === 'dark' ? '☀️' : '🌙';
    }
  }

  static getAccountIdentity() {
    const auth = window.AuthEngine;

    if (auth?.isCoach?.()) {
      const emailName = String(auth.user?.email || '').split('@')[0];
      return {
        label: 'Entrenador',
        name: String(auth.profile?.display_name || emailName || 'Cuenta conectada')
      };
    }

    if (auth?.user) {
      const emailName = String(auth.user.email || '').split('@')[0];
      const isPlayer = auth.profile?.account_role === 'player';
      return {
        label: isPlayer ? 'Cuenta de golfista' : 'Cuenta en preparación',
        name: String(auth.profile?.display_name || emailName || 'Cuenta conectada')
      };
    }

    return {
      label: 'Acceso requerido',
      name: 'Espacio bloqueado'
    };
  }

  static updateWorkspaceContext() {
    const profile = StorageManager.getProfile();
    const playerName = String(profile?.name || 'Sin golfista');
    const handicap = profile?.handicap === null || profile?.handicap === undefined ? null : App.safeNumber(profile.handicap, 0);
    const account = App.getAccountIdentity();
    const accountLabel = document.getElementById('workspace-account-label');
    const coachName = document.getElementById('workspace-coach-name');
    const playerNameEl = document.getElementById('workspace-player-name');
    const playerHcp = document.getElementById('workspace-player-hcp');
    const accountButton = document.getElementById('workspace-account-context');
    const playerButton = document.getElementById('workspace-player-context');

    if (accountLabel) accountLabel.textContent = account.label;
    if (coachName) coachName.textContent = account.name;
    if (playerNameEl) playerNameEl.textContent = playerName;
    if (playerHcp) playerHcp.textContent = handicap === null ? 'HCP —' : `HCP ${handicap}`;

    if (accountButton) {
      const accountAction = `${account.label}: ${account.name}. Abrir cuenta.`;
      accountButton.title = accountAction;
      accountButton.setAttribute('aria-label', accountAction);
    }

    if (playerButton) {
      const playerAction = profile
        ? `Viendo a ${playerName}, hándicap ${handicap ?? 'sin cargar'}. Cambiar golfista seleccionado.`
        : 'No hay un golfista seleccionado. Crear o seleccionar una ficha.';
      playerButton.title = playerAction;
      playerButton.setAttribute('aria-label', playerAction);
      playerButton.disabled = !StorageManager.isWorkspaceUnlocked();
    }
  }

  static updateProfileDisplay() {
    const profile = StorageManager.getProfile();
    const name = String(profile?.name || 'Sin golfista');
    const handicap = profile?.handicap === null || profile?.handicap === undefined ? '—' : App.safeNumber(profile.handicap, 0);
    const targetHandicap = profile?.targetHandicap === null || profile?.targetHandicap === undefined ? '—' : App.safeNumber(profile.targetHandicap, 0);
    
    // Sidebar elements
    const nameEl = document.getElementById('sidebar-player-name');
    const hcpEl = document.getElementById('sidebar-player-hcp');
    const avatarEl = document.getElementById('sidebar-player-avatar');

    if (nameEl) nameEl.innerText = name;
    if (hcpEl) hcpEl.innerText = `HCP ${handicap} · Meta ${targetHandicap}`;
    if (avatarEl) avatarEl.innerText = profile ? name.charAt(0).toUpperCase() : '—';

    // Drawer elements
    const dNameEl = document.getElementById('drawer-player-name');
    const dHcpEl = document.getElementById('drawer-player-hcp');
    const dAvatarEl = document.getElementById('drawer-player-avatar');

    if (dNameEl) dNameEl.innerText = name;
    if (dHcpEl) dHcpEl.innerText = `HCP ${handicap} · Cambiar`;
    if (dAvatarEl) dAvatarEl.innerText = profile ? name.charAt(0).toUpperCase() : '—';

    App.updateWorkspaceContext();
    App.updateDemoModeIndicator();
  }

  static openDemoModeInfo() {
    if (!StorageManager.isDemoPlayer(StorageManager.getProfile())) return;
    const modalContent = document.getElementById('global-modal-content');
    if (!modalContent) return;
    modalContent.innerHTML = `
      <div class="modal-handle-bar"></div>
      <div class="modal-header">
        <div>
          <span class="badge badge-gold">🧪 Modo demo</span>
          <h3 style="margin-top:0.4rem;">Estás explorando datos simulados</h3>
        </div>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <p style="color:var(--text-muted); line-height:1.6;">Esta ficha, sus rondas, diagnóstico y metas son ejemplos. No se envían a la nube ni se mezclan con los golfistas reales.</p>
      <div style="display:flex; gap:0.65rem; flex-wrap:wrap; margin-top:1.25rem;">
        <button class="btn btn-primary" onclick="App.closeModal(); PlayerEngine.openNewPlayerModal()">Agregar golfista real</button>
        <button class="btn btn-secondary" onclick="App.closeModal(); App.navigateTo('players')">Ver todas las fichas</button>
      </div>
    `;
    App.openModal();
  }

  static openProfileModal() {
    const profile = StorageManager.getProfile();
    if (!profile) {
      App.showToast('Primero creá o seleccioná un golfista.');
      window.PlayerEngine?.openNewPlayerModal?.();
      return;
    }
    const profileName = App.escapeHTML(profile?.name || 'Golfista');
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-handle-bar"></div>
      <div class="modal-header">
        <div>
          <span class="badge badge-gold" style="margin-bottom: 0.25rem;">Golfista seleccionado</span>
          <h3>Ficha de ${profileName}</h3>
        </div>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>

      <div class="form-group">
        <label class="form-label">Nombre Completo</label>
        <input type="text" class="form-control" id="profile-name-input" value="${App.escapeHTML(profile.name)}">
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-control" id="profile-email-input" value="${App.escapeHTML(profile.email || '')}" placeholder="nombre@email.com">
        </div>
        <div class="form-group">
          <label class="form-label">Teléfono</label>
          <input type="text" class="form-control" id="profile-phone-input" value="${App.escapeHTML(profile.phone || '')}" placeholder="Contacto">
        </div>
      </div>

      <div class="grid-3">
        <div class="form-group">
          <label class="form-label">Hándicap Actual</label>
          <input type="number" step="0.1" class="form-control" id="profile-hcp-input" value="${App.safeNumber(profile.handicap, 0)}">
        </div>
        <div class="form-group">
          <label class="form-label">Hándicap Objetivo</label>
          <input type="number" step="0.1" class="form-control" id="profile-target-hcp-input" value="${profile.targetHandicap ?? ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Licencia Federativa</label>
          <input type="text" class="form-control" id="profile-license-input" value="${App.escapeHTML(profile.federationLicense || '')}" placeholder="Opcional">
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Club Principal</label>
          <input type="text" class="form-control" id="profile-club-input" value="${App.escapeHTML(profile.homeClub || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Carry Driver (m)</label>
          <input type="number" class="form-control" id="profile-driver-input" value="${profile.driverDistanceAvg ?? ''}">
        </div>
      </div>

      <div class="grid-3">
        <div class="form-group">
          <label class="form-label">Mano Dominante</label>
          <select class="form-control" id="profile-hand-input">
            <option ${profile.dominantHand === 'Diestro' ? 'selected' : ''}>Diestro</option>
            <option ${profile.dominantHand === 'Zurdo' ? 'selected' : ''}>Zurdo</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Años de Experiencia</label>
          <input type="number" min="0" class="form-control" id="profile-experience-input" value="${App.safeNumber(profile.experienceYears, 0)}">
        </div>
        <div class="form-group">
          <label class="form-label">Fecha de Nacimiento</label>
          <input type="date" class="form-control" id="profile-birthdate-input" value="${App.escapeHTML(profile.birthDate || '')}">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Categoría / Nivel</label>
        <input type="text" class="form-control" id="profile-category-input" value="${App.escapeHTML(profile.playerCategory || '')}" placeholder="Ej.: Amateur competitivo">
      </div>

      <div style="margin-top: 1.25rem;">
        <div class="form-status" id="profile-save-status" role="status" aria-live="polite"></div>
        <button class="btn btn-primary" id="profile-save-btn" style="width: 100%; min-height: 48px;" onclick="App.saveProfile()">Guardar cambios</button>
      </div>
    `;

    App.openModal();
  }

  static async saveProfile() {
    const button = document.getElementById('profile-save-btn');
    const status = document.getElementById('profile-save-status');
    if (button?.disabled) return;
    const profile = StorageManager.getProfile();
    if (!profile) return;
    const read = (id) => document.getElementById(id)?.value?.trim() || '';
    const readOptionalNumber = (id) => {
      const value = read(id);
      return value === '' ? null : Number(value);
    };
    profile.name = read('profile-name-input');
    profile.email = read('profile-email-input');
    profile.phone = read('profile-phone-input');
    profile.handicap = readOptionalNumber('profile-hcp-input');
    profile.targetHandicap = readOptionalNumber('profile-target-hcp-input');
    profile.federationLicense = read('profile-license-input');
    profile.homeClub = read('profile-club-input');
    profile.driverDistanceAvg = readOptionalNumber('profile-driver-input');
    profile.dominantHand = read('profile-hand-input') || 'Diestro';
    profile.experienceYears = readOptionalNumber('profile-experience-input') ?? 0;
    profile.birthDate = read('profile-birthdate-input');
    profile.playerCategory = read('profile-category-input');

    try {
      if (button) {
        button.disabled = true;
        button.textContent = 'Guardando…';
      }
      if (status) {
        status.textContent = '';
        status.classList.remove('error');
      }
      await StorageManager.saveProfile(profile);
      App.updateProfileDisplay();
      App.closeModal();
      App.showToast('✅ Perfil actualizado.');
      App.renderDashboard();
      if (App.currentView === 'players' && window.PlayerEngine) await PlayerEngine.renderPlayersView();
    } catch (error) {
      console.error('No se pudo actualizar el perfil:', error);
      const message = error.message || 'No se pudo actualizar el perfil.';
      if (status) {
        status.textContent = message;
        status.classList.add('error');
      }
      if (button) {
        button.disabled = false;
        button.textContent = 'Guardar cambios';
      }
      App.showToast(message);
    }
  }

  static escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  static safeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  static clampNumber(value, min, max, fallback = min) {
    return Math.min(max, Math.max(min, App.safeNumber(value, fallback)));
  }

  static openModal() {
    const modal = document.getElementById('global-modal');
    if (modal) modal.classList.add('active');
  }

  static closeModal() {
    const modal = document.getElementById('global-modal');
    if (modal) modal.classList.remove('active');
    const cleanup = App.modalCleanup;
    App.modalCleanup = null;
    if (typeof cleanup === 'function') cleanup();
  }

  static setModalCleanup(cleanup) {
    App.modalCleanup = typeof cleanup === 'function' ? cleanup : null;
  }

  static showToast(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = document.createElement('span');
    icon.textContent = '⛳';
    const content = document.createElement('div');
    content.textContent = String(message ?? '');
    toast.replaceChildren(icon, content);
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }
}

window.App = App;

document.addEventListener('DOMContentLoaded', () => {
  App.init().catch((error) => {
    console.error('No se pudo iniciar GolfCoach:', error);
    document.body.classList.remove('auth-resolving');
  });
});

document.addEventListener('click', (event) => {
  const menu = document.getElementById('topbar-actions');
  const button = document.getElementById('mobile-topbar-actions-btn');
  if (!menu?.classList.contains('mobile-actions-open')) return;
  if (menu.contains(event.target) || button?.contains(event.target)) return;
  App.closeMobileTopbarActions();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') App.closeMobileTopbarActions({ restoreFocus: true });
});
