/**
 * GolfCoach Pro - Mobile & Desktop Scorecard Engine
 * Hole-by-hole scoring, touch steppers (+ / -), FIR%, GIR%, Putts analysis
 */

class RoundsEngine {
  static currentHoleCount = 18;
  static activeMobileHole = 0;
  static scorecardMode = 'mobile'; // 'mobile' (stepper) or 'table'
  static holeData = [];
  static roundPlayerContext = null;
  static discardArmedUntil = 0;
  static discardResetTimer = null;

  static initHoleData(count = 18) {
    RoundsEngine.currentHoleCount = count;
    RoundsEngine.holeData = [];
    RoundsEngine.activeMobileHole = 0;
    RoundsEngine.discardArmedUntil = 0;
    if (RoundsEngine.discardResetTimer) window.clearTimeout(RoundsEngine.discardResetTimer);
    RoundsEngine.discardResetTimer = null;
    
    // Default par distribution
    const defaultPars18 = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];
    for (let i = 0; i < count; i++) {
      const par = defaultPars18[i] || 4;
      RoundsEngine.holeData.push({
        hole: i + 1,
        par: par,
        strokes: null,
        putts: null,
        fir: null,
        gir: null,
        bunker: false,
        penalty: 0,
        completed: false
      });
    }
  }

  static renderRoundsView() {
    const container = document.getElementById('rounds-container');
    if (!container) return;

    if (RoundsEngine.holeData.length === 0) {
      RoundsEngine.initHoleData(18);
    }

    const rounds = StorageManager.getRounds();
    const profile = StorageManager.getProfile();
    const playerName = RoundsEngine.escapeHTML(profile?.name || 'Golfista');

    if (!rounds.length) {
      container.innerHTML = `
        <div class="card card-gold-glow view-hero">
          <div class="view-heading-copy">
            <div class="view-kicker-row"><span class="badge badge-gold">Golfista seleccionado</span></div>
            <h2>Rondas de ${playerName}</h2>
            <p>Las estadísticas aparecerán cuando registres una ronda real.</p>
          </div>
        </div>
        <div class="card empty-state-panel">
          <div class="card-icon">⛳</div>
          <span class="badge badge-green">Sin rondas cargadas</span>
          <h3 style="margin-top:0.7rem;">Registrá la primera vuelta</h3>
          <p style="max-width:540px; margin:0.45rem auto 1rem; color:var(--text-muted); line-height:1.55;">Cargá 9 o 18 hoyos completos. Hasta entonces no mostramos promedios ni estadísticas estimadas.</p>
          <button class="btn btn-primary" onclick="RoundsEngine.openNewRoundModal()">Registrar primera ronda</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="card card-gold-glow view-hero">
        <div class="view-hero-row">
          <div class="view-heading-copy">
            <div class="view-kicker-row"><span class="badge badge-gold">Golfista seleccionado</span></div>
            <h2>Rondas de ${playerName}</h2>
            <p>Estadísticas y scorecards asociados a la ficha que estás viendo.</p>
          </div>
          <div class="view-actions">
            <button class="btn btn-primary" onclick="RoundsEngine.openNewRoundModal()">
              ➕ Registrar Nueva Ronda
            </button>
          </div>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="grid-4 layout-section">
        ${RoundsEngine.generateKPIsHTML(rounds)}
      </div>

      <!-- Score Trend Evolution Chart -->
      <div class="card layout-section">
        <div class="card-header">
          <div class="card-title-group">
            <div class="card-icon">📈</div>
            <h3 class="card-title">Evolución de Puntuación & Hándicap</h3>
          </div>
          <span class="badge badge-gold">Últimas Rondas</span>
        </div>
        <div style="height: 200px; width: 100%; display: flex; align-items: center; justify-content: center;">
          ${RoundsEngine.generateTrendSVG(rounds)}
        </div>
      </div>

      <!-- History of Rounds Table -->
      <div class="card">
        <div class="card-header">
          <div class="card-title-group">
            <div class="card-icon">📋</div>
            <h3 class="card-title">Historial de Rondas</h3>
          </div>
          <span class="badge badge-green">${rounds.length} Rondas</span>
        </div>

        <div class="scorecard-table-wrapper">
          <table class="scorecard-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Campo</th>
                <th>Tipo</th>
                <th>Hoyos</th>
                <th>Golpes</th>
                <th>vs Par</th>
                <th>FIR %</th>
                <th>GIR %</th>
                <th>Putts</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              ${rounds.map(r => {
                const fairwaysTotal = RoundsEngine.toNonNegativeInteger(r.fairwaysTotal);
                const fairwaysHit = Math.min(
                  RoundsEngine.toNonNegativeInteger(r.fairwaysHit),
                  fairwaysTotal
                );
                const girTotal = RoundsEngine.toNonNegativeInteger(r.girTotal);
                const girHit = Math.min(
                  RoundsEngine.toNonNegativeInteger(r.girHit),
                  girTotal
                );
                const firPct = fairwaysTotal > 0 ? Math.round((fairwaysHit / fairwaysTotal) * 100) : '-';
                const girPct = girTotal > 0 ? Math.round((girHit / girTotal) * 100) : '-';
                const scoreToPar = RoundsEngine.getScoreToPar(r);
                const roundId = RoundsEngine.escapeHTML(r.id || '');
                const hasHoleDetails = Array.isArray(r.holes) && r.holes.length > 0;
                return `
                  <tr>
                    <td>${RoundsEngine.escapeHTML(r.date || '')}</td>
                    <td style="font-weight: 600; text-align: left; padding-left: 0.5rem; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${RoundsEngine.escapeHTML(r.course || '')}</td>
                    <td><span class="badge ${r.kind === 'Torneo' ? 'badge-gold' : 'badge-blue'}">${RoundsEngine.escapeHTML(r.kind || 'Práctica')}</span></td>
                    <td>${RoundsEngine.toNonNegativeInteger(r.holesCount, hasHoleDetails ? r.holes.length : 0)}H</td>
                    <td style="font-weight: 800; font-size: 1rem; color: var(--gold-400);">${RoundsEngine.toNonNegativeInteger(r.totalScore)}</td>
                    <td><span class="score-chip ${scoreToPar <= 0 ? 'birdie' : 'bogey'}">${RoundsEngine.formatScoreDiff(scoreToPar)}</span></td>
                    <td>${firPct}%</td>
                    <td>${girPct}%</td>
                    <td style="font-weight: 700;">${RoundsEngine.toNonNegativeInteger(r.totalPutts)}</td>
                    <td><button class="btn btn-secondary btn-sm" data-round-id="${roundId}">${hasHoleDetails ? 'Ver' : 'Sin datos'}</button></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    RoundsEngine.bindRoundDetailsHandler(container);
  }

  static generateKPIsHTML(rounds) {
    if (rounds.length === 0) {
      return `
        <div class="card stat-card"><div class="stat-label">Promedio Score</div><div class="stat-value">-</div></div>
        <div class="card stat-card"><div class="stat-label">Fairways (FIR)</div><div class="stat-value">-</div></div>
        <div class="card stat-card"><div class="stat-label">Greens (GIR)</div><div class="stat-value">-</div></div>
        <div class="card stat-card"><div class="stat-label">Putts / Ronda</div><div class="stat-value">-</div></div>
      `;
    }

    const avgScore = Math.round(
      rounds.reduce((acc, r) => acc + RoundsEngine.toNonNegativeInteger(r.totalScore), 0) / rounds.length
    );
    let totalFirHit = 0, totalFirTot = 0;
    let totalGirHit = 0, totalGirTot = 0;
    let totalPutts = 0;

    rounds.forEach(r => {
      const fairwaysTotal = RoundsEngine.toNonNegativeInteger(r.fairwaysTotal, 14) || 14;
      const girTotal = RoundsEngine.toNonNegativeInteger(r.girTotal, 18) || 18;
      totalFirHit += Math.min(RoundsEngine.toNonNegativeInteger(r.fairwaysHit), fairwaysTotal);
      totalFirTot += fairwaysTotal;
      totalGirHit += Math.min(RoundsEngine.toNonNegativeInteger(r.girHit), girTotal);
      totalGirTot += girTotal;
      totalPutts += RoundsEngine.toNonNegativeInteger(r.totalPutts, 36) || 36;
    });

    const firPct = Math.round((totalFirHit / (totalFirTot || 1)) * 100);
    const girPct = Math.round((totalGirHit / (totalGirTot || 1)) * 100);
    const avgPutts = (totalPutts / rounds.length).toFixed(1);

    return `
      <div class="card stat-card">
        <div class="stat-label">Promedio Score</div>
        <div class="stat-value">${avgScore}</div>
        <div class="stat-sub gold">⛳ Meta: 82</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Fairways (FIR)</div>
        <div class="stat-value">${firPct}%</div>
        <div class="stat-sub ${firPct >= 50 ? 'positive' : 'negative'}">${totalFirHit}/${totalFirTot} calles</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Greens (GIR)</div>
        <div class="stat-value">${girPct}%</div>
        <div class="stat-sub ${girPct >= 35 ? 'positive' : 'negative'}">${totalGirHit}/${totalGirTot} greens</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Putts / Ronda</div>
        <div class="stat-value">${avgPutts}</div>
        <div class="stat-sub ${avgPutts <= 32 ? 'positive' : 'negative'}">Por 18H</div>
      </div>
    `;
  }

  static generateTrendSVG(rounds) {
    if (rounds.length < 2) {
      return `<p style="color: var(--text-muted); font-size: 0.85rem;">Registra 2 o más rondas para ver la evolución.</p>`;
    }

    const scores = rounds.slice().reverse().map(r => RoundsEngine.toNonNegativeInteger(r.totalScore));
    const width = 500;
    const height = 160;
    const padding = 30;

    const minScore = Math.min(...scores) - 2;
    const maxScore = Math.max(...scores) + 2;
    const scoreRange = maxScore - minScore || 1;

    const points = scores.map((val, idx) => {
      const x = padding + (idx / (scores.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - minScore) / scoreRange) * (height - padding * 2);
      return { x, y, val };
    });

    const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const accessibleSummary = scores.map((score, index) => `ronda ${index + 1}: ${score} golpes`).join(', ');

    return `
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%;" role="img" aria-label="Evolución de score. ${accessibleSummary}">
        <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="rgba(255,255,255,0.06)" />
        <line x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" stroke="rgba(255,255,255,0.06)" />
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.06)" />
        <path d="${pathD}" fill="none" stroke="var(--gold-400)" stroke-width="2.5" stroke-linecap="round" />
        ${points.map(p => `
          <circle cx="${p.x}" cy="${p.y}" r="4" fill="var(--gold-300)" stroke="var(--primary-900)" stroke-width="1.5" />
          <text x="${p.x}" y="${p.y - 8}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text-main)">${p.val}</text>
        `).join('')}
      </svg>
    `;
  }

  static async openNewRoundModal() {
    const authenticatedWithoutCoachRole = Boolean(
      window.AuthEngine?.user && !window.AuthEngine?.isCoach?.()
    );
    if (window.PlayerPortal?.active || authenticatedWithoutCoachRole) {
      App.showToast('Registrar rondas está disponible únicamente en el panel del entrenador.');
      return;
    }

    RoundsEngine.initHoleData(18);
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;
    const playerId = StorageManager.getActivePlayerId();
    const profile = StorageManager.getProfile();
    const playerName = RoundsEngine.escapeHTML(profile?.name || 'Golfista');

    if (!playerId) {
      App.showToast('Primero seleccioná un golfista.');
      return;
    }

    let tournaments = [];
    try {
      tournaments = await StorageManager.getTournaments(playerId);
    } catch (error) {
      console.warn('No se pudieron cargar los torneos para la ronda:', error);
    }

    // El nombre visible y el destino real deben pertenecer siempre a la misma
    // ficha, incluso si el entrenador cambia de golfista durante esta carga.
    if (StorageManager.getActivePlayerId() !== playerId) {
      App.showToast('Cambiaste de golfista. Abrí nuevamente la ronda para continuar.');
      return;
    }
    RoundsEngine.roundPlayerContext = {
      playerId,
      playerName: String(profile?.name || 'Golfista'),
      accountUserId: window.AuthEngine?.user?.id || null,
      workspaceOwnerId: StorageManager.workspaceOwnerId
    };

    modalContent.innerHTML = `
      <div class="modal-handle-bar"></div>
      <div class="modal-header">
        <div class="modal-heading">
          <span class="modal-eyebrow">Scorecard</span>
          <h3 class="modal-title">Registrar ronda</h3>
          <p class="modal-description">Completá los datos generales y luego avanzá hoyo por hoyo.</p>
        </div>
        <button class="modal-close" type="button" onclick="App.requestModalClose()" aria-label="Cerrar ventana">&times;</button>
      </div>
      <div class="app-form round-entry-form" id="round-entry-form">
        <div class="form-context" role="status">
          <span aria-hidden="true">🏌️</span>
          <span>Se guardará en la ficha de <strong>${playerName}</strong>.</span>
        </div>
        <details class="form-section round-setup-section" id="round-setup-section" open>
          <summary class="round-setup-summary">
            <span><strong>Datos de la ronda</strong><small id="round-setup-summary-text">Campo, fecha y modalidad</small></span>
            <span class="round-setup-edit">Editar</span>
          </summary>
          <div class="round-setup-content">
            <div class="form-grid-3">
            <div class="form-group">
              <label class="form-label" for="round-course-input">Campo de golf <span class="form-required" aria-hidden="true">*</span></label>
              <input type="text" class="form-control" id="round-course-input" placeholder="Nombre del campo" maxlength="160" data-required-message="Ingresá el nombre del campo." required>
            </div>
            <div class="form-group">
              <label class="form-label" for="round-date-input">Fecha <span class="form-required" aria-hidden="true">*</span></label>
              <input type="date" class="form-control" id="round-date-input" value="${GolfUtils.localDateISO()}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="round-holes-select">Modalidad</label>
              <select class="form-control" id="round-holes-select" onchange="RoundsEngine.changeHolesCount(this.value)">
                <option value="18" selected>18 hoyos</option>
                <option value="9">9 hoyos</option>
              </select>
            </div>
            </div>
            <details class="round-setup-optional">
              <summary>Tipo de ronda y torneo <span>Opcional</span></summary>
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="round-kind-select">Tipo de ronda</label>
                  <select class="form-control" id="round-kind-select">
                    <option value="Práctica">Práctica</option>
                    <option value="Amistosa">Amistosa</option>
                    <option value="Torneo">Torneo</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" for="round-tournament-select">Torneo vinculado</label>
                  <select class="form-control" id="round-tournament-select">
                    <option value="">Sin vincular</option>
                    ${tournaments.map((tournament) => `<option value="${RoundsEngine.escapeHTML(tournament.id)}">${RoundsEngine.escapeHTML(tournament.name)} · ${RoundsEngine.escapeHTML(tournament.startDate)}</option>`).join('')}
                  </select>
                </div>
              </div>
            </details>
            <button class="btn btn-primary round-mobile-start-btn" type="button" onclick="RoundsEngine.startScorecard()">Empezar por el hoyo 1</button>
          </div>
        </details>

        <section class="form-section round-score-section" id="round-score-section">
          <div class="form-section-title">Score hoyo por hoyo</div>
          <div class="round-progress-card" aria-live="polite">
            <div class="round-progress-heading">
              <span id="round-progress-label">0 de 18 hoyos</span>
              <strong id="round-progress-score">Sin score</strong>
            </div>
            <div class="round-progress-track" id="round-progress-track" role="progressbar" aria-label="Hoyos completados" aria-valuemin="0" aria-valuemax="18" aria-valuenow="0"><span id="round-progress-fill" aria-hidden="true"></span></div>
            <div class="round-progress-meta">
              <span id="round-progress-putts">0 putts</span>
              <span id="round-progress-status">Empezá por el hoyo 1</span>
            </div>
          </div>
          <div>
            <div class="hole-pagination-heading">
              <span>Seleccionar hoyo</span>
              <small><i class="hole-status-dot"></i> Completado</small>
            </div>
            <div class="hole-pagination-bar" id="hole-chips-container">
              ${RoundsEngine.renderHolePaginationChips()}
            </div>
          </div>

          <div id="active-hole-container">
            ${RoundsEngine.renderActiveHoleStepperCard()}
          </div>
        </section>

        <section class="form-section">
          <div class="form-section-title">Cierre de la ronda</div>
          <div class="form-group">
            <label class="form-label" for="round-notes-input">Sensaciones y notas</label>
            <textarea class="form-control" id="round-notes-input" rows="3" maxlength="1200" placeholder="Qué funcionó, qué ajustar y sensaciones del juego…"></textarea>
          </div>
          <div id="live-round-total" class="round-final-summary">0 de 18 hoyos completos</div>
        </section>

        <div class="form-status" id="round-save-status" role="status" aria-live="polite"></div>
        <div class="form-actions">
          <button class="btn btn-secondary" type="button" id="round-cancel-btn" onclick="RoundsEngine.cancelRoundEntry()">Cancelar</button>
          <button class="btn btn-primary" type="button" id="round-save-btn" onclick="RoundsEngine.saveNewRound()">Guardar ronda</button>
        </div>
      </div>
    `;

    RoundsEngine.updateLiveTotals();
    App.setModalCleanup(() => {
      RoundsEngine.roundPlayerContext = null;
      RoundsEngine.discardArmedUntil = 0;
      if (RoundsEngine.discardResetTimer) window.clearTimeout(RoundsEngine.discardResetTimer);
      RoundsEngine.discardResetTimer = null;
    });
    App.openModal();
    window.setTimeout(() => document.getElementById('round-course-input')?.focus(), 0);
  }

  static renderHolePaginationChips() {
    return RoundsEngine.holeData.map((h, idx) => `
      <button type="button" class="hole-chip-btn ${idx === RoundsEngine.activeMobileHole ? 'active' : ''} ${h.completed ? 'completed' : ''}" onclick="RoundsEngine.selectHole(${idx})" aria-label="Hoyo ${h.hole}, ${h.completed ? 'completado' : 'pendiente'}" ${idx === RoundsEngine.activeMobileHole ? 'aria-current="step"' : ''}>
        <span>${h.hole}</span>
      </button>
    `).join('');
  }

  static selectHole(idx) {
    const safeIndex = Math.max(0, Math.min(RoundsEngine.holeData.length - 1, Number(idx) || 0));
    RoundsEngine.activeMobileHole = safeIndex;
    const chipsContainer = document.getElementById('hole-chips-container');
    if (chipsContainer) chipsContainer.innerHTML = RoundsEngine.renderHolePaginationChips();

    const holeContainer = document.getElementById('active-hole-container');
    if (holeContainer) holeContainer.innerHTML = RoundsEngine.renderActiveHoleStepperCard();
    RoundsEngine.updateLiveTotals();
  }

  static holeScoreLabel(hole) {
    if (!Number.isInteger(hole?.strokes)) return 'Sin score';
    const relative = hole.strokes - hole.par;
    if (relative === 0) return 'Par';
    if (relative === -1) return 'Birdie';
    if (relative <= -2) return 'Eagle o mejor';
    return `+${relative}`;
  }

  static renderActiveHoleStepperCard() {
    const idx = RoundsEngine.activeMobileHole;
    const h = RoundsEngine.holeData[idx];
    if (!h) return '';
    const isLast = idx === RoundsEngine.holeData.length - 1;

    return `
      <div class="mobile-hole-card">
        <div class="mobile-hole-header">
          <div class="mobile-hole-title">
            <span>Hoyo ${h.hole} de ${RoundsEngine.holeData.length}</span>
            <h4>Hoyo ${h.hole}</h4>
            <strong id="active-hole-score">${RoundsEngine.holeScoreLabel(h)}</strong>
          </div>
          <div class="hole-par-control">
            <label class="form-label" for="hole-par-${idx}">Par</label>
            <select class="form-control" id="hole-par-${idx}" onchange="RoundsEngine.updateHole(${idx}, 'par', parseInt(this.value)); RoundsEngine.selectHole(${idx});">
              <option value="3" ${h.par === 3 ? 'selected' : ''}>Par 3</option>
              <option value="4" ${h.par === 4 ? 'selected' : ''}>Par 4</option>
              <option value="5" ${h.par === 5 ? 'selected' : ''}>Par 5</option>
            </select>
          </div>
        </div>

        <div class="quick-score-row" aria-label="Cargar golpes rápidamente">
          <span>Score rápido</span>
          <div>
            <button type="button" onclick="RoundsEngine.setQuickScore(${idx}, -1)" aria-label="Hoyo ${h.hole}: un golpe bajo par">−1</button>
            <button type="button" onclick="RoundsEngine.setQuickScore(${idx}, 0)" aria-label="Hoyo ${h.hole}: par">Par</button>
            <button type="button" onclick="RoundsEngine.setQuickScore(${idx}, 1)" aria-label="Hoyo ${h.hole}: un golpe sobre par">+1</button>
            <button type="button" onclick="RoundsEngine.setQuickScore(${idx}, 2)" aria-label="Hoyo ${h.hole}: dos golpes sobre par">+2</button>
          </div>
        </div>

        <div class="hole-stepper-grid">
          <div class="hole-stepper-field" role="group" aria-labelledby="stepper-strokes-label-${idx}">
            <span class="form-label" id="stepper-strokes-label-${idx}">Golpes</span>
            <div class="stepper-control">
              <button type="button" class="stepper-btn" onclick="RoundsEngine.adjustStepper(${idx}, 'strokes', -1)" aria-label="Restar golpe">−</button>
              <span class="stepper-value" id="stepper-strokes-${idx}" role="status" aria-live="polite" aria-label="Golpes actuales">${h.strokes ?? '—'}</span>
              <button type="button" class="stepper-btn" onclick="RoundsEngine.adjustStepper(${idx}, 'strokes', 1)" aria-label="Sumar golpe">+</button>
            </div>
          </div>

          <div class="hole-stepper-field" role="group" aria-labelledby="stepper-putts-label-${idx}">
            <span class="form-label" id="stepper-putts-label-${idx}">Putts</span>
            <div class="stepper-control">
              <button type="button" class="stepper-btn" onclick="RoundsEngine.adjustStepper(${idx}, 'putts', -1)" aria-label="Restar putt">−</button>
              <span class="stepper-value" id="stepper-putts-${idx}" role="status" aria-live="polite" aria-label="Putts actuales">${h.putts ?? '—'}</span>
              <button type="button" class="stepper-btn" onclick="RoundsEngine.adjustStepper(${idx}, 'putts', 1)" aria-label="Sumar putt">+</button>
            </div>
          </div>

          <div class="hole-stepper-field hole-stepper-penalties" role="group" aria-labelledby="stepper-penalty-label-${idx}">
            <span class="form-label" id="stepper-penalty-label-${idx}">Penalidades</span>
            <div class="stepper-control">
              <button type="button" class="stepper-btn" onclick="RoundsEngine.adjustStepper(${idx}, 'penalty', -1)" aria-label="Restar penalidad">−</button>
              <span class="stepper-value" id="stepper-penalty-${idx}" role="status" aria-live="polite" aria-label="Penalidades actuales">${h.penalty || 0}</span>
              <button type="button" class="stepper-btn" onclick="RoundsEngine.adjustStepper(${idx}, 'penalty', 1)" aria-label="Sumar penalidad">+</button>
            </div>
          </div>
        </div>

        <div class="round-metrics-grid" aria-label="Estadísticas opcionales del hoyo">
          <label class="round-metric-toggle ${h.par === 3 ? 'disabled' : ''}">
            <input type="checkbox" ${h.fir ? 'checked' : ''} ${h.par === 3 ? 'disabled' : ''} onchange="RoundsEngine.updateHole(${idx}, 'fir', this.checked)">
            <span>Calle<small>FIR</small></span>
          </label>
          <label class="round-metric-toggle">
            <input type="checkbox" ${h.gir ? 'checked' : ''} onchange="RoundsEngine.updateHole(${idx}, 'gir', this.checked)">
            <span>Green<small>GIR</small></span>
          </label>
          <label class="round-metric-toggle">
            <input type="checkbox" ${h.bunker ? 'checked' : ''} onchange="RoundsEngine.updateHole(${idx}, 'bunker', this.checked)">
            <span>Bunker<small>Sí / no</small></span>
          </label>
        </div>

        <div class="hole-navigation-actions">
          <button type="button" class="btn btn-secondary" ${idx === 0 ? 'disabled' : ''} onclick="RoundsEngine.selectHole(${idx - 1})">
            Anterior
          </button>
          <button type="button" class="btn btn-primary" onclick="RoundsEngine.advanceHole()">
            ${isLast ? 'Revisar ronda' : 'Guardar y seguir'}
          </button>
        </div>
      </div>
    `;
  }

  static startScorecard() {
    const setup = document.getElementById('round-setup-section');
    const status = document.getElementById('round-save-status');
    if (!GolfForm.validate(setup)) {
      GolfForm.setStatus(status, 'Completá el nombre del campo para empezar el scorecard.', 'error');
      return;
    }
    RoundsEngine.syncSetupSummary();
    if (setup) setup.open = false;
    GolfForm.setStatus(status);
    document.getElementById('round-score-section')?.scrollIntoView({ behavior: GolfA11y.scrollBehavior(), block: 'start' });
  }

  static syncSetupSummary() {
    const summary = document.getElementById('round-setup-summary-text');
    if (!summary) return;
    const course = document.getElementById('round-course-input')?.value?.trim() || 'Campo pendiente';
    const holes = document.getElementById('round-holes-select')?.value || RoundsEngine.holeData.length;
    summary.textContent = `${course} · ${holes} hoyos`;
  }

  static setQuickScore(holeIdx, relativeToPar) {
    const hole = RoundsEngine.holeData[holeIdx];
    if (!hole) return;
    hole.strokes = Math.max(1, Math.min(15, hole.par + Number(relativeToPar || 0)));
    hole.completed = Number.isInteger(hole.putts) && hole.putts >= 0;
    RoundsEngine.selectHole(holeIdx);
  }

  static updateHoleCardStatus() {
    const hole = RoundsEngine.holeData[RoundsEngine.activeMobileHole];
    const score = document.getElementById('active-hole-score');
    if (hole && score) score.textContent = RoundsEngine.holeScoreLabel(hole);
  }

  static validateActiveHole() {
    const hole = RoundsEngine.holeData[RoundsEngine.activeMobileHole];
    const status = document.getElementById('round-save-status');
    if (!hole || !Number.isInteger(hole.strokes) || !Number.isInteger(hole.putts)) {
      GolfForm.setStatus(status, `Completá golpes y putts del hoyo ${RoundsEngine.activeMobileHole + 1}.`, 'error');
      document.querySelector('.mobile-hole-card')?.classList.add('needs-attention');
      return false;
    }
    if (hole.putts > hole.strokes || (hole.penalty || 0) > hole.strokes) {
      GolfForm.setStatus(status, 'Los putts y las penalidades no pueden superar los golpes del hoyo.', 'error');
      document.querySelector('.mobile-hole-card')?.classList.add('needs-attention');
      return false;
    }
    document.querySelector('.mobile-hole-card')?.classList.remove('needs-attention');
    GolfForm.setStatus(status);
    return true;
  }

  static advanceHole() {
    if (!RoundsEngine.validateActiveHole()) return;
    const nextIndex = RoundsEngine.activeMobileHole + 1;
    if (nextIndex < RoundsEngine.holeData.length) {
      RoundsEngine.selectHole(nextIndex);
      document.querySelector('.mobile-hole-card')?.scrollIntoView({ behavior: GolfA11y.scrollBehavior(), block: 'center' });
      return;
    }
    GolfForm.setStatus('round-save-status', 'Scorecard completo. Revisá las notas y guardá la ronda.', 'success');
    document.getElementById('round-notes-input')?.scrollIntoView({ behavior: GolfA11y.scrollBehavior(), block: 'center' });
  }

  static hasRoundEntryChanges() {
    const hasGeneralChanges = Boolean(
      document.getElementById('round-course-input')?.value?.trim()
      || document.getElementById('round-notes-input')?.value?.trim()
      || document.getElementById('round-tournament-select')?.value
      || (document.getElementById('round-kind-select')?.value || 'Práctica') !== 'Práctica'
    );
    const hasScore = RoundsEngine.holeData.some((hole) => (
      Number.isInteger(hole.strokes)
      || Number.isInteger(hole.putts)
      || Number(hole.penalty) > 0
      || hole.fir !== null
      || hole.gir !== null
      || hole.bunker
    ));
    return hasGeneralChanges || hasScore;
  }

  static cancelRoundEntry() {
    if (!RoundsEngine.hasRoundEntryChanges()) {
      App.closeModal();
      return;
    }
    const now = Date.now();
    if (RoundsEngine.discardArmedUntil > now) {
      App.closeModal();
      return;
    }

    RoundsEngine.discardArmedUntil = now + 5000;
    const button = document.getElementById('round-cancel-btn');
    if (button) {
      button.textContent = 'Descartar carga';
      button.classList.add('btn-danger-soft');
    }
    GolfForm.setStatus('round-save-status', 'La ronda todavía no se guardó. Tocá “Descartar carga” para salir.', 'error');
    if (RoundsEngine.discardResetTimer) window.clearTimeout(RoundsEngine.discardResetTimer);
    RoundsEngine.discardResetTimer = window.setTimeout(() => {
      RoundsEngine.discardArmedUntil = 0;
      if (button?.isConnected) {
        button.textContent = 'Cancelar';
        button.classList.remove('btn-danger-soft');
      }
    }, 5000);
  }

  static adjustStepper(holeIdx, field, delta) {
    const h = RoundsEngine.holeData[holeIdx];
    if (!h) return;

    let minVal = field === 'strokes' ? 1 : 0;
    let maxVal = field === 'strokes' ? 15 : 6;

    let current = Number(h[field]);
    if (h[field] === null || h[field] === undefined || !Number.isFinite(current)) {
      current = field === 'strokes'
        ? (delta > 0 ? h.par - 1 : 2)
        : (field === 'putts' ? (delta > 0 ? 1 : 1) : 0);
    }
    h[field] = Math.max(minVal, Math.min(maxVal, current + delta));
    h.completed = Number.isInteger(h.strokes) && h.strokes > 0 && Number.isInteger(h.putts) && h.putts >= 0;

    // Update specific stepper label in DOM
    const valEl = document.getElementById(`stepper-${field}-${holeIdx}`);
    if (valEl) valEl.innerText = h[field];

    const chipsContainer = document.getElementById('hole-chips-container');
    if (chipsContainer) chipsContainer.innerHTML = RoundsEngine.renderHolePaginationChips();
    RoundsEngine.updateHoleCardStatus();
    RoundsEngine.updateLiveTotals();
  }

  static updateHole(index, field, value) {
    if (RoundsEngine.holeData[index]) {
      RoundsEngine.holeData[index][field] = value;
      const h = RoundsEngine.holeData[index];
      h.completed = Number.isInteger(h.strokes) && h.strokes > 0 && Number.isInteger(h.putts) && h.putts >= 0;
      RoundsEngine.updateHoleCardStatus();
      RoundsEngine.updateLiveTotals();
    }
  }

  static changeHolesCount(countStr) {
    const count = parseInt(countStr);
    RoundsEngine.initHoleData(count);
    RoundsEngine.selectHole(0);
    RoundsEngine.syncSetupSummary();
    RoundsEngine.updateLiveTotals();
  }

  static updateLiveTotals() {
    let totScore = 0;
    let totPar = 0;
    let totPutts = 0;

    const completedHoles = RoundsEngine.holeData.filter((hole) => hole.completed);
    completedHoles.forEach(h => {
      totScore += h.strokes;
      totPar += (h.par || 4);
      totPutts += (h.putts || 0);
    });

    const diff = completedHoles.length ? totScore - totPar : 0;
    const diffStr = diff > 0 ? `+${diff}` : (diff === 0 ? 'E' : `${diff}`);

    const label = document.getElementById('live-round-total');
    if (label) {
      label.innerText = completedHoles.length
        ? `${completedHoles.length}/${RoundsEngine.holeData.length} hoyos · ${totScore} golpes (${diffStr}) · ${totPutts} putts`
        : `0 de ${RoundsEngine.holeData.length} hoyos completos`;
    }

    const totalHoles = RoundsEngine.holeData.length;
    const completedCount = completedHoles.length;
    const progressLabel = document.getElementById('round-progress-label');
    const progressScore = document.getElementById('round-progress-score');
    const progressPutts = document.getElementById('round-progress-putts');
    const progressStatus = document.getElementById('round-progress-status');
    const progressTrack = document.getElementById('round-progress-track');
    const progressFill = document.getElementById('round-progress-fill');
    const nextIncomplete = RoundsEngine.holeData.findIndex((hole) => !hole.completed);
    if (progressLabel) progressLabel.textContent = `${completedCount} de ${totalHoles} hoyos`;
    if (progressScore) progressScore.textContent = completedCount ? `${totScore} golpes · ${diffStr}` : 'Sin score';
    if (progressPutts) progressPutts.textContent = `${totPutts} putt${totPutts === 1 ? '' : 's'}`;
    if (progressStatus) progressStatus.textContent = nextIncomplete >= 0 ? `Próximo: hoyo ${nextIncomplete + 1}` : 'Scorecard completo';
    if (progressTrack) {
      progressTrack.setAttribute('aria-valuemax', String(totalHoles));
      progressTrack.setAttribute('aria-valuenow', String(completedCount));
      progressTrack.setAttribute('aria-valuetext', `${completedCount} de ${totalHoles} hoyos completados`);
    }
    if (progressFill) progressFill.style.width = `${totalHoles ? (completedCount / totalHoles) * 100 : 0}%`;

    const saveButton = document.getElementById('round-save-btn');
    if (saveButton) {
      saveButton.disabled = completedCount !== totalHoles;
      saveButton.textContent = completedCount === totalHoles ? 'Guardar ronda' : `Completar · ${completedCount}/${totalHoles}`;
    }
  }

  static toNonNegativeInteger(value, fallback = 0) {
    const numeric = Number(value);
    const safeFallback = Number.isFinite(Number(fallback)) ? Number(fallback) : 0;
    return Math.max(0, Math.round(Number.isFinite(numeric) ? numeric : safeFallback));
  }

  static getScoreToPar(round = {}) {
    const storedScoreToPar = Number(round?.scoreToPar);
    if (Number.isFinite(storedScoreToPar)) return Math.round(storedScoreToPar);

    const storedScoreDiff = String(round?.scoreDiff ?? '').trim();
    if (storedScoreDiff.toUpperCase() === 'E') return 0;
    const parsedScoreDiff = Number(storedScoreDiff);
    if (Number.isFinite(parsedScoreDiff)) return Math.round(parsedScoreDiff);

    return RoundsEngine.toNonNegativeInteger(round?.totalScore)
      - RoundsEngine.toNonNegativeInteger(round?.totalPar);
  }

  static formatScoreDiff(value) {
    const scoreToPar = Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;
    return scoreToPar > 0 ? `+${scoreToPar}` : (scoreToPar === 0 ? 'E' : `${scoreToPar}`);
  }

  static bindRoundDetailsHandler(container) {
    if (container.dataset.roundDetailsHandlerBound === 'true') return;
    container.addEventListener('click', RoundsEngine.handleRoundDetailsClick);
    container.dataset.roundDetailsHandlerBound = 'true';
  }

  static handleRoundDetailsClick(event) {
    const target = event.target;
    const button = target instanceof Element ? target.closest('[data-round-id]') : null;
    if (!button || !event.currentTarget?.contains(button)) return;

    const roundId = button.dataset.roundId;
    if (roundId) RoundsEngine.openRoundDetailsModal(roundId);
  }

  static escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  static openRoundDetailsModal(roundId) {
    const round = StorageManager.getRounds().find((item) => item?.id === roundId);
    const modalContent = document.getElementById('global-modal-content');
    if (!round || !modalContent) return;

    const holes = Array.isArray(round.holes)
      ? round.holes
        .filter((hole) => hole && typeof hole === 'object')
        .slice()
        .sort((a, b) => RoundsEngine.toNonNegativeInteger(a.hole) - RoundsEngine.toNonNegativeInteger(b.hole))
      : [];
    const kind = RoundsEngine.escapeHTML(round.kind || 'Práctica');
    const course = RoundsEngine.escapeHTML(round.course || '');
    const date = RoundsEngine.escapeHTML(round.date || '');
    const totalScore = RoundsEngine.toNonNegativeInteger(round.totalScore);
    const totalPutts = RoundsEngine.toNonNegativeInteger(round.totalPutts);
    const penalties = RoundsEngine.toNonNegativeInteger(round.penalties);
    const scoreDiff = RoundsEngine.formatScoreDiff(RoundsEngine.getScoreToPar(round));
    const notes = String(round.notes ?? '').trim();
    const holeRows = holes.map((hole) => {
      const holeNumber = RoundsEngine.toNonNegativeInteger(hole.hole);
      const par = RoundsEngine.toNonNegativeInteger(hole.par);
      const strokes = RoundsEngine.toNonNegativeInteger(hole.strokes);
      const putts = RoundsEngine.toNonNegativeInteger(hole.putts);
      const penalty = RoundsEngine.toNonNegativeInteger(hole.penalty);
      const diff = strokes - par;
      const diffText = RoundsEngine.formatScoreDiff(diff);
      return `<tr>
        <td>${holeNumber}</td><td>${par}</td><td style="font-weight:700;">${strokes}</td>
        <td>${diffText}</td><td>${putts}</td>
        <td>${par > 3 ? (hole.fir === true ? '✓' : '—') : 'N/A'}</td>
        <td>${hole.gir === true ? '✓' : '—'}</td><td>${hole.bunker === true ? '✓' : '—'}</td><td>${penalty}</td>
      </tr>`;
    }).join('');

    modalContent.innerHTML = `
      <div class="modal-handle-bar"></div>
      <div class="modal-header">
        <div>
          <span class="badge ${round.kind === 'Torneo' ? 'badge-gold' : 'badge-blue'}">${kind}</span>
          <h3 style="margin-top:0.3rem;">${course} · ${date}</h3>
        </div>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <div class="grid-4" style="margin-bottom:1rem;">
        <div class="card stat-card"><div class="stat-label">Golpes</div><div class="stat-value">${totalScore}</div></div>
        <div class="card stat-card"><div class="stat-label">vs Par</div><div class="stat-value">${scoreDiff}</div></div>
        <div class="card stat-card"><div class="stat-label">Putts</div><div class="stat-value">${totalPutts}</div></div>
        <div class="card stat-card"><div class="stat-label">Penalidades</div><div class="stat-value">${penalties}</div></div>
      </div>
      ${holes.length ? `
        <div class="scorecard-table-wrapper">
          <table class="scorecard-table">
            <thead><tr><th>Hoyo</th><th>Par</th><th>Golpes</th><th>vs Par</th><th>Putts</th><th>FIR</th><th>GIR</th><th>Bunker</th><th>Pen.</th></tr></thead>
            <tbody>
              ${holeRows}
            </tbody>
          </table>
        </div>
      ` : '<p style="color:var(--text-muted); font-size:0.9rem;">Esta es una ronda histórica importada sin detalle por hoyo. Las nuevas rondas sí guardan cada golpe, putt y penalidad por hoyo.</p>'}
      ${notes ? `<div style="margin-top:1rem; font-size:0.88rem; color:var(--text-muted);"><strong style="color:var(--text-main);">Notas:</strong> ${RoundsEngine.escapeHTML(notes)}</div>` : ''}
    `;
    App.openModal();
  }

  static async saveNewRound() {
    const roundContext = RoundsEngine.roundPlayerContext;
    const form = document.getElementById('round-entry-form');
    const status = document.getElementById('round-save-status');
    const authenticatedWithoutCoachRole = Boolean(
      window.AuthEngine?.user && !window.AuthEngine?.isCoach?.()
    );
    const currentAccountUserId = window.AuthEngine?.user?.id || null;
    const changedContext = Boolean(
      !roundContext?.playerId
      || StorageManager.getActivePlayerId() !== roundContext.playerId
      || currentAccountUserId !== roundContext.accountUserId
      || StorageManager.workspaceOwnerId !== roundContext.workspaceOwnerId
    );
    if (window.PlayerPortal?.active || authenticatedWithoutCoachRole || changedContext) {
      RoundsEngine.roundPlayerContext = null;
      App.closeModal();
      App.showToast('No se guardó la ronda porque cambió la cuenta o el golfista seleccionado.');
      return;
    }

    if (!GolfForm.validate(form)) {
      GolfForm.setStatus(status, 'Revisá los campos marcados antes de guardar.', 'error');
      return;
    }

    const course = document.getElementById('round-course-input')?.value?.trim() || '';
    const date = document.getElementById('round-date-input')?.value || GolfUtils.localDateISO();
    const notes = document.getElementById('round-notes-input')?.value || '';
    const tournamentId = document.getElementById('round-tournament-select')?.value || null;
    const kind = tournamentId
      ? 'Torneo'
      : (document.getElementById('round-kind-select')?.value || 'Práctica');

    const incompleteIndex = RoundsEngine.holeData.findIndex((hole) => !hole.completed);
    if (incompleteIndex >= 0) {
      RoundsEngine.selectHole(incompleteIndex);
      GolfForm.setStatus(status, `Completá golpes y putts del hoyo ${incompleteIndex + 1} antes de guardar.`, 'error');
      App.showToast(`Completá golpes y putts del hoyo ${incompleteIndex + 1} antes de guardar.`);
      return;
    }

    const inconsistentIndex = RoundsEngine.holeData.findIndex((hole) => (
      hole.putts > hole.strokes || (hole.penalty || 0) > hole.strokes
    ));
    if (inconsistentIndex >= 0) {
      RoundsEngine.selectHole(inconsistentIndex);
      GolfForm.setStatus(status, `Revisá putts y penalidades del hoyo ${inconsistentIndex + 1}.`, 'error');
      App.showToast(`Revisá putts y penalidades del hoyo ${inconsistentIndex + 1}.`);
      return;
    }

    const saveButton = document.getElementById('round-save-btn');
    if (saveButton?.disabled) return;
    GolfForm.setBusy(saveButton, true, 'Guardando ronda…');
    GolfForm.setStatus(status);

    let totalScore = 0;
    let totalPar = 0;
    let totalPutts = 0;
    let fairwaysHit = 0;
    let fairwaysTotal = 0;
    let girHit = 0;
    let girTotal = 0;
    let penalties = 0;
    let bunkerSaves = 0;
    let bunkersTotal = 0;

    RoundsEngine.holeData.forEach(h => {
      totalScore += h.strokes;
      totalPar += h.par;
      totalPutts += h.putts;
      if (h.par > 3 && typeof h.fir === 'boolean') {
        fairwaysTotal++;
        if (h.fir) fairwaysHit++;
      }
      if (typeof h.gir === 'boolean') {
        girTotal++;
        if (h.gir) girHit++;
      }
      if (h.bunker) {
        bunkersTotal++;
        if (h.strokes <= h.par) bunkerSaves++;
      }
      penalties += (h.penalty || 0);
    });

    const diff = totalScore - totalPar;
    const diffStr = diff > 0 ? `+${diff}` : (diff === 0 ? 'E' : `${diff}`);

    const newRound = {
      id: StorageManager.makeId('round'),
      date,
      course,
      kind,
      tournamentId,
      holesCount: RoundsEngine.holeData.length,
      totalPar,
      totalScore,
      scoreToPar: diff,
      scoreDiff: diffStr,
      fairwaysHit,
      fairwaysTotal,
      girHit,
      girTotal,
      totalPutts,
      penalties,
      bunkerSaves,
      bunkersTotal,
      notes,
      // Se persiste cada hoyo: así los golpes y penalidades no se pierden
      // al cerrar la ronda y quedan disponibles para análisis posterior.
      holes: RoundsEngine.holeData.map((hole) => ({ ...hole }))
    };

    try {
      await StorageManager.addRound(newRound);
      const playerName = roundContext.playerName;
      RoundsEngine.roundPlayerContext = null;
      App.closeModal();
      App.showSaveConfirmation('Ronda guardada', `El scorecard quedó asociado a la ficha de ${playerName}.`);
      RoundsEngine.renderRoundsView();
      if (window.App && App.renderDashboard) App.renderDashboard();
      if (window.PlayerEngine && App.currentView === 'players') PlayerEngine.renderPlayersView();
    } catch (error) {
      console.error('No se pudo guardar la ronda:', error);
      GolfForm.setStatus(status, 'No se pudo guardar la ronda. Tus datos siguen en pantalla.', 'error');
      App.showToast('No se pudo guardar la ronda.');
      GolfForm.setBusy(saveButton, false);
    }
  }
}

window.RoundsEngine = RoundsEngine;

