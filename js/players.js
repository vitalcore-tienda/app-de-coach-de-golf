/**
 * GolfCoach Pro - Gestión de golfistas, hándicap y torneos
 */

class PlayerEngine {
  static selectionGeneration = 0;

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

  static displayNumber(value, fallback = '—') {
    if (value === null || value === undefined || value === '') return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  static formatDate(value) {
    if (!value) return 'Sin fecha';
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return PlayerEngine.escapeHTML(value);
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }

  static async renderPlayersView() {
    const container = document.getElementById('players-container');
    if (!container) return;
    container.innerHTML = GolfUI.loading('cards', 'Cargando fichas de golfistas…');

    try {
      if (!StorageManager.isWorkspaceUnlocked()) {
        container.innerHTML = '<div class="card"><h3>Espacio protegido</h3><p style="color:var(--text-muted);">Ingresá como entrenador para abrir las fichas locales.</p><button class="btn btn-primary" onclick="AuthEngine.openAccessModal()">Ingresar por correo</button></div>';
        return;
      }

      const players = await StorageManager.getPlayers();
      if (!players.length) {
        container.innerHTML = App.renderEmptyWorkspaceOnboarding();
        return;
      }

      let activePlayer = StorageManager.getProfile();
      if (!activePlayer) {
        await StorageManager.setActivePlayer(players[0].id);
        activePlayer = StorageManager.getProfile();
      }
      const [handicapHistory, tournaments, rounds] = await Promise.all([
        StorageManager.getHandicapHistory(),
        StorageManager.getTournaments(),
        Promise.resolve(StorageManager.getRounds())
      ]);

      // Si el usuario cambió de jugador mientras cargaba, se vuelve a pintar
      // con el golfista que quedó activo para no mezclar historiales.
      if (!activePlayer || activePlayer.id !== StorageManager.getActivePlayerId()) {
        return PlayerEngine.renderPlayersView();
      }

      const playerName = PlayerEngine.escapeHTML(activePlayer.name);
      const latestHandicap = handicapHistory[0];
      const completedTournaments = tournaments.filter((tournament) => tournament.status === 'Finalizado').length;
      const roundCount = rounds.length;
      const coachCollaborationActions = window.PlayerPortal?.renderCoachActions?.(activePlayer) || '';

      container.innerHTML = `
        <div class="card card-gold-glow view-hero">
          <div class="view-hero-row">
            <div class="view-heading-copy">
              <div class="view-kicker-row"><span class="badge badge-gold">Base de datos de golfistas</span></div>
              <h2>Ficha de ${playerName}</h2>
              <p>Centralizá perfil, evolución de hándicap, torneos y cada ronda del jugador seleccionado.</p>
            </div>
            <div class="view-actions">
              ${coachCollaborationActions}
              <button class="btn btn-secondary btn-sm" onclick="App.openProfileModal()">✏️ Editar ficha</button>
              <button class="btn btn-primary btn-sm" onclick="PlayerEngine.openNewPlayerModal()">➕ Nuevo golfista</button>
            </div>
          </div>
        </div>

        <div class="grid-4 layout-section">
          <div class="card stat-card">
            <div class="stat-label">Hándicap actual</div>
            <div class="stat-value" style="color:var(--gold-400);">${PlayerEngine.displayNumber(activePlayer.handicap)}</div>
            <div class="stat-sub gold">Meta: ${PlayerEngine.displayNumber(activePlayer.targetHandicap)}</div>
          </div>
          <div class="card stat-card">
            <div class="stat-label">Rondas cargadas</div>
            <div class="stat-value">${PlayerEngine.safeNumber(roundCount, 0)}</div>
            <div class="stat-sub">Datos por hoyo incluidos</div>
          </div>
          <div class="card stat-card">
            <div class="stat-label">Torneos finalizados</div>
            <div class="stat-value">${PlayerEngine.safeNumber(completedTournaments, 0)}</div>
            <div class="stat-sub">${PlayerEngine.safeNumber(tournaments.length, 0)} registrados</div>
          </div>
          <div class="card stat-card">
            <div class="stat-label">Último registro HCP</div>
            <div class="stat-value" style="font-size:1.25rem;">${latestHandicap ? PlayerEngine.safeNumber(latestHandicap.handicap, 0) : '—'}</div>
            <div class="stat-sub">${latestHandicap ? PlayerEngine.formatDate(latestHandicap.date) : 'Aún no cargado'}</div>
          </div>
        </div>

        <div class="grid-2 layout-section">
          <div class="card">
            <div class="card-header">
              <div class="card-title-group">
                <div class="card-icon">👤</div>
                <h3 class="card-title">Datos deportivos</h3>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="App.openProfileModal()">Editar</button>
            </div>
            <div style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0.85rem; font-size:0.88rem;">
              ${PlayerEngine.detailItem('Club', activePlayer.homeClub || '—')}
              ${PlayerEngine.detailItem('Licencia', activePlayer.federationLicense || '—')}
              ${PlayerEngine.detailItem('Mano dominante', activePlayer.dominantHand || '—')}
              ${PlayerEngine.detailItem('Experiencia', activePlayer.experienceYears ? `${activePlayer.experienceYears} años` : '—')}
              ${PlayerEngine.detailItem('Carry Driver', activePlayer.driverDistanceAvg ? `${activePlayer.driverDistanceAvg} m` : '—')}
              ${PlayerEngine.detailItem('Categoría', activePlayer.playerCategory || '—')}
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div class="card-title-group">
                <div class="card-icon">📈</div>
                <h3 class="card-title">Evolución de hándicap</h3>
              </div>
              <button class="btn btn-primary btn-sm" onclick="PlayerEngine.openHandicapModal()">➕ Registro</button>
            </div>
            ${PlayerEngine.renderHandicapHistory(handicapHistory)}
          </div>
        </div>

        <div class="card layout-section">
          <div class="card-header">
            <div class="card-title-group">
              <div class="card-icon">🏆</div>
              <h3 class="card-title">Torneos</h3>
            </div>
            <button class="btn btn-primary btn-sm" onclick="PlayerEngine.openTournamentModal()">➕ Torneo</button>
          </div>
          ${PlayerEngine.renderTournaments(tournaments)}
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <div class="card-icon">🏌️</div>
              <h3 class="card-title">Golfistas a cargo</h3>
            </div>
            <span class="badge badge-green">${players.length} ${players.length === 1 ? 'jugador' : 'jugadores'}</span>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:0.85rem;">
            ${players.map((player) => PlayerEngine.renderPlayerCard(player, activePlayer.id)).join('')}
          </div>
        </div>
      `;

      container.querySelectorAll('[data-player-id]').forEach((button) => {
        button.addEventListener('click', () => PlayerEngine.selectPlayer(button.dataset.playerId));
      });
      container.querySelectorAll('[data-player-training-id]').forEach((button) => {
        button.addEventListener('click', () => PlayerPortal.openCoachTrainingModal(button.dataset.playerTrainingId));
      });
      container.querySelectorAll('[data-player-message-id]').forEach((button) => {
        button.addEventListener('click', () => PlayerPortal.openCoachMessagesModal(button.dataset.playerMessageId));
      });
    } catch (error) {
      console.error('No se pudo cargar la ficha de golfistas:', error);
      container.innerHTML = '<div class="card"><h3>No se pudieron cargar los golfistas</h3><p style="color:var(--text-muted);">Intentá recargar la aplicación.</p></div>';
    }
  }

  static detailItem(label, value) {
    return `
      <div style="padding:0.65rem; border:1px solid var(--border-subtle); border-radius:var(--radius-sm); background:var(--bg-surface); min-width:0;">
        <div style="font-size:0.7rem; color:var(--text-subtle); text-transform:uppercase; letter-spacing:0.04em;">${PlayerEngine.escapeHTML(label)}</div>
        <div style="font-weight:650; margin-top:0.16rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${PlayerEngine.escapeHTML(value)}</div>
      </div>
    `;
  }

  static renderPlayerCard(player, activePlayerId) {
    const selected = player.id === activePlayerId;
    const isDemo = StorageManager.isDemoPlayer(player);
    const playerId = PlayerEngine.escapeHTML(player.id);
    const playerName = String(player.name ?? '');
    return `
      <button class="card" data-player-id="${playerId}" style="text-align:left; cursor:pointer; padding:1rem; border:${selected ? '1px solid var(--gold-400)' : '1px solid var(--border-subtle)'}; background:${selected ? 'rgba(212,175,55,0.08)' : 'var(--bg-card)'};">
        <div style="display:flex; align-items:center; gap:0.7rem;">
          <div class="player-avatar">${PlayerEngine.escapeHTML(playerName.charAt(0).toUpperCase())}</div>
          <div style="min-width:0;">
            <div style="font-weight:750; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${PlayerEngine.escapeHTML(playerName)}</div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.15rem;">HCP ${PlayerEngine.displayNumber(player.handicap)} · Meta ${PlayerEngine.displayNumber(player.targetHandicap)}</div>
            ${isDemo ? '<div class="badge badge-gold" style="margin-top:0.4rem;">🧪 Modo demo · sin nube</div>' : ''}
          </div>
        </div>
        <div style="font-size:0.75rem; color:${selected ? 'var(--gold-400)' : 'var(--text-subtle)'}; margin-top:0.7rem;">${selected ? '● Golfista seleccionado' : 'Seleccionar ficha →'}</div>
      </button>
    `;
  }

  static renderHandicapHistory(history) {
    if (!history.length) {
      return '<p style="color:var(--text-muted); font-size:0.9rem;">Todavía no hay mediciones. Registrá el hándicap para empezar a seguir su evolución.</p>';
    }
    return `
      <div style="display:flex; flex-direction:column; gap:0.45rem;">
        ${history.slice(0, 5).map((entry) => `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:0.75rem; padding:0.55rem 0; border-bottom:1px solid var(--border-subtle);">
            <div>
              <div style="font-weight:700; color:var(--gold-400);">HCP ${PlayerEngine.safeNumber(entry.handicap, 0)}</div>
              <div style="font-size:0.74rem; color:var(--text-subtle);">${PlayerEngine.escapeHTML(entry.source || 'Manual')} · ${PlayerEngine.formatDate(entry.date)}</div>
            </div>
            <div style="font-size:0.78rem; color:var(--text-muted); text-align:right; max-width:45%;">${PlayerEngine.escapeHTML(entry.notes || '')}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  static renderTournaments(tournaments) {
    if (!tournaments.length) {
      return '<p style="color:var(--text-muted); font-size:0.9rem;">No hay torneos registrados para este golfista. Agregá el próximo evento para relacionar sus rondas.</p>';
    }
    return `
      <div class="scorecard-table-wrapper">
        <table class="scorecard-table">
          <thead><tr><th>Fecha</th><th>Torneo</th><th>Campo</th><th>Formato</th><th>Estado</th><th>Pos.</th></tr></thead>
          <tbody>
            ${tournaments.map((tournament) => `
              <tr>
                <td>${PlayerEngine.formatDate(tournament.startDate)}</td>
                <td style="text-align:left; font-weight:650;">${PlayerEngine.escapeHTML(tournament.name)}</td>
                <td>${PlayerEngine.escapeHTML(tournament.course || '—')}</td>
                <td>${PlayerEngine.escapeHTML(tournament.format || 'Stroke Play')}</td>
                <td><span class="badge ${tournament.status === 'Finalizado' ? 'badge-green' : 'badge-gold'}">${PlayerEngine.escapeHTML(tournament.status)}</span></td>
                <td>${tournament.position ? PlayerEngine.safeNumber(tournament.position, 0) : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  static async selectPlayer(playerId) {
    if (playerId === StorageManager.getActivePlayerId()) return;
    const generation = ++PlayerEngine.selectionGeneration;
    try {
      await StorageManager.setActivePlayer(playerId);
      if (generation !== PlayerEngine.selectionGeneration || playerId !== StorageManager.getActivePlayerId()) return;
      App.updateProfileDisplay();
      App.renderDashboard();
      if (window.RoundsEngine) RoundsEngine.renderRoundsView();
      await PlayerEngine.renderPlayersView();
      App.showToast('⛳ Golfista seleccionado.');
    } catch (error) {
      console.error(error);
      App.showToast('No se pudo cambiar de golfista.');
    }
  }

  static openNewPlayerModal() {
    if (!StorageManager.isWorkspaceUnlocked()) {
      AuthEngine.openAccessModal();
      return;
    }
    const modalContent = document.getElementById('global-modal-content');
    if (!modalContent) return;
    modalContent.innerHTML = `
      <div class="modal-handle-bar"></div>
      <div class="modal-header">
        <div class="modal-heading">
          <span class="modal-eyebrow">Golfistas · Paso 2 de 3</span>
          <h3 class="modal-title">Agregar golfista</h3>
          <p class="modal-description">Completá lo indispensable para empezar. El contacto y los datos deportivos se pueden agregar después.</p>
        </div>
        <button class="modal-close" type="button" onclick="App.closeModal()" aria-label="Cerrar ventana">&times;</button>
      </div>
      <form class="app-form" id="new-player-form" onsubmit="event.preventDefault(); PlayerEngine.saveNewPlayer();" novalidate>
        ${PlayerEngine.playerFormFields({ handicap: '', targetHandicap: '', dominantHand: 'Diestro', experienceYears: 0, driverDistanceAvg: '' }, 'new-player', { onboarding: true })}
        <div class="form-status" id="new-player-status" role="status" aria-live="polite"></div>
        <div class="form-actions">
          <button class="btn btn-secondary" type="button" onclick="App.closeModal()">Cancelar</button>
          <button class="btn btn-primary" type="submit" id="new-player-save-btn">Crear golfista</button>
        </div>
      </form>
    `;
    App.openModal();
    window.setTimeout(() => document.getElementById('new-player-name')?.focus(), 0);
  }

  static playerFormFields(profile, prefix, { onboarding = false } = {}) {
    const field = (name) => `${prefix}-${name}`;
    const value = (name) => PlayerEngine.escapeHTML(profile[name] ?? '');
    const requiredFields = `
      <div class="form-section">
        <div class="form-section-title">Datos indispensables</div>
        <div class="form-group"><label class="form-label" for="${field('name')}">Nombre completo <span class="form-required" aria-hidden="true">*</span></label><input class="form-control" id="${field('name')}" value="${value('name')}" placeholder="Ej.: Martina López" maxlength="120" data-required-message="Ingresá el nombre del golfista." required></div>
        <div class="form-grid-2">
          <div class="form-group"><label class="form-label" for="${field('handicap')}">Hándicap actual <span class="form-required" aria-hidden="true">*</span></label><input type="number" min="-10" max="54" step="0.1" class="form-control" id="${field('handicap')}" value="${value('handicap')}" placeholder="Ej.: 18,4" data-required-message="Ingresá el hándicap actual." required></div>
          <div class="form-group"><label class="form-label" for="${field('targetHandicap')}">Hándicap meta</label><input type="number" min="-10" max="54" step="0.1" class="form-control" id="${field('targetHandicap')}" value="${value('targetHandicap')}" placeholder="Opcional"></div>
        </div>
      </div>
    `;
    const optionalFields = `
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label" for="${field('email')}">Email</label><input type="email" class="form-control" id="${field('email')}" value="${value('email')}" placeholder="nombre@email.com" maxlength="254"></div>
        <div class="form-group"><label class="form-label" for="${field('phone')}">Teléfono</label><input class="form-control" id="${field('phone')}" value="${value('phone')}" placeholder="Contacto" maxlength="40"></div>
      </div>
      <div class="form-grid-2" style="margin-top:0.8rem;">
        <div class="form-group"><label class="form-label" for="${field('federationLicense')}">Licencia federativa</label><input class="form-control" id="${field('federationLicense')}" value="${value('federationLicense')}" placeholder="Opcional" maxlength="80"></div>
        <div class="form-group"><label class="form-label" for="${field('homeClub')}">Club principal</label><input class="form-control" id="${field('homeClub')}" value="${value('homeClub')}" placeholder="Club de golf" maxlength="120"></div>
      </div>
      <div class="form-grid-3" style="margin-top:0.8rem;">
        <div class="form-group"><label class="form-label" for="${field('dominantHand')}">Mano dominante</label><select class="form-control" id="${field('dominantHand')}"><option ${profile.dominantHand === 'Diestro' ? 'selected' : ''}>Diestro</option><option ${profile.dominantHand === 'Zurdo' ? 'selected' : ''}>Zurdo</option></select></div>
        <div class="form-group"><label class="form-label" for="${field('experienceYears')}">Años de experiencia</label><input type="number" min="0" max="100" class="form-control" id="${field('experienceYears')}" value="${value('experienceYears')}"></div>
        <div class="form-group"><label class="form-label" for="${field('birthDate')}">Fecha de nacimiento</label><input type="date" class="form-control" id="${field('birthDate')}" value="${value('birthDate')}"></div>
      </div>
      <div class="form-grid-2" style="margin-top:0.8rem;">
        <div class="form-group"><label class="form-label" for="${field('driverDistanceAvg')}">Carry Driver (m)</label><input type="number" min="0" max="500" class="form-control" id="${field('driverDistanceAvg')}" value="${value('driverDistanceAvg')}"></div>
        <div class="form-group"><label class="form-label" for="${field('playerCategory')}">Categoría / nivel</label><input class="form-control" id="${field('playerCategory')}" value="${value('playerCategory')}" placeholder="Ej.: Amateur competitivo" maxlength="100"></div>
      </div>
    `;
    if (onboarding) {
      return `${requiredFields}<details class="optional-fields"><summary>Agregar datos opcionales</summary><div class="optional-fields-content">${optionalFields}</div></details>`;
    }
    return `
      ${requiredFields}
      ${optionalFields}
    `;
  }

  static readPlayerForm(prefix) {
    const read = (name) => document.getElementById(`${prefix}-${name}`)?.value?.trim() || '';
    const readNumber = (name) => {
      const value = read(name);
      return value === '' ? null : Number(value);
    };
    return {
      name: read('name'),
      email: read('email'),
      phone: read('phone'),
      handicap: readNumber('handicap'),
      targetHandicap: readNumber('targetHandicap'),
      federationLicense: read('federationLicense'),
      homeClub: read('homeClub'),
      driverDistanceAvg: readNumber('driverDistanceAvg'),
      dominantHand: read('dominantHand'),
      experienceYears: readNumber('experienceYears'),
      birthDate: read('birthDate'),
      playerCategory: read('playerCategory')
    };
  }

  static async saveNewPlayer() {
    const button = document.getElementById('new-player-save-btn');
    const status = document.getElementById('new-player-status');
    const form = document.getElementById('new-player-form');
    if (!GolfForm.validate(form)) {
      GolfForm.setStatus(status, 'Revisá los campos marcados antes de crear la ficha.', 'error');
      return;
    }
    try {
      if (button?.disabled) return;
      GolfForm.setBusy(button, true, 'Creando ficha…');
      GolfForm.setStatus(status);
      const data = PlayerEngine.readPlayerForm('new-player');
      if (!data.name) throw new Error('Ingresá el nombre del golfista.');
      if (!Number.isFinite(data.handicap) || data.handicap < -10 || data.handicap > 54) throw new Error('Ingresá un hándicap válido.');
      await StorageManager.createPlayer(data);
      App.closeModal();
      App.updateWorkspaceVisibility();
      App.updateProfileDisplay();
      App.renderDashboard();
      await PlayerEngine.renderPlayersView();
      App.showSaveConfirmation('Ficha de golfista creada', 'Ya podés empezar a cargar su seguimiento deportivo.');
    } catch (error) {
      const message = error.message || 'No se pudo crear el golfista.';
      GolfForm.setStatus(status, message, 'error');
      App.showToast(message);
      GolfForm.setBusy(button, false);
    }
  }

  static openHandicapModal() {
    const profile = StorageManager.getProfile();
    const modalContent = document.getElementById('global-modal-content');
    if (!modalContent) return;
    const today = GolfUtils.localDateISO();
    modalContent.innerHTML = `
      <div class="modal-handle-bar"></div>
      <div class="modal-header">
        <div><span class="badge badge-gold">Hándicap</span><h3 style="margin-top:0.3rem;">Registrar evolución</h3></div>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label" for="handicap-date-input">Fecha</label><input type="date" class="form-control" id="handicap-date-input" value="${today}"></div>
        <div class="form-group"><label class="form-label" for="handicap-value-input">Índice de hándicap</label><input type="number" min="-10" max="54" step="0.1" class="form-control" id="handicap-value-input" value="${PlayerEngine.escapeHTML(profile.handicap)}"></div>
      </div>
      <div class="form-group"><label class="form-label" for="handicap-source-input">Origen</label><select class="form-control" id="handicap-source-input"><option>Manual</option><option>Oficial</option><option>Estimado por coach</option></select></div>
      <div class="form-group"><label class="form-label" for="handicap-notes-input">Notas</label><input class="form-control" id="handicap-notes-input" placeholder="Ej.: actualización federativa de agosto"></div>
      <div class="form-status" id="handicap-save-status" role="status" aria-live="polite"></div>
      <button class="btn btn-primary" id="handicap-save-btn" style="width:100%; min-height:48px; margin-top:0.4rem;" onclick="PlayerEngine.saveHandicapRecord()">Guardar hándicap</button>
    `;
    App.openModal();
  }

  static async saveHandicapRecord() {
    const button = document.getElementById('handicap-save-btn');
    const status = document.getElementById('handicap-save-status');
    if (button?.disabled) return;
    try {
      GolfForm.setBusy(button, true, 'Guardando hándicap…');
      await StorageManager.addHandicapRecord({
        date: document.getElementById('handicap-date-input')?.value,
        handicap: document.getElementById('handicap-value-input')?.value,
        source: document.getElementById('handicap-source-input')?.value,
        notes: document.getElementById('handicap-notes-input')?.value
      });
      App.closeModal();
      App.updateProfileDisplay();
      App.renderDashboard();
      await PlayerEngine.renderPlayersView();
      App.showSaveConfirmation('Hándicap registrado', 'La evolución del golfista quedó actualizada.');
    } catch (error) {
      const message = error.message || 'No se pudo guardar el hándicap.';
      if (status) {
        status.textContent = message;
        status.classList.add('error');
      }
      GolfForm.setBusy(button, false);
      App.showToast(message);
    }
  }

  static openTournamentModal() {
    const today = GolfUtils.localDateISO();
    const modalContent = document.getElementById('global-modal-content');
    if (!modalContent) return;
    modalContent.innerHTML = `
      <div class="modal-handle-bar"></div>
      <div class="modal-header">
        <div class="modal-heading">
          <span class="modal-eyebrow">Calendario competitivo</span>
          <h3 class="modal-title">Agregar torneo</h3>
          <p class="modal-description">Registrá primero el evento. Después podrás vincularle las rondas del golfista.</p>
        </div>
        <button class="modal-close" type="button" onclick="App.closeModal()" aria-label="Cerrar ventana">&times;</button>
      </div>
      <form class="app-form" id="tournament-form" onsubmit="event.preventDefault(); PlayerEngine.saveTournament();" novalidate>
        <section class="form-section">
          <div class="form-section-title">Datos principales</div>
          <div class="form-group"><label class="form-label" for="tournament-name-input">Nombre del torneo <span class="form-required" aria-hidden="true">*</span></label><input class="form-control" id="tournament-name-input" placeholder="Ej.: Abierto del Club" maxlength="160" data-required-message="Ingresá el nombre del torneo." required></div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label" for="tournament-start-input">Fecha de inicio <span class="form-required" aria-hidden="true">*</span></label><input type="date" class="form-control" id="tournament-start-input" value="${today}" required></div>
            <div class="form-group"><label class="form-label" for="tournament-end-input">Fecha de fin <span class="form-required" aria-hidden="true">*</span></label><input type="date" class="form-control" id="tournament-end-input" value="${today}" required></div>
          </div>
        </section>
        <section class="form-section">
          <div class="form-section-title">Lugar y modalidad</div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label" for="tournament-course-input">Campo</label><input class="form-control" id="tournament-course-input" placeholder="Club / campo de golf" maxlength="160"></div>
            <div class="form-group"><label class="form-label" for="tournament-city-input">Ciudad</label><input class="form-control" id="tournament-city-input" placeholder="Ciudad" maxlength="120"></div>
          </div>
          <div class="form-grid-3" style="margin-top:0.8rem;">
            <div class="form-group"><label class="form-label" for="tournament-format-input">Formato</label><select class="form-control" id="tournament-format-input"><option>Stroke Play</option><option>Stableford</option><option>Match Play</option><option>Scramble</option></select></div>
            <div class="form-group"><label class="form-label" for="tournament-status-input">Estado</label><select class="form-control" id="tournament-status-input"><option>Planificado</option><option>En juego</option><option>Finalizado</option></select></div>
            <div class="form-group"><label class="form-label" for="tournament-organizer-input">Organizador</label><input class="form-control" id="tournament-organizer-input" placeholder="Opcional" maxlength="120"></div>
          </div>
        </section>
        <details class="optional-fields">
          <summary>Agregar resultado y notas</summary>
          <div class="optional-fields-content">
            <div class="form-grid-2">
              <div class="form-group"><label class="form-label" for="tournament-position-input">Posición final</label><input type="number" min="1" class="form-control" id="tournament-position-input" placeholder="Opcional"></div>
              <div class="form-group"><label class="form-label" for="tournament-score-input">Score total</label><input type="number" min="1" class="form-control" id="tournament-score-input" placeholder="Opcional"></div>
            </div>
            <div class="form-group" style="margin-top:0.8rem;"><label class="form-label" for="tournament-notes-input">Notas</label><textarea class="form-control" id="tournament-notes-input" rows="3" maxlength="1000" placeholder="Objetivo, sensaciones o resultado"></textarea></div>
          </div>
        </details>
        <div class="form-status" id="tournament-save-status" role="status" aria-live="polite"></div>
        <div class="form-actions">
          <button class="btn btn-secondary" type="button" onclick="App.closeModal()">Cancelar</button>
          <button class="btn btn-primary" type="submit" id="tournament-save-btn">Guardar torneo</button>
        </div>
      </form>
    `;
    App.openModal();
    window.setTimeout(() => document.getElementById('tournament-name-input')?.focus(), 0);
  }

  static async saveTournament() {
    const button = document.getElementById('tournament-save-btn');
    const status = document.getElementById('tournament-save-status');
    const form = document.getElementById('tournament-form');
    const startInput = document.getElementById('tournament-start-input');
    const endInput = document.getElementById('tournament-end-input');
    GolfForm.setCustomError(endInput, startInput?.value && endInput?.value && endInput.value < startInput.value
      ? 'La fecha de fin no puede ser anterior al inicio.'
      : '');
    if (!GolfForm.validate(form)) {
      GolfForm.setStatus(status, 'Revisá los campos marcados antes de guardar.', 'error');
      return;
    }
    if (button?.disabled) return;
    try {
      GolfForm.setBusy(button, true);
      GolfForm.setStatus(status);
      await StorageManager.saveTournament({
        name: document.getElementById('tournament-name-input')?.value,
        startDate: document.getElementById('tournament-start-input')?.value,
        endDate: document.getElementById('tournament-end-input')?.value,
        course: document.getElementById('tournament-course-input')?.value,
        city: document.getElementById('tournament-city-input')?.value,
        format: document.getElementById('tournament-format-input')?.value,
        status: document.getElementById('tournament-status-input')?.value,
        organizer: document.getElementById('tournament-organizer-input')?.value,
        position: document.getElementById('tournament-position-input')?.value,
        totalScore: document.getElementById('tournament-score-input')?.value,
        notes: document.getElementById('tournament-notes-input')?.value
      });
      App.closeModal();
      await PlayerEngine.renderPlayersView();
      App.showSaveConfirmation('Torneo guardado', 'El evento ya puede vincularse con sus rondas.');
    } catch (error) {
      const message = error.message || 'No se pudo guardar el torneo.';
      GolfForm.setStatus(status, message, 'error');
      GolfForm.setBusy(button, false);
      App.showToast(message);
    }
  }
}

window.PlayerEngine = PlayerEngine;
