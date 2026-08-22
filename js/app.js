/**
 * GolfCoach Pro - Core Application Orchestrator
 * Navigation, Mobile Bottom Bar, Themes, Modals, Toasts, Dashboard Rendering
 */

class App {
  static currentView = 'dashboard';
  static currentTheme = 'dark';

  static async init() {
    // 1. Cargar la base local y migrar los datos que ya existían.
    await StorageManager.initialize();

    // 1.1 Restaurar la sesión cloud sin bloquear el modo local/offline.
    // El respaldo se activa explícitamente desde CloudSync y nunca impide usar la app.
    if (window.AuthEngine) {
      AuthEngine.init().catch(error => console.warn('No se pudo iniciar el acceso cloud:', error));
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

    // 5. Activar la experiencia instalable/offline una vez que la app ya
    // está lista para mostrar sus avisos y abrir accesos directos de PWA.
    if (window.PWAEngine) {
      PWAEngine.init();
      PWAEngine.handleLaunchShortcut();
    }
  }

  static navigateTo(viewId) {
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
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
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
      players: 'Golfistas & Datos',
      assessment: 'Diagnóstico Integral 360°',
      drills: 'Planes de Entrenamiento & Drills',
      mental: 'Juego Mental & Rutina',
      tactics: 'Caddy Táctico & Estrategia',
      rounds: 'Scorecard & Estadísticas',
      mentor: 'Centro de Mentoría & Metas'
    };

    const titleEl = document.getElementById('current-page-title');
    if (titleEl) {
      titleEl.innerText = titles[viewId] || 'GolfCoach Pro';
    }

    // 5. Trigger Module Renderers
    if (viewId === 'dashboard') App.renderDashboard();
    if (viewId === 'players' && window.PlayerEngine) PlayerEngine.renderPlayersView();
    if (viewId === 'assessment' && window.AssessmentEngine) AssessmentEngine.renderDiagnosticView();
    if (viewId === 'drills' && window.DrillsEngine) DrillsEngine.renderDrillsView();
    if (viewId === 'mental' && window.MentalEngine) MentalEngine.renderMentalView();
    if (viewId === 'tactics' && window.TacticsEngine) TacticsEngine.renderTacticsView();
    if (viewId === 'rounds' && window.RoundsEngine) RoundsEngine.renderRoundsView();
    if (viewId === 'mentor' && window.MentorEngine) MentorEngine.renderMentorView();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  static toggleMobileDrawer() {
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

  static renderDashboard() {
    const container = document.getElementById('dashboard-container');
    if (!container) return;

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
    const handicap = App.safeNumber(profile.handicap, 0);
    const targetHandicap = App.safeNumber(profile.targetHandicap, 0);
    const playerCategory = App.escapeHTML(profile.playerCategory || '—');
    const homeClub = App.escapeHTML(profile.homeClub || '—');
    const lastRoundScore = lastRound ? App.safeNumber(lastRound.totalScore, 0) : '-';
    const lastRoundDiff = lastRound ? App.escapeHTML(lastRound.scoreDiff || '—') : '';
    const lastRoundCourse = lastRound ? App.escapeHTML(lastRound.course || '—') : 'Sin rondas';

    container.innerHTML = `
      <!-- Welcome Hero Banner -->
      <div class="card card-gold-glow" style="margin-bottom: 1.5rem; background: radial-gradient(circle at 10% 20%, rgba(24, 92, 59, 0.4) 0%, rgba(18, 25, 21, 0.95) 80%);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.25rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="badge badge-gold">Metodología 360° SotaPar</span>
              <span class="badge badge-green">En Entrenamiento</span>
            </div>
            <h2>Bienvenido, ${profileName}</h2>
            <p style="font-size: 0.88rem; max-width: 600px;">
              Tu camino para bajar de hándicap dominando técnica, juego corto, estrategia de torneo y fortaleza mental.
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
      <div class="grid-4" style="margin-bottom: 1.5rem;">
        <div class="card stat-card">
          <div class="stat-label">Hándicap Actual</div>
          <div class="stat-value" style="color: var(--gold-400);">${handicap}</div>
          <div class="stat-sub gold">🎯 Meta: ${targetHandicap}</div>
        </div>

        <div class="card stat-card">
          <div class="stat-label">Promedio de Score</div>
          <div class="stat-value">${avgScore}</div>
          <div class="stat-sub positive">⛳ ${rounds.length} rondas</div>
        </div>

        <div class="card stat-card">
          <div class="stat-label">Última Ronda</div>
          <div class="stat-value" style="font-size: 1.4rem;">${lastRound ? `${lastRoundScore} (${lastRoundDiff})` : '-'}</div>
          <div class="stat-sub" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${lastRoundCourse}</div>
        </div>

        <div class="card stat-card">
          <div class="stat-label">Perfil de Jugador</div>
          <div class="stat-value" style="font-size: 1rem; line-height: 1.3; color: var(--primary-300);">
            ${playerCategory}
          </div>
          <div class="stat-sub gold">🏌️ Club: ${homeClub}</div>
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
            <button class="btn btn-secondary btn-sm" onclick="App.navigateTo('assessment')">Detalles</button>
          </div>
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
              ${goals.slice(0, 2).map(g => {
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
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
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
      btn.innerHTML = App.currentTheme === 'dark' ? '☀️' : '🌙';
    }
  }

  static updateProfileDisplay() {
    const profile = StorageManager.getProfile();
    const name = String(profile?.name || 'Golfista');
    const handicap = App.safeNumber(profile?.handicap, 0);
    const targetHandicap = App.safeNumber(profile?.targetHandicap, 0);
    
    // Sidebar elements
    const nameEl = document.getElementById('sidebar-player-name');
    const hcpEl = document.getElementById('sidebar-player-hcp');
    const avatarEl = document.getElementById('sidebar-player-avatar');

    if (nameEl) nameEl.innerText = name;
    if (hcpEl) hcpEl.innerText = `HCP: ${handicap} (Meta: ${targetHandicap})`;
    if (avatarEl) avatarEl.innerText = name.charAt(0).toUpperCase();

    // Drawer elements
    const dNameEl = document.getElementById('drawer-player-name');
    const dHcpEl = document.getElementById('drawer-player-hcp');
    const dAvatarEl = document.getElementById('drawer-player-avatar');

    if (dNameEl) dNameEl.innerText = name;
    if (dHcpEl) dHcpEl.innerText = `HCP: ${handicap} • Editar ⚙️`;
    if (dAvatarEl) dAvatarEl.innerText = name.charAt(0).toUpperCase();
  }

  static openProfileModal() {
    const profile = StorageManager.getProfile();
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-handle-bar"></div>
      <div class="modal-header">
        <div>
          <span class="badge badge-gold" style="margin-bottom: 0.25rem;">Configuración de Jugador</span>
          <h3>Perfil del Golfista</h3>
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
          <input type="number" step="0.1" class="form-control" id="profile-target-hcp-input" value="${App.safeNumber(profile.targetHandicap, 0)}">
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
          <input type="number" class="form-control" id="profile-driver-input" value="${App.safeNumber(profile.driverDistanceAvg, 0)}">
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
        <button class="btn btn-primary" style="width: 100%; min-height: 48px;" onclick="App.saveProfile()">Guardar Cambios</button>
      </div>
    `;

    App.openModal();
  }

  static async saveProfile() {
    const profile = StorageManager.getProfile();
    profile.name = document.getElementById('profile-name-input')?.value || profile.name;
    profile.email = document.getElementById('profile-email-input')?.value || '';
    profile.phone = document.getElementById('profile-phone-input')?.value || '';
    profile.handicap = parseFloat(document.getElementById('profile-hcp-input')?.value || profile.handicap);
    profile.targetHandicap = parseFloat(document.getElementById('profile-target-hcp-input')?.value || profile.targetHandicap);
    profile.federationLicense = document.getElementById('profile-license-input')?.value || '';
    profile.homeClub = document.getElementById('profile-club-input')?.value || profile.homeClub;
    profile.driverDistanceAvg = parseInt(document.getElementById('profile-driver-input')?.value || profile.driverDistanceAvg);
    profile.dominantHand = document.getElementById('profile-hand-input')?.value || profile.dominantHand;
    profile.experienceYears = parseInt(document.getElementById('profile-experience-input')?.value || profile.experienceYears);
    profile.birthDate = document.getElementById('profile-birthdate-input')?.value || '';
    profile.playerCategory = document.getElementById('profile-category-input')?.value || profile.playerCategory;

    try {
      await StorageManager.saveProfile(profile);
      App.updateProfileDisplay();
      App.closeModal();
      App.showToast('✅ Perfil actualizado.');
      App.renderDashboard();
      if (App.currentView === 'players' && window.PlayerEngine) await PlayerEngine.renderPlayersView();
    } catch (error) {
      console.error('No se pudo actualizar el perfil:', error);
      App.showToast('No se pudo actualizar el perfil.');
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
  App.init();
});
