/**
 * GolfCoach Pro - Gestión de golfistas, hándicap y torneos
 */

class PlayerEngine {
  static escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  static formatDate(value) {
    if (!value) return 'Sin fecha';
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }

  static async renderPlayersView() {
    const container = document.getElementById('players-container');
    if (!container) return;
    container.innerHTML = '<div class="card"><p style="color: var(--text-muted);">Cargando ficha de golfistas…</p></div>';

    try {
      const activePlayer = StorageManager.getProfile();
      const [players, handicapHistory, tournaments, rounds] = await Promise.all([
        StorageManager.getPlayers(),
        StorageManager.getHandicapHistory(),
        StorageManager.getTournaments(),
        Promise.resolve(StorageManager.getRounds())
      ]);

      // Si el usuario cambió de jugador mientras cargaba, se vuelve a pintar
      // con el golfista que quedó activo para no mezclar historiales.
      if (activePlayer.id !== StorageManager.getActivePlayerId()) {
        return PlayerEngine.renderPlayersView();
      }

      const playerName = PlayerEngine.escapeHTML(activePlayer.name);
      const latestHandicap = handicapHistory[0];
      const completedTournaments = tournaments.filter((tournament) => tournament.status === 'Finalizado').length;
      const roundCount = rounds.length;

      container.innerHTML = `
        <div class="card card-gold-glow" style="margin-bottom: 1.5rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap;">
            <div>
              <span class="badge badge-gold">Base de datos de golfistas</span>
              <h2 style="margin-top:0.35rem;">Ficha de ${playerName}</h2>
              <p>Centralizá perfil, evolución de hándicap, torneos y cada ronda del jugador seleccionado.</p>
            </div>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap; width:100%; justify-content:flex-end;">
              <button class="btn btn-secondary btn-sm" onclick="App.openProfileModal()">✏️ Editar ficha</button>
              <button class="btn btn-primary btn-sm" onclick="PlayerEngine.openNewPlayerModal()">➕ Nuevo golfista</button>
            </div>
          </div>
        </div>

        <div class="grid-4" style="margin-bottom:1.5rem;">
          <div class="card stat-card">
            <div class="stat-label">Hándicap actual</div>
            <div class="stat-value" style="color:var(--gold-400);">${activePlayer.handicap}</div>
            <div class="stat-sub gold">Meta: ${activePlayer.targetHandicap}</div>
          </div>
          <div class="card stat-card">
            <div class="stat-label">Rondas cargadas</div>
            <div class="stat-value">${roundCount}</div>
            <div class="stat-sub">Datos por hoyo incluidos</div>
          </div>
          <div class="card stat-card">
            <div class="stat-label">Torneos finalizados</div>
            <div class="stat-value">${completedTournaments}</div>
            <div class="stat-sub">${tournaments.length} registrados</div>
          </div>
          <div class="card stat-card">
            <div class="stat-label">Último registro HCP</div>
            <div class="stat-value" style="font-size:1.25rem;">${latestHandicap ? latestHandicap.handicap : '—'}</div>
            <div class="stat-sub">${latestHandicap ? PlayerEngine.formatDate(latestHandicap.date) : 'Aún no cargado'}</div>
          </div>
        </div>

        <div class="grid-2" style="margin-bottom:1.5rem;">
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

        <div class="card" style="margin-bottom:1.5rem;">
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
    return `
      <button class="card" style="text-align:left; cursor:pointer; padding:1rem; border:${selected ? '1px solid var(--gold-400)' : '1px solid var(--border-subtle)'}; background:${selected ? 'rgba(212,175,55,0.08)' : 'var(--bg-card)'};" onclick="PlayerEngine.selectPlayer('${PlayerEngine.escapeHTML(player.id)}')">
        <div style="display:flex; align-items:center; gap:0.7rem;">
          <div class="player-avatar">${PlayerEngine.escapeHTML(player.name.charAt(0).toUpperCase())}</div>
          <div style="min-width:0;">
            <div style="font-weight:750; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${PlayerEngine.escapeHTML(player.name)}</div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.15rem;">HCP ${PlayerEngine.escapeHTML(player.handicap)} · Meta ${PlayerEngine.escapeHTML(player.targetHandicap)}</div>
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
              <div style="font-weight:700; color:var(--gold-400);">HCP ${PlayerEngine.escapeHTML(entry.handicap)}</div>
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
                <td>${tournament.position || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  static async selectPlayer(playerId) {
    if (playerId === StorageManager.getActivePlayerId()) return;
    try {
      await StorageManager.setActivePlayer(playerId);
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
    const modalContent = document.getElementById('global-modal-content');
    if (!modalContent) return;
    modalContent.innerHTML = `
      <div class="modal-handle-bar"></div>
      <div class="modal-header">
        <div><span class="badge badge-gold">Nuevo golfista</span><h3 style="margin-top:0.3rem;">Crear ficha de jugador</h3></div>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      ${PlayerEngine.playerFormFields({ handicap: 18, targetHandicap: 12, dominantHand: 'Diestro', experienceYears: 0, driverDistanceAvg: 0 }, 'new-player')}
      <button class="btn btn-primary" style="width:100%; min-height:48px; margin-top:0.4rem;" onclick="PlayerEngine.saveNewPlayer()">💾 Crear y seleccionar golfista</button>
    `;
    App.openModal();
  }

  static playerFormFields(profile, prefix) {
    const field = (name) => `${prefix}-${name}`;
    const value = (name) => PlayerEngine.escapeHTML(profile[name] ?? '');
    return `
      <div class="form-group"><label class="form-label">Nombre completo *</label><input class="form-control" id="${field('name')}" value="${value('name')}" placeholder="Nombre del golfista"></div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-control" id="${field('email')}" value="${value('email')}" placeholder="nombre@email.com"></div>
        <div class="form-group"><label class="form-label">Teléfono</label><input class="form-control" id="${field('phone')}" value="${value('phone')}" placeholder="Contacto"></div>
      </div>
      <div class="grid-3">
        <div class="form-group"><label class="form-label">Hándicap actual</label><input type="number" min="-10" max="54" step="0.1" class="form-control" id="${field('handicap')}" value="${value('handicap')}"></div>
        <div class="form-group"><label class="form-label">Hándicap meta</label><input type="number" min="-10" max="54" step="0.1" class="form-control" id="${field('targetHandicap')}" value="${value('targetHandicap')}"></div>
        <div class="form-group"><label class="form-label">Licencia federativa</label><input class="form-control" id="${field('federationLicense')}" value="${value('federationLicense')}" placeholder="Opcional"></div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Club principal</label><input class="form-control" id="${field('homeClub')}" value="${value('homeClub')}" placeholder="Club de golf"></div>
        <div class="form-group"><label class="form-label">Carry Driver (m)</label><input type="number" min="0" class="form-control" id="${field('driverDistanceAvg')}" value="${value('driverDistanceAvg')}"></div>
      </div>
      <div class="grid-3">
        <div class="form-group"><label class="form-label">Mano dominante</label><select class="form-control" id="${field('dominantHand')}"><option ${profile.dominantHand === 'Diestro' ? 'selected' : ''}>Diestro</option><option ${profile.dominantHand === 'Zurdo' ? 'selected' : ''}>Zurdo</option></select></div>
        <div class="form-group"><label class="form-label">Años de experiencia</label><input type="number" min="0" max="100" class="form-control" id="${field('experienceYears')}" value="${value('experienceYears')}"></div>
        <div class="form-group"><label class="form-label">Fecha de nacimiento</label><input type="date" class="form-control" id="${field('birthDate')}" value="${value('birthDate')}"></div>
      </div>
      <div class="form-group"><label class="form-label">Categoría / nivel</label><input class="form-control" id="${field('playerCategory')}" value="${value('playerCategory')}" placeholder="Ej.: Amateur competitivo"></div>
    `;
  }

  static readPlayerForm(prefix) {
    const read = (name) => document.getElementById(`${prefix}-${name}`)?.value?.trim() || '';
    return {
      name: read('name'),
      email: read('email'),
      phone: read('phone'),
      handicap: Number(read('handicap')),
      targetHandicap: Number(read('targetHandicap')),
      federationLicense: read('federationLicense'),
      homeClub: read('homeClub'),
      driverDistanceAvg: Number(read('driverDistanceAvg')),
      dominantHand: read('dominantHand'),
      experienceYears: Number(read('experienceYears')),
      birthDate: read('birthDate'),
      playerCategory: read('playerCategory')
    };
  }

  static async saveNewPlayer() {
    try {
      const data = PlayerEngine.readPlayerForm('new-player');
      if (!data.name) throw new Error('Ingresá el nombre del golfista.');
      if (!Number.isFinite(data.handicap) || data.handicap < -10 || data.handicap > 54) throw new Error('Ingresá un hándicap válido.');
      await StorageManager.createPlayer(data);
      App.closeModal();
      App.updateProfileDisplay();
      App.renderDashboard();
      await PlayerEngine.renderPlayersView();
      App.showToast('✅ Golfista creado y seleccionado.');
    } catch (error) {
      App.showToast(error.message || 'No se pudo crear el golfista.');
    }
  }

  static openHandicapModal() {
    const profile = StorageManager.getProfile();
    const modalContent = document.getElementById('global-modal-content');
    if (!modalContent) return;
    const today = new Date().toISOString().split('T')[0];
    modalContent.innerHTML = `
      <div class="modal-handle-bar"></div>
      <div class="modal-header">
        <div><span class="badge badge-gold">Hándicap</span><h3 style="margin-top:0.3rem;">Registrar evolución</h3></div>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Fecha</label><input type="date" class="form-control" id="handicap-date-input" value="${today}"></div>
        <div class="form-group"><label class="form-label">Índice de hándicap</label><input type="number" min="-10" max="54" step="0.1" class="form-control" id="handicap-value-input" value="${PlayerEngine.escapeHTML(profile.handicap)}"></div>
      </div>
      <div class="form-group"><label class="form-label">Origen</label><select class="form-control" id="handicap-source-input"><option>Manual</option><option>Oficial</option><option>Estimado por coach</option></select></div>
      <div class="form-group"><label class="form-label">Notas</label><input class="form-control" id="handicap-notes-input" placeholder="Ej.: actualización federativa de agosto"></div>
      <button class="btn btn-primary" style="width:100%; min-height:48px; margin-top:0.4rem;" onclick="PlayerEngine.saveHandicapRecord()">💾 Guardar hándicap</button>
    `;
    App.openModal();
  }

  static async saveHandicapRecord() {
    try {
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
      App.showToast('📈 Hándicap registrado.');
    } catch (error) {
      App.showToast(error.message || 'No se pudo guardar el hándicap.');
    }
  }

  static openTournamentModal() {
    const today = new Date().toISOString().split('T')[0];
    const modalContent = document.getElementById('global-modal-content');
    if (!modalContent) return;
    modalContent.innerHTML = `
      <div class="modal-handle-bar"></div>
      <div class="modal-header">
        <div><span class="badge badge-gold">Torneo</span><h3 style="margin-top:0.3rem;">Registrar torneo</h3></div>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <div class="form-group"><label class="form-label">Nombre del torneo *</label><input class="form-control" id="tournament-name-input" placeholder="Ej.: Abierto del Club"></div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Fecha de inicio</label><input type="date" class="form-control" id="tournament-start-input" value="${today}"></div>
        <div class="form-group"><label class="form-label">Fecha de fin</label><input type="date" class="form-control" id="tournament-end-input" value="${today}"></div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Campo</label><input class="form-control" id="tournament-course-input" placeholder="Club / campo de golf"></div>
        <div class="form-group"><label class="form-label">Ciudad</label><input class="form-control" id="tournament-city-input" placeholder="Ciudad"></div>
      </div>
      <div class="grid-3">
        <div class="form-group"><label class="form-label">Formato</label><select class="form-control" id="tournament-format-input"><option>Stroke Play</option><option>Stableford</option><option>Match Play</option><option>Scramble</option></select></div>
        <div class="form-group"><label class="form-label">Estado</label><select class="form-control" id="tournament-status-input"><option>Planificado</option><option>En juego</option><option>Finalizado</option></select></div>
        <div class="form-group"><label class="form-label">Organizador</label><input class="form-control" id="tournament-organizer-input" placeholder="Opcional"></div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Posición final</label><input type="number" min="1" class="form-control" id="tournament-position-input" placeholder="Opcional"></div>
        <div class="form-group"><label class="form-label">Score total</label><input type="number" class="form-control" id="tournament-score-input" placeholder="Opcional"></div>
      </div>
      <div class="form-group"><label class="form-label">Notas</label><input class="form-control" id="tournament-notes-input" placeholder="Objetivo, sensaciones o resultado"></div>
      <button class="btn btn-primary" style="width:100%; min-height:48px; margin-top:0.4rem;" onclick="PlayerEngine.saveTournament()">💾 Guardar torneo</button>
    `;
    App.openModal();
  }

  static async saveTournament() {
    try {
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
      App.showToast('🏆 Torneo guardado.');
    } catch (error) {
      App.showToast(error.message || 'No se pudo guardar el torneo.');
    }
  }
}

window.PlayerEngine = PlayerEngine;
