/**
 * GolfCoach Pro - 360° Assessment Engine
 * Multi-pillar diagnostic questionnaire & player profiling
 */

const ASSESSMENT_QUESTIONS = [
  // Pillar: Swing & Mechanics
  {
    id: 'q1',
    category: 'swing',
    categoryName: 'Mecánica & Swing',
    text: '¿Con qué frecuencia logras un impacto sólido y en el centro de la cara del palo con tus hierros medios?',
    options: [
      { text: 'Rara vez, suelo dar golpes pesados (fat) o finos (thin)', score: 20 },
      { text: 'Aproximadamente en el 40-50% de los tiros', score: 50 },
      { text: 'La mayoría de las veces (70-80%)', score: 80 },
      { text: 'Prácticamente siempre, con trayectoria y control consistentes', score: 100 }
    ]
  },
  {
    id: 'q2',
    category: 'swing',
    categoryName: 'Mecánica & Swing',
    text: '¿Cuál es tu tendencia de vuelo de bola más habitual con el driver?',
    options: [
      { text: 'Slice o slice pronunciado que pierde mucha distancia y va al rough/fuera de límites', score: 30 },
      { text: 'Hook o pull imprevisto hacia la izquierda', score: 45 },
      { text: 'Ligero fade o draw controlable la mayor parte del tiempo', score: 85 },
      { text: 'Vuelo recto y penetrante con capacidad de moldear a voluntad', score: 100 }
    ]
  },
  {
    id: 'q3',
    category: 'swing',
    categoryName: 'Mecánica & Swing',
    text: '¿Conoces tus distancias reales (carry y total) con cada palo de tu bolsa?',
    options: [
      { text: 'No, elijo el palo por intuición o lo que veo en mis compañeros', score: 20 },
      { text: 'Tengo una idea aproximada de mis hierros pero varían mucho', score: 50 },
      { text: 'Conozco la distancia promedio de cada palo en condiciones normales', score: 85 },
      { text: 'Tengo una tabla calibrada con launch monitor / GPS para cada palo', score: 100 }
    ]
  },

  // Pillar: Short Game (Putt, Chip, Pitch, Bunker)
  {
    id: 'q4',
    category: 'shortGame',
    categoryName: 'Juego Corto',
    text: '¿Cuántos putts promedias en una ronda de 18 hoyos?',
    options: [
      { text: 'Más de 38 putts (muchos tripateos constantes)', score: 25 },
      { text: 'Entre 34 y 38 putts (algunos tripateos por vuelta)', score: 55 },
      { text: 'Entre 30 y 33 putts (máximo 1 o 2 tripateos)', score: 85 },
      { text: 'Menos de 30 putts con gran efectividad dentro de 2 metros', score: 100 }
    ]
  },
  {
    id: 'q5',
    category: 'shortGame',
    categoryName: 'Juego Corto',
    text: 'A 15-20 metros del green en el antegreen o rough corto, ¿qué tan cerca dejas la bola?',
    options: [
      { text: 'Frecuentemente hago filazos o topos y no llego al green', score: 20 },
      { text: 'Llego a green pero suelo dejarme putts largos de más de 4-5 metros', score: 50 },
      { text: 'Suelo dejarla a distancia de 1 solo putt (1-2.5 metros) el 60% de las veces', score: 80 },
      { text: 'Tengo un arsenal de golpes (chip rodado, pitch alto, flop) y suelo salvar el par', score: 100 }
    ]
  },
  {
    id: 'q6',
    category: 'shortGame',
    categoryName: 'Juego Corto',
    text: '¿Cómo te sientes cuando tu bola cae en un bunker alrededor de green?',
    options: [
      { text: 'Pánico total: suelo necesitar 2 o más intentos para sacarla', score: 20 },
      { text: 'Logro sacarla fuera, pero sin control de dónde queda la bola', score: 50 },
      { text: 'La saco al green con consistencia en un solo golpe', score: 80 },
      { text: 'Tengo excelente técnica de arena (uso del bounce) y ataco la bandera', score: 100 }
    ]
  },

  // Pillar: Strategy & Course Management
  {
    id: 'q7',
    category: 'strategy',
    categoryName: 'Estrategia de Campo',
    text: 'Al enfrentarte a un Par 4 con agua o fuera de límites a la derecha a distancia de driver:',
    options: [
      { text: 'Saco el driver e intento darle lo más fuerte posible ignorando el peligro', score: 25 },
      { text: 'Tomo el driver pero con miedo, lo que suele provocar un mal tiro', score: 40 },
      { text: 'Evalúo jugar una madera 3 o hierro largo al sector ancho del fairway', score: 85 },
      { text: 'Calculo el landing zone óptimo, ángulo al green y elimino el lado de peligro', score: 100 }
    ]
  },
  {
    id: 'q8',
    category: 'strategy',
    categoryName: 'Estrategia de Campo',
    text: 'Cuando la bandera está colocada en un rincón difícil cerca de un obstáculo:',
    options: [
      { text: 'Siempre apunto directamente al mástil de la bandera', score: 30 },
      { text: 'Apunto a la bandera sin considerar el margen de error', score: 50 },
      { text: 'Apunto al centro del green para garantizar dos putts y evitar el bogey grande', score: 90 },
      { text: 'Calculo la zona segura ("fat side") según el viento y mi golpe natural', score: 100 }
    ]
  },
  {
    id: 'q9',
    category: 'strategy',
    categoryName: 'Estrategia de Campo',
    text: '¿Cómo planificas tu ronda antes de salir a jugar a un campo?',
    options: [
      { text: 'Llego 5 minutos antes y voy directo al hoyo 1 sin revisar nada', score: 15 },
      { text: 'Miro la tarjeta de puntuación rápidamente en el club', score: 45 },
      { text: 'Reviso la meteorología, viento y la guía de hoyos con anticipación', score: 80 },
      { text: 'Defino una estrategia hoyo por hoyo, objetivos de tiros y zonas seguras', score: 100 }
    ]
  },

  // Pillar: Mental Fortitude & Focus
  {
    id: 'q10',
    category: 'mental',
    categoryName: 'Juego Mental',
    text: '¿Qué sucede con tu juego tras cometer un doble o triple bogey?',
    options: [
      { text: 'Me enojo, pierdo la concentración y arruino los siguientes 3 o 4 hoyos', score: 20 },
      { text: 'Me frustro y me cuesta un par de hoyos volver al ritmo normal', score: 50 },
      { text: 'Aplico respiración y borrón de cuenta nueva para el siguiente golpe', score: 85 },
      { text: 'Acepto el error como parte del golf y mantengo mi compromiso con el plan', score: 100 }
    ]
  },
  {
    id: 'q11',
    category: 'mental',
    categoryName: 'Juego Mental',
    text: '¿Tienes y ejecutas una Rutina Pre-Golpe idéntica antes de CADA tiro?',
    options: [
      { text: 'No tengo rutina, me coloco y le pego a la bola', score: 15 },
      { text: 'A veces hago un swing de práctica pero varía mucho en cada golpe', score: 45 },
      { text: 'Tengo una rutina establecida de visualización y colocación (la uso el 75%)', score: 80 },
      { text: 'Mi rutina pre-golpe es sagrada e invariable: visualizo, respiro y ejecuto', score: 100 }
    ]
  },
  {
    id: 'q12',
    category: 'mental',
    categoryName: 'Juego Mental',
    text: '¿En qué piensas durante los 2 segundos que dura el swing?',
    options: [
      { text: 'En 4 o 5 pensamientos técnicos a la vez sobre codos, caderas y muñecas', score: 25 },
      { text: 'En el miedo a fallar hacia el agua o out of bounds', score: 35 },
      { text: 'En una sola sensación o disparador clave (ej. ritmo suave o rotación)', score: 85 },
      { text: 'Mente despejada, visualizando únicamente el objetivo y dejando fluir el cuerpo', score: 100 }
    ]
  },

  // Pillar: Physical Fitness & Mobility
  {
    id: 'q13',
    category: 'fitness',
    categoryName: 'Físico & Movilidad',
    text: '¿Cómo describirías tu flexibilidad en hombros, caderas y columna torácica?',
    options: [
      { text: 'Muy rígido, me cuesta completar un backswing sin levantarme o arquearme', score: 30 },
      { text: 'Movilidad moderada pero siento tensiones y limitaciones al girar', score: 55 },
      { text: 'Buena rotación fluida de 90° de hombros con buena postura', score: 85 },
      { text: 'Excelente flexibilidad y rango articular adaptado al swing', score: 100 }
    ]
  },
  {
    id: 'q14',
    category: 'fitness',
    categoryName: 'Físico & Movilidad',
    text: '¿Realizas rutina de calentamiento y movilidad antes de pegar el primer golpe?',
    options: [
      { text: 'Ninguna, salgo directo del coche al tee de salida', score: 15 },
      { text: 'Doy un par de swings con dos hierros juntos en el tee', score: 45 },
      { text: '10-15 minutos de estiramientos dinámicos y bolas de práctica graduales', score: 85 },
      { text: 'Rutina completa de activación muscular, movilidad articular y putting green', score: 100 }
    ]
  },
  {
    id: 'q15',
    category: 'fitness',
    categoryName: 'Físico & Movilidad',
    text: '¿Cómo se siente tu nivel de energía física y resistencia en los hoyos 15 al 18?',
    options: [
      { text: 'Agotado física y mentalmente, suelo cometer mis peores errores al final', score: 25 },
      { text: 'Cansado, noto pérdida de velocidad y concentración', score: 55 },
      { text: 'Bien, mantengo hidratación y buena condición hasta el final', score: 85 },
      { text: 'Óptimo, con resistencia física para mantener el mismo swing los 18 hoyos', score: 100 }
    ]
  }
];

class AssessmentEngine {
  constructor() {
    this.currentStep = 0;
    this.userAnswers = {};
  }

  static renderDiagnosticView() {
    const container = document.getElementById('assessment-container');
    if (!container) return;

    const saved = StorageManager.getAssessment();
    
    container.innerHTML = `
      <div class="card card-gold-glow" style="margin-bottom: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2>Diagnóstico 360° del Golfista</h2>
            <p>Evalúa tus 5 pilares clave para identificar tus mayores áreas de mejora y bajar tu hándicap.</p>
          </div>
          <button class="btn btn-primary" onclick="AssessmentEngine.startQuiz()">
            <span class="nav-icon">✨</span> ${saved.completed ? 'Repetir Evaluación' : 'Comenzar Test 360°'}
          </button>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom: 2rem;">
        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <div class="card-icon">📊</div>
              <h3 class="card-title">Radar de Habilidades 360°</h3>
            </div>
            <span class="badge badge-gold">Puntuación Integral</span>
          </div>
          <div class="radar-container" id="radar-chart-box">
            ${AssessmentEngine.generateRadarSVG(saved.scores)}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <div class="card-icon">🏌️‍♂️</div>
              <h3 class="card-title">Diagnóstico & Recomendación del Coach</h3>
            </div>
            <span class="badge badge-green">Plan Activo</span>
          </div>
          <div id="assessment-report-box">
            ${AssessmentEngine.generateReportHTML(saved.scores)}
          </div>
        </div>
      </div>

      <!-- Quiz Modal / Container -->
      <div id="quiz-flow-container" style="display: none;"></div>
    `;
  }

  static generateRadarSVG(scores) {
    // 5 pillars: swing, shortGame, strategy, mental, fitness
    const pillars = [
      { key: 'swing', label: 'Swing', val: scores.swing || 50 },
      { key: 'shortGame', label: 'Juego Corto', val: scores.shortGame || 50 },
      { key: 'strategy', label: 'Estrategia', val: scores.strategy || 50 },
      { key: 'mental', label: 'Mente', val: scores.mental || 50 },
      { key: 'fitness', label: 'Físico', val: scores.fitness || 50 }
    ];

    const size = 260;
    const center = size / 2;
    const radius = 95;
    const numPoints = pillars.length;

    // Helper for polar coordinates
    const getCoord = (value, index) => {
      const angle = (Math.PI * 2 / numPoints) * index - Math.PI / 2;
      const r = (value / 100) * radius;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle)
      };
    };

    // Generate grid circles
    let gridCircles = '';
    [25, 50, 75, 100].forEach(level => {
      const r = (level / 100) * radius;
      gridCircles += `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3,3" />`;
    });

    // Generate axis lines & labels
    let axisLines = '';
    let labels = '';
    pillars.forEach((p, idx) => {
      const outer = getCoord(100, idx);
      const labelCoord = getCoord(122, idx);
      axisLines += `<line x1="${center}" y1="${center}" x2="${outer.x}" y2="${outer.y}" stroke="rgba(255,255,255,0.12)" />`;
      labels += `<text x="${labelCoord.x}" y="${labelCoord.y + 4}" text-anchor="middle" font-size="11" fill="var(--text-muted)" font-weight="600">${p.label} (${p.val}%)</text>`;
    });

    // Generate polygon points
    const pointsStr = pillars.map((p, idx) => {
      const c = getCoord(p.val, idx);
      return `${c.x},${c.y}`;
    }).join(' ');

    return `
      <svg viewBox="0 0 ${size} ${size}" style="width: 100%; height: 100%;">
        ${gridCircles}
        ${axisLines}
        <polygon points="${pointsStr}" fill="rgba(212, 175, 55, 0.25)" stroke="var(--gold-400)" stroke-width="2.5" />
        ${pillars.map((p, idx) => {
          const c = getCoord(p.val, idx);
          return `<circle cx="${c.x}" cy="${c.y}" r="4" fill="var(--gold-300)" stroke="var(--primary-900)" stroke-width="1.5" />`;
        }).join('')}
        ${labels}
      </svg>
    `;
  }

  static generateReportHTML(scores) {
    const avg = Math.round((scores.swing + scores.shortGame + scores.strategy + scores.mental + scores.fitness) / 5);
    
    // Determine weakest and strongest pillars
    const pillars = [
      { name: 'Mecánica de Swing', val: scores.swing, cat: 'swing' },
      { name: 'Juego Corto (Putt/Chip/Bunker)', val: scores.shortGame, cat: 'shortGame' },
      { name: 'Estrategia de Campo', val: scores.strategy, cat: 'strategy' },
      { name: 'Juego Mental & Rutina', val: scores.mental, cat: 'mental' },
      { name: 'Físico & Flexibilidad', val: scores.fitness, cat: 'fitness' }
    ].sort((a, b) => a.val - b.val);

    const weakest = pillars[0];
    const secondWeakest = pillars[1];
    const strongest = pillars[pillars.length - 1];

    let playerProfile = 'Aficionado en Búsqueda de Consistencia';
    if (avg >= 85) playerProfile = 'Golfista Competitivo / Bajo Hándicap';
    else if (avg >= 70) playerProfile = 'Aspirante a Romper 80 Golpes';
    else if (avg < 45) playerProfile = 'Iniciación / Fundamentos Clave';

    return `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 0.85rem 1rem; border-radius: var(--radius-md);">
          <div>
            <span style="font-size: 0.75rem; color: var(--text-subtle); text-transform: uppercase;">Perfil Asignado</span>
            <h4 style="color: var(--gold-400); font-size: 1.05rem;">${playerProfile}</h4>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 0.75rem; color: var(--text-subtle); text-transform: uppercase;">Índice General</span>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--primary-300);">${avg}/100</div>
          </div>
        </div>

        <div style="border-left: 3px solid var(--color-danger); padding-left: 0.85rem;">
          <h5 style="color: #f87171; font-size: 0.9rem; margin-bottom: 0.2rem;">Área Crítica a Trabajar (#1): ${weakest.name} (${weakest.val}%)</h5>
          <p style="font-size: 0.85rem; color: var(--text-muted);">
            Esta es la mayor fuga de golpes en tus rondas. Dedicar el 50% de tus sesiones de práctica a este pilar reducirá drásticamente tu hándicap.
          </p>
        </div>

        <div style="border-left: 3px solid var(--color-warning); padding-left: 0.85rem;">
          <h5 style="color: #fbbf24; font-size: 0.9rem; margin-bottom: 0.2rem;">Segunda Oportunidad de Mejora: ${secondWeakest.name} (${secondWeakest.val}%)</h5>
          <p style="font-size: 0.85rem; color: var(--text-muted);">
            Complementa tus entrenamientos con simulaciones estructuradas bajo presión.
          </p>
        </div>

        <div style="border-left: 3px solid var(--color-success); padding-left: 0.85rem;">
          <h5 style="color: #34d399; font-size: 0.9rem; margin-bottom: 0.2rem;">Mayor Fortaleza: ${strongest.name} (${strongest.val}%)</h5>
          <p style="font-size: 0.85rem; color: var(--text-muted);">
            Tu base más sólida. Apóyate en esta habilidad cuando estés en situaciones difíciles en el campo.
          </p>
        </div>

        <div style="margin-top: 0.5rem;">
          <button class="btn btn-green btn-sm" style="width: 100%;" onclick="App.navigateTo('drills')">
            🎯 Ver Drills Recomendados para tu Perfil
          </button>
        </div>
      </div>
    `;
  }

  static startQuiz() {
    window.currentQuizInstance = new AssessmentEngine();
    window.currentQuizInstance.renderQuizStep();
  }

  renderQuizStep() {
    const q = ASSESSMENT_QUESTIONS[this.currentStep];
    const total = ASSESSMENT_QUESTIONS.length;
    const progressPct = Math.round(((this.currentStep) / total) * 100);

    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-header">
        <div>
          <span class="badge badge-gold" style="margin-bottom: 0.35rem;">Pregunta ${this.currentStep + 1} de ${total} • ${q.categoryName}</span>
          <h3>Evaluación Diagnóstica 360°</h3>
        </div>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>

      <div class="progress-bar-container" style="margin-bottom: 1.75rem;">
        <div class="progress-bar-fill" style="width: ${progressPct}%;"></div>
      </div>

      <div style="margin-bottom: 1.75rem;">
        <h4 style="font-size: 1.15rem; line-height: 1.4; color: var(--text-main);">${q.text}</h4>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.85rem; margin-bottom: 2rem;">
        ${q.options.map((opt, idx) => `
          <div class="routine-step" onclick="window.currentQuizInstance.selectAnswer(${opt.score})" style="cursor: pointer;">
            <div class="step-num">${String.fromCharCode(65 + idx)}</div>
            <div class="step-text" style="font-size: 0.95rem;">${opt.text}</div>
          </div>
        `).join('')}
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center;">
        <button class="btn btn-secondary btn-sm" ${this.currentStep === 0 ? 'disabled style="opacity:0.4;"' : ''} onclick="window.currentQuizInstance.prevStep()">
          ← Anterior
        </button>
        <span style="font-size: 0.82rem; color: var(--text-subtle);">${progressPct}% completado</span>
      </div>
    `;

    App.openModal();
  }

  selectAnswer(score) {
    const q = ASSESSMENT_QUESTIONS[this.currentStep];
    if (!this.userAnswers[q.category]) {
      this.userAnswers[q.category] = [];
    }
    this.userAnswers[q.category].push(score);

    this.currentStep++;
    if (this.currentStep < ASSESSMENT_QUESTIONS.length) {
      this.renderQuizStep();
    } else {
      this.finishQuiz();
    }
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      const q = ASSESSMENT_QUESTIONS[this.currentStep];
      if (this.userAnswers[q.category]) {
        this.userAnswers[q.category].pop();
      }
      this.renderQuizStep();
    }
  }

  finishQuiz() {
    // Calculate category averages
    const calcCat = (cat) => {
      const arr = this.userAnswers[cat] || [50];
      const sum = arr.reduce((acc, curr) => acc + curr, 0);
      return Math.round(sum / arr.length);
    };

    const scores = {
      swing: calcCat('swing'),
      shortGame: calcCat('shortGame'),
      strategy: calcCat('strategy'),
      mental: calcCat('mental'),
      fitness: calcCat('fitness')
    };

    const assessmentData = {
      completed: true,
      scores: scores,
      lastDate: new Date().toISOString()
    };

    StorageManager.saveAssessment(assessmentData);
    App.closeModal();
    App.showToast('✅ ¡Diagnóstico 360° completado con éxito!');

    // Re-render views
    AssessmentEngine.renderDiagnosticView();
    if (window.App && App.renderDashboard) {
      App.renderDashboard();
    }
  }
}

window.AssessmentEngine = AssessmentEngine;
