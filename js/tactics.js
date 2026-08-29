/**
 * GolfCoach Pro - Tactical Caddy & Course Management Engine
 * Club Selector, Plays-Like Distance, Risk-Reward Strategies
 */

const DEFAULT_BAG = [
  { name: 'Driver', baseCarry: 220, type: 'Wood' },
  { name: 'Madera 3', baseCarry: 200, type: 'Wood' },
  { name: 'Híbrido 4 (22°)', baseCarry: 185, type: 'Hybrid' },
  { name: 'Hierro 5', baseCarry: 170, type: 'Iron' },
  { name: 'Hierro 6', baseCarry: 160, type: 'Iron' },
  { name: 'Hierro 7', baseCarry: 150, type: 'Iron' },
  { name: 'Hierro 8', baseCarry: 140, type: 'Iron' },
  { name: 'Hierro 9', baseCarry: 130, type: 'Iron' },
  { name: 'Pitching Wedge (46°)', baseCarry: 118, type: 'Wedge' },
  { name: 'Gap Wedge (52°)', baseCarry: 100, type: 'Wedge' },
  { name: 'Sand Wedge (56°)', baseCarry: 85, type: 'Wedge' },
  { name: 'Lob Wedge (60°)', baseCarry: 70, type: 'Wedge' }
];

class TacticsEngine {
  static bag = DEFAULT_BAG;

  static renderTacticsView() {
    const container = document.getElementById('tactics-container');
    if (!container) return;

    container.innerHTML = `
      <div class="card card-gold-glow view-hero">
        <div class="view-hero-row">
          <div class="view-heading-copy">
            <h2>Caddy Virtual & Estrategia de Campo</h2>
            <p>Toma decisiones inteligentes como un golfista de torneo y elimina los errores innecesarios.</p>
          </div>
        </div>
      </div>

      <div class="caddy-calculator layout-section">
        <!-- Inputs Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <div class="card-icon">🎛️</div>
              <h3 class="card-title">Condiciones del Golpe</h3>
            </div>
            <span class="badge badge-gold">Calculadora Táctica</span>
          </div>

          <div class="form-group">
            <label class="form-label">Distancia Láser / GPS a la Bandera (metros)</label>
            <input type="number" class="form-control" id="caddy-dist-input" value="145" min="20" max="300" oninput="TacticsEngine.calculateRecommendation()">
          </div>

          <div class="form-group">
            <label class="form-label">Condición del Viento</label>
            <select class="form-control" id="caddy-wind-select" onchange="TacticsEngine.calculateRecommendation()">
              <option value="0">Calma / Viento imperceptible</option>
              <option value="8">Viento en contra leve (+8m / +1 palo)</option>
              <option value="18">Viento en contra fuerte (+18m / +2 palos)</option>
              <option value="-8">Viento a favor leve (-8m / -1 palo)</option>
              <option value="-15">Viento a favor fuerte (-15m / -1.5 palos)</option>
              <option value="cross_l">Viento cruzado de izquierda a derecha</option>
              <option value="cross_r">Viento cruzado de derecha a izquierda</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Desnivel / Pendiente</label>
            <select class="form-control" id="caddy-slope-select" onchange="TacticsEngine.calculateRecommendation()">
              <option value="0">Tiro a nivel (plano)</option>
              <option value="8">Cuesta arriba leve (+8m)</option>
              <option value="16">Cuesta arriba pronunciada (+16m)</option>
              <option value="-8">Cuesta abajo leve (-8m)</option>
              <option value="-16">Cuesta abajo pronunciada (-16m)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Posición de la Bola (Lie)</label>
            <select class="form-control" id="caddy-lie-select" onchange="TacticsEngine.calculateRecommendation()">
              <option value="fairway">Fairway limpio / Tee</option>
              <option value="rough_light">Rough medio / Antegreen</option>
              <option value="rough_deep">Rough denso / Hierba alta</option>
              <option value="ball_above">Bola por encima de los pies (tiende a Draw/Hook)</option>
              <option value="ball_below">Bola por debajo de los pies (tiende a Fade/Slice)</option>
            </select>
          </div>
        </div>

        <!-- Recommendation Output Box -->
        <div class="card caddy-recommendation-box" id="caddy-result-card">
          <!-- Dynamic Content Rendered by JS -->
        </div>
      </div>

      <!-- Course Management Playbook -->
      <div class="card">
        <div class="card-header">
          <div class="card-title-group">
            <div class="card-icon">📖</div>
            <h3 class="card-title">Playbook: Los 4 Mandamientos de Gestión de Campo</h3>
          </div>
          <span class="badge badge-green">Estrategia SotaPar</span>
        </div>

        <div class="grid-2 insight-grid">
          <div class="insight-card">
            <h4 class="icon-heading">🎯 1. Olvida la Bandera en los Pares 3</h4>
            <p>
              El 90% de los golfistas aficionados dejan golpes en los pares 3 por atacar banderas escondidas. Apunta SIEMPRE al centro geométrico del green; tu peor resultado será un cómodo putt de dos toques.
            </p>
          </div>

          <div class="insight-card">
            <h4 class="icon-heading">🛡️ 2. Elimina el Lado del Peligro</h4>
            <p>
              Si hay agua u obstáculos a la derecha del fairway, colócate a la derecha del tee y apunta hacia la izquierda. Concédele al campo el fallo en el sector seguro.
            </p>
          </div>

          <div class="insight-card">
            <h4 class="icon-heading">🛑 3. El Golpe de Rescate debe ser Seguro</h4>
            <p>
              Tras caer en árboles o un mal lie, nunca intentes el golpe "milagroso" a través de una ventana estrecha. Saca la bola al fairway con hierro corto. El bogey es aceptable; el triple bogey destruye la tarjeta.
            </p>
          </div>

          <div class="insight-card">
            <h4 class="icon-heading">📏 4. Deja tu Distancia Favorita de Wedge</h4>
            <p>
              En los Pares 5, en lugar de intentar un segundo tiro forzado a 40 metros del green en posición incómoda, calcula un layup que te deje exactamente a tu distancia de swing completo de Sand Wedge (ej. 80 metros).
            </p>
          </div>
        </div>
      </div>
    `;

    TacticsEngine.calculateRecommendation();
  }

  static calculateRecommendation() {
    const rawDist = parseFloat(document.getElementById('caddy-dist-input')?.value || 145);
    const windVal = document.getElementById('caddy-wind-select')?.value || '0';
    const slopeVal = parseFloat(document.getElementById('caddy-slope-select')?.value || 0);
    const lieVal = document.getElementById('caddy-lie-select')?.value || 'fairway';

    let windAdjustment = 0;
    let windTip = '';
    if (windVal === 'cross_l') {
      windTip = '💨 Viento cruzado desde la izquierda: apunta 4-6 metros a la izquierda del objetivo.';
    } else if (windVal === 'cross_r') {
      windTip = '💨 Viento cruzado desde la derecha: apunta 4-6 metros a la derecha del objetivo.';
    } else {
      windAdjustment = parseFloat(windVal);
    }

    let lieAdjustment = 0;
    let lieTip = '';
    if (lieVal === 'rough_deep') {
      lieAdjustment = 10; // flyer or heavy grass
      lieTip = '🌿 Rough pesado: el palo perderá velocidad y saldrá con poco spin. Cuidado con rodar de más.';
    } else if (lieVal === 'ball_above') {
      lieTip = '📐 Bola por encima de los pies: coge el palo 2-3 cm más corto y apunta levemente a la derecha.';
    } else if (lieVal === 'ball_below') {
      lieTip = '📐 Bola por debajo de los pies: flexiona más las rodillas y apunta levemente a la izquierda.';
    }

    const effectiveDist = Math.round(rawDist + windAdjustment + slopeVal + lieAdjustment);

    // Find best matching club from bag
    let bestClub = TacticsEngine.bag[0];
    let minDiff = 999;
    TacticsEngine.bag.forEach(club => {
      const diff = Math.abs(club.baseCarry - effectiveDist);
      if (diff < minDiff) {
        minDiff = diff;
        bestClub = club;
      }
    });

    const resultBox = document.getElementById('caddy-result-card');
    if (!resultBox) return;

    resultBox.innerHTML = `
      <div>
        <div class="card-header">
          <span class="badge badge-gold">Recomendación del Caddy</span>
          <span class="badge badge-blue">Distancia Real: ${rawDist}m</span>
        </div>

        <div class="rec-club-display">
          <div style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-subtle);">Distancia Jugada Efectiva</div>
          <div class="rec-target-dist">${effectiveDist} metros ("Plays Like")</div>
          <div class="rec-club-name">${bestClub.name}</div>
          <div style="font-size: 0.9rem; color: var(--gold-300);">Tu carry calibrado: ${bestClub.baseCarry}m</div>
        </div>

        <div class="ui-icon-copy" style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: var(--radius-md); font-size: 0.88rem; line-height: 1.5; color: var(--text-muted);">
          <div style="font-weight: 700; color: var(--text-main); margin-bottom: 0.35rem;">💡 Consejos Tácticos de Ejecución:</div>
          ${windTip ? `<div>${windTip}</div>` : ''}
          ${lieTip ? `<div>${lieTip}</div>` : ''}
          <div>⛳ <strong>Estrategia de Green:</strong> Apunta al centro del green y confía en el swing sin intentar forzar potencia extra.</div>
        </div>
      </div>

      <div style="margin-top: 1rem;">
        <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="MentalEngine.renderMentalView(); App.navigateTo('mental');">
          🧘 Ir a Rutina Pre-Golpe con ${bestClub.name}
        </button>
      </div>
    `;
  }
}

window.TacticsEngine = TacticsEngine;
