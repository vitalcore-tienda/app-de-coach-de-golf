/**
 * GolfCoach Pro - Mobile & Desktop Scorecard Engine
 * Hole-by-hole scoring, touch steppers (+ / -), FIR%, GIR%, Putts analysis
 */

class RoundsEngine {
  static currentHoleCount = 18;
  static activeMobileHole = 0;
  static scorecardMode = 'mobile'; // 'mobile' (stepper) or 'table'
  static holeData = [];

  static initHoleData(count = 18) {
    RoundsEngine.currentHoleCount = count;
    RoundsEngine.holeData = [];
    RoundsEngine.activeMobileHole = 0;
    
    // Default par distribution
    const defaultPars18 = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];
    for (let i = 0; i < count; i++) {
      const par = defaultPars18[i] || 4;
      RoundsEngine.holeData.push({
        hole: i + 1,
        par: par,
        strokes: par + 1,
        putts: 2,
        fir: par > 3 ? true : false,
        gir: false,
        bunker: false,
        penalty: 0
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

    container.innerHTML = `
      <div class="card card-gold-glow" style="margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2>Scorecard & Estadísticas de Rondas</h2>
            <p>Registra tus vueltas con facilidad en el campo con botones táctiles rápidos.</p>
          </div>
          <div style="display: flex; gap: 0.5rem; width: 100%; justify-content: flex-end;">
            <button class="btn btn-primary" style="flex: 1; max-width: 240px;" onclick="RoundsEngine.openNewRoundModal()">
              ➕ Registrar Nueva Ronda
            </button>
          </div>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="grid-4" style="margin-bottom: 1.5rem;">
        ${RoundsEngine.generateKPIsHTML(rounds)}
      </div>

      <!-- Score Trend Evolution Chart -->
      <div class="card" style="margin-bottom: 1.5rem;">
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

    return `
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%;">
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
    RoundsEngine.initHoleData(18);
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    let tournaments = [];
    try {
      tournaments = await StorageManager.getTournaments();
    } catch (error) {
      console.warn('No se pudieron cargar los torneos para la ronda:', error);
    }

    modalContent.innerHTML = `
      <div class="modal-handle-bar"></div>
      <div class="modal-header">
        <div>
          <span class="badge badge-gold" style="margin-bottom: 0.25rem;">Scorecard Móvil</span>
          <h3>Registro de Ronda en Campo</h3>
        </div>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>

      <div class="grid-3" style="margin-bottom: 1rem;">
        <div class="form-group" style="margin-bottom: 0.5rem;">
          <label class="form-label">Campo de Golf</label>
          <input type="text" class="form-control" id="round-course-input" value="Club de Golf">
        </div>
        <div class="form-group" style="margin-bottom: 0.5rem;">
          <label class="form-label">Fecha</label>
          <input type="date" class="form-control" id="round-date-input" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group" style="margin-bottom: 0.5rem;">
          <label class="form-label">Modalidad</label>
          <select class="form-control" id="round-holes-select" onchange="RoundsEngine.changeHolesCount(this.value)">
            <option value="18" selected>18 Hoyos</option>
            <option value="9">9 Hoyos</option>
          </select>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom: 1rem;">
        <div class="form-group" style="margin-bottom: 0.5rem;">
          <label class="form-label">Tipo de ronda</label>
          <select class="form-control" id="round-kind-select">
            <option value="Práctica">Práctica</option>
            <option value="Amistosa">Amistosa</option>
            <option value="Torneo">Torneo</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0.5rem;">
          <label class="form-label">Torneo vinculado</label>
          <select class="form-control" id="round-tournament-select">
            <option value="">Sin vincular</option>
            ${tournaments.map((tournament) => `<option value="${RoundsEngine.escapeHTML(tournament.id)}">${RoundsEngine.escapeHTML(tournament.name)} · ${RoundsEngine.escapeHTML(tournament.startDate)}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Hole Selection Pagination Chips -->
      <div style="margin-bottom: 0.75rem;">
        <label class="form-label">Seleccionar Hoyo:</label>
        <div class="hole-pagination-bar" id="hole-chips-container">
          ${RoundsEngine.renderHolePaginationChips()}
        </div>
      </div>

      <!-- Active Hole Mobile Stepper Card -->
      <div id="active-hole-container">
        ${RoundsEngine.renderActiveHoleStepperCard()}
      </div>

      <!-- Notes Field -->
      <div class="form-group" style="margin-top: 1rem;">
        <label class="form-label">Sensaciones & Notas</label>
        <input type="text" class="form-control" id="round-notes-input" placeholder="Sensaciones del juego...">
      </div>

      <!-- Live Total Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
        <div id="live-round-total" style="font-weight: 700; color: var(--gold-400); font-size: 1.05rem;">
          Total: 86 (+14) • 33 Putts
        </div>
        <button class="btn btn-primary" style="min-height: 48px; width: 100%;" onclick="RoundsEngine.saveNewRound()">
          💾 Guardar Ronda
        </button>
      </div>
    `;

    RoundsEngine.updateLiveTotals();
    App.openModal();
  }

  static renderHolePaginationChips() {
    return RoundsEngine.holeData.map((h, idx) => `
      <button class="hole-chip-btn ${idx === RoundsEngine.activeMobileHole ? 'active' : ''}" onclick="RoundsEngine.selectHole(${idx})">
        ${h.hole}
      </button>
    `).join('');
  }

  static selectHole(idx) {
    RoundsEngine.activeMobileHole = idx;
    const chipsContainer = document.getElementById('hole-chips-container');
    if (chipsContainer) chipsContainer.innerHTML = RoundsEngine.renderHolePaginationChips();
    
    const holeContainer = document.getElementById('active-hole-container');
    if (holeContainer) holeContainer.innerHTML = RoundsEngine.renderActiveHoleStepperCard();
  }

  static renderActiveHoleStepperCard() {
    const idx = RoundsEngine.activeMobileHole;
    const h = RoundsEngine.holeData[idx];
    if (!h) return '';

    return `
      <div class="mobile-hole-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <div>
            <h4 style="font-size: 1.2rem; color: var(--gold-400);">Hoyo #${h.hole}</h4>
            <span style="font-size: 0.8rem; color: var(--text-subtle);">Par ${h.par}</span>
          </div>
          <div>
            <select class="form-control" style="padding: 0.3rem 0.6rem; min-height: 36px; width: auto;" onchange="RoundsEngine.updateHole(${idx}, 'par', parseInt(this.value)); RoundsEngine.selectHole(${idx});">
              <option value="3" ${h.par === 3 ? 'selected' : ''}>Par 3</option>
              <option value="4" ${h.par === 4 ? 'selected' : ''}>Par 4</option>
              <option value="5" ${h.par === 5 ? 'selected' : ''}>Par 5</option>
            </select>
          </div>
        </div>

        <div class="grid-3" style="margin-bottom: 1rem;">
          <!-- Strokes Stepper -->
          <div>
            <label class="form-label" style="text-align: center;">Golpes Totales</label>
            <div class="stepper-control">
              <button class="stepper-btn" onclick="RoundsEngine.adjustStepper(${idx}, 'strokes', -1)">−</button>
              <span class="stepper-value" id="stepper-strokes-${idx}">${h.strokes}</span>
              <button class="stepper-btn" onclick="RoundsEngine.adjustStepper(${idx}, 'strokes', 1)">+</button>
            </div>
          </div>

          <!-- Putts Stepper -->
          <div>
            <label class="form-label" style="text-align: center;">Putts en Green</label>
            <div class="stepper-control">
              <button class="stepper-btn" onclick="RoundsEngine.adjustStepper(${idx}, 'putts', -1)">−</button>
              <span class="stepper-value" id="stepper-putts-${idx}">${h.putts}</span>
              <button class="stepper-btn" onclick="RoundsEngine.adjustStepper(${idx}, 'putts', 1)">+</button>
            </div>
          </div>

          <!-- Penalty Strokes Stepper -->
          <div>
            <label class="form-label" style="text-align: center;">Penalidades</label>
            <div class="stepper-control">
              <button class="stepper-btn" onclick="RoundsEngine.adjustStepper(${idx}, 'penalty', -1)">−</button>
              <span class="stepper-value" id="stepper-penalty-${idx}">${h.penalty || 0}</span>
              <button class="stepper-btn" onclick="RoundsEngine.adjustStepper(${idx}, 'penalty', 1)">+</button>
            </div>
          </div>
        </div>

        <!-- Quick Toggles -->
        <div style="display: flex; gap: 0.5rem; justify-content: space-around; background: var(--bg-surface); padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
            <input type="checkbox" ${h.fir ? 'checked' : ''} ${h.par === 3 ? 'disabled' : ''} onchange="RoundsEngine.updateHole(${idx}, 'fir', this.checked)">
            Calle (FIR)
          </label>
          <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
            <input type="checkbox" ${h.gir ? 'checked' : ''} onchange="RoundsEngine.updateHole(${idx}, 'gir', this.checked)">
            Green (GIR)
          </label>
          <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
            <input type="checkbox" ${h.bunker ? 'checked' : ''} onchange="RoundsEngine.updateHole(${idx}, 'bunker', this.checked)">
            Bunker
          </label>
        </div>

        <!-- Next / Prev Hole Navigation Buttons -->
        <div style="display: flex; justify-content: space-between; margin-top: 1rem;">
          <button class="btn btn-secondary btn-sm" ${idx === 0 ? 'disabled style="opacity:0.4;"' : ''} onclick="RoundsEngine.selectHole(${idx - 1})">
            ← Hoyo Anterior
          </button>
          <button class="btn btn-secondary btn-sm" ${idx >= RoundsEngine.holeData.length - 1 ? 'disabled style="opacity:0.4;"' : ''} onclick="RoundsEngine.selectHole(${idx + 1})">
            Siguiente Hoyo →
          </button>
        </div>
      </div>
    `;
  }

  static adjustStepper(holeIdx, field, delta) {
    const h = RoundsEngine.holeData[holeIdx];
    if (!h) return;

    let minVal = field === 'strokes' ? 1 : 0;
    let maxVal = field === 'strokes' ? 15 : 6;

    h[field] = Math.max(minVal, Math.min(maxVal, h[field] + delta));

    // Update specific stepper label in DOM
    const valEl = document.getElementById(`stepper-${field}-${holeIdx}`);
    if (valEl) valEl.innerText = h[field];

    RoundsEngine.updateLiveTotals();
  }

  static updateHole(index, field, value) {
    if (RoundsEngine.holeData[index]) {
      RoundsEngine.holeData[index][field] = value;
      RoundsEngine.updateLiveTotals();
    }
  }

  static changeHolesCount(countStr) {
    const count = parseInt(countStr);
    RoundsEngine.initHoleData(count);
    RoundsEngine.selectHole(0);
    RoundsEngine.updateLiveTotals();
  }

  static updateLiveTotals() {
    let totScore = 0;
    let totPar = 0;
    let totPutts = 0;

    RoundsEngine.holeData.forEach(h => {
      totScore += (h.strokes || 0);
      totPar += (h.par || 4);
      totPutts += (h.putts || 0);
    });

    const diff = totScore - totPar;
    const diffStr = diff > 0 ? `+${diff}` : (diff === 0 ? 'E' : `${diff}`);

    const label = document.getElementById('live-round-total');
    if (label) {
      label.innerText = `Total: ${totScore} (${diffStr}) • ${totPutts} Putts`;
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
    const course = document.getElementById('round-course-input')?.value || 'Club de Golf';
    const date = document.getElementById('round-date-input')?.value || new Date().toISOString().split('T')[0];
    const notes = document.getElementById('round-notes-input')?.value || '';
    const tournamentId = document.getElementById('round-tournament-select')?.value || null;
    const kind = tournamentId
      ? 'Torneo'
      : (document.getElementById('round-kind-select')?.value || 'Práctica');

    let totalScore = 0;
    let totalPar = 0;
    let totalPutts = 0;
    let fairwaysHit = 0;
    let fairwaysTotal = 0;
    let girHit = 0;
    let girTotal = RoundsEngine.holeData.length;
    let penalties = 0;
    let bunkerSaves = 0;
    let bunkersTotal = 0;

    RoundsEngine.holeData.forEach(h => {
      totalScore += h.strokes;
      totalPar += h.par;
      totalPutts += h.putts;
      if (h.par > 3) {
        fairwaysTotal++;
        if (h.fir) fairwaysHit++;
      }
      if (h.gir) girHit++;
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
      App.closeModal();
      App.showToast('🏆 ¡Ronda guardada con éxito!');
      RoundsEngine.renderRoundsView();
      if (window.App && App.renderDashboard) App.renderDashboard();
      if (window.PlayerEngine && App.currentView === 'players') PlayerEngine.renderPlayersView();
    } catch (error) {
      console.error('No se pudo guardar la ronda:', error);
      App.showToast('No se pudo guardar la ronda.');
    }
  }
}

window.RoundsEngine = RoundsEngine;
