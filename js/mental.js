/**
 * GolfCoach Pro - Mental Game & Pre-Shot Routine Engine
 * Box Breathing, Stress Relief, Pre-shot checklist, Frustration Reset
 */

class MentalEngine {
  static breathingInterval = null;
  static isBreathingActive = false;
  static breathingPhase = 0; // 0: inhale, 1: hold, 2: exhale, 3: hold
  static breathingSec = 4;

  static defaultRoutineSteps = [
    {
      id: 'step_1',
      title: 'Paso 1: Detrás de la Bola (Zona de Pensamiento)',
      desc: 'Evalúa viento, pendiente y elige un punto de aterrizaje muy específico (un árbol al fondo o una mota de hierba a 1 metro delante de la bola).'
    },
    {
      id: 'step_2',
      title: 'Paso 2: Swing de Práctica de Sensación',
      desc: '1 solo swing de práctica buscando sentir el ritmo y el fondo del arco, NO pensando en mecánica.'
    },
    {
      id: 'step_3',
      title: 'Paso 3: Respiración de Reset (Entrar a la Zona de Ejecución)',
      desc: 'Una exhalación profunda por la boca para relajar hombros y soltar la presión en el grip.'
    },
    {
      id: 'step_4',
      title: 'Paso 4: Colocación & Cuadrar la Cara del Palo',
      desc: 'Alinea la cara del palo hacia el punto intermedio antes de cuadrar los pies.'
    },
    {
      id: 'step_5',
      title: 'Paso 5: Mirada Final al Objetivo & Disparador ("Gatillo")',
      desc: 'Última fijación visual al target, un movimiento suave (waggle) y dispara en menos de 3 segundos.'
    }
  ];

  static renderMentalView() {
    const container = document.getElementById('mental-container');
    if (!container) return;

    container.innerHTML = `
      <div class="card card-gold-glow view-hero">
        <div class="view-hero-row">
          <div class="view-heading-copy">
            <h2>Juego Mental & Rutina Pre-Golpe</h2>
            <p><em>"El golf es 90% mental y 10% técnica."</em> Desarrolla una mente inquebrantable bajo presión.</p>
          </div>
        </div>
      </div>

      <div class="grid-2 layout-section">
        <!-- Box Breathing Interactive Card -->
        <div class="card breathing-card">
          <div class="card-header" style="width: 100%;">
            <div class="card-title-group">
              <div class="card-icon">🫁</div>
              <h3 class="card-title">Respiración Táctica Cuadrada (Box Breathing 4-4-4-4)</h3>
            </div>
            <span class="badge badge-gold">Calma Cardíaca</span>
          </div>

          <p class="content-copy">
            Técnica utilizada por jugadores de élite y atletas olímpicos para reducir pulsaciones y eliminar la tensión muscular antes del tee del 1.
          </p>

          <div class="breathing-circle-wrapper">
            <div class="breathing-outer-ring"></div>
            <div class="breathing-bubble" id="breathing-bubble-circle">
              <span id="breathing-timer-count" style="font-size: 1.5rem; font-weight: 800; color: #061c11;">4</span>
            </div>
          </div>

          <div class="breathing-instruction" id="breathing-instruction-text" role="status" aria-live="polite" aria-atomic="true">
            Presiona Iniciar para comenzar el ciclo
          </div>

          <div style="margin-top: 1.5rem;">
            <button class="btn btn-primary" type="button" id="breathing-toggle-btn" onclick="MentalEngine.toggleBreathing()" aria-pressed="false">
              ▶ Iniciar Respiración Guiada
            </button>
          </div>
        </div>

        <!-- Pre-Shot Routine Checklist -->
        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <div class="card-icon">🎯</div>
              <h3 class="card-title">Tu Rutina Pre-Golpe Consistente</h3>
            </div>
            <span class="badge badge-green">5 Pasos Clave</span>
          </div>

          <p class="content-copy">
            Repite esta secuencia mental exactamente igual en el tee de salida, en el fairway y en el putt:
          </p>

          <div class="routine-list" id="pre-shot-routine-list">
            ${MentalEngine.defaultRoutineSteps.map((step, idx) => `
              <button class="routine-step" type="button" id="routine-step-${idx}" onclick="MentalEngine.toggleStep(${idx})" aria-pressed="false">
                <span class="step-num" aria-hidden="true">${idx + 1}</span>
                <span>
                  <span class="step-text">${step.title}</span>
                  <span class="step-subtext">${step.desc}</span>
                </span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Emotional Reset Protocol -->
      <div class="card layout-section">
        <div class="card-header">
          <div class="card-title-group">
            <div class="card-icon">⚡</div>
            <h3 class="card-title">Protocolo de Reset Emocional (Superar un Mal Golpe)</h3>
          </div>
          <span class="badge badge-blue">Resiliencia en Campo</span>
        </div>

        <div class="grid-3 insight-grid">
          <div class="insight-card">
            <div class="reset-step-title"><span class="reset-step-number">1</span><span>Regla de los 10 Pasos</span></div>
            <p>
              Tienes permitido lamentarte únicamente durante 10 pasos tras el golpe. Al llegar al paso 11, el tiro ya es pasado inalterable.
            </p>
          </div>

          <div class="insight-card">
            <div class="reset-step-title"><span class="reset-step-number">2</span><span>Guardar el Palo con Intención</span></div>
            <p>
              Al introducir el palo en la bolsa, imagina que guardas allí cualquier pensamiento negativo o frustración.
            </p>
          </div>

          <div class="insight-card">
            <div class="reset-step-title"><span class="reset-step-number">3</span><span>Re-Enfocar en la Oportunidad</span></div>
            <p>
              En lugar de pensar en el hoyo arruinado, míralo como un desafío emocionante para entrenar tu capacidad de recuperación (Scrambling).
            </p>
          </div>
        </div>
      </div>
    `;
  }

  static toggleBreathing() {
    if (MentalEngine.isBreathingActive) {
      MentalEngine.stopBreathing();
    } else {
      MentalEngine.startBreathing();
    }
  }

  static startBreathing() {
    MentalEngine.isBreathingActive = true;
    MentalEngine.breathingPhase = 0;
    MentalEngine.breathingSec = 4;

    const btn = document.getElementById('breathing-toggle-btn');
    if (btn) {
      btn.innerHTML = '⏹ Detener';
      btn.setAttribute('aria-pressed', 'true');
    }

    MentalEngine.updateBreathingState();

    MentalEngine.breathingInterval = setInterval(() => {
      MentalEngine.breathingSec--;
      const countEl = document.getElementById('breathing-timer-count');
      if (countEl) countEl.innerText = MentalEngine.breathingSec;

      if (MentalEngine.breathingSec <= 0) {
        MentalEngine.breathingPhase = (MentalEngine.breathingPhase + 1) % 4;
        MentalEngine.breathingSec = 4;
        MentalEngine.updateBreathingState();
      }
    }, 1000);
  }

  static stopBreathing() {
    MentalEngine.isBreathingActive = false;
    clearInterval(MentalEngine.breathingInterval);

    const btn = document.getElementById('breathing-toggle-btn');
    const bubble = document.getElementById('breathing-bubble-circle');
    const text = document.getElementById('breathing-instruction-text');
    const countEl = document.getElementById('breathing-timer-count');

    if (btn) {
      btn.innerHTML = '▶ Iniciar Respiración Guiada';
      btn.setAttribute('aria-pressed', 'false');
    }
    if (bubble) bubble.className = 'breathing-bubble';
    if (text) text.innerText = 'Ciclo pausado';
    if (countEl) countEl.innerText = '4';
  }

  static updateBreathingState() {
    const bubble = document.getElementById('breathing-bubble-circle');
    const text = document.getElementById('breathing-instruction-text');
    if (!bubble || !text) return;

    switch (MentalEngine.breathingPhase) {
      case 0: // Inhale
        bubble.className = 'breathing-bubble inhale';
        text.innerText = '🌬️ Inhala profundo por la nariz...';
        break;
      case 1: // Hold
        bubble.className = 'breathing-bubble hold';
        text.innerText = '🧘 Retén el aire y relaja los hombros...';
        break;
      case 2: // Exhale
        bubble.className = 'breathing-bubble exhale';
        text.innerText = '💨 Exhala lento y suavemente por la boca...';
        break;
      case 3: // Hold empty
        bubble.className = 'breathing-bubble';
        text.innerText = '✨ Mantén los pulmones vacíos en calma...';
        break;
    }
  }

  static toggleStep(idx) {
    const el = document.getElementById(`routine-step-${idx}`);
    if (el) {
      el.classList.toggle('completed');
      el.setAttribute('aria-pressed', String(el.classList.contains('completed')));
    }
  }
}

window.MentalEngine = MentalEngine;
