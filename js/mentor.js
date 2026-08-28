/**
 * GolfCoach Pro - Mentorship, Goals & Coach Journal Engine
 * Interactive Coach AI Chat, SMART goals manager, training journal
 */

const COACH_KNOWLEDGE_BASE = [
  {
    triggers: ['slice', 'driver', 'derecha', 'desviado'],
    response: `El slice suele ser provocado por dos factores combinados: un camino de swing "Over the top" (de afuera hacia adentro) y una cara del palo abierta en el impacto. 

**3 correcciones clave del coach:**
1. **Grip**: Asegúrate de ver 2 a 3 nudillos de tu mano izquierda al colocarte en el stance (evita el grip débil).
2. **Cuerpo cerrado en el set-up**: Alinea tus hombros levemente paralelos o apuntando a la derecha del objetivo.
3. **Drill de la Varilla**: Practica con una varilla clavada detrás de ti para forzar a que las manos bajen por el interior (in-to-out).`
  },
  {
    triggers: ['putt', 'tripateo', 'tres putts', 'green', 'distancia'],
    response: `El 80% de los tripateos en golf amateur no se deben a una mala lectura de línea, sino a una deficiente **gestión de la velocidad** en el primer putt largo.

**Recomendación para el putting:**
1. **Control de Distancia**: En el putting green, haz el *Ladder Drill* (de 5 a 12 metros). El objetivo es que la bola nunca quede a más de 50 cm del hoyo.
2. **Stroke con los hombros**: Bloquea las muñecas; el movimiento debe ser un péndulo puro generado por el triángulo hombros-pecho.
3. **No levantes la vista antes de tiempo**: Escucha la bola caer antes de mirar el hoyo.`
  },
  {
    triggers: ['mente', 'mental', 'nervios', 'presión', 'frustración', 'primer tee', 'miedo'],
    response: `Como decía el legendario Bobby Jones, *"El golf es un juego que se juega en un campo de 12 centímetros: el espacio entre tus orejas"*.

**Estrategia mental SotaPar:**
1. **Rutina Pre-Golpe Invariable**: Tu rutina es tu ancla de seguridad bajo presión. Respira hondo antes de cuadrar la cara del palo.
2. **La Regla de los 10 Pasos**: Tienes 10 pasos tras un mal golpe para desahogarte. Al paso 11, ese tiro ya no existe.
3. **Prueba el Box Breathing**: Inhala 4s, retén 4s, exhala 4s. Esto normaliza tus pulsaciones inmediatamente.`
  },
  {
    triggers: ['bunker', 'arena', 'sacada', 'enterrada'],
    response: `El bunker no requiere fuerza, sino **comprender el uso del bounce** de la suela de tu Sand Wedge.

**Claves para la arena:**
1. **Abre la cara ANTES de coger el grip**, no después.
2. **Entrada en la arena**: El palo debe golpear la arena unos 3-4 cm antes de la bola; es la capa de arena la que expulsa la bola suavemente.
3. **No desaceleres en el impacto**: Mantén la aceleración hasta un finish completo y alto.`
  },
  {
    triggers: ['bajar handicap', 'hándicap', '100', '90', '80', 'mejorar'],
    response: `Para bajar de 90 golpes no necesitas pegar drives de 280 metros, necesitas **eliminar los errores graves** (dobles bogeys o pérdidas de bola).

**Plan de acción para bajar hándicap:**
1. **Asegura la salida**: Si el driver tiene riesgo de out of bounds, juega madera o híbrido al centro.
2. **Juego corto (50% de tu práctica)**: Dedica la mitad de tus sesiones al chip y putt dentro de 2 metros.
3. **Apunta al centro del green**: Deja de atacar banderas comprometidas y garantiza dos putts para par o bogey fácil.`
  },
  {
    triggers: ['pomodoro', 'entrenamiento', 'practicar', 'tiempo', 'drill'],
    response: `En SotaPar recomendamos la **Técnica Pomodoro aplicada al Golf**:
- 20 minutos de concentración absoluta en un solo drill específico con rutina pre-golpe en cada bola.
- 5 minutos de pausa para hidratarte y analizar sensaciones.
- 2 o 3 bloques de 20 minutos bien enfocados son 10 veces más efectivos que tirar 2 cubos de 100 bolas sin parar.`
  }
];

class MentorEngine {
  static sendingMessage = false;

  static escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  static escapeWithLineBreaks(value) {
    return MentorEngine.escapeHTML(value).replace(/\r?\n/g, '<br>');
  }

  static normalizeChatSender(sender) {
    return sender === 'coach' ? 'coach' : 'user';
  }

  static clampProgress(value) {
    const progress = Number.parseInt(value, 10);
    if (!Number.isFinite(progress)) return 0;
    return Math.min(100, Math.max(0, progress));
  }

  static renderChatMessage(message = {}) {
    const sender = MentorEngine.normalizeChatSender(message?.sender);
    const text = MentorEngine.escapeWithLineBreaks(message?.text);
    const time = MentorEngine.escapeHTML(message?.time || '');

    return `
      <div class="chat-bubble ${sender}">
        ${text}
        <div style="font-size: 0.7rem; color: var(--text-subtle); margin-top: 0.35rem; text-align: right;">${time}</div>
      </div>
    `;
  }

  static renderGoal(goal = {}) {
    const progress = MentorEngine.clampProgress(goal?.progress);
    const title = MentorEngine.escapeHTML(goal?.title);
    const category = MentorEngine.escapeHTML(goal?.category);
    const targetDate = MentorEngine.escapeHTML(goal?.targetDate);

    return `
      <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span style="font-weight: 600; font-size: 0.95rem; color: var(--text-main);">${title}</span>
          <span class="badge badge-green">${progress}%</span>
        </div>
        <div class="progress-bar-container" style="margin-bottom: 0.4rem;">
          <div class="progress-bar-fill" style="width: ${progress}%;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-subtle);">
          <span>Categoría: ${category}</span>
          <span>Fecha límite: ${targetDate}</span>
        </div>
      </div>
    `;
  }

  static renderNote(note = {}) {
    const title = MentorEngine.escapeHTML(note?.title);
    const date = MentorEngine.escapeHTML(note?.date);
    const content = MentorEngine.escapeHTML(note?.content);

    return `
      <div style="background: var(--bg-surface-elevated); padding: 0.85rem 1rem; border-radius: var(--radius-md); border-left: 3px solid var(--gold-400);">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
          <h5 style="color: var(--text-main); font-size: 0.9rem;">${title}</h5>
          <span style="font-size: 0.72rem; color: var(--text-subtle);">${date}</span>
        </div>
        <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.4;">${content}</p>
      </div>
    `;
  }

  static renderMentorView() {
    const container = document.getElementById('mentor-container');
    if (!container) return;

    const chatHistory = StorageManager.getChatHistory();
    const goals = StorageManager.getGoals();
    const notes = StorageManager.getNotes();

    container.innerHTML = `
      <div class="card card-gold-glow" style="margin-bottom: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.25rem;">
          <div>
            <h2>Centro de Mentoría & Metas</h2>
            <p>Consejos expertos basados en la metodología de SotaPar, seguimiento de metas SMART y diario de sensaciones.</p>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <button class="btn btn-primary" onclick="MentorEngine.openNewGoalModal()">
              🎯 Añadir Nueva Meta
            </button>
            <button class="btn btn-secondary" onclick="MentorEngine.openNewNoteModal()">
              📝 Escribir Nota de Sensaciones
            </button>
          </div>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom: 2rem;">
        <!-- Coach AI Chat Container -->
        <div class="chat-container">
          <div class="chat-header">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="player-avatar" style="width: 36px; height: 36px; font-size: 0.9rem;">⛳</div>
              <div>
                <h4 style="font-size: 0.95rem;">Coach Virtual de Golf</h4>
                <p style="font-size: 0.75rem; color: var(--color-success);">● En línea • Metodología SotaPar</p>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="MentorEngine.clearChat()">Limpiar Chat</button>
          </div>

          <div class="chat-messages" id="chat-messages-box">
            ${chatHistory.length
              ? chatHistory.map((message) => MentorEngine.renderChatMessage(message)).join('')
              : '<div class="portal-empty-state">Todavía no hay conversación. Escribí una consulta concreta para empezar.</div>'}
          </div>

          <!-- Quick prompts -->
          <div style="padding: 0.5rem 1rem; background: var(--bg-surface-elevated); border-top: 1px solid var(--border-subtle); display: flex; gap: 0.4rem; overflow-x: auto;">
            <button class="filter-pill" style="font-size: 0.75rem;" onclick="MentorEngine.sendQuickPrompt('¿Cómo corregir el slice con el driver?')">🏌️ Corregir Slice</button>
            <button class="filter-pill" style="font-size: 0.75rem;" onclick="MentorEngine.sendQuickPrompt('¿Cómo evitar los tripateos?')">⛳ Eliminar Tripateos</button>
            <button class="filter-pill" style="font-size: 0.75rem;" onclick="MentorEngine.sendQuickPrompt('¿Cómo controlar los nervios en el tee del 1?')">🧘 Manejo de Nervios</button>
            <button class="filter-pill" style="font-size: 0.75rem;" onclick="MentorEngine.sendQuickPrompt('¿Cómo bajar mi hándicap?')">📈 Bajar Hándicap</button>
          </div>

          <div class="chat-input-bar">
            <input type="text" class="form-control" id="chat-input-field" placeholder="Pregunta al Coach sobre swing, mente, putts..." onkeypress="if(event.key==='Enter') MentorEngine.sendMessage()">
            <button class="btn btn-primary" id="chat-send-btn" onclick="MentorEngine.sendMessage()">Enviar</button>
          </div>
        </div>

        <!-- Goals & Notes Column -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <!-- SMART Goals Card -->
          <div class="card">
            <div class="card-header">
              <div class="card-title-group">
                <div class="card-icon">🎯</div>
                <h3 class="card-title">Metas de Rendimiento (SMART)</h3>
              </div>
              <span class="badge badge-gold">${goals.length} Activas</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 1rem;">
              ${goals.length
                ? goals.map((goal) => MentorEngine.renderGoal(goal)).join('')
                : '<div class="portal-empty-state">Aún no hay metas para este golfista.<br><button class="btn btn-secondary btn-sm" style="margin-top:0.7rem;" onclick="MentorEngine.openNewGoalModal()">Crear primera meta</button></div>'}
            </div>
          </div>

          <!-- Notes Journal Card -->
          <div class="card">
            <div class="card-header">
              <div class="card-title-group">
                <div class="card-icon">📖</div>
                <h3 class="card-title">Diario de Sensaciones & Lecciones</h3>
              </div>
              <span class="badge badge-green">${notes.length} Entradas</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.85rem; max-height: 220px; overflow-y: auto;">
              ${notes.length
                ? notes.map((note) => MentorEngine.renderNote(note)).join('')
                : '<div class="portal-empty-state">El diario está vacío. Las primeras sensaciones se guardarán cuando las escribas.</div>'}
            </div>
          </div>
        </div>
      </div>
    `;

    MentorEngine.scrollChatToBottom();
  }

  static async sendMessage() {
    const input = document.getElementById('chat-input-field');
    const button = document.getElementById('chat-send-btn');
    if (MentorEngine.sendingMessage || !input || !input.value.trim()) return;

    const playerId = StorageManager.getActivePlayerId();
    if (!playerId) {
      App.showToast('Primero seleccioná un golfista.');
      return;
    }
    const userText = input.value.trim();
    MentorEngine.sendingMessage = true;
    if (button) button.disabled = true;
    input.value = '';

    const history = StorageManager.getChatHistory();
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      // Generate intelligent response based on keywords
      await new Promise((resolve) => window.setTimeout(resolve, 600));
      const lower = userText.toLowerCase();
      let reply = `Excelente punto. En el golf, cada dificultad es una oportunidad para afianzar tu rutina y comprensión del movimiento. Te recomiendo trabajar este aspecto en bloques de 20 minutos con el temporizador Pomodoro y anotar tus sensaciones en tu diario.`;

      for (const item of COACH_KNOWLEDGE_BASE) {
        if (item.triggers.some(t => lower.includes(t))) {
          reply = item.response;
          break;
        }
      }

      history.push({ sender: 'user', text: userText, time: timeNow });
      history.push({
        sender: 'coach',
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      await StorageManager.savePlayerDataFor(playerId, STORAGE_KEYS.CHAT_HISTORY, history);
      if (StorageManager.getActivePlayerId() === playerId) MentorEngine.renderChatMessagesOnly();
    } catch (error) {
      console.error('No se pudo guardar el mensaje:', error);
      if (StorageManager.getActivePlayerId() === playerId) {
        input.value = userText;
        App.showToast('No se pudo guardar el mensaje. Intentá nuevamente.');
      }
    } finally {
      MentorEngine.sendingMessage = false;
      if (button?.isConnected) button.disabled = false;
    }
  }

  static sendQuickPrompt(promptText) {
    const input = document.getElementById('chat-input-field');
    if (input) {
      input.value = promptText;
      MentorEngine.sendMessage();
    }
  }

  static renderChatMessagesOnly() {
    const box = document.getElementById('chat-messages-box');
    if (!box) return;

    const history = StorageManager.getChatHistory();
    box.innerHTML = history.length
      ? history.map((message) => MentorEngine.renderChatMessage(message)).join('')
      : '<div class="portal-empty-state">Todavía no hay conversación. Escribí una consulta concreta para empezar.</div>';

    MentorEngine.scrollChatToBottom();
  }

  static scrollChatToBottom() {
    const box = document.getElementById('chat-messages-box');
    if (box) box.scrollTop = box.scrollHeight;
  }

  static async clearChat() {
    if (!StorageManager.getChatHistory().length) return;
    if (!window.confirm('¿Querés eliminar toda la conversación guardada para este golfista?')) return;
    try {
      await StorageManager.saveChatHistory([]);
      MentorEngine.renderChatMessagesOnly();
      App.showToast('Conversación eliminada de esta ficha.');
    } catch (error) {
      console.error('No se pudo limpiar la conversación:', error);
      App.showToast('No se pudo limpiar la conversación. Intentá nuevamente.');
    }
  }

  static openNewGoalModal() {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-header">
        <div>
          <span class="badge badge-gold" style="margin-bottom: 0.35rem;">Planificación Deportiva</span>
          <h3>Nueva Meta de Golf (SMART)</h3>
        </div>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>

      <div class="form-group">
        <label class="form-label">Título del Objetivo</label>
        <input type="text" class="form-control" id="goal-title-input" placeholder="ej. Bajar a 14 de hándicap o embocar 90% de putts a 1 metro">
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Categoría</label>
          <select class="form-control" id="goal-cat-select">
            <option value="Handicap">Hándicap</option>
            <option value="Juego Corto">Juego Corto</option>
            <option value="Swing & Drive">Swing & Drive</option>
            <option value="Juego Mental">Juego Mental</option>
            <option value="Físico">Físico & Movilidad</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Fecha Objetivo</label>
          <input type="date" class="form-control" id="goal-date-input" value="${GolfUtils.localDateISO()}">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Progreso Inicial (%)</label>
        <input type="number" class="form-control" id="goal-progress-input" value="20" min="0" max="100">
      </div>

      <div style="margin-top: 1.5rem; text-align: right;">
        <button class="btn btn-primary" id="goal-save-btn" onclick="MentorEngine.saveNewGoal()">Guardar Meta</button>
      </div>
    `;

    App.openModal();
  }

  static async saveNewGoal() {
    const title = document.getElementById('goal-title-input')?.value || '';
    const category = document.getElementById('goal-cat-select')?.value || 'Handicap';
    const targetDate = document.getElementById('goal-date-input')?.value || '';
    const progress = MentorEngine.clampProgress(document.getElementById('goal-progress-input')?.value);

    if (!title.trim()) {
      App.showToast('Por favor escribe el título de la meta.');
      return;
    }

    const goals = StorageManager.getGoals();
    goals.push({
      id: StorageManager.makeId('goal'),
      title,
      category,
      targetDate,
      progress
    });

    const button = document.getElementById('goal-save-btn');
    if (button?.disabled) return;
    try {
      if (button) button.disabled = true;
      await StorageManager.saveGoals(goals);
      App.closeModal();
      App.showToast('🎯 Meta guardada en tu plan de temporada.');
      MentorEngine.renderMentorView();
    } catch (error) {
      console.error('No se pudo guardar la meta:', error);
      if (button) button.disabled = false;
      App.showToast('No se pudo guardar la meta. Intentá nuevamente.');
    }
  }

  static openNewNoteModal() {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-header">
        <div>
          <span class="badge badge-gold" style="margin-bottom: 0.35rem;">Diario del Jugador</span>
          <h3>Nueva Nota de Sensaciones</h3>
        </div>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>

      <div class="form-group">
        <label class="form-label">Título / Clave del Día</label>
        <input type="text" class="form-control" id="note-title-input" placeholder="ej. Sensación de soltar las manos en el finish">
      </div>

      <div class="form-group">
        <label class="form-label">Detalle de la Sensación o Aprendizaje</label>
        <textarea class="form-control" id="note-content-input" rows="4" placeholder="¿Qué sentiste en el impacto? ¿Qué pensamiento te ayudó a mantener la calma?"></textarea>
      </div>

      <div style="margin-top: 1.5rem; text-align: right;">
        <button class="btn btn-primary" id="note-save-btn" onclick="MentorEngine.saveNewNote()">Guardar en el Diario</button>
      </div>
    `;

    App.openModal();
  }

  static async saveNewNote() {
    const title = document.getElementById('note-title-input')?.value || '';
    const content = document.getElementById('note-content-input')?.value || '';

    if (!title.trim() || !content.trim()) {
      App.showToast('Por favor completa el título y el contenido.');
      return;
    }

    const notes = StorageManager.getNotes();
    notes.unshift({
      id: StorageManager.makeId('note'),
      date: GolfUtils.localDateISO(),
      title,
      content,
      category: 'General'
    });

    const button = document.getElementById('note-save-btn');
    if (button?.disabled) return;
    try {
      if (button) button.disabled = true;
      await StorageManager.saveNotes(notes);
      App.closeModal();
      App.showToast('📝 Entrada guardada en tu diario de sensaciones.');
      MentorEngine.renderMentorView();
    } catch (error) {
      console.error('No se pudo guardar la nota:', error);
      if (button) button.disabled = false;
      App.showToast('No se pudo guardar la nota. Intentá nuevamente.');
    }
  }
}

window.MentorEngine = MentorEngine;
