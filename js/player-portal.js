/**
 * GolfCoach Pro - focused golfer portal and coach collaboration tools.
 *
 * Authenticated golfers read only the cloud rows allowed by RLS. The coach
 * keeps the full local workspace and can assign practice or exchange private
 * messages after the player's local profile has been backed up to Supabase.
 */

class PlayerPortal {
  static CACHE_PREFIX = 'player-portal-cache:';
  static active = false;
  static data = null;
  static loadPromise = null;
  static coachContext = null;
  static identityKey = null;
  static loadGeneration = 0;
  static currentSection = 'today';
  static sectionTargets = Object.freeze({
    today: 'player-portal-today',
    plan: 'player-portal-plan',
    progress: 'player-portal-progress',
    messages: 'player-portal-messages-card'
  });

  static isPlayerAccount() {
    return Boolean(AuthEngine.user?.id && AuthEngine.profile?.account_role === 'player');
  }

  static isIdentityPending() {
    return Boolean(AuthEngine.user?.id && !AuthEngine.profile);
  }

  static setPlayerNavigationVisible(visible) {
    const navigation = document.getElementById('player-bottom-nav');
    if (navigation) navigation.hidden = !visible;
  }

  static updatePlayerNavigation(sectionId = PlayerPortal.currentSection) {
    if (!PlayerPortal.sectionTargets[sectionId]) sectionId = 'today';
    PlayerPortal.currentSection = sectionId;
    document.querySelectorAll('#player-bottom-nav [data-player-section]').forEach((item) => {
      const active = item.dataset.playerSection === sectionId;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    const titles = { today: 'Hoy', plan: 'Mi plan', progress: 'Progreso', messages: 'Mensajes' };
    const title = document.getElementById('current-page-title');
    if (title && PlayerPortal.active) title.textContent = titles[sectionId];
  }

  static navigateToSection(sectionId) {
    if (!PlayerPortal.active || !PlayerPortal.sectionTargets[sectionId]) return false;
    const target = document.getElementById(PlayerPortal.sectionTargets[sectionId]);
    if (!target) return false;
    PlayerPortal.updatePlayerNavigation(sectionId);
    target.scrollIntoView({
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth',
      block: 'start'
    });
    return true;
  }

  static cacheId(userId = AuthEngine.user?.id) {
    return `${PlayerPortal.CACHE_PREFIX}${userId || 'unknown'}`;
  }

  static syncIdentityContext() {
    const userId = AuthEngine.user?.id || null;
    const role = AuthEngine.profile?.account_role || (userId ? 'pending' : 'anonymous');
    const identityKey = `${userId || 'anonymous'}:${role}`;
    if (identityKey !== PlayerPortal.identityKey) {
      PlayerPortal.identityKey = identityKey;
      PlayerPortal.loadGeneration += 1;
      PlayerPortal.loadPromise = null;
      PlayerPortal.data = null;
      PlayerPortal.coachContext = null;
      PlayerPortal.currentSection = 'today';
    }
    return { userId, generation: PlayerPortal.loadGeneration };
  }

  static isCurrentLoad({ userId, generation }) {
    return Boolean(
      PlayerPortal.isPlayerAccount()
      && AuthEngine.user?.id === userId
      && PlayerPortal.loadGeneration === generation
    );
  }

  static closeCoachOverlays() {
    document.getElementById('global-modal')?.classList.remove('active');
    document.getElementById('mobile-drawer-overlay')?.classList.remove('active');
  }

  static async onAuthStateChanged() {
    const identityContext = PlayerPortal.syncIdentityContext();
    if (PlayerPortal.isPlayerAccount()) {
      PlayerPortal.activate(identityContext);
      return;
    }

    // Una sesión autenticada sin rol confirmado nunca recibe por descarte el
    // workspace del entrenador. RLS protege la nube y este estado neutral evita
    // exponer también las fichas locales del dispositivo.
    if (PlayerPortal.isIdentityPending()) {
      PlayerPortal.activateIdentityPending();
      return;
    }

    PlayerPortal.deactivate();
    if (AuthEngine.isCoach?.() && window.App?.currentView === 'players') {
      await window.PlayerEngine?.renderPlayersView?.();
    }
  }

  static activate(identityContext = PlayerPortal.syncIdentityContext()) {
    PlayerPortal.active = true;
    PlayerPortal.currentSection = 'today';
    PlayerPortal.setPlayerNavigationVisible(false);
    PlayerPortal.closeCoachOverlays();
    document.body.classList.add('player-portal-active');
    document.querySelectorAll('.view-panel').forEach((panel) => panel.classList.remove('active'));
    document.getElementById('player-portal-panel')?.classList.add('active');
    const title = document.getElementById('current-page-title');
    if (title) title.textContent = 'Hoy';
    PlayerPortal.renderLoading();
    PlayerPortal.load({ identityContext }).catch((error) => {
      console.warn('No se pudo preparar el portal del golfista:', error);
    });
  }

  static activateIdentityPending() {
    PlayerPortal.active = true;
    PlayerPortal.data = null;
    PlayerPortal.loadPromise = null;
    PlayerPortal.setPlayerNavigationVisible(false);
    PlayerPortal.closeCoachOverlays();
    document.body.classList.add('player-portal-active');
    document.querySelectorAll('.view-panel').forEach((panel) => panel.classList.remove('active'));
    document.getElementById('player-portal-panel')?.classList.add('active');
    const title = document.getElementById('current-page-title');
    if (title) title.textContent = 'Verificando cuenta';
    PlayerPortal.renderIdentityPending();
  }

  static renderIdentityPending() {
    const container = document.getElementById('player-portal-container');
    if (!container) return;
    container.innerHTML = `
      <div class="card portal-account-pending">
        <div class="card-icon">🔐</div>
        <span class="badge badge-gold">Verificación segura</span>
        <h2 style="margin-top:0.75rem;">Estamos confirmando tu tipo de cuenta</h2>
        <p style="margin-top:0.55rem;">Mientras no podamos confirmar si esta cuenta pertenece a un entrenador o a un golfista, las fichas privadas de este dispositivo permanecerán ocultas.</p>
        <div style="display:flex; gap:0.65rem; justify-content:center; flex-wrap:wrap; margin-top:1.25rem;">
          <button class="btn btn-primary" id="auth-retry-identity-btn" onclick="AuthEngine.retryIdentity()">Reintentar verificación</button>
          <button class="btn btn-secondary" onclick="AuthEngine.openAccessModal()">Opciones de cuenta</button>
        </div>
      </div>
    `;
  }

  static deactivate() {
    const wasActive = PlayerPortal.active;
    PlayerPortal.active = false;
    PlayerPortal.data = null;
    PlayerPortal.loadPromise = null;
    PlayerPortal.coachContext = null;
    PlayerPortal.currentSection = 'today';
    PlayerPortal.setPlayerNavigationVisible(false);
    document.body.classList.remove('player-portal-active');

    if (!wasActive || !window.App) return;
    document.getElementById('player-portal-panel')?.classList.remove('active');
    App.navigateTo('dashboard');
  }

  static renderLoading() {
    const container = document.getElementById('player-portal-container');
    if (!container) return;
    PlayerPortal.setPlayerNavigationVisible(false);
    container.innerHTML = GolfUI.loading('portal', 'Cargando tu hándicap, entrenamientos y próximos torneos…');
  }

  static async load({ force = false, identityContext = null } = {}) {
    if (!PlayerPortal.isPlayerAccount()) return;
    if (PlayerPortal.loadPromise && !force) return PlayerPortal.loadPromise;

    if (force) {
      PlayerPortal.loadGeneration += 1;
      PlayerPortal.loadPromise = null;
    }
    const context = identityContext || {
      userId: AuthEngine.user?.id || null,
      generation: PlayerPortal.loadGeneration
    };

    const loadPromise = PlayerPortal.performLoad(context)
      .finally(() => {
        if (PlayerPortal.loadPromise === loadPromise) PlayerPortal.loadPromise = null;
      });
    PlayerPortal.loadPromise = loadPromise;
    return loadPromise;
  }

  static async performLoad(context) {
    try {
      if (navigator.onLine === false) {
        const cached = await PlayerPortal.readCache(context.userId);
        if (!PlayerPortal.isCurrentLoad(context)) return;
        if (!cached) throw new Error('offline-without-cache');
        PlayerPortal.data = { ...cached, fromCache: true };
      } else {
        const cloudData = await PlayerPortal.fetchCloudData();
        if (!PlayerPortal.isCurrentLoad(context)) return;
        await PlayerPortal.saveCache(cloudData, context.userId);
        if (!PlayerPortal.isCurrentLoad(context)) return;
        PlayerPortal.data = cloudData;
      }
      PlayerPortal.render();
    } catch (error) {
      if (!PlayerPortal.isCurrentLoad(context)) return;
      console.warn('No se pudo cargar el portal del golfista:', error);
      const cached = await PlayerPortal.readCache(context.userId);
      if (!PlayerPortal.isCurrentLoad(context)) return;
      if (cached) {
        PlayerPortal.data = { ...cached, fromCache: true };
        PlayerPortal.render();
        return;
      }
      PlayerPortal.renderError(error);
    }
  }

  static async fetchCloudData() {
    const { data: player, error: playerError } = await AuthEngine.client
      .from('players')
      .select('id, full_name, current_handicap, target_handicap, home_club, player_category, dominant_hand')
      .limit(1)
      .maybeSingle();
    if (playerError) throw playerError;

    if (!player) {
      return {
        player: null,
        handicapHistory: [],
        trainingAssignments: [],
        tournaments: [],
        rounds: [],
        goals: [],
        legacyDrillProgress: {},
        messages: [],
        fetchedAt: new Date().toISOString()
      };
    }

    const playerId = player.id;
    const results = await Promise.all([
      AuthEngine.client.from('handicap_history')
        .select('id, handicap_index, effective_date, source, is_current')
        .eq('player_id', playerId)
        .order('effective_date', { ascending: false })
        .limit(12),
      AuthEngine.client.from('training_assignments')
        .select('id, title, category, instructions, due_date, status, completed_at, created_at')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false }),
      AuthEngine.client.from('tournaments')
        .select('id, name, course_name, city, start_date, end_date, status, competition_format, final_position, total_score')
        .eq('player_id', playerId)
        .order('start_date', { ascending: false })
        .limit(20),
      AuthEngine.client.from('rounds')
        .select('id, played_on, course_name, kind, holes_played, course_par, gross_score, score_to_par, fairways_hit, fairways_total, gir_hit, gir_total, total_putts, penalties')
        .eq('player_id', playerId)
        .order('played_on', { ascending: false })
        .limit(12),
      AuthEngine.client.from('player_documents')
        .select('data_key, payload, updated_at')
        .eq('player_id', playerId)
        .in('data_key', ['goals', 'drills_progress']),
      AuthEngine.client.from('player_messages')
        .select('id, sender_user_id, sender_role, body, created_at, read_at')
        .eq('player_id', playerId)
        .order('created_at', { ascending: true })
        .limit(100)
    ]);

    const [handicapHistory, trainingAssignments, tournaments, rounds, documents, messages] =
      results.map((result) => PlayerPortal.unwrap(result));
    const goalsDocument = documents.find((document) => document.data_key === 'goals');
    const drillsDocument = documents.find((document) => document.data_key === 'drills_progress');

    const portalData = {
      player,
      handicapHistory,
      trainingAssignments,
      tournaments,
      rounds,
      goals: Array.isArray(goalsDocument?.payload) ? goalsDocument.payload : [],
      legacyDrillProgress: PlayerPortal.isPlainObject(drillsDocument?.payload) ? drillsDocument.payload : {},
      messages,
      fetchedAt: new Date().toISOString()
    };

    PlayerPortal.markReceivedMessagesRead(playerId).catch((error) => {
      console.warn('No se pudieron marcar los mensajes como leídos:', error);
    });
    return portalData;
  }

  static unwrap(result) {
    if (result?.error) throw result.error;
    return Array.isArray(result?.data) ? result.data : [];
  }

  static isPlainObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  static async saveCache(data, userId = AuthEngine.user?.id) {
    if (!userId || !window.GolfDatabase?.isAvailable || !data) return;
    try {
      await GolfDatabase.put(GOLF_DATABASE.STORES.SETTINGS, {
        id: PlayerPortal.cacheId(userId),
        value: data,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.warn('No se pudo guardar la vista offline del golfista:', error);
    }
  }

  static async readCache(userId = AuthEngine.user?.id) {
    if (!userId || !window.GolfDatabase?.isAvailable) return null;
    try {
      const cached = await GolfDatabase.get(GOLF_DATABASE.STORES.SETTINGS, PlayerPortal.cacheId(userId));
      return cached?.value || null;
    } catch (error) {
      return null;
    }
  }

  static render() {
    const container = document.getElementById('player-portal-container');
    if (!container || !PlayerPortal.active || !PlayerPortal.isPlayerAccount() || !PlayerPortal.data) return;

    const data = PlayerPortal.data;
    if (!data.player) {
      PlayerPortal.renderUnlinkedAccount();
      return;
    }

    const player = data.player;
    const completedAssignments = data.trainingAssignments.filter((item) => item.status === 'completed').length;
    const activeAssignments = data.trainingAssignments.filter((item) => ['assigned', 'in_progress'].includes(item.status));
    const upcomingTournaments = PlayerPortal.upcomingTournaments(data.tournaments);
    const currentHandicap = PlayerPortal.numberOrDash(player.current_handicap, 1);
    const targetHandicap = PlayerPortal.numberOrDash(player.target_handicap, 1);
    const lastRound = data.rounds[0] || null;
    const lastScore = lastRound?.gross_score ?? '—';
    const fromCacheBadge = data.fromCache
      ? '<span class="badge badge-blue">Modo offline · última actualización guardada</span>'
      : '<span class="badge badge-green">Datos protegidos y actualizados</span>';

    container.innerHTML = `
      <div class="card card-gold-glow player-portal-hero player-portal-section" id="player-portal-today">
        <div class="player-portal-hero-copy">
          <div style="display:flex; gap:0.45rem; flex-wrap:wrap;">${fromCacheBadge}<span class="badge badge-gold">Mi golf</span></div>
          <h2>Hola, ${PlayerPortal.escapeHTML(player.full_name)}</h2>
          <p>Tu plan, tus resultados y la comunicación con tu entrenador en un solo lugar.</p>
        </div>
        <button class="btn btn-secondary player-portal-refresh" id="player-portal-refresh-btn" ${navigator.onLine === false ? 'disabled' : ''}>↻ Actualizar</button>
      </div>

      <div class="grid-4 layout-section">
        <div class="card stat-card">
          <div class="stat-label">Handicap actual</div>
          <div class="stat-value" style="color:var(--gold-400);">${currentHandicap}</div>
          <div class="stat-sub gold">Meta: ${targetHandicap}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Entrenamientos activos</div>
          <div class="stat-value">${activeAssignments.length}</div>
          <div class="stat-sub positive">${completedAssignments} completados</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Próximo torneo</div>
          <div class="stat-value" style="font-size:1.15rem;">${upcomingTournaments[0] ? PlayerPortal.escapeHTML(upcomingTournaments[0].name) : 'Sin fecha'}</div>
          <div class="stat-sub">${upcomingTournaments[0] ? PlayerPortal.formatDate(upcomingTournaments[0].start_date) : 'Tu entrenador podrá cargarlo'}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Última ronda</div>
          <div class="stat-value">${PlayerPortal.escapeHTML(lastScore)}</div>
          <div class="stat-sub">${lastRound ? `${PlayerPortal.escapeHTML(lastRound.course_name)} · ${PlayerPortal.formatScore(lastRound.score_to_par)}` : 'Todavía sin resultados'}</div>
        </div>
      </div>

      <div class="player-portal-grid">
        <div class="card player-portal-section" id="player-portal-plan">
          <div class="card-header">
            <div class="card-title-group"><div class="card-icon">🎯</div><h3 class="card-title">Mis entrenamientos</h3></div>
            <span class="badge badge-gold">${activeAssignments.length} activos</span>
          </div>
          <div class="portal-stack">${PlayerPortal.renderTrainingAssignments(data)}</div>
        </div>

        <div class="card player-portal-section" id="player-portal-progress">
          <div class="card-header">
            <div class="card-title-group"><div class="card-icon">📈</div><h3 class="card-title">Evolución de handicap</h3></div>
          </div>
          ${PlayerPortal.renderHandicapTrend(data.handicapHistory, player.current_handicap)}
        </div>
      </div>

      <div class="player-portal-grid">
        <div class="card">
          <div class="card-header">
            <div class="card-title-group"><div class="card-icon">🏆</div><h3 class="card-title">Próximos torneos</h3></div>
            <span class="badge badge-green">${upcomingTournaments.length}</span>
          </div>
          <div class="portal-stack">${PlayerPortal.renderTournaments(upcomingTournaments)}</div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title-group"><div class="card-icon">🎯</div><h3 class="card-title">Mis metas</h3></div>
          </div>
          <div class="portal-stack">${PlayerPortal.renderGoals(data.goals)}</div>
        </div>
      </div>

      <div class="card layout-section">
        <div class="card-header">
          <div class="card-title-group"><div class="card-icon">📊</div><h3 class="card-title">Resultados y rondas</h3></div>
          <span class="badge badge-blue">${data.rounds.length} registradas</span>
        </div>
        <div class="portal-stack">${PlayerPortal.renderRounds(data.rounds)}</div>
      </div>

      <div class="card player-portal-section" id="player-portal-messages-card">
        <div class="card-header">
          <div class="card-title-group"><div class="card-icon">💬</div><h3 class="card-title">Mensajes con mi entrenador</h3></div>
          <span class="badge badge-green">Privado</span>
        </div>
        ${PlayerPortal.renderMessages(data.messages, 'player')}
        <div class="portal-message-composer">
          <textarea class="form-control" id="player-message-input" maxlength="2000" placeholder="Escribí una respuesta a tu entrenador…"></textarea>
          <button class="btn btn-primary" id="player-message-send-btn">Enviar</button>
        </div>
      </div>
    `;

    PlayerPortal.bindPortalActions(container);
    PlayerPortal.setPlayerNavigationVisible(true);
    PlayerPortal.updatePlayerNavigation();
  }

  static renderUnlinkedAccount() {
    const container = document.getElementById('player-portal-container');
    if (!container) return;
    PlayerPortal.setPlayerNavigationVisible(false);
    const email = PlayerPortal.escapeHTML(AuthEngine.user?.email || 'tu correo');
    container.innerHTML = `
      <div class="card portal-account-pending">
        <div class="card-icon">🔗</div>
        <span class="badge badge-gold">Cuenta de golfista</span>
        <h2 style="margin-top:0.75rem;">Falta vincular tu ficha</h2>
        <p style="margin-top:0.6rem; line-height:1.55;">Pedile a tu entrenador que cargue <strong style="color:var(--text-main);">${email}</strong> en tu ficha y active el respaldo cloud. La asociación se hace automáticamente.</p>
        <button class="btn btn-secondary" id="player-portal-refresh-btn" style="margin-top:1.15rem;">↻ Volver a comprobar</button>
      </div>
    `;
    document.getElementById('player-portal-refresh-btn')?.addEventListener('click', () => PlayerPortal.refresh());
  }

  static renderError(error) {
    const container = document.getElementById('player-portal-container');
    if (!container) return;
    PlayerPortal.setPlayerNavigationVisible(false);
    const offline = navigator.onLine === false || String(error?.message || '').includes('offline');
    container.innerHTML = `
      <div class="card portal-account-pending">
        <div class="card-icon">${offline ? '📴' : '⚠️'}</div>
        <h2>${offline ? 'Conectate para abrir tu portal por primera vez' : 'No pudimos cargar tu información'}</h2>
        <p style="margin-top:0.6rem;">${offline ? 'Después de la primera carga, tus datos más recientes también estarán disponibles sin conexión.' : 'Revisá la conexión e intentá nuevamente.'}</p>
        <button class="btn btn-secondary" id="player-portal-refresh-btn" style="margin-top:1.15rem;">↻ Reintentar</button>
      </div>
    `;
    document.getElementById('player-portal-refresh-btn')?.addEventListener('click', () => PlayerPortal.refresh());
  }

  static renderTrainingAssignments(data) {
    const assignments = data.trainingAssignments.filter((item) => item.status !== 'cancelled');
    if (assignments.length) {
      return assignments.map((assignment) => {
        const status = PlayerPortal.assignmentStatus(assignment.status);
        let action = '';
        if (assignment.status === 'assigned') {
          action = `<button class="btn btn-secondary btn-sm" data-assignment-id="${PlayerPortal.escapeHTML(assignment.id)}" data-assignment-status="in_progress">▶ Empezar</button>`;
        } else if (assignment.status === 'in_progress') {
          action = `<button class="btn btn-green btn-sm" data-assignment-id="${PlayerPortal.escapeHTML(assignment.id)}" data-assignment-status="completed">✓ Marcar realizado</button>`;
        }
        return `
          <div class="portal-training-item">
            <div class="portal-item-header">
              <div><span class="badge badge-blue">${PlayerPortal.categoryLabel(assignment.category)}</span><h4 style="margin-top:0.45rem;">${PlayerPortal.escapeHTML(assignment.title)}</h4></div>
              <span class="badge ${status.className}">${status.label}</span>
            </div>
            ${assignment.instructions ? `<p style="font-size:0.84rem; margin-top:0.55rem; line-height:1.5; white-space:pre-wrap;">${PlayerPortal.escapeHTML(assignment.instructions)}</p>` : ''}
            <div class="portal-item-meta"><span>📅 ${assignment.due_date ? `Para ${PlayerPortal.formatDate(assignment.due_date)}` : 'Sin fecha límite'}</span></div>
            ${action ? `<div style="margin-top:0.75rem;">${action}</div>` : ''}
          </div>
        `;
      }).join('');
    }

    const recordedDrills = Object.entries(data.legacyDrillProgress || {})
      .filter(([, progress]) => progress?.completed || progress?.reps)
      .map(([drillId, progress]) => ({
        drill: window.DRILLS_CATALOG?.find?.((item) => item.id === drillId) ||
          (typeof DRILLS_CATALOG !== 'undefined' ? DRILLS_CATALOG.find((item) => item.id === drillId) : null),
        progress
      }))
      .filter((entry) => entry.drill);

    if (recordedDrills.length) {
      return recordedDrills.map(({ drill, progress }) => `
        <div class="portal-training-item">
          <div class="portal-item-header"><h4>${PlayerPortal.escapeHTML(drill.title)}</h4><span class="badge ${progress.completed ? 'badge-green' : 'badge-gold'}">${progress.completed ? 'Realizado' : 'En progreso'}</span></div>
          <div class="portal-item-meta"><span>${PlayerPortal.escapeHTML(drill.categoryName)}</span><span>⏱️ ${drill.duration} min</span></div>
        </div>
      `).join('');
    }

    return '<div class="portal-empty-state">Tu entrenador todavía no asignó un entrenamiento. Cuando lo haga, aparecerá acá con sus indicaciones.</div>';
  }

  static renderHandicapTrend(history, currentHandicap) {
    const points = history.slice(0, 8).reverse();
    if (!points.length && currentHandicap !== null && currentHandicap !== undefined) {
      points.push({ handicap_index: currentHandicap, effective_date: GolfUtils.localDateISO() });
    }
    if (!points.length) return '<div class="portal-empty-state">Todavía no hay registros de handicap.</div>';

    const values = points.map((point) => Number(point.handicap_index)).filter(Number.isFinite);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);
    return `
      <div class="portal-handicap-trend">
        ${points.map((point) => {
          const value = Number(point.handicap_index);
          const height = Number.isFinite(value) ? 34 + ((max - value) / span) * 58 : 12;
          return `<div class="portal-handicap-point"><strong style="color:var(--text-main);">${PlayerPortal.numberOrDash(value, 1)}</strong><div class="portal-handicap-bar" style="height:${Math.round(height)}px;"></div><span>${PlayerPortal.shortDate(point.effective_date)}</span></div>`;
        }).join('')}
      </div>
      <p style="font-size:0.75rem; margin-top:0.55rem;">En el gráfico, una barra más alta indica un handicap más bajo.</p>
    `;
  }

  static upcomingTournaments(tournaments) {
    const today = GolfUtils.localDateISO();
    return tournaments
      .filter((item) => ['scheduled', 'in_progress'].includes(item.status) && (item.end_date || item.start_date) >= today)
      .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
  }

  static renderTournaments(tournaments) {
    if (!tournaments.length) return '<div class="portal-empty-state">No hay torneos próximos cargados.</div>';
    return tournaments.map((tournament) => `
      <div class="portal-tournament-item">
        <div class="portal-item-header"><h4>${PlayerPortal.escapeHTML(tournament.name)}</h4><span class="badge ${tournament.status === 'in_progress' ? 'badge-green' : 'badge-gold'}">${tournament.status === 'in_progress' ? 'En juego' : 'Programado'}</span></div>
        <div class="portal-item-meta"><span>📅 ${PlayerPortal.formatDate(tournament.start_date)}</span><span>⛳ ${PlayerPortal.escapeHTML(tournament.course_name || 'Campo a confirmar')}</span>${tournament.city ? `<span>📍 ${PlayerPortal.escapeHTML(tournament.city)}</span>` : ''}</div>
      </div>
    `).join('');
  }

  static renderGoals(goals) {
    if (!goals.length) return '<div class="portal-empty-state">Las metas compartidas por tu entrenador aparecerán acá.</div>';
    return goals.slice(0, 8).map((goal) => {
      const progress = Math.max(0, Math.min(100, Number.parseInt(goal?.progress, 10) || 0));
      return `
        <div class="portal-goal-item">
          <div class="portal-item-header"><h4>${PlayerPortal.escapeHTML(goal?.title || 'Meta de entrenamiento')}</h4><span class="badge badge-green">${progress}%</span></div>
          <div class="progress-bar-container" style="margin-top:0.65rem;"><div class="progress-bar-fill" style="width:${progress}%;"></div></div>
          <div class="portal-item-meta"><span>${PlayerPortal.escapeHTML(goal?.category || 'General')}</span>${goal?.targetDate ? `<span>📅 ${PlayerPortal.formatDate(goal.targetDate)}</span>` : ''}</div>
        </div>
      `;
    }).join('');
  }

  static renderRounds(rounds) {
    if (!rounds.length) return '<div class="portal-empty-state">Todavía no hay rondas registradas.</div>';
    return rounds.slice(0, 8).map((round) => {
      const fir = PlayerPortal.percentage(round.fairways_hit, round.fairways_total);
      const gir = PlayerPortal.percentage(round.gir_hit, round.gir_total);
      return `
        <div class="portal-round-item">
          <div class="portal-item-header">
            <div><h4>${PlayerPortal.escapeHTML(round.course_name || 'Campo de golf')}</h4><div class="portal-item-meta"><span>📅 ${PlayerPortal.formatDate(round.played_on)}</span><span>${round.holes_played || '—'} hoyos</span><span>FIR ${fir}</span><span>GIR ${gir}</span><span>${round.total_putts ?? '—'} putts</span></div></div>
            <div style="text-align:right;"><div style="font-size:1.45rem; font-weight:800; color:var(--gold-400);">${round.gross_score ?? '—'}</div><span class="badge badge-blue">${PlayerPortal.formatScore(round.score_to_par)}</span></div>
          </div>
        </div>
      `;
    }).join('');
  }

  static renderMessages(messages, viewerRole) {
    if (!messages.length) return '<div class="portal-messages"><div class="portal-empty-state">Todavía no hay mensajes. Podés iniciar la conversación desde abajo.</div></div>';
    const userId = AuthEngine.user?.id;
    return `
      <div class="portal-messages" id="portal-messages-list">
        ${messages.map((message) => {
          const own = message.sender_user_id === userId;
          const sender = message.sender_role === 'coach' ? 'Entrenador' : 'Golfista';
          return `
            <div class="portal-message ${own ? 'own' : 'received'}">
              <div class="portal-message-meta"><strong>${own ? 'Vos' : sender}</strong><span>${PlayerPortal.formatDateTime(message.created_at)}</span></div>
              <div class="portal-message-body">${PlayerPortal.escapeHTML(message.body)}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  static bindPortalActions(container) {
    container.querySelector('#player-portal-refresh-btn')?.addEventListener('click', () => PlayerPortal.refresh());
    container.querySelectorAll('[data-assignment-status]').forEach((button) => {
      button.addEventListener('click', () => PlayerPortal.updateAssignmentStatus(
        button.dataset.assignmentId,
        button.dataset.assignmentStatus,
        button
      ));
    });
    container.querySelector('#player-message-send-btn')?.addEventListener('click', () => PlayerPortal.sendPlayerMessage());
    container.querySelector('#player-message-input')?.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') PlayerPortal.sendPlayerMessage();
    });
    window.setTimeout(() => {
      const list = document.getElementById('portal-messages-list');
      if (list) list.scrollTop = list.scrollHeight;
    }, 0);
  }

  static async refresh() {
    if (!PlayerPortal.isPlayerAccount()) {
      if (PlayerPortal.isIdentityPending()) PlayerPortal.renderIdentityPending();
      return;
    }
    if (navigator.onLine === false) {
      App.showToast('Necesitás conexión para actualizar. Seguís viendo la última versión guardada.');
      return;
    }
    PlayerPortal.renderLoading();
    await PlayerPortal.load({ force: true });
  }

  static async updateAssignmentStatus(assignmentId, status, button) {
    if (!PlayerPortal.validUuid(assignmentId) || !['in_progress', 'completed'].includes(status)) return;
    GolfForm.setBusy(button, true, status === 'completed' ? 'Guardando…' : 'Iniciando…');
    try {
      const { error } = await AuthEngine.client
        .from('training_assignments')
        .update({ status })
        .eq('id', assignmentId);
      if (error) throw error;
      App.showSaveConfirmation(
        status === 'completed' ? 'Entrenamiento completado' : 'Entrenamiento iniciado',
        'Tu entrenador podrá ver este cambio en el seguimiento.'
      );
      await PlayerPortal.load({ force: true });
    } catch (error) {
      App.showToast(PlayerPortal.readableError(error));
      GolfForm.setBusy(button, false);
    }
  }

  static async sendPlayerMessage() {
    const input = document.getElementById('player-message-input');
    const button = document.getElementById('player-message-send-btn');
    const body = String(input?.value || '').trim();
    if (!body) {
      input?.focus();
      return;
    }
    if (body.length > 2000) {
      App.showToast('El mensaje es demasiado largo.');
      return;
    }
    GolfForm.setBusy(button, true, 'Enviando…');
    try {
      await PlayerPortal.insertMessage(PlayerPortal.data?.player?.id, 'player', body);
      if (input) input.value = '';
      await PlayerPortal.load({ force: true });
      App.showSaveConfirmation('Mensaje enviado', 'Tu entrenador ya puede verlo en la conversación.');
    } catch (error) {
      App.showToast(PlayerPortal.readableError(error));
      GolfForm.setBusy(button, false);
    }
  }

  static async insertMessage(playerId, senderRole, body) {
    if (!PlayerPortal.validUuid(playerId) || !['coach', 'player'].includes(senderRole)) {
      throw new Error('No hay una ficha cloud válida para enviar el mensaje.');
    }
    const { error } = await AuthEngine.client.from('player_messages').insert({
      player_id: playerId,
      sender_user_id: AuthEngine.user.id,
      sender_role: senderRole,
      body
    });
    if (error) throw error;
  }

  static async markReceivedMessagesRead(playerId) {
    if (!PlayerPortal.validUuid(playerId) || !AuthEngine.user?.id) return;
    const { error } = await AuthEngine.client
      .from('player_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('player_id', playerId)
      .neq('sender_user_id', AuthEngine.user.id)
      .is('read_at', null);
    if (error) throw error;
  }

  static renderCoachActions(player) {
    if (!AuthEngine.isCoach?.() || !player?.id) return '';
    const playerId = PlayerPortal.escapeHTML(player.id);
    return `
      <button class="btn btn-secondary btn-sm" data-player-training-id="${playerId}">🎯 Asignar entrenamiento</button>
      <button class="btn btn-secondary btn-sm" data-player-message-id="${playerId}">💬 Mensajes</button>
    `;
  }

  static async renderCoachMessagesHub() {
    const container = document.getElementById('messages-container');
    if (!container) return;
    if (!window.AuthEngine?.isCoach?.()) {
      container.innerHTML = '<div class="card portal-account-pending"><div class="card-icon">🔐</div><h2>Acceso del entrenador requerido</h2><p>Ingresá con la cuenta del entrenador para abrir las conversaciones privadas.</p></div>';
      return;
    }

    container.innerHTML = GolfUI.loading('messages', 'Cargando conversaciones con golfistas…');
    try {
      const players = await StorageManager.getPlayers();
      if (!players.length) {
        container.innerHTML = `
          <div class="card card-gold-glow empty-state-panel">
            <div class="card-icon">💬</div>
            <h2>Todavía no hay golfistas</h2>
            <p style="margin-top:0.45rem; color:var(--text-muted);">Agregá la primera ficha para poder asignar planes y abrir conversaciones privadas.</p>
            <button class="btn btn-primary" style="margin-top:1rem;" onclick="App.navigateTo('players')">Agregar golfista</button>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="card card-gold-glow coach-messages-hero">
          <div>
            <span class="badge badge-green">Comunicación privada</span>
            <h2 style="margin-top:0.55rem;">Mensajes con tus golfistas</h2>
            <p style="margin-top:0.35rem; color:var(--text-muted); line-height:1.55;">Elegí una ficha para abrir la conversación. Los mensajes se habilitan cuando el golfista está respaldado y vinculado por correo.</p>
          </div>
          <button class="btn btn-secondary" onclick="App.navigateTo('players')">Gestionar golfistas</button>
        </div>
        <div class="coach-messages-grid">
          ${players.map((player) => PlayerPortal.renderCoachMessageHubCard(player)).join('')}
        </div>
      `;

      container.querySelectorAll('[data-coach-hub-message-id]').forEach((button) => {
        button.addEventListener('click', () => PlayerPortal.openCoachMessagesModal(button.dataset.coachHubMessageId));
      });
    } catch (error) {
      console.error('No se pudo preparar el centro de mensajes:', error);
      container.innerHTML = '<div class="card empty-state-panel"><div class="card-icon">⚠️</div><h2>No pudimos cargar las conversaciones</h2><p style="margin-top:0.45rem; color:var(--text-muted);">Tus fichas no se modificaron. Intentá nuevamente.</p></div>';
    }
  }

  static renderCoachMessageHubCard(player) {
    const playerId = PlayerPortal.escapeHTML(player?.id || '');
    const playerName = PlayerPortal.escapeHTML(player?.name || 'Golfista');
    const isDemo = StorageManager.isDemoPlayer(player);
    const linked = PlayerPortal.validUuid(player?.remoteId);
    const status = isDemo
      ? { badge: 'badge-gold', label: 'Modo demo · sin nube', description: 'Las demostraciones no admiten mensajes.' }
      : linked
        ? { badge: 'badge-green', label: 'Cuenta vinculada', description: 'Conversación privada disponible.' }
        : { badge: 'badge-blue', label: 'Falta respaldo', description: 'La app te guiará para habilitar los mensajes.' };
    return `
      <article class="card coach-message-player-card">
        <div class="coach-message-player-main">
          <div class="player-avatar">${PlayerPortal.escapeHTML(String(player?.name || 'G').charAt(0).toUpperCase())}</div>
          <div style="min-width:0;">
            <h3>${playerName}</h3>
            <span class="badge ${status.badge}" style="margin-top:0.4rem;">${status.label}</span>
            <p>${status.description}</p>
          </div>
        </div>
        <button class="btn ${linked ? 'btn-primary' : 'btn-secondary'}" type="button" ${isDemo ? 'disabled' : `data-coach-hub-message-id="${playerId}"`}>
          ${isDemo ? 'No disponible' : linked ? 'Abrir conversación' : 'Configurar mensajes'}
        </button>
      </article>
    `;
  }

  static async localPlayer(localPlayerId) {
    const players = await StorageManager.getPlayers();
    return players.find((player) => String(player.id) === String(localPlayerId)) || null;
  }

  static async requireRemotePlayer(localPlayerId, purpose) {
    if (!AuthEngine.isCoach?.()) throw new Error('Iniciá sesión como entrenador.');
    const player = await PlayerPortal.localPlayer(localPlayerId);
    if (!player) throw new Error('No se encontró la ficha local.');
    if (PlayerPortal.validUuid(player.remoteId)) return player;

    AuthEngine.renderModal(`
      <div class="modal-handle-bar"></div>
      <div class="modal-header"><div><span class="badge badge-gold">Falta respaldo cloud</span><h3 style="margin-top:0.3rem;">${PlayerPortal.escapeHTML(purpose)}</h3></div><button class="modal-close" onclick="App.closeModal()">&times;</button></div>
      <p style="line-height:1.55;">Primero respaldá la ficha de <strong style="color:var(--text-main);">${PlayerPortal.escapeHTML(player.name)}</strong>. Esto crea su registro seguro y permite vincularlo por correo.</p>
      <button class="btn btn-primary" id="portal-open-cloud-sync-btn" style="width:100%; margin-top:1rem;">☁️ Abrir respaldo cloud</button>
    `);
    document.getElementById('portal-open-cloud-sync-btn')?.addEventListener('click', () => {
      App.closeModal();
      CloudSync.openSyncModal();
    });
    return null;
  }

  static async openCoachTrainingModal(localPlayerId) {
    try {
      const player = await PlayerPortal.requireRemotePlayer(localPlayerId, 'Asignar entrenamiento');
      if (!player) return;
      PlayerPortal.coachContext = { localPlayerId, remotePlayerId: player.remoteId, playerName: player.name };
      const drills = typeof DRILLS_CATALOG !== 'undefined' ? DRILLS_CATALOG : [];
      const options = drills.map((drill) => `<option value="${PlayerPortal.escapeHTML(drill.id)}">${PlayerPortal.escapeHTML(drill.categoryName)} · ${PlayerPortal.escapeHTML(drill.title)}</option>`).join('');
      const tomorrow = GolfUtils.localDateISO(new Date(Date.now() + 7 * 86400000));

      AuthEngine.renderModal(`
        <div class="modal-handle-bar"></div>
        <div class="modal-header">
          <div class="modal-heading">
            <span class="modal-eyebrow">Plan de entrenamiento</span>
            <h3 class="modal-title">Asignar entrenamiento</h3>
            <p class="modal-description">Prepará una tarea clara para ${PlayerPortal.escapeHTML(player.name)} y definí cuándo debería completarla.</p>
          </div>
          <button class="modal-close" type="button" onclick="App.closeModal()" aria-label="Cerrar ventana">&times;</button>
        </div>
        <form class="app-form" id="coach-training-form" novalidate>
          <section class="form-section">
            <div class="form-section-title">Contenido del plan</div>
            <div class="form-group"><label class="form-label" for="coach-training-template">Usar plantilla</label><select class="form-control" id="coach-training-template"><option value="">Plan personalizado</option>${options}</select><span class="form-hint">Elegir un drill completa automáticamente el título y las indicaciones.</span></div>
            <div class="form-group"><label class="form-label" for="coach-training-title">Título <span class="form-required" aria-hidden="true">*</span></label><input class="form-control" id="coach-training-title" maxlength="160" placeholder="Ej.: Control de distancia con wedges" data-required-message="Ingresá un título para el entrenamiento." required></div>
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label" for="coach-training-category">Categoría</label><select class="form-control" id="coach-training-category">${PlayerPortal.trainingCategoryOptions()}</select></div>
              <div class="form-group"><label class="form-label" for="coach-training-due-date">Fecha objetivo</label><input class="form-control" id="coach-training-due-date" type="date" value="${tomorrow}"></div>
            </div>
            <div class="form-group" style="margin-top:0.8rem;"><label class="form-label" for="coach-training-instructions">Indicaciones</label><textarea class="form-control" id="coach-training-instructions" rows="5" maxlength="4000" placeholder="Objetivo, repeticiones y puntos de control…"></textarea><span class="form-hint">Incluí cantidad de repeticiones, duración y un criterio para darlo por cumplido.</span></div>
          </section>
          <div class="form-status" id="coach-training-status" role="status" aria-live="polite"></div>
          <div class="form-actions">
            <button class="btn btn-secondary" type="button" onclick="App.closeModal()">Cancelar</button>
            <button class="btn btn-primary" type="submit" id="coach-training-save-btn">Asignar entrenamiento</button>
          </div>
        </form>
      `);

      document.getElementById('coach-training-template')?.addEventListener('change', (event) => PlayerPortal.applyDrillTemplate(event.target.value));
      document.getElementById('coach-training-form')?.addEventListener('submit', (event) => {
        event.preventDefault();
        PlayerPortal.saveCoachTraining();
      });
      window.setTimeout(() => document.getElementById('coach-training-title')?.focus(), 0);
    } catch (error) {
      App.showToast(PlayerPortal.readableError(error));
    }
  }

  static applyDrillTemplate(drillId) {
    if (!drillId || typeof DRILLS_CATALOG === 'undefined') return;
    const drill = DRILLS_CATALOG.find((item) => item.id === drillId);
    if (!drill) return;
    const title = document.getElementById('coach-training-title');
    const instructions = document.getElementById('coach-training-instructions');
    const category = document.getElementById('coach-training-category');
    if (title) title.value = drill.title;
    if (instructions) instructions.value = `${drill.instructions}\n\nMeta: ${drill.repsTarget} · Duración sugerida: ${drill.duration} minutos.`;
    if (category) category.value = PlayerPortal.drillCategory(drill.category);
  }

  static async saveCoachTraining() {
    const context = PlayerPortal.coachContext;
    const button = document.getElementById('coach-training-save-btn');
    const status = document.getElementById('coach-training-status');
    const form = document.getElementById('coach-training-form');
    if (!GolfForm.validate(form)) {
      GolfForm.setStatus(status, 'Revisá los campos marcados antes de asignar.', 'error');
      return;
    }
    const title = String(document.getElementById('coach-training-title')?.value || '').trim();
    const instructions = String(document.getElementById('coach-training-instructions')?.value || '').trim();
    const category = document.getElementById('coach-training-category')?.value || 'general';
    const dueDate = document.getElementById('coach-training-due-date')?.value || null;
    if (!context || !title) {
      GolfForm.setStatus(status, 'No se pudo identificar el golfista o el entrenamiento.', 'error');
      return;
    }

    GolfForm.setBusy(button, true, 'Asignando…');
    GolfForm.setStatus(status);
    try {
      const { error } = await AuthEngine.client.from('training_assignments').insert({
        player_id: context.remotePlayerId,
        assigned_by: AuthEngine.user.id,
        title,
        category,
        instructions: instructions || null,
        due_date: dueDate,
        status: 'assigned'
      });
      if (error) throw error;
      App.closeModal();
      App.showSaveConfirmation('Entrenamiento asignado', 'El golfista ya puede verlo en su plan.');
    } catch (error) {
      GolfForm.setStatus(status, PlayerPortal.readableError(error), 'error');
      GolfForm.setBusy(button, false);
    }
  }

  static async openCoachMessagesModal(localPlayerId) {
    try {
      const player = await PlayerPortal.requireRemotePlayer(localPlayerId, 'Mensajes con el golfista');
      if (!player) return;
      PlayerPortal.coachContext = { localPlayerId, remotePlayerId: player.remoteId, playerName: player.name };
      AuthEngine.renderModal(`
        <div class="modal-handle-bar"></div>
        <div class="modal-header"><div><span class="badge badge-green">Conversación privada</span><h3 style="margin-top:0.3rem;">${PlayerPortal.escapeHTML(player.name)}</h3></div><button class="modal-close" onclick="App.closeModal()">&times;</button></div>
        <div id="coach-message-thread">${GolfUI.loading('thread', 'Cargando mensajes…')}</div>
      `);
      await PlayerPortal.loadCoachMessages();
    } catch (error) {
      App.showToast(PlayerPortal.readableError(error));
    }
  }

  static async loadCoachMessages() {
    const context = PlayerPortal.coachContext;
    const thread = document.getElementById('coach-message-thread');
    if (!context || !thread) return;
    try {
      const { data, error } = await AuthEngine.client
        .from('player_messages')
        .select('id, sender_user_id, sender_role, body, created_at, read_at')
        .eq('player_id', context.remotePlayerId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      thread.innerHTML = `
        ${PlayerPortal.renderMessages(data || [], 'coach')}
        <div class="portal-message-composer">
          <textarea class="form-control" id="coach-message-input" maxlength="2000" placeholder="Escribí un mensaje para ${PlayerPortal.escapeHTML(context.playerName)}…"></textarea>
          <button class="btn btn-primary" id="coach-message-send-btn">Enviar</button>
        </div>
        <div id="coach-message-status" role="status" aria-live="polite" style="min-height:1.2rem; margin-top:0.55rem; color:var(--text-muted); font-size:0.82rem;"></div>
      `;
      document.getElementById('coach-message-send-btn')?.addEventListener('click', () => PlayerPortal.sendCoachMessage());
      const list = document.getElementById('portal-messages-list');
      if (list) list.scrollTop = list.scrollHeight;
      PlayerPortal.markReceivedMessagesRead(context.remotePlayerId).catch(() => {});
    } catch (error) {
      thread.innerHTML = `<div class="portal-empty-state">${PlayerPortal.escapeHTML(PlayerPortal.readableError(error))}</div>`;
    }
  }

  static async sendCoachMessage() {
    const context = PlayerPortal.coachContext;
    const input = document.getElementById('coach-message-input');
    const button = document.getElementById('coach-message-send-btn');
    const status = document.getElementById('coach-message-status');
    const body = String(input?.value || '').trim();
    if (!context || !body) {
      input?.focus();
      return;
    }
    GolfForm.setStatus(status, '', '');
    GolfForm.setBusy(button, true, 'Enviando…');
    try {
      await PlayerPortal.insertMessage(context.remotePlayerId, 'coach', body);
      if (input) input.value = '';
      await PlayerPortal.loadCoachMessages();
      App.showSaveConfirmation('Mensaje enviado', 'El golfista ya puede verlo en su portal.');
    } catch (error) {
      GolfForm.setStatus(status, PlayerPortal.readableError(error), 'error');
      GolfForm.setBusy(button, false);
    }
  }

  static trainingCategoryOptions() {
    return [
      ['swing', 'Swing'], ['putting', 'Putting'], ['short_game', 'Juego corto'],
      ['bunker', 'Bunker'], ['fitness', 'Físico'], ['mental', 'Juego mental'],
      ['strategy', 'Estrategia'], ['general', 'General']
    ].map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  }

  static drillCategory(category) {
    const map = { swing: 'swing', putting: 'putting', chipping: 'short_game', bunker: 'bunker', fitness: 'fitness' };
    return map[category] || 'general';
  }

  static categoryLabel(category) {
    const labels = {
      swing: 'Swing', putting: 'Putting', short_game: 'Juego corto', bunker: 'Bunker',
      fitness: 'Físico', mental: 'Mental', strategy: 'Estrategia', general: 'General'
    };
    return labels[category] || 'General';
  }

  static assignmentStatus(status) {
    const states = {
      assigned: { label: 'Asignado', className: 'badge-gold' },
      in_progress: { label: 'En progreso', className: 'badge-blue' },
      completed: { label: 'Completado', className: 'badge-green' },
      cancelled: { label: 'Cancelado', className: 'badge-blue' }
    };
    return states[status] || states.assigned;
  }

  static percentage(value, total) {
    const numerator = Number(value);
    const denominator = Number(total);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return '—';
    return `${Math.round((numerator / denominator) * 100)}%`;
  }

  static formatScore(value) {
    const score = Number(value);
    if (!Number.isFinite(score)) return '—';
    if (score === 0) return 'E';
    return score > 0 ? `+${score}` : `${score}`;
  }

  static numberOrDash(value, decimals = 0) {
    if (value === null || value === undefined || value === '') return '—';
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(decimals) : '—';
  }

  static formatDate(value) {
    if (!value) return 'Sin fecha';
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(date.getTime())) return PlayerPortal.escapeHTML(value);
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }

  static shortDate(value) {
    if (!value) return '—';
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' }).format(date);
  }

  static formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  static validUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
  }

  static readableError(error) {
    const message = String(error?.message || error || '').toLowerCase();
    const kind = PlayerPortal.errorKind(error);
    if (kind === 'network') return 'No se pudo conectar ni sincronizar este cambio. Revisá internet e intentá nuevamente; tus datos anteriores siguen seguros.';
    if (kind === 'permission') return 'Tu cuenta no tiene permiso para modificar esta ficha.';
    if (kind === 'duplicate') return 'Este dato ya existe. Actualizá la vista antes de volver a guardarlo.';
    if (message.includes('relation') && (message.includes('training_assignments') || message.includes('player_messages'))) return 'La actualización del portal todavía no fue aplicada en la base de datos.';
    if (message.includes('ficha cloud')) return error.message;
    return 'No se pudo completar la acción. Tus demás datos no se modificaron.';
  }

  static errorKind(error) {
    const code = String(error?.code || '').toUpperCase();
    const status = Number(error?.status || error?.statusCode || 0);
    const message = String(error?.message || error || '').toLowerCase();
    if (
      navigator.onLine === false ||
      AuthEngine.isNetworkError?.(error) ||
      /^PGRST00[0-3]$/.test(code) ||
      code.startsWith('08') ||
      [408, 503, 504, 520].includes(status)
    ) return 'network';
    if (code === '42501' || [401, 403].includes(status) || message.includes('row-level security') || message.includes('permission denied')) return 'permission';
    if (code === '23505' || status === 409 || message.includes('duplicate key') || message.includes('unique constraint')) return 'duplicate';
    return 'unknown';
  }

  static escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

window.addEventListener('online', () => {
  if (PlayerPortal.active && PlayerPortal.isPlayerAccount()) PlayerPortal.refresh().catch(() => {});
});

window.PlayerPortal = PlayerPortal;
