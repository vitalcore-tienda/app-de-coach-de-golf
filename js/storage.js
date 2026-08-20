/**
 * GolfCoach Pro - Data Storage Layer
 * LocalStorage management for Player Profile, Evaluations, Drills, Rounds, Goals
 */

const STORAGE_KEYS = {
  PROFILE: 'golfcoach_profile',
  ASSESSMENT: 'golfcoach_assessment',
  DRILLS_PROGRESS: 'golfcoach_drills_progress',
  ROUNDS: 'golfcoach_rounds',
  MENTAL_ROUTINE: 'golfcoach_mental_routine',
  GOALS: 'golfcoach_goals',
  CHAT_HISTORY: 'golfcoach_chat_history',
  NOTES: 'golfcoach_notes',
  THEME: 'golfcoach_theme'
};

const DEFAULT_PROFILE = {
  name: 'Alejandro Golfista',
  handicap: 18.4,
  targetHandicap: 12.0,
  playerCategory: 'Aficionado en Búsqueda de Consistencia',
  experienceYears: 4,
  dominantHand: 'Diestro',
  driverDistanceAvg: 220,
  homeClub: 'Real Club de Golf',
  createdDate: new Date().toISOString()
};

const DEFAULT_ASSESSMENT = {
  completed: true,
  scores: {
    swing: 65,      // Técnica y swing
    shortGame: 55,  // Putt, Chip, Bunker
    strategy: 60,   // Gestión de campo
    mental: 50,     // Concentración y rutina
    fitness: 70     // Movilidad y fuerza
  },
  lastDate: new Date().toISOString()
};

const DEFAULT_GOALS = [
  { id: 'g1', title: 'Bajar de 18 a 14 de Hándicap', targetDate: '2026-12-31', progress: 45, category: 'Handicap' },
  { id: 'g2', title: 'Reducir promedio a menos de 32 putts por ronda', targetDate: '2026-10-30', progress: 65, category: 'Juego Corto' },
  { id: 'g3', title: 'Completar 100% de la Rutina Pre-Golpe en cada tiro', targetDate: '2026-09-30', progress: 80, category: 'Juego Mental' }
];

const DEFAULT_ROUNDS = [
  {
    id: 'r1',
    date: '2026-08-15',
    course: 'Augusta Green Golf Club',
    holesCount: 18,
    totalPar: 72,
    totalScore: 86,
    scoreDiff: '+14',
    fairwaysHit: 8,
    fairwaysTotal: 14,
    girHit: 7,
    girTotal: 18,
    totalPutts: 33,
    penalties: 2,
    bunkerSaves: 2,
    bunkersTotal: 3,
    notes: 'Buen control de maderas en el tee. El putt de media distancia salvó varios pares.'
  },
  {
    id: 'r2',
    date: '2026-08-08',
    course: 'Lakeside Hills',
    holesCount: 18,
    totalPar: 72,
    totalScore: 90,
    scoreDiff: '+18',
    fairwaysHit: 6,
    fairwaysTotal: 14,
    girHit: 5,
    girTotal: 18,
    totalPutts: 36,
    penalties: 3,
    bunkerSaves: 1,
    bunkersTotal: 4,
    notes: 'Frustración tras un tripateo en el hoyo 5. Necesito reforzar la rutina pre-golpe y respiración.'
  }
];

class StorageManager {
  static get(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from storage:`, e);
      return defaultValue;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Error saving ${key} to storage:`, e);
      return false;
    }
  }

  // Specialized getters & setters
  static getProfile() {
    return this.get(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
  }

  static saveProfile(profile) {
    return this.set(STORAGE_KEYS.PROFILE, profile);
  }

  static getAssessment() {
    return this.get(STORAGE_KEYS.ASSESSMENT, DEFAULT_ASSESSMENT);
  }

  static saveAssessment(assessment) {
    return this.set(STORAGE_KEYS.ASSESSMENT, assessment);
  }

  static getRounds() {
    return this.get(STORAGE_KEYS.ROUNDS, DEFAULT_ROUNDS);
  }

  static saveRounds(rounds) {
    return this.set(STORAGE_KEYS.ROUNDS, rounds);
  }

  static addRound(round) {
    const rounds = this.getRounds();
    rounds.unshift(round);
    this.saveRounds(rounds);
    return rounds;
  }

  static getGoals() {
    return this.get(STORAGE_KEYS.GOALS, DEFAULT_GOALS);
  }

  static saveGoals(goals) {
    return this.set(STORAGE_KEYS.GOALS, goals);
  }

  static getDrillsProgress() {
    return this.get(STORAGE_KEYS.DRILLS_PROGRESS, {});
  }

  static saveDrillsProgress(progress) {
    return this.set(STORAGE_KEYS.DRILLS_PROGRESS, progress);
  }

  static getNotes() {
    return this.get(STORAGE_KEYS.NOTES, [
      {
        id: 'n1',
        date: '2026-08-18',
        title: 'Sensación en el take away',
        content: 'Mantener la cara del palo cuadrada al arrancar el backswing sin quebrar las muñecas antes de tiempo.',
        category: 'Swing'
      }
    ]);
  }

  static saveNotes(notes) {
    return this.set(STORAGE_KEYS.NOTES, notes);
  }

  static getChatHistory() {
    return this.get(STORAGE_KEYS.CHAT_HISTORY, [
      {
        sender: 'coach',
        text: '¡Hola! Soy tu Mentor de Golf. Basado en la metodología de SotaPar, estoy aquí para guiarte en técnica, estrategia, juego mental y bajada de hándicap. ¿En qué aspecto de tu juego quieres enfocarte hoy?',
        time: '10:00'
      }
    ]);
  }

  static saveChatHistory(history) {
    return this.set(STORAGE_KEYS.CHAT_HISTORY, history);
  }

  static exportAllData() {
    const allData = {
      profile: this.getProfile(),
      assessment: this.getAssessment(),
      rounds: this.getRounds(),
      goals: this.getGoals(),
      drills: this.getDrillsProgress(),
      notes: this.getNotes(),
      chat: this.getChatHistory(),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(allData, null, 2);
  }

  static importAllData(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.profile) this.saveProfile(data.profile);
      if (data.assessment) this.saveAssessment(data.assessment);
      if (data.rounds) this.saveRounds(data.rounds);
      if (data.goals) this.saveGoals(data.goals);
      if (data.drills) this.saveDrillsProgress(data.drills);
      if (data.notes) this.saveNotes(data.notes);
      return true;
    } catch (e) {
      console.error('Error importing data:', e);
      return false;
    }
  }
}

window.StorageManager = StorageManager;
