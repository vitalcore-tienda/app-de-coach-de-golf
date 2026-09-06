/**
 * GolfCoach Pro - Training & Drills Engine
 * Categorized library, structured practice timer (Pomodoro), reps tracking
 */

const DRILLS_CATALOG = [
  // 1. Swing & Mechanics
  {
    id: 'd_swing_1',
    title: 'Takeaway de Un Solo Bloque (One-Piece Takeaway)',
    category: 'swing',
    categoryName: 'Swing & Hierros',
    duration: 15,
    difficulty: 'Intermedio',
    purpose: 'Evitar desconexión temprana de muñecas y asegurar una rotación amplia de hombros.',
    instructions: 'Coloca una toalla debajo de ambas axilas. Inicia el movimiento hacia atrás usando únicamente los hombros y el torso hasta que el palo quede paralelo al suelo, sin que la toalla se caiga ni quiebres muñecas antes de tiempo.',
    repsTarget: '20 repeticiones'
  },
  {
    id: 'd_swing_2',
    title: 'Drill de la Varilla de Alineación (Path & Plane)',
    category: 'swing',
    categoryName: 'Swing & Hierros',
    duration: 20,
    difficulty: 'Todos los niveles',
    purpose: 'Corregir el swing "Over the top" y promover un camino de adentro hacia afuera (In-to-Out).',
    instructions: 'Clava una varilla a 45 grados en el suelo detrás de ti en la línea de tu stance. Practica el downswing pasando el palo por debajo de la varilla para forzar un ataque desde el interior.',
    repsTarget: '15 swings con bola'
  },
  {
    id: 'd_swing_3',
    title: 'Pausa en el Tope del Backswing (Ritmo y Transición)',
    category: 'swing',
    categoryName: 'Swing & Hierros',
    duration: 15,
    difficulty: 'Avanzado',
    purpose: 'Eliminar el apuro en la bajada y lograr que el tren inferior inicie el downswing.',
    instructions: 'Haz el backswing completo y detente deliberadamente durante 1 segundo completo en el tope. Desde esa pausa estática, inicia el downswing con el giro de caderas e impacta la bola.',
    repsTarget: '15 bolas'
  },

  // 2. Putting
  {
    id: 'd_putt_1',
    title: 'El Drill de la Puerta con Tees (Gate Drill)',
    category: 'putting',
    categoryName: 'Putting',
    duration: 15,
    difficulty: 'Fundamentos',
    purpose: 'Garantizar el impacto en el sweet-spot y cara del putter perfectamente cuadrada al objetivo.',
    instructions: 'Clava dos tees en el putting green apenas más anchos que la cabeza de tu putter. Practica tu stroke pasando el putter entre los tees sin tocarlos hacia un hoyo a 2 metros.',
    repsTarget: '25 putts embocados'
  },
  {
    id: 'd_putt_2',
    title: 'Drill del Reloj / Estrella a 1 Metro (Presión)',
    category: 'putting',
    categoryName: 'Putting',
    duration: 20,
    difficulty: 'Intermedio',
    purpose: 'Desarrollar confianza infalible en putts de salvar par y presión de torneo.',
    instructions: 'Coloca 6 bolas en círculo a 1 metro de distancia del hoyo (como las horas del reloj). El objetivo es embocar las 6 seguidas. Si fallas una, el contador vuelve a 0.',
    repsTarget: '3 vueltas completas consecutivas'
  },
  {
    id: 'd_putt_3',
    title: 'Ladder Drill (Escalera de Control de Distancia)',
    category: 'putting',
    categoryName: 'Putting',
    duration: 20,
    difficulty: 'Avanzado',
    purpose: 'Eliminar los tripateos ajustando la velocidad y toque a distancias largas (lag putting).',
    instructions: 'Coloca una varilla a 1 metro detrás del hoyo. Tira bolas desde 5, 8, 10 y 12 metros. Cada bola debe quedar entre el hoyo y la varilla sin pasarse.',
    repsTarget: '12 bolas logradas'
  },

  // 3. Chipping & Pitching
  {
    id: 'd_chip_1',
    title: 'Método del Reloj para Distancias de Wedge',
    category: 'chipping',
    categoryName: 'Juego Corto',
    duration: 25,
    difficulty: 'Intermedio',
    purpose: 'Construir distancias automáticas y predecibles desde 30, 50 y 70 metros.',
    instructions: 'Practica 3 amplitudes de swing con tu Sand Wedge: Manos a las 8:00 (cintura), manos a las 9:00 (pecho) y manos a las 10:00 (hombro). Anota la distancia promedio que produce cada posición con el mismo ritmo.',
    repsTarget: '10 bolas por cada posición'
  },
  {
    id: 'd_chip_2',
    title: 'Drill de la Toalla en el Landing Spot',
    category: 'chipping',
    categoryName: 'Juego Corto',
    duration: 15,
    difficulty: 'Todos los niveles',
    purpose: 'Entrenar el punto exacto de aterrizaje de la bola en lugar de mirar solo el hoyo.',
    instructions: 'Coloca una toalla pequeña a 4-5 metros de ti en el green. Ejecuta chips con hierro 8 o pitching wedge buscando que la bola pique exactamente sobre la toalla y ruede hacia el hoyo.',
    repsTarget: '15 impactos en la toalla'
  },

  // 4. Bunker
  {
    id: 'd_bunker_1',
    title: 'Drill de la Línea en la Arena (Splash & Bounce)',
    category: 'bunker',
    categoryName: 'Bunker',
    duration: 15,
    difficulty: 'Fundamentos',
    purpose: 'Dominar el punto de entrada de la cara del palo 3-5 cm antes de la bola usando la suela/bounce.',
    instructions: 'Dibuja una línea recta en la arena con tu dedo. Sin bola, realiza swings enfocándote en que el wedge entre exactamente en la línea y salpique arena hacia adelante.',
    repsTarget: '20 impactos limpios en la línea'
  },
  {
    id: 'd_bunker_2',
    title: 'Salida de Huevo Frito / Bola Enterrada',
    category: 'bunker',
    categoryName: 'Bunker',
    duration: 15,
    difficulty: 'Avanzado',
    purpose: 'Aprender la mecánica especial para lies difíciles y arena compacta.',
    instructions: 'Cierra ligeramente la cara del wedge (en lugar de abrirla), coloca la bola más centrada en el stance y clava la punta del palo con un golpe descendente y follow-through corto.',
    repsTarget: '10 salidas controladas'
  },

  // 5. Fitness & Movilidad
  {
    id: 'd_fit_1',
    title: 'Disociación Pélvica & Rotación Torácica',
    category: 'fitness',
    categoryName: 'Físico & Movilidad',
    duration: 10,
    difficulty: 'Todos los niveles',
    purpose: 'Aumentar la velocidad de swing mediante la separación del giro de torso y caderas.',
    instructions: 'Coloca un palo sobre tus hombros en postura de golf. Mantén las caderas estables y gira los hombros 90 grados. Luego mantén los hombros quietos y gira las caderas independientemente.',
    repsTarget: '3 series de 12 giros'
  },
  {
    id: 'd_fit_2',
    title: 'Movilidad de Caderas 90/90 en el Suelo',
    category: 'fitness',
    categoryName: 'Físico & Movilidad',
    duration: 10,
    difficulty: 'Todos los niveles',
    purpose: 'Liberar rotación interna y externa de cadera para permitir un finish completo sin dolor lumbar.',
    instructions: 'Siéntate en el suelo con ambas piernas flexionadas a 90 grados (una adelante y otra al costado). Rota el tronco suavemente sobre la pierna delantera y luego cambia de lado.',
    repsTarget: '2 minutos por lado'
  }
];

class DrillsEngine {
  static currentFilter = 'all';
  static activeTimer = null;
  static timerSeconds = 1200; // 20 min default (Pomodoro)
  static timerInitial = 1200;
  static isTimerRunning = false;
  static isBreakPhase = false;
  static pendingProgress = new Set();

  static renderDrillsView() {
    const container = document.getElementById('drills-container');
    if (!container) return;

    const progress = StorageManager.getDrillsProgress();

    container.innerHTML = `
      <div class="card card-gold-glow view-hero">
        <div class="view-hero-row">
          <div class="view-heading-copy">
            <h2>Planes de Entrenamiento & Drills</h2>
            <p>Ejercicios específicos con propósito estructurado para corregir fallos y afianzar consistencia.</p>
          </div>
          <div class="view-actions">
            <button class="btn btn-primary" onclick="DrillsEngine.openTimerModal()">
              ⏱️ Abrir Temporizador Pomodoro de Golf
            </button>
          </div>
        </div>
      </div>

      <!-- Category Filter Pills -->
      <div class="filter-bar" role="group" aria-label="Filtrar planes por categoría">
        <button class="filter-pill ${DrillsEngine.currentFilter === 'all' ? 'active' : ''}" type="button" aria-pressed="${DrillsEngine.currentFilter === 'all'}" onclick="DrillsEngine.setFilter('all')">Todos</button>
        <button class="filter-pill ${DrillsEngine.currentFilter === 'swing' ? 'active' : ''}" type="button" aria-pressed="${DrillsEngine.currentFilter === 'swing'}" onclick="DrillsEngine.setFilter('swing')">🏌️ Swing & Maderas</button>
        <button class="filter-pill ${DrillsEngine.currentFilter === 'putting' ? 'active' : ''}" type="button" aria-pressed="${DrillsEngine.currentFilter === 'putting'}" onclick="DrillsEngine.setFilter('putting')">⛳ Putting</button>
        <button class="filter-pill ${DrillsEngine.currentFilter === 'chipping' ? 'active' : ''}" type="button" aria-pressed="${DrillsEngine.currentFilter === 'chipping'}" onclick="DrillsEngine.setFilter('chipping')">🎯 Chipping & Wedges</button>
        <button class="filter-pill ${DrillsEngine.currentFilter === 'bunker' ? 'active' : ''}" type="button" aria-pressed="${DrillsEngine.currentFilter === 'bunker'}" onclick="DrillsEngine.setFilter('bunker')">🏖️ Bunker</button>
        <button class="filter-pill ${DrillsEngine.currentFilter === 'fitness' ? 'active' : ''}" type="button" aria-pressed="${DrillsEngine.currentFilter === 'fitness'}" onclick="DrillsEngine.setFilter('fitness')">💪 Físico & Movilidad</button>
      </div>

      <!-- Drills Grid -->
      <div class="grid-3" id="drills-list-grid">
        ${DrillsEngine.generateDrillsCardsHTML(progress)}
      </div>
    `;
  }

  static setFilter(category) {
    DrillsEngine.currentFilter = category;
    DrillsEngine.renderDrillsView();
  }

  static generateDrillsCardsHTML(progress) {
    const filtered = DrillsEngine.currentFilter === 'all'
      ? DRILLS_CATALOG
      : DRILLS_CATALOG.filter(d => d.category === DrillsEngine.currentFilter);

    if (filtered.length === 0) {
      return `<p style="grid-column: 1 / -1; text-align: center; padding: 2rem;">No hay ejercicios en esta categoría.</p>`;
    }

    return filtered.map(drill => {
      const isCompleted = progress[drill.id]?.completed;
      const repsCompleted = progress[drill.id]?.reps || 0;

      return `
        <div class="card drill-card ${isCompleted ? 'completed-drill' : ''}" style="${isCompleted ? 'border-left-color: var(--color-success);' : ''}">
          <div>
            <div class="card-header">
              <span class="badge badge-gold">${drill.categoryName}</span>
              <span class="badge badge-blue">⏱️ ${drill.duration} min</span>
            </div>
            <h3 class="content-title">${drill.title}</h3>
            
            <div class="drill-purpose">
              <strong>Propósito:</strong> ${drill.purpose}
            </div>

            <p class="drill-instructions">${drill.instructions}</p>
          </div>

          <div style="border-top: 1px solid var(--border-subtle); padding-top: 1rem; margin-top: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <span style="font-size: 0.8rem; color: var(--text-subtle); font-weight: 600;">Meta: ${drill.repsTarget}</span>
              <span class="badge ${isCompleted ? 'badge-green' : 'badge-gold'}">${isCompleted ? 'Completado' : 'Pendiente'}</span>
            </div>
            
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="DrillsEngine.startDrillWithTimer('${drill.id}', ${drill.duration})">
                ▶ Entrenar (${drill.duration}m)
              </button>
              <button class="btn btn-green btn-sm" onclick="DrillsEngine.toggleDrillComplete('${drill.id}')">
                ${isCompleted ? '✓' : 'Marcar Hecho'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  static async toggleDrillComplete(drillId) {
    if (DrillsEngine.pendingProgress.has(drillId)) return;
    DrillsEngine.pendingProgress.add(drillId);
    const progress = StorageManager.getDrillsProgress();
    if (!progress[drillId]) {
      progress[drillId] = { completed: false, reps: 0, lastDate: new Date().toISOString() };
    }
    progress[drillId].completed = !progress[drillId].completed;
    progress[drillId].lastDate = new Date().toISOString();
    try {
      await StorageManager.saveDrillsProgress(progress);
      App.showSaveConfirmation(
        progress[drillId].completed ? 'Drill completado' : 'Estado del drill actualizado',
        progress[drillId].completed ? 'El progreso quedó registrado en la ficha.' : 'El ejercicio volvió a quedar pendiente.'
      );
      DrillsEngine.renderDrillsView();
      if (window.App && App.renderDashboard) App.renderDashboard();
    } catch (error) {
      console.error('No se pudo guardar el progreso:', error);
      App.showToast('No se pudo guardar el progreso. Intentá nuevamente.');
    } finally {
      DrillsEngine.pendingProgress.delete(drillId);
    }
  }

  static startDrillWithTimer(drillId, minutes) {
    DrillsEngine.stopTimer();
    DrillsEngine.timerSeconds = minutes * 60;
    DrillsEngine.timerInitial = minutes * 60;
    DrillsEngine.openTimerModal();
    DrillsEngine.startTimer();
  }

  static openTimerModal() {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-header">
        <div>
          <span class="badge badge-gold" style="margin-bottom: 0.35rem;">Metodología Pomodoro en Golf</span>
          <h3>Temporizador de Práctica con Propósito</h3>
        </div>
        <button class="modal-close" onclick="DrillsEngine.stopTimer(); App.closeModal();">&times;</button>
      </div>

      <div class="timer-container">
        <div class="timer-circle">
          <div class="timer-phase" id="timer-phase-label">${DrillsEngine.isBreakPhase ? 'Descanso Mental' : 'Foco / Práctica'}</div>
          <div class="timer-display" id="timer-display-text">${DrillsEngine.formatTime(DrillsEngine.timerSeconds)}</div>
        </div>

        <div class="timer-controls">
          <button class="btn btn-primary" id="timer-toggle-btn" onclick="DrillsEngine.toggleTimerState()">
            ${DrillsEngine.isTimerRunning ? '⏸ Pausar' : '▶ Iniciar'}
          </button>
          <button class="btn btn-secondary" onclick="DrillsEngine.resetTimer(1200)">
            🔄 20 min
          </button>
          <button class="btn btn-secondary" onclick="DrillsEngine.resetTimer(900)">
            🔄 15 min
          </button>
          <button class="btn btn-secondary" onclick="DrillsEngine.resetTimer(300)">
            ☕ 5 min
          </button>
        </div>
      </div>

      <div class="ui-icon-copy" style="margin-top: 1.5rem; text-align: center; font-size: 0.85rem; color: var(--text-muted);">
        💡 <em>"20 minutos de práctica con intención y rutina valen más que 2 horas pegando 100 bolas en automático sin pensar." — SotaPar</em>
      </div>
    `;

    App.setModalCleanup(() => DrillsEngine.stopTimer());
    App.openModal();
  }

  static formatTime(totalSecs) {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  static toggleTimerState() {
    if (DrillsEngine.isTimerRunning) {
      DrillsEngine.pauseTimer();
    } else {
      DrillsEngine.startTimer();
    }
  }

  static startTimer() {
    DrillsEngine.isTimerRunning = true;
    const btn = document.getElementById('timer-toggle-btn');
    if (btn) btn.innerHTML = '⏸ Pausar';

    DrillsEngine.activeTimer = setInterval(() => {
      if (DrillsEngine.timerSeconds > 0) {
        DrillsEngine.timerSeconds--;
        const display = document.getElementById('timer-display-text');
        if (display) display.innerText = DrillsEngine.formatTime(DrillsEngine.timerSeconds);
      } else {
        DrillsEngine.handleTimerComplete();
      }
    }, 1000);
  }

  static pauseTimer() {
    DrillsEngine.isTimerRunning = false;
    clearInterval(DrillsEngine.activeTimer);
    const btn = document.getElementById('timer-toggle-btn');
    if (btn) btn.innerHTML = '▶ Reanudar';
  }

  static stopTimer() {
    DrillsEngine.isTimerRunning = false;
    clearInterval(DrillsEngine.activeTimer);
  }

  static resetTimer(seconds) {
    DrillsEngine.stopTimer();
    DrillsEngine.timerSeconds = seconds;
    DrillsEngine.timerInitial = seconds;
    DrillsEngine.isBreakPhase = (seconds <= 300);

    const display = document.getElementById('timer-display-text');
    const label = document.getElementById('timer-phase-label');
    const btn = document.getElementById('timer-toggle-btn');

    if (display) display.innerText = DrillsEngine.formatTime(seconds);
    if (label) label.innerText = DrillsEngine.isBreakPhase ? 'Descanso Mental' : 'Foco / Práctica';
    if (btn) btn.innerHTML = '▶ Iniciar';
  }

  static handleTimerComplete() {
    DrillsEngine.stopTimer();
    DrillsEngine.playAudioBeep();

    if (!DrillsEngine.isBreakPhase) {
      App.showToast('⏱️ ¡Sesión de práctica finalizada! Tómate 5 minutos de pausa mental.');
      DrillsEngine.resetTimer(300); // 5 min break
    } else {
      App.showToast('🔔 ¡Descanso finalizado! Listo para el siguiente bloque de entrenamiento.');
      DrillsEngine.resetTimer(1200); // 20 min work
    }
  }

  static playAudioBeep() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 587.33; // D5 tone
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.log('Audio not supported or permitted without user interaction');
    }
  }
}

window.DrillsEngine = DrillsEngine;
