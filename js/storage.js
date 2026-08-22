/**
 * GolfCoach Pro - Repositorio de datos
 *
 * Mantiene compatibilidad con la interfaz síncrona que ya usa la app y guarda
 * los datos de forma estructurada en IndexedDB. LocalStorage queda como caché
 * y respaldo para navegadores que no exponen IndexedDB.
 */

const STORAGE_KEYS = {
  PROFILE: 'golfcoach_profile',
  PLAYERS: 'golfcoach_players',
  ACTIVE_PLAYER: 'golfcoach_active_player',
  ASSESSMENT: 'golfcoach_assessment',
  DRILLS_PROGRESS: 'golfcoach_drills_progress',
  ROUNDS: 'golfcoach_rounds',
  MENTAL_ROUTINE: 'golfcoach_mental_routine',
  GOALS: 'golfcoach_goals',
  CHAT_HISTORY: 'golfcoach_chat_history',
  NOTES: 'golfcoach_notes',
  THEME: 'golfcoach_theme'
};

const PLAYER_DATA_KEYS = [
  STORAGE_KEYS.ASSESSMENT,
  STORAGE_KEYS.DRILLS_PROGRESS,
  STORAGE_KEYS.MENTAL_ROUTINE,
  STORAGE_KEYS.GOALS,
  STORAGE_KEYS.CHAT_HISTORY,
  STORAGE_KEYS.NOTES
];

const DEFAULT_PROFILE = {
  name: 'Alejandro Golfista',
  email: '',
  phone: '',
  birthDate: '',
  gender: '',
  federationLicense: '',
  handicap: 18.4,
  targetHandicap: 12.0,
  playerCategory: 'Aficionado en Búsqueda de Consistencia',
  experienceYears: 4,
  dominantHand: 'Diestro',
  driverDistanceAvg: 220,
  homeClub: 'Real Club de Golf',
  notes: '',
  createdDate: new Date().toISOString()
};

const DEFAULT_ASSESSMENT = {
  completed: true,
  scores: {
    swing: 65,
    shortGame: 55,
    strategy: 60,
    mental: 50,
    fitness: 70
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
    notes: 'Buen control de maderas en el tee. El putt de media distancia salvó varios pares.',
    holes: []
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
    notes: 'Frustración tras un tripateo en el hoyo 5. Necesito reforzar la rutina pre-golpe y respiración.',
    holes: []
  }
];

const DEFAULT_NOTES = [
  {
    id: 'n1',
    date: '2026-08-18',
    title: 'Sensación en el take away',
    content: 'Mantener la cara del palo cuadrada al arrancar el backswing sin quebrar las muñecas antes de tiempo.',
    category: 'Swing'
  }
];

const DEFAULT_CHAT_HISTORY = [
  {
    sender: 'coach',
    text: '¡Hola! Soy tu Mentor de Golf. Basado en la metodología de SotaPar, estoy aquí para guiarte en técnica, estrategia, juego mental y bajada de hándicap. ¿En qué aspecto de tu juego quieres enfocarte hoy?',
    time: '10:00'
  }
];

class StorageManager {
  static initialized = false;
  static initializingPromise = null;
  static persistenceAvailable = false;
  static activePlayerId = null;
  static activeProfile = null;
  static activeRounds = null;
  static playerDataCache = {};

  static clone(value) {
    if (value === undefined || value === null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  static get(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : StorageManager.clone(defaultValue);
    } catch (error) {
      console.error(`Error al leer ${key}:`, error);
      return StorageManager.clone(defaultValue);
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error al guardar ${key}:`, error);
      return false;
    }
  }

  static makeId(prefix) {
    if (window.GolfDatabase) return GolfDatabase.createId(prefix);
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  static getPlayerScopedStorageKey(key, playerId = StorageManager.activePlayerId) {
    return `${key}:${playerId || 'default'}`;
  }

  static defaultPlayerData(key) {
    const defaults = {
      [STORAGE_KEYS.ASSESSMENT]: DEFAULT_ASSESSMENT,
      [STORAGE_KEYS.DRILLS_PROGRESS]: {},
      [STORAGE_KEYS.MENTAL_ROUTINE]: {},
      [STORAGE_KEYS.GOALS]: DEFAULT_GOALS,
      [STORAGE_KEYS.CHAT_HISTORY]: DEFAULT_CHAT_HISTORY,
      [STORAGE_KEYS.NOTES]: DEFAULT_NOTES
    };
    return StorageManager.clone(defaults[key] ?? null);
  }

  static normalizeProfile(profile = {}, options = {}) {
    const now = new Date().toISOString();
    const fallback = StorageManager.clone(DEFAULT_PROFILE);
    return {
      ...fallback,
      ...StorageManager.clone(profile),
      id: profile.id || options.id || StorageManager.activePlayerId || StorageManager.makeId('player'),
      name: String(profile.name || fallback.name).trim() || fallback.name,
      handicap: Number.isFinite(Number(profile.handicap)) ? Number(profile.handicap) : fallback.handicap,
      targetHandicap: Number.isFinite(Number(profile.targetHandicap)) ? Number(profile.targetHandicap) : fallback.targetHandicap,
      experienceYears: Number.isFinite(Number(profile.experienceYears)) ? Number(profile.experienceYears) : fallback.experienceYears,
      driverDistanceAvg: Number.isFinite(Number(profile.driverDistanceAvg)) ? Number(profile.driverDistanceAvg) : fallback.driverDistanceAvg,
      createdDate: profile.createdDate || profile.createdAt || now,
      createdAt: profile.createdAt || profile.createdDate || now,
      updatedAt: now
    };
  }

  static normalizeRound(round = {}) {
    const totalScore = Number(round.totalScore || 0);
    const totalPar = Number(round.totalPar || 0);
    const numericDiff = Number.isFinite(Number(round.scoreToPar))
      ? Number(round.scoreToPar)
      : totalScore - totalPar;
    const scoreDiff = round.scoreDiff || (numericDiff > 0 ? `+${numericDiff}` : (numericDiff === 0 ? 'E' : `${numericDiff}`));
    return {
      ...StorageManager.clone(round),
      id: round.id || StorageManager.makeId('round'),
      playerId: round.playerId || StorageManager.activePlayerId,
      date: round.date || new Date().toISOString().split('T')[0],
      course: String(round.course || 'Club de Golf').trim() || 'Club de Golf',
      kind: round.kind || (round.tournamentId ? 'Torneo' : 'Práctica'),
      tournamentId: round.tournamentId || null,
      totalScore,
      totalPar,
      scoreToPar: numericDiff,
      scoreDiff,
      holes: Array.isArray(round.holes) ? StorageManager.clone(round.holes) : [],
      createdAt: round.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  static async initialize() {
    if (StorageManager.initialized) return StorageManager.persistenceAvailable;
    if (StorageManager.initializingPromise) return StorageManager.initializingPromise;

    StorageManager.initializingPromise = (async () => {
      try {
        await GolfDatabase.open();
        StorageManager.persistenceAvailable = true;
        await StorageManager.migrateLegacyData();

        const activeSetting = await GolfDatabase.get(GOLF_DATABASE.STORES.SETTINGS, 'active-player');
        const requestedPlayerId = activeSetting?.value || StorageManager.get(STORAGE_KEYS.ACTIVE_PLAYER, null);
        const players = await GolfDatabase.getAll(GOLF_DATABASE.STORES.PLAYERS);
        const playerId = players.some((player) => player.id === requestedPlayerId)
          ? requestedPlayerId
          : players[0]?.id;

        if (!playerId) throw new Error('No se pudo preparar un perfil de golfista.');
        await StorageManager.loadActivePlayer(playerId, false);
      } catch (error) {
        console.warn('Se usará el respaldo local de GolfCoach Pro:', error);
        StorageManager.persistenceAvailable = false;
        const savedProfile = StorageManager.get(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
        const profile = StorageManager.normalizeProfile(savedProfile, { id: savedProfile.id || 'player_local' });
        StorageManager.activePlayerId = profile.id;
        StorageManager.activeProfile = profile;
        StorageManager.activeRounds = StorageManager.get(STORAGE_KEYS.ROUNDS, DEFAULT_ROUNDS)
          .map((round) => StorageManager.normalizeRound({ ...round, playerId: profile.id }));
        StorageManager.playerDataCache = {};
        PLAYER_DATA_KEYS.forEach((key) => {
          StorageManager.playerDataCache[key] = StorageManager.get(
            StorageManager.getPlayerScopedStorageKey(key, profile.id),
            StorageManager.get(key, StorageManager.defaultPlayerData(key))
          );
        });
        StorageManager.set(STORAGE_KEYS.PROFILE, profile);
        StorageManager.set(STORAGE_KEYS.ACTIVE_PLAYER, profile.id);
      }

      StorageManager.initialized = true;
      return StorageManager.persistenceAvailable;
    })();

    try {
      return await StorageManager.initializingPromise;
    } finally {
      StorageManager.initializingPromise = null;
    }
  }

  static async migrateLegacyData() {
    const stores = GOLF_DATABASE.STORES;
    const migration = await GolfDatabase.get(stores.SETTINGS, 'legacy-migration-v1');
    if (migration?.completed) return;

    const legacyProfile = StorageManager.get(STORAGE_KEYS.PROFILE, null);
    const profile = StorageManager.normalizeProfile(legacyProfile || DEFAULT_PROFILE, {
      id: legacyProfile?.id || 'player_alejandro_demo'
    });
    await GolfDatabase.put(stores.PLAYERS, profile);

    await GolfDatabase.put(stores.HANDICAP_HISTORY, {
      id: StorageManager.makeId('hcp'),
      playerId: profile.id,
      date: String(profile.createdDate || new Date().toISOString()).slice(0, 10),
      handicap: profile.handicap,
      source: 'Perfil inicial',
      notes: 'Registro migrado desde la configuración inicial.',
      createdAt: new Date().toISOString()
    });

    const legacyRounds = StorageManager.get(STORAGE_KEYS.ROUNDS, DEFAULT_ROUNDS)
      .map((round) => StorageManager.normalizeRound({ ...round, playerId: profile.id }));
    await GolfDatabase.replacePlayerRounds(profile.id, legacyRounds);

    for (const key of PLAYER_DATA_KEYS) {
      const value = StorageManager.get(key, null);
      if (value !== null) {
        await GolfDatabase.put(stores.PLAYER_DATA, {
          id: `${profile.id}:${key}`,
          playerId: profile.id,
          key,
          value,
          updatedAt: new Date().toISOString()
        });
      }
    }

    await GolfDatabase.put(stores.SETTINGS, {
      id: 'legacy-migration-v1',
      completed: true,
      completedAt: new Date().toISOString()
    });
    await GolfDatabase.put(stores.SETTINGS, { id: 'active-player', value: profile.id });
  }

  static async loadActivePlayer(playerId, saveSelection = true) {
    if (!StorageManager.persistenceAvailable) return null;
    const stores = GOLF_DATABASE.STORES;
    const player = await GolfDatabase.get(stores.PLAYERS, playerId);
    if (!player) throw new Error('El golfista seleccionado no existe.');

    const [rounds, playerDataRows] = await Promise.all([
      GolfDatabase.getPlayerRounds(playerId),
      GolfDatabase.getAllByIndex(stores.PLAYER_DATA, 'playerId', playerId)
    ]);

    StorageManager.activePlayerId = playerId;
    StorageManager.activeProfile = StorageManager.normalizeProfile(player, { id: playerId });
    StorageManager.activeRounds = rounds.map((round) => StorageManager.normalizeRound(round));
    StorageManager.playerDataCache = {};
    playerDataRows.forEach((row) => {
      StorageManager.playerDataCache[row.key] = StorageManager.clone(row.value);
    });

    StorageManager.set(STORAGE_KEYS.ACTIVE_PLAYER, playerId);
    StorageManager.set(STORAGE_KEYS.PROFILE, StorageManager.activeProfile);
    StorageManager.set(STORAGE_KEYS.ROUNDS, StorageManager.activeRounds);
    PLAYER_DATA_KEYS.forEach((key) => {
      if (StorageManager.playerDataCache[key] !== undefined) {
        StorageManager.set(StorageManager.getPlayerScopedStorageKey(key, playerId), StorageManager.playerDataCache[key]);
      }
    });

    if (saveSelection) {
      await GolfDatabase.put(stores.SETTINGS, { id: 'active-player', value: playerId });
    }
    return StorageManager.clone(StorageManager.activeProfile);
  }

  static getActivePlayerId() {
    return StorageManager.activePlayerId;
  }

  static queueCloudSync(playerId = StorageManager.activePlayerId) {
    if (!StorageManager.persistenceAvailable || !playerId || !window.CloudSync?.queueLocalPlayer) return;
    CloudSync.queueLocalPlayer(playerId)
      .catch((error) => console.warn('No se pudo dejar el respaldo cloud en cola:', error));
  }

  static async getPlayers() {
    if (StorageManager.persistenceAvailable) {
      const players = await GolfDatabase.getAll(GOLF_DATABASE.STORES.PLAYERS);
      return players
        .map((player) => StorageManager.normalizeProfile(player, { id: player.id }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }
    const fallbackPlayers = StorageManager.get(STORAGE_KEYS.PLAYERS, []);
    const active = StorageManager.getProfile();
    const players = fallbackPlayers.length ? fallbackPlayers : [active];
    return players.map((player) => StorageManager.normalizeProfile(player, { id: player.id }));
  }

  static async createPlayer(profileData) {
    const player = StorageManager.normalizeProfile(profileData, { id: StorageManager.makeId('player') });
    if (StorageManager.persistenceAvailable) {
      await GolfDatabase.put(GOLF_DATABASE.STORES.PLAYERS, player);
      await GolfDatabase.put(GOLF_DATABASE.STORES.HANDICAP_HISTORY, {
        id: StorageManager.makeId('hcp'),
        playerId: player.id,
        date: new Date().toISOString().split('T')[0],
        handicap: player.handicap,
        source: 'Alta de jugador',
        notes: 'Hándicap informado al crear el perfil.',
        createdAt: new Date().toISOString()
      });
      await StorageManager.loadActivePlayer(player.id);
      StorageManager.queueCloudSync(player.id);
      return player;
    }

    const players = StorageManager.get(STORAGE_KEYS.PLAYERS, []);
    players.push(player);
    StorageManager.set(STORAGE_KEYS.PLAYERS, players);
    StorageManager.activePlayerId = player.id;
    StorageManager.activeProfile = player;
    StorageManager.activeRounds = [];
    StorageManager.playerDataCache = {};
    StorageManager.set(STORAGE_KEYS.PROFILE, player);
    StorageManager.set(STORAGE_KEYS.ACTIVE_PLAYER, player.id);
    StorageManager.set(STORAGE_KEYS.ROUNDS, []);
    StorageManager.queueCloudSync(player.id);
    return player;
  }

  static async setActivePlayer(playerId) {
    if (StorageManager.persistenceAvailable) return StorageManager.loadActivePlayer(playerId);
    const players = await StorageManager.getPlayers();
    const player = players.find((candidate) => candidate.id === playerId);
    if (!player) throw new Error('El golfista seleccionado no existe.');
    StorageManager.activePlayerId = player.id;
    StorageManager.activeProfile = player;
    StorageManager.activeRounds = StorageManager.get(
      StorageManager.getPlayerScopedStorageKey(STORAGE_KEYS.ROUNDS, player.id),
      []
    );
    StorageManager.set(STORAGE_KEYS.ACTIVE_PLAYER, player.id);
    StorageManager.set(STORAGE_KEYS.PROFILE, player);
    StorageManager.set(STORAGE_KEYS.ROUNDS, StorageManager.activeRounds);
    return StorageManager.clone(player);
  }

  static getProfile() {
    return StorageManager.clone(
      StorageManager.activeProfile || StorageManager.normalizeProfile(StorageManager.get(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE))
    );
  }

  static async saveProfile(profile, options = {}) {
    const previous = StorageManager.activeProfile || StorageManager.getProfile();
    const player = StorageManager.normalizeProfile(profile, {
      id: profile.id || previous.id || StorageManager.activePlayerId
    });
    StorageManager.activePlayerId = player.id;
    StorageManager.activeProfile = player;
    StorageManager.set(STORAGE_KEYS.PROFILE, player);

    if (StorageManager.persistenceAvailable) {
      await GolfDatabase.put(GOLF_DATABASE.STORES.PLAYERS, player);
      const handicapChanged = Number(previous.handicap) !== Number(player.handicap);
      if (options.recordHandicap !== false && handicapChanged) {
        await GolfDatabase.put(GOLF_DATABASE.STORES.HANDICAP_HISTORY, {
          id: StorageManager.makeId('hcp'),
          playerId: player.id,
          date: options.handicapDate || new Date().toISOString().split('T')[0],
          handicap: player.handicap,
          source: options.handicapSource || 'Actualización de perfil',
          notes: options.handicapNotes || '',
          createdAt: new Date().toISOString()
        });
      }
    } else {
      const players = StorageManager.get(STORAGE_KEYS.PLAYERS, []);
      const index = players.findIndex((candidate) => candidate.id === player.id);
      if (index >= 0) players[index] = player;
      else players.push(player);
      StorageManager.set(STORAGE_KEYS.PLAYERS, players);
    }
    StorageManager.queueCloudSync(player.id);
    return StorageManager.clone(player);
  }

  static getPlayerData(key, defaultValue) {
    const fallback = defaultValue === undefined ? StorageManager.defaultPlayerData(key) : defaultValue;
    if (StorageManager.playerDataCache[key] !== undefined) return StorageManager.clone(StorageManager.playerDataCache[key]);
    return StorageManager.clone(fallback);
  }

  static async savePlayerData(key, value) {
    const cloned = StorageManager.clone(value);
    StorageManager.playerDataCache[key] = cloned;
    StorageManager.set(StorageManager.getPlayerScopedStorageKey(key), cloned);
    if (StorageManager.persistenceAvailable && StorageManager.activePlayerId) {
      await GolfDatabase.put(GOLF_DATABASE.STORES.PLAYER_DATA, {
        id: `${StorageManager.activePlayerId}:${key}`,
        playerId: StorageManager.activePlayerId,
        key,
        value: cloned,
        updatedAt: new Date().toISOString()
      });
    }
    StorageManager.queueCloudSync();
    return cloned;
  }

  static getAssessment() {
    return StorageManager.getPlayerData(STORAGE_KEYS.ASSESSMENT, DEFAULT_ASSESSMENT);
  }

  static saveAssessment(assessment) {
    return StorageManager.savePlayerData(STORAGE_KEYS.ASSESSMENT, assessment);
  }

  static getRounds() {
    const rounds = StorageManager.activeRounds ?? StorageManager.get(STORAGE_KEYS.ROUNDS, DEFAULT_ROUNDS);
    return StorageManager.clone(rounds).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  static async saveRounds(rounds) {
    const normalized = (rounds || [])
      .map((round) => StorageManager.normalizeRound({ ...round, playerId: StorageManager.activePlayerId }))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    StorageManager.activeRounds = normalized;
    StorageManager.set(STORAGE_KEYS.ROUNDS, normalized);
    StorageManager.set(StorageManager.getPlayerScopedStorageKey(STORAGE_KEYS.ROUNDS), normalized);
    if (StorageManager.persistenceAvailable && StorageManager.activePlayerId) {
      await GolfDatabase.replacePlayerRounds(StorageManager.activePlayerId, normalized);
    }
    StorageManager.queueCloudSync();
    return StorageManager.clone(normalized);
  }

  static async addRound(round) {
    const newRound = StorageManager.normalizeRound({
      ...round,
      id: round.id || StorageManager.makeId('round'),
      playerId: StorageManager.activePlayerId
    });
    const rounds = StorageManager.getRounds();
    rounds.unshift(newRound);
    StorageManager.activeRounds = rounds;
    StorageManager.set(STORAGE_KEYS.ROUNDS, rounds);
    StorageManager.set(StorageManager.getPlayerScopedStorageKey(STORAGE_KEYS.ROUNDS), rounds);
    if (StorageManager.persistenceAvailable) await GolfDatabase.saveRound(newRound);
    StorageManager.queueCloudSync();
    return StorageManager.clone(rounds);
  }

  static async getHandicapHistory(playerId = StorageManager.activePlayerId) {
    if (StorageManager.persistenceAvailable) {
      const history = await GolfDatabase.getAllByIndex(
        GOLF_DATABASE.STORES.HANDICAP_HISTORY,
        'playerId',
        playerId
      );
      return history.sort((a, b) => {
        const byDate = String(b.date).localeCompare(String(a.date));
        return byDate || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      });
    }
    return StorageManager.getPlayerData('golfcoach_handicap_history', []);
  }

  static async addHandicapRecord(record) {
    const playerId = record.playerId || StorageManager.activePlayerId;
    const handicap = Number(record.handicap);
    if (!playerId || !Number.isFinite(handicap) || handicap < -10 || handicap > 54) {
      throw new Error('Ingresá un hándicap válido entre -10 y 54.');
    }
    const entry = {
      id: record.id || StorageManager.makeId('hcp'),
      playerId,
      date: record.date || new Date().toISOString().split('T')[0],
      handicap,
      source: record.source || 'Manual',
      notes: String(record.notes || '').trim(),
      createdAt: record.createdAt || new Date().toISOString()
    };
    if (StorageManager.persistenceAvailable) {
      await GolfDatabase.put(GOLF_DATABASE.STORES.HANDICAP_HISTORY, entry);
    } else {
      const history = await StorageManager.getHandicapHistory(playerId);
      history.push(entry);
      await StorageManager.savePlayerData('golfcoach_handicap_history', history);
    }
    if (playerId === StorageManager.activePlayerId) {
      const profile = StorageManager.getProfile();
      profile.handicap = handicap;
      await StorageManager.saveProfile(profile, { recordHandicap: false });
    }
    StorageManager.queueCloudSync(playerId);
    return entry;
  }

  static async getTournaments(playerId = StorageManager.activePlayerId) {
    if (StorageManager.persistenceAvailable) {
      const tournaments = await GolfDatabase.getAllByIndex(
        GOLF_DATABASE.STORES.TOURNAMENTS,
        'playerId',
        playerId
      );
      return tournaments.sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
    }
    return StorageManager.getPlayerData('golfcoach_tournaments', []);
  }

  static async saveTournament(tournament) {
    const playerId = tournament.playerId || StorageManager.activePlayerId;
    if (!playerId) throw new Error('Primero seleccioná un golfista.');
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const normalized = {
      ...StorageManager.clone(tournament),
      id: tournament.id || StorageManager.makeId('tournament'),
      playerId,
      name: String(tournament.name || '').trim(),
      course: String(tournament.course || '').trim(),
      city: String(tournament.city || '').trim(),
      organizer: String(tournament.organizer || '').trim(),
      format: tournament.format || 'Stroke Play',
      status: tournament.status || 'Planificado',
      startDate: tournament.startDate || today,
      endDate: tournament.endDate || tournament.startDate || today,
      position: tournament.position ? Number(tournament.position) : null,
      totalScore: tournament.totalScore ? Number(tournament.totalScore) : null,
      notes: String(tournament.notes || '').trim(),
      createdAt: tournament.createdAt || now,
      updatedAt: now
    };
    if (!normalized.name) throw new Error('El torneo necesita un nombre.');
    if (StorageManager.persistenceAvailable) {
      await GolfDatabase.put(GOLF_DATABASE.STORES.TOURNAMENTS, normalized);
    } else {
      const tournaments = await StorageManager.getTournaments(playerId);
      const existingIndex = tournaments.findIndex((item) => item.id === normalized.id);
      if (existingIndex >= 0) tournaments[existingIndex] = normalized;
      else tournaments.push(normalized);
      await StorageManager.savePlayerData('golfcoach_tournaments', tournaments);
    }
    StorageManager.queueCloudSync(playerId);
    return normalized;
  }

  static getGoals() {
    return StorageManager.getPlayerData(STORAGE_KEYS.GOALS, DEFAULT_GOALS);
  }

  static saveGoals(goals) {
    return StorageManager.savePlayerData(STORAGE_KEYS.GOALS, goals);
  }

  static getDrillsProgress() {
    return StorageManager.getPlayerData(STORAGE_KEYS.DRILLS_PROGRESS, {});
  }

  static saveDrillsProgress(progress) {
    return StorageManager.savePlayerData(STORAGE_KEYS.DRILLS_PROGRESS, progress);
  }

  static getNotes() {
    return StorageManager.getPlayerData(STORAGE_KEYS.NOTES, DEFAULT_NOTES);
  }

  static saveNotes(notes) {
    return StorageManager.savePlayerData(STORAGE_KEYS.NOTES, notes);
  }

  static getChatHistory() {
    return StorageManager.getPlayerData(STORAGE_KEYS.CHAT_HISTORY, DEFAULT_CHAT_HISTORY);
  }

  static saveChatHistory(history) {
    return StorageManager.savePlayerData(STORAGE_KEYS.CHAT_HISTORY, history);
  }

  static exportAllData() {
    return JSON.stringify({
      schemaVersion: 1,
      player: StorageManager.getProfile(),
      assessment: StorageManager.getAssessment(),
      rounds: StorageManager.getRounds(),
      goals: StorageManager.getGoals(),
      drills: StorageManager.getDrillsProgress(),
      notes: StorageManager.getNotes(),
      chat: StorageManager.getChatHistory(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  static async importAllData(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.player || data.profile) await StorageManager.saveProfile(data.player || data.profile);
      if (data.assessment) await StorageManager.saveAssessment(data.assessment);
      if (data.rounds) await StorageManager.saveRounds(data.rounds);
      if (data.goals) await StorageManager.saveGoals(data.goals);
      if (data.drills) await StorageManager.saveDrillsProgress(data.drills);
      if (data.notes) await StorageManager.saveNotes(data.notes);
      if (data.chat) await StorageManager.saveChatHistory(data.chat);
      if (Array.isArray(data.handicapHistory)) {
        for (const record of data.handicapHistory) await StorageManager.addHandicapRecord(record);
      }
      if (Array.isArray(data.tournaments)) {
        for (const tournament of data.tournaments) await StorageManager.saveTournament(tournament);
      }
      return true;
    } catch (error) {
      console.error('Error al importar datos:', error);
      return false;
    }
  }
}

window.StorageManager = StorageManager;
