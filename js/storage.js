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
  HANDICAP_HISTORY: 'golfcoach_handicap_history',
  TOURNAMENTS: 'golfcoach_tournaments',
  LEGACY_CLAIM_OWNER: 'golfcoach_legacy_claim_owner',
  THEME: 'golfcoach_theme'
};

const PLAYER_DATA_KEYS = [
  STORAGE_KEYS.ASSESSMENT,
  STORAGE_KEYS.DRILLS_PROGRESS,
  STORAGE_KEYS.MENTAL_ROUTINE,
  STORAGE_KEYS.GOALS,
  STORAGE_KEYS.CHAT_HISTORY,
  STORAGE_KEYS.NOTES,
  STORAGE_KEYS.HANDICAP_HISTORY,
  STORAGE_KEYS.TOURNAMENTS
];

const DEFAULT_PROFILE = {
  name: '',
  email: '',
  phone: '',
  birthDate: '',
  gender: '',
  federationLicense: '',
  handicap: null,
  targetHandicap: null,
  playerCategory: '',
  experienceYears: 0,
  dominantHand: 'Diestro',
  driverDistanceAvg: null,
  homeClub: '',
  notes: '',
  createdDate: new Date().toISOString()
};

const DEFAULT_ASSESSMENT = {
  completed: false,
  scores: {
    swing: 0,
    shortGame: 0,
    strategy: 0,
    mental: 0,
    fitness: 0
  },
  lastDate: null
};

const DEFAULT_GOALS = [];
const DEFAULT_ROUNDS = [];
const DEFAULT_NOTES = [];
const DEFAULT_CHAT_HISTORY = [];

class StorageManager {
  static initialized = false;
  static initializingPromise = null;
  static persistenceAvailable = false;
  static activePlayerId = null;
  static activeProfile = null;
  static activeRounds = null;
  static playerDataCache = {};
  static workspaceOwnerId = null;
  static unclaimedLegacyCount = 0;
  static workspaceGeneration = 0;
  static playerSelectionGeneration = 0;

  static clone(value) {
    if (value === undefined || value === null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  static optionalNumber(value, fallback = null) {
    if (value === '' || value === null || value === undefined) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  static localDateISO(date = new Date()) {
    if (window.GolfUtils?.localDateISO) return GolfUtils.localDateISO(date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static isValidDateISO(value) {
    const text = String(value || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    const [year, month, day] = text.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
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

  static commitFallbackWrites(entries) {
    const writes = [...new Map(entries.map((entry) => [entry.key, entry])).values()];
    let snapshots;
    try {
      snapshots = writes.map((entry) => ({ key: entry.key, value: localStorage.getItem(entry.key) }));
      writes.forEach((entry) => localStorage.setItem(entry.key, JSON.stringify(entry.value)));
      return true;
    } catch (error) {
      if (snapshots) {
        snapshots.slice().reverse().forEach((snapshot) => {
          try {
            if (snapshot.value === null) localStorage.removeItem(snapshot.key);
            else localStorage.setItem(snapshot.key, snapshot.value);
          } catch (rollbackError) {
            console.error('No se pudo restaurar un dato local durante el rollback:', rollbackError);
          }
        });
      }
      throw new Error('No se pudo completar el guardado. Los cambios anteriores fueron restaurados.');
    }
  }

  static makeId(prefix) {
    if (window.GolfDatabase) return GolfDatabase.createId(prefix);
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  static getPlayerScopedStorageKey(key, playerId = StorageManager.activePlayerId) {
    const ownerId = StorageManager.workspaceOwnerId || 'locked';
    return `${key}:owner:${ownerId}:player:${playerId || 'none'}`;
  }

  static getWorkspaceStorageKey(key, ownerId = StorageManager.workspaceOwnerId) {
    return `${key}:owner:${ownerId || 'locked'}`;
  }

  static getWorkspaceValue(key, defaultValue = null) {
    if (!StorageManager.workspaceOwnerId) return StorageManager.clone(defaultValue);
    return StorageManager.get(StorageManager.getWorkspaceStorageKey(key), defaultValue);
  }

  static setWorkspaceValue(key, value) {
    if (!StorageManager.workspaceOwnerId) throw new Error('El espacio del entrenador está bloqueado.');
    if (!StorageManager.set(StorageManager.getWorkspaceStorageKey(key), value) && !StorageManager.persistenceAvailable) {
      throw new Error('No se pudo guardar en este dispositivo.');
    }
    return true;
  }

  static isWorkspaceUnlocked() {
    return Boolean(StorageManager.workspaceOwnerId);
  }

  static requireWorkspace() {
    if (!StorageManager.workspaceOwnerId) {
      throw new Error('Iniciá sesión como entrenador para acceder a las fichas locales.');
    }
    return StorageManager.workspaceOwnerId;
  }

  static clearActiveState() {
    StorageManager.activePlayerId = null;
    StorageManager.activeProfile = null;
    StorageManager.activeRounds = [];
    StorageManager.playerDataCache = {};
  }

  static defaultPlayerData(key) {
    const defaults = {
      [STORAGE_KEYS.ASSESSMENT]: DEFAULT_ASSESSMENT,
      [STORAGE_KEYS.DRILLS_PROGRESS]: {},
      [STORAGE_KEYS.MENTAL_ROUTINE]: {},
      [STORAGE_KEYS.GOALS]: DEFAULT_GOALS,
      [STORAGE_KEYS.CHAT_HISTORY]: DEFAULT_CHAT_HISTORY,
      [STORAGE_KEYS.NOTES]: DEFAULT_NOTES,
      [STORAGE_KEYS.HANDICAP_HISTORY]: [],
      [STORAGE_KEYS.TOURNAMENTS]: []
    };
    return StorageManager.clone(defaults[key] ?? null);
  }

  static normalizeProfile(profile = {}, options = {}) {
    const now = new Date().toISOString();
    const fallback = StorageManager.clone(DEFAULT_PROFILE);
    const ownerId = Object.prototype.hasOwnProperty.call(options, 'ownerId')
      ? options.ownerId
      : (profile.ownerId || StorageManager.workspaceOwnerId || null);
    return {
      ...fallback,
      ...StorageManager.clone(profile),
      id: profile.id || options.id || StorageManager.activePlayerId || StorageManager.makeId('player'),
      ownerId,
      name: String(profile.name || fallback.name).trim(),
      email: String(profile.email || '').trim().toLowerCase(),
      phone: String(profile.phone || '').trim(),
      birthDate: String(profile.birthDate || '').trim(),
      federationLicense: String(profile.federationLicense || '').trim(),
      homeClub: String(profile.homeClub || '').trim(),
      playerCategory: String(profile.playerCategory || '').trim(),
      handicap: StorageManager.optionalNumber(profile.handicap, fallback.handicap),
      targetHandicap: StorageManager.optionalNumber(profile.targetHandicap, fallback.targetHandicap),
      experienceYears: StorageManager.optionalNumber(profile.experienceYears, fallback.experienceYears),
      driverDistanceAvg: StorageManager.optionalNumber(profile.driverDistanceAvg, fallback.driverDistanceAvg),
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
      ownerId: round.ownerId || StorageManager.workspaceOwnerId || null,
      date: round.date || StorageManager.localDateISO(),
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

  static validateProfile(player, { requireHandicap = false } = {}) {
    const handicap = StorageManager.optionalNumber(player.handicap);
    const target = StorageManager.optionalNumber(player.targetHandicap);
    const experience = StorageManager.optionalNumber(player.experienceYears, 0);
    const driverDistance = StorageManager.optionalNumber(player.driverDistanceAvg);
    if (!player.name) throw new Error('Ingresá el nombre del golfista.');
    if (player.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(player.email)) throw new Error('Ingresá un email válido o dejalo vacío.');
    if (player.birthDate && !StorageManager.isValidDateISO(player.birthDate)) throw new Error('La fecha de nacimiento no es válida.');
    if (player.birthDate && player.birthDate > StorageManager.localDateISO()) throw new Error('La fecha de nacimiento no puede estar en el futuro.');
    if (requireHandicap && handicap === null) throw new Error('Ingresá el hándicap actual.');
    if (handicap !== null && (handicap < -10 || handicap > 54)) throw new Error('El hándicap debe estar entre -10 y 54.');
    if (target !== null && (target < -10 || target > 54)) throw new Error('El hándicap objetivo debe estar entre -10 y 54.');
    if (experience < 0 || experience > 100) throw new Error('Los años de experiencia no son válidos.');
    if (driverDistance !== null && (driverDistance < 0 || driverDistance > 500)) throw new Error('La distancia de driver no es válida.');
    return player;
  }

  static async initialize() {
    if (StorageManager.initialized) return StorageManager.persistenceAvailable;
    if (StorageManager.initializingPromise) return StorageManager.initializingPromise;

    StorageManager.initializingPromise = (async () => {
      try {
        await GolfDatabase.open();
        StorageManager.persistenceAvailable = true;
        await StorageManager.migrateLegacyData();
        await StorageManager.migrateExistingCloudOwnership();
        await StorageManager.refreshUnclaimedLegacyCount();
      } catch (error) {
        console.warn('Se usará el respaldo local de GolfCoach Pro:', error);
        StorageManager.persistenceAvailable = false;
        const legacyPlayers = StorageManager.get(STORAGE_KEYS.PLAYERS, []);
        const legacyProfile = StorageManager.get(STORAGE_KEYS.PROFILE, null);
        const legacyClaimOwner = StorageManager.get(STORAGE_KEYS.LEGACY_CLAIM_OWNER, null);
        StorageManager.unclaimedLegacyCount = legacyClaimOwner
          ? 0
          : (legacyPlayers.length || legacyProfile ? Math.max(legacyPlayers.length, 1) : 0);
      }

      StorageManager.clearActiveState();
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
    const legacyPlayers = StorageManager.get(STORAGE_KEYS.PLAYERS, []);
    const sourcePlayers = Array.isArray(legacyPlayers) ? [...legacyPlayers] : [];
    if (legacyProfile && !sourcePlayers.some((player) => player?.id === legacyProfile.id)) {
      sourcePlayers.unshift(legacyProfile);
    }

    const profiles = sourcePlayers
      .filter((profile) => profile && String(profile.name || '').trim())
      .map((profile) => StorageManager.normalizeProfile(profile, {
        id: profile.id || StorageManager.makeId('player'),
        ownerId: null
      }))
      .map((profile) => ({ ...profile, ownerId: null, legacyUnclaimed: true }));

    if (profiles.length) {
      await GolfDatabase.putMany(stores.PLAYERS, profiles);
      const primaryProfile = profiles.find((profile) => profile.id === legacyProfile?.id) || profiles[0];
      const legacyRounds = StorageManager.get(STORAGE_KEYS.ROUNDS, [])
        .map((round) => StorageManager.normalizeRound({
          ...round,
          playerId: primaryProfile.id,
          ownerId: null
        }))
        .map((round) => ({ ...round, ownerId: null }));
      if (legacyRounds.length) await GolfDatabase.replacePlayerRounds(primaryProfile.id, legacyRounds, null);

      for (const key of PLAYER_DATA_KEYS) {
        const value = StorageManager.get(key, null);
        if (value !== null) {
          await GolfDatabase.put(stores.PLAYER_DATA, {
            id: `${primaryProfile.id}:${key}`,
            playerId: primaryProfile.id,
            ownerId: null,
            key,
            value,
            updatedAt: new Date().toISOString()
          });
        }
      }

      if (StorageManager.optionalNumber(primaryProfile.handicap) !== null) {
        await GolfDatabase.put(stores.HANDICAP_HISTORY, {
          id: StorageManager.makeId('hcp'),
          playerId: primaryProfile.id,
          ownerId: null,
          date: String(primaryProfile.createdDate || StorageManager.localDateISO()).slice(0, 10),
          handicap: primaryProfile.handicap,
          source: 'Migración local',
          notes: 'Registro local anterior pendiente de asignación a un entrenador.',
          createdAt: new Date().toISOString()
        });
      }
    }

    await GolfDatabase.put(stores.SETTINGS, {
      id: 'legacy-migration-v1',
      completed: true,
      completedAt: new Date().toISOString(),
      importedPlayers: profiles.length
    });
  }

  static activePlayerSettingId(ownerId = StorageManager.workspaceOwnerId) {
    return `active-player:${ownerId || 'locked'}`;
  }

  static async migrateExistingCloudOwnership() {
    if (!StorageManager.persistenceAvailable) return;
    const stores = GOLF_DATABASE.STORES;
    const players = await GolfDatabase.getAll(stores.PLAYERS);
    const linkedPlayers = players.filter((player) => !player.ownerId && player.cloudOwnerId);
    if (!linkedPlayers.length) return;

    const ownersByPlayer = new Map(linkedPlayers.map((player) => [player.id, player.cloudOwnerId]));
    await GolfDatabase.putMany(stores.PLAYERS, linkedPlayers.map((player) => ({
      ...player,
      ownerId: player.cloudOwnerId,
      legacyUnclaimed: false,
      updatedAt: player.updatedAt || new Date().toISOString()
    })));

    const childStores = [
      stores.HANDICAP_HISTORY,
      stores.TOURNAMENTS,
      stores.ROUNDS,
      stores.ROUND_HOLES,
      stores.SHOT_LOGS,
      stores.PLAYER_DATA
    ];
    for (const storeName of childStores) {
      const rows = await GolfDatabase.getAll(storeName);
      const linkedRows = rows
        .filter((row) => ownersByPlayer.has(row.playerId) && !row.ownerId)
        .map((row) => ({ ...row, ownerId: ownersByPlayer.get(row.playerId) }));
      if (linkedRows.length) await GolfDatabase.putMany(storeName, linkedRows);
    }
  }

  static async refreshUnclaimedLegacyCount() {
    if (!StorageManager.persistenceAvailable) return StorageManager.unclaimedLegacyCount;
    const players = await GolfDatabase.getAll(GOLF_DATABASE.STORES.PLAYERS);
    StorageManager.unclaimedLegacyCount = players.filter((player) => !player.ownerId).length;
    return StorageManager.unclaimedLegacyCount;
  }

  static hasUnclaimedLegacyData() {
    return StorageManager.unclaimedLegacyCount > 0;
  }

  static isDemoPlayer(player) {
    if (!player) return false;
    return player.isDemo === true || (
      player.id === 'player_alejandro_demo' &&
      String(player.name || '').trim() === 'Alejandro Golfista'
    );
  }

  static normalizeDemoIdentity(player) {
    const normalized = StorageManager.clone(player);
    if (!StorageManager.isDemoPlayer(normalized)) return normalized;
    normalized.isDemo = true;
    if (
      normalized.id === 'player_alejandro_demo' &&
      String(normalized.name || '').trim() === 'Alejandro Golfista'
    ) {
      normalized.demoOriginalName = normalized.name;
      normalized.name = 'Golfista Demo (anterior)';
    }
    return normalized;
  }

  static dateOffsetISO(offsetDays = 0) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + Number(offsetDays || 0));
    return StorageManager.localDateISO(date);
  }

  static buildDemoHoles(totalScore, totalPutts, seed = 0) {
    const pars = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4];
    let scoreExtra = Math.max(0, Number(totalScore) - pars.reduce((sum, par) => sum + par, 0));
    let puttExtra = Math.max(0, Number(totalPutts) - pars.length);
    return pars.map((par, index) => {
      const strokesExtra = scoreExtra > 0 ? 1 : 0;
      const puttsExtra = puttExtra > 0 ? 1 : 0;
      scoreExtra -= strokesExtra;
      puttExtra -= puttsExtra;
      return {
        hole: index + 1,
        par,
        strokes: par + strokesExtra,
        putts: 1 + puttsExtra,
        fir: par > 3 ? ((index + seed) % 3 !== 0) : null,
        gir: (index + seed) % 3 === 1,
        bunker: false,
        penalty: 0,
        completed: true
      };
    });
  }

  static buildDemoFixture(ownerId) {
    const now = new Date().toISOString();
    const playerId = StorageManager.makeId('player_demo');
    const player = StorageManager.normalizeProfile({
      id: playerId,
      ownerId,
      name: 'Golfista Demo',
      handicap: 16.4,
      targetHandicap: 12,
      playerCategory: 'Amateur en progreso',
      experienceYears: 4,
      dominantHand: 'Diestro',
      driverDistanceAvg: 205,
      homeClub: 'Club de ejemplo',
      notes: 'Ficha generada exclusivamente para explorar GolfCoach.',
      isDemo: true,
      demoVersion: 1,
      demoCreatedAt: now
    }, { id: playerId, ownerId });

    const assessment = {
      completed: true,
      scores: { swing: 62, shortGame: 58, strategy: 70, mental: 55, fitness: 66 },
      lastDate: StorageManager.dateOffsetISO(-18),
      isDemo: true
    };
    const goals = [
      {
        id: StorageManager.makeId('goal_demo'),
        title: 'Bajar el hándicap a 12',
        category: 'Handicap',
        targetDate: StorageManager.dateOffsetISO(90),
        progress: 45,
        isDemo: true
      },
      {
        id: StorageManager.makeId('goal_demo'),
        title: 'Mejorar el control de distancia en putt',
        category: 'Juego Corto',
        targetDate: StorageManager.dateOffsetISO(45),
        progress: 60,
        isDemo: true
      }
    ];
    const notes = [{
      id: StorageManager.makeId('note_demo'),
      date: StorageManager.dateOffsetISO(-10),
      title: 'Ejemplo de nota del entrenador',
      content: 'Datos simulados: priorizar rutina previa y control de distancia en los primeros nueve hoyos.',
      category: 'Demostración',
      isDemo: true
    }];
    const roundSpecs = [
      { days: -9, score: 83, putts: 31, course: 'Campo Demo Norte', seed: 1 },
      { days: -31, score: 86, putts: 33, course: 'Campo Demo Sur', seed: 2 },
      { days: -58, score: 89, putts: 35, course: 'Campo Demo Norte', seed: 3 }
    ];
    const rounds = roundSpecs.map((spec) => {
      const holes = StorageManager.buildDemoHoles(spec.score, spec.putts, spec.seed);
      const fairwayHoles = holes.filter((hole) => typeof hole.fir === 'boolean');
      const greenHoles = holes.filter((hole) => typeof hole.gir === 'boolean');
      return StorageManager.normalizeRound({
        id: StorageManager.makeId('round_demo'),
        playerId,
        ownerId,
        date: StorageManager.dateOffsetISO(spec.days),
        course: spec.course,
        kind: 'Práctica demo',
        holesCount: 18,
        totalPar: 72,
        totalScore: spec.score,
        scoreToPar: spec.score - 72,
        fairwaysHit: fairwayHoles.filter((hole) => hole.fir).length,
        fairwaysTotal: fairwayHoles.length,
        girHit: greenHoles.filter((hole) => hole.gir).length,
        girTotal: greenHoles.length,
        totalPutts: spec.putts,
        penalties: 0,
        bunkerSaves: 0,
        bunkersTotal: 0,
        notes: 'Ronda simulada para explorar las estadísticas.',
        holes,
        isDemo: true
      });
    });
    const handicapHistory = [
      {
        id: StorageManager.makeId('hcp_demo'),
        playerId,
        ownerId,
        date: StorageManager.dateOffsetISO(-90),
        handicap: 17.8,
        source: 'Dato de demostración',
        notes: 'Valor simulado.',
        createdAt: now,
        isDemo: true
      },
      {
        id: StorageManager.makeId('hcp_demo'),
        playerId,
        ownerId,
        date: StorageManager.dateOffsetISO(-5),
        handicap: 16.4,
        source: 'Dato de demostración',
        notes: 'Valor simulado.',
        createdAt: now,
        isDemo: true
      }
    ];
    return { player, assessment, goals, notes, rounds, handicapHistory };
  }

  static async unlockWorkspace(ownerId) {
    if (!StorageManager.initialized) await StorageManager.initialize();
    const normalizedOwnerId = String(ownerId || '').trim();
    if (!normalizedOwnerId) {
      StorageManager.lockWorkspace();
      return false;
    }

    StorageManager.workspaceGeneration += 1;
    StorageManager.playerSelectionGeneration += 1;
    const generation = StorageManager.workspaceGeneration;
    const selectionGeneration = StorageManager.playerSelectionGeneration;
    StorageManager.workspaceOwnerId = normalizedOwnerId;
    StorageManager.clearActiveState();

    if (StorageManager.persistenceAvailable) {
      const players = await GolfDatabase.getAllByIndex(
        GOLF_DATABASE.STORES.PLAYERS,
        'ownerId',
        normalizedOwnerId
      );
      const activeSetting = await GolfDatabase.get(
        GOLF_DATABASE.STORES.SETTINGS,
        StorageManager.activePlayerSettingId(normalizedOwnerId)
      );
      const requestedPlayerId = activeSetting?.value || StorageManager.getWorkspaceValue(STORAGE_KEYS.ACTIVE_PLAYER, null);
      const playerId = players.some((player) => player.id === requestedPlayerId)
        ? requestedPlayerId
        : players[0]?.id;
      if (playerId) await StorageManager.loadActivePlayer(playerId, false, generation, selectionGeneration);
      await StorageManager.refreshUnclaimedLegacyCount();
      return true;
    }

    await StorageManager.loadFallbackWorkspace(generation);
    return true;
  }

  static lockWorkspace() {
    StorageManager.workspaceGeneration += 1;
    StorageManager.playerSelectionGeneration += 1;
    StorageManager.workspaceOwnerId = null;
    StorageManager.clearActiveState();
  }

  static async loadFallbackWorkspace(generation = StorageManager.workspaceGeneration) {
    StorageManager.requireWorkspace();
    const players = StorageManager.getWorkspaceValue(STORAGE_KEYS.PLAYERS, []);
    const requestedPlayerId = StorageManager.getWorkspaceValue(STORAGE_KEYS.ACTIVE_PLAYER, null);
    const playerId = players.some((player) => player.id === requestedPlayerId)
      ? requestedPlayerId
      : players[0]?.id;
    if (!playerId || generation !== StorageManager.workspaceGeneration) return null;
    return StorageManager.setActivePlayer(playerId);
  }

  static async claimLegacyWorkspace() {
    const ownerId = StorageManager.requireWorkspace();

    if (!StorageManager.persistenceAvailable) {
      const existingClaimOwner = StorageManager.get(STORAGE_KEYS.LEGACY_CLAIM_OWNER, null);
      if (existingClaimOwner && existingClaimOwner !== ownerId) {
        StorageManager.unclaimedLegacyCount = 0;
        return 0;
      }
      const legacyPlayers = StorageManager.get(STORAGE_KEYS.PLAYERS, []);
      const legacyProfile = StorageManager.get(STORAGE_KEYS.PROFILE, null);
      const players = Array.isArray(legacyPlayers) ? [...legacyPlayers] : [];
      if (legacyProfile && !players.some((player) => player?.id === legacyProfile.id)) players.unshift(legacyProfile);
      const claimed = players
        .filter((player) => (
          player &&
          String(player.name || '').trim() &&
          (!player.cloudOwnerId || player.cloudOwnerId === ownerId)
        ))
        .map((player) => StorageManager.normalizeDemoIdentity({
          ...StorageManager.normalizeProfile(player, { ownerId }),
          isDemo: StorageManager.isDemoPlayer(player)
        }));
      if (!claimed.length) return 0;
      const existingPlayers = StorageManager.getWorkspaceValue(STORAGE_KEYS.PLAYERS, []);
      const mergedPlayers = [...existingPlayers];
      claimed.forEach((player) => {
        const existingIndex = mergedPlayers.findIndex((candidate) => candidate.id === player.id);
        if (existingIndex >= 0) mergedPlayers[existingIndex] = player;
        else mergedPlayers.push(player);
      });
      const primary = claimed[0];
      const legacyRounds = StorageManager.get(STORAGE_KEYS.ROUNDS, []);
      const legacyPlayerData = {};
      PLAYER_DATA_KEYS.forEach((key) => {
        const legacyValue = StorageManager.get(`${key}:${primary.id}`, StorageManager.get(key, null));
        if (legacyValue !== null) legacyPlayerData[key] = legacyValue;
      });
      const writes = [
        { key: STORAGE_KEYS.LEGACY_CLAIM_OWNER, value: ownerId },
        { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.PLAYERS), value: mergedPlayers },
        { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.ACTIVE_PLAYER), value: primary.id },
        { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.PROFILE), value: primary },
        { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.ROUNDS), value: legacyRounds },
        { key: StorageManager.getPlayerScopedStorageKey(STORAGE_KEYS.ROUNDS, primary.id), value: legacyRounds },
        ...Object.entries(legacyPlayerData).map(([key, value]) => ({
          key: StorageManager.getPlayerScopedStorageKey(key, primary.id),
          value
        }))
      ];
      StorageManager.commitFallbackWrites(writes);
      StorageManager.activePlayerId = primary.id;
      StorageManager.activeProfile = primary;
      StorageManager.activeRounds = StorageManager.clone(legacyRounds);
      StorageManager.playerDataCache = {};
      PLAYER_DATA_KEYS.forEach((key) => {
        StorageManager.playerDataCache[key] = StorageManager.clone(
          legacyPlayerData[key] ?? StorageManager.defaultPlayerData(key)
        );
      });
      StorageManager.unclaimedLegacyCount = 0;
      return claimed.length;
    }

    const stores = GOLF_DATABASE.STORES;
    const allPlayers = await GolfDatabase.getAll(stores.PLAYERS);
    const legacyPlayers = allPlayers.filter((player) => !player.ownerId);
    if (!legacyPlayers.length) {
      StorageManager.unclaimedLegacyCount = 0;
      return 0;
    }

    const claimedPlayers = legacyPlayers.map((player) => StorageManager.normalizeDemoIdentity({
      ...player,
      ownerId,
      isDemo: StorageManager.isDemoPlayer(player),
      legacyUnclaimed: false,
      claimedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    const activeSetting = {
      id: StorageManager.activePlayerSettingId(ownerId),
      value: legacyPlayers[0].id,
      updatedAt: new Date().toISOString()
    };
    await GolfDatabase.claimLegacyWorkspace(ownerId, claimedPlayers, activeSetting);
    await StorageManager.refreshUnclaimedLegacyCount();
    await StorageManager.unlockWorkspace(ownerId);
    return legacyPlayers.length;
  }

  static async loadActivePlayer(
    playerId,
    saveSelection = true,
    generation = StorageManager.workspaceGeneration,
    selectionGeneration = StorageManager.playerSelectionGeneration
  ) {
    if (!StorageManager.persistenceAvailable) return null;
    const ownerId = StorageManager.requireWorkspace();
    const stores = GOLF_DATABASE.STORES;
    const player = await GolfDatabase.get(stores.PLAYERS, playerId);
    if (!player || player.ownerId !== ownerId) throw new Error('El golfista seleccionado no pertenece a esta cuenta.');

    const [rounds, playerDataRows] = await Promise.all([
      GolfDatabase.getPlayerRounds(playerId, ownerId),
      GolfDatabase.getAllByIndex(stores.PLAYER_DATA, 'playerId', playerId)
    ]);

    if (
      generation !== StorageManager.workspaceGeneration ||
      selectionGeneration !== StorageManager.playerSelectionGeneration ||
      ownerId !== StorageManager.workspaceOwnerId
    ) return null;

    StorageManager.activePlayerId = playerId;
    StorageManager.activeProfile = StorageManager.normalizeDemoIdentity(
      StorageManager.normalizeProfile(player, { id: playerId, ownerId })
    );
    StorageManager.activeRounds = rounds.map((round) => StorageManager.normalizeRound(round));
    StorageManager.playerDataCache = {};
    playerDataRows.filter((row) => row.ownerId === ownerId).forEach((row) => {
      StorageManager.playerDataCache[row.key] = StorageManager.clone(row.value);
    });

    StorageManager.setWorkspaceValue(STORAGE_KEYS.ACTIVE_PLAYER, playerId);
    StorageManager.setWorkspaceValue(STORAGE_KEYS.PROFILE, StorageManager.activeProfile);
    StorageManager.setWorkspaceValue(STORAGE_KEYS.ROUNDS, StorageManager.activeRounds);
    PLAYER_DATA_KEYS.forEach((key) => {
      if (StorageManager.playerDataCache[key] !== undefined) {
        StorageManager.set(StorageManager.getPlayerScopedStorageKey(key, playerId), StorageManager.playerDataCache[key]);
      }
    });

    if (saveSelection) {
      await GolfDatabase.put(stores.SETTINGS, {
        id: StorageManager.activePlayerSettingId(ownerId),
        value: playerId,
        updatedAt: new Date().toISOString()
      });
    }
    return StorageManager.clone(StorageManager.activeProfile);
  }

  static getActivePlayerId() {
    return StorageManager.activePlayerId;
  }

  static async ownsPlayer(playerId) {
    if (!StorageManager.workspaceOwnerId || !playerId) return false;
    if (StorageManager.activePlayerId === playerId && StorageManager.activeProfile?.ownerId === StorageManager.workspaceOwnerId) {
      return true;
    }
    if (StorageManager.persistenceAvailable) {
      const player = await GolfDatabase.get(GOLF_DATABASE.STORES.PLAYERS, playerId);
      return player?.ownerId === StorageManager.workspaceOwnerId;
    }
    const players = StorageManager.getWorkspaceValue(STORAGE_KEYS.PLAYERS, []);
    return players.some((player) => player.id === playerId && player.ownerId === StorageManager.workspaceOwnerId);
  }

  static queueCloudSync(playerId = StorageManager.activePlayerId) {
    if (!StorageManager.persistenceAvailable || !playerId || !window.CloudSync?.queueLocalPlayer) return;
    CloudSync.queueLocalPlayer(playerId)
      .catch((error) => console.warn('No se pudo dejar el respaldo cloud en cola:', error));
  }

  static async getPlayers() {
    const ownerId = StorageManager.requireWorkspace();
    if (StorageManager.persistenceAvailable) {
      const players = await GolfDatabase.getAllByIndex(GOLF_DATABASE.STORES.PLAYERS, 'ownerId', ownerId);
      return players
        .map((player) => StorageManager.normalizeProfile(player, { id: player.id, ownerId }))
        .map((player) => StorageManager.normalizeDemoIdentity(player))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }
    const fallbackPlayers = StorageManager.getWorkspaceValue(STORAGE_KEYS.PLAYERS, []);
    return fallbackPlayers
      .filter((player) => player.ownerId === ownerId)
      .map((player) => StorageManager.normalizeProfile(player, { id: player.id, ownerId }))
      .map((player) => StorageManager.normalizeDemoIdentity(player));
  }

  static async createDemoWorkspace() {
    const ownerId = StorageManager.requireWorkspace();
    const existingDemo = (await StorageManager.getPlayers()).find((player) => StorageManager.isDemoPlayer(player));
    if (existingDemo) {
      await StorageManager.setActivePlayer(existingDemo.id);
      return StorageManager.clone(StorageManager.getProfile());
    }

    const fixture = StorageManager.buildDemoFixture(ownerId);
    const { player, assessment, goals, notes, rounds, handicapHistory } = fixture;
    const demoData = {
      [STORAGE_KEYS.ASSESSMENT]: assessment,
      [STORAGE_KEYS.GOALS]: goals,
      [STORAGE_KEYS.NOTES]: notes,
      [STORAGE_KEYS.HANDICAP_HISTORY]: handicapHistory
    };

    if (StorageManager.persistenceAvailable) {
      const now = new Date().toISOString();
      const playerDataRows = Object.entries(demoData)
        .filter(([key]) => key !== STORAGE_KEYS.HANDICAP_HISTORY)
        .map(([key, value]) => ({
          id: `${player.id}:${key}`,
          playerId: player.id,
          ownerId,
          key,
          value: StorageManager.clone(value),
          updatedAt: now
        }));
      await GolfDatabase.createPlayerBundle({
        player,
        handicapRecords: handicapHistory,
        playerDataRows,
        rounds,
        activeSetting: {
          id: StorageManager.activePlayerSettingId(ownerId),
          value: player.id,
          updatedAt: now
        }
      });
      await StorageManager.loadActivePlayer(
        player.id,
        false,
        StorageManager.workspaceGeneration,
        ++StorageManager.playerSelectionGeneration
      );
      return StorageManager.clone(StorageManager.activeProfile);
    }

    const players = StorageManager.getWorkspaceValue(STORAGE_KEYS.PLAYERS, []);
    players.push(player);
    const playerDataCache = {};
    PLAYER_DATA_KEYS.forEach((key) => {
      playerDataCache[key] = StorageManager.clone(demoData[key] ?? StorageManager.defaultPlayerData(key));
    });
    StorageManager.commitFallbackWrites([
      { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.PLAYERS), value: players },
      { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.PROFILE), value: player },
      { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.ACTIVE_PLAYER), value: player.id },
      { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.ROUNDS), value: rounds },
      { key: StorageManager.getPlayerScopedStorageKey(STORAGE_KEYS.ROUNDS, player.id), value: rounds },
      ...PLAYER_DATA_KEYS.map((key) => ({
        key: StorageManager.getPlayerScopedStorageKey(key, player.id),
        value: playerDataCache[key]
      }))
    ]);
    StorageManager.activePlayerId = player.id;
    StorageManager.activeProfile = StorageManager.clone(player);
    StorageManager.activeRounds = StorageManager.clone(rounds);
    StorageManager.playerDataCache = playerDataCache;
    return StorageManager.clone(player);
  }

  static async createPlayer(profileData) {
    const ownerId = StorageManager.requireWorkspace();
    const player = StorageManager.normalizeProfile(profileData, {
      id: StorageManager.makeId('player'),
      ownerId
    });
    StorageManager.validateProfile(player, { requireHandicap: true });
    if (StorageManager.persistenceAvailable) {
      const handicapRecord = StorageManager.optionalNumber(player.handicap) !== null
        ? {
          id: StorageManager.makeId('hcp'),
          playerId: player.id,
          ownerId,
          date: StorageManager.localDateISO(),
          handicap: player.handicap,
          source: 'Alta de jugador',
          notes: 'Hándicap informado al crear el perfil.',
          createdAt: new Date().toISOString()
        }
        : null;
      await GolfDatabase.savePlayerProfile(player, handicapRecord);
      try {
        await StorageManager.setActivePlayer(player.id);
      } catch (selectionError) {
        // La ficha ya quedó guardada de forma atómica. Un fallo secundario al
        // recordar la selección no debe invitar a crearla nuevamente.
        console.warn('La ficha se creó, pero no se pudo recordar la selección:', selectionError);
        StorageManager.activePlayerId = player.id;
        StorageManager.activeProfile = player;
        StorageManager.activeRounds = [];
        StorageManager.playerDataCache = {};
      }
      StorageManager.queueCloudSync(player.id);
      return player;
    }

    const players = StorageManager.getWorkspaceValue(STORAGE_KEYS.PLAYERS, []);
    players.push(player);
    StorageManager.commitFallbackWrites([
      { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.PLAYERS), value: players },
      { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.PROFILE), value: player },
      { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.ACTIVE_PLAYER), value: player.id },
      { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.ROUNDS), value: [] },
      { key: StorageManager.getPlayerScopedStorageKey(STORAGE_KEYS.ROUNDS, player.id), value: [] }
    ]);
    StorageManager.activePlayerId = player.id;
    StorageManager.activeProfile = player;
    StorageManager.activeRounds = [];
    StorageManager.playerDataCache = {};
    StorageManager.queueCloudSync(player.id);
    return player;
  }

  static async setActivePlayer(playerId) {
    const selectionGeneration = ++StorageManager.playerSelectionGeneration;
    if (StorageManager.persistenceAvailable) {
      return StorageManager.loadActivePlayer(
        playerId,
        true,
        StorageManager.workspaceGeneration,
        selectionGeneration
      );
    }
    const players = await StorageManager.getPlayers();
    const player = players.find((candidate) => candidate.id === playerId);
    if (!player) throw new Error('El golfista seleccionado no existe.');
    if (selectionGeneration !== StorageManager.playerSelectionGeneration) return null;
    const rounds = StorageManager.get(
      StorageManager.getPlayerScopedStorageKey(STORAGE_KEYS.ROUNDS, player.id),
      []
    );
    const playerDataCache = {};
    PLAYER_DATA_KEYS.forEach((key) => {
      playerDataCache[key] = StorageManager.get(
        StorageManager.getPlayerScopedStorageKey(key, player.id),
        StorageManager.defaultPlayerData(key)
      );
    });
    StorageManager.commitFallbackWrites([
      { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.ACTIVE_PLAYER), value: player.id },
      { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.PROFILE), value: player },
      { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.ROUNDS), value: rounds }
    ]);
    StorageManager.activePlayerId = player.id;
    StorageManager.activeProfile = player;
    StorageManager.activeRounds = rounds;
    StorageManager.playerDataCache = playerDataCache;
    return StorageManager.clone(player);
  }

  static getProfile() {
    if (!StorageManager.workspaceOwnerId || !StorageManager.activeProfile) return null;
    return StorageManager.clone(StorageManager.activeProfile);
  }

  static async saveProfile(profile, options = {}) {
    const ownerId = StorageManager.requireWorkspace();
    const previous = StorageManager.activeProfile;
    if (!previous) throw new Error('Primero seleccioná un golfista.');
    const player = StorageManager.normalizeProfile(profile, {
      id: profile.id || previous.id || StorageManager.activePlayerId,
      ownerId
    });
    StorageManager.validateProfile(player);
    if (player.id !== previous.id || player.ownerId !== ownerId) throw new Error('La ficha no pertenece a este espacio.');

    if (StorageManager.persistenceAvailable) {
      const previousHandicap = StorageManager.optionalNumber(previous.handicap);
      const nextHandicap = StorageManager.optionalNumber(player.handicap);
      const handicapChanged = previousHandicap !== nextHandicap;
      const handicapRecord = options.recordHandicap !== false && handicapChanged && nextHandicap !== null
        ? {
          id: StorageManager.makeId('hcp'),
          playerId: player.id,
          ownerId,
          date: options.handicapDate || StorageManager.localDateISO(),
          handicap: player.handicap,
          source: options.handicapSource || 'Actualización de perfil',
          notes: options.handicapNotes || '',
          createdAt: new Date().toISOString()
        }
        : null;
      await GolfDatabase.savePlayerProfile(player, handicapRecord);
    } else {
      const players = StorageManager.getWorkspaceValue(STORAGE_KEYS.PLAYERS, []);
      const index = players.findIndex((candidate) => candidate.id === player.id);
      if (index >= 0) players[index] = player;
      else players.push(player);
      StorageManager.commitFallbackWrites([
        { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.PLAYERS), value: players },
        { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.PROFILE), value: player }
      ]);
    }
    StorageManager.activePlayerId = player.id;
    StorageManager.activeProfile = player;
    if (StorageManager.persistenceAvailable) StorageManager.setWorkspaceValue(STORAGE_KEYS.PROFILE, player);
    StorageManager.queueCloudSync(player.id);
    return StorageManager.clone(player);
  }

  static getPlayerData(key, defaultValue) {
    const fallback = defaultValue === undefined ? StorageManager.defaultPlayerData(key) : defaultValue;
    if (StorageManager.playerDataCache[key] !== undefined) return StorageManager.clone(StorageManager.playerDataCache[key]);
    return StorageManager.clone(fallback);
  }

  static async getPlayerDataFor(playerId, key, defaultValue) {
    const fallback = defaultValue === undefined ? StorageManager.defaultPlayerData(key) : defaultValue;
    if (!playerId || !(await StorageManager.ownsPlayer(playerId))) return StorageManager.clone(fallback);
    if (playerId === StorageManager.activePlayerId) return StorageManager.getPlayerData(key, fallback);
    if (StorageManager.persistenceAvailable) {
      const row = await GolfDatabase.get(GOLF_DATABASE.STORES.PLAYER_DATA, `${playerId}:${key}`);
      return StorageManager.clone(row?.value ?? fallback);
    }
    return StorageManager.get(StorageManager.getPlayerScopedStorageKey(key, playerId), fallback);
  }

  static async savePlayerDataFor(playerId, key, value) {
    const ownerId = StorageManager.requireWorkspace();
    if (!playerId || !(await StorageManager.ownsPlayer(playerId))) {
      throw new Error('El golfista ya no está disponible en este espacio.');
    }
    const cloned = StorageManager.clone(value);
    if (StorageManager.persistenceAvailable) {
      await GolfDatabase.put(GOLF_DATABASE.STORES.PLAYER_DATA, {
        id: `${playerId}:${key}`,
        playerId,
        ownerId,
        key,
        value: cloned,
        updatedAt: new Date().toISOString()
      });
    } else if (!StorageManager.set(StorageManager.getPlayerScopedStorageKey(key, playerId), cloned)) {
      throw new Error('No se pudo guardar en este dispositivo.');
    }
    if (playerId === StorageManager.activePlayerId) StorageManager.playerDataCache[key] = cloned;
    StorageManager.queueCloudSync(playerId);
    return cloned;
  }

  static async savePlayerData(key, value) {
    const playerId = StorageManager.activePlayerId;
    if (!playerId) throw new Error('Primero seleccioná un golfista.');
    return StorageManager.savePlayerDataFor(playerId, key, value);
  }

  static getAssessment() {
    return StorageManager.getPlayerData(STORAGE_KEYS.ASSESSMENT, DEFAULT_ASSESSMENT);
  }

  static saveAssessment(assessment) {
    return StorageManager.savePlayerData(STORAGE_KEYS.ASSESSMENT, assessment);
  }

  static getRounds() {
    if (!StorageManager.workspaceOwnerId || !StorageManager.activePlayerId) return [];
    const rounds = StorageManager.activeRounds ?? [];
    return StorageManager.clone(rounds).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  static async saveRounds(rounds) {
    const ownerId = StorageManager.requireWorkspace();
    const playerId = StorageManager.activePlayerId;
    if (!playerId) throw new Error('Primero seleccioná un golfista.');
    const normalized = (rounds || [])
      .map((round) => StorageManager.normalizeRound({ ...round, playerId, ownerId }))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    if (StorageManager.persistenceAvailable) {
      await GolfDatabase.replacePlayerRounds(playerId, normalized, ownerId);
    } else {
      StorageManager.commitFallbackWrites([
        { key: StorageManager.getPlayerScopedStorageKey(STORAGE_KEYS.ROUNDS, playerId), value: normalized },
        { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.ROUNDS), value: normalized }
      ]);
    }
    StorageManager.activeRounds = normalized;
    if (StorageManager.persistenceAvailable) StorageManager.setWorkspaceValue(STORAGE_KEYS.ROUNDS, normalized);
    StorageManager.queueCloudSync(playerId);
    return StorageManager.clone(normalized);
  }

  static async addRound(round) {
    const ownerId = StorageManager.requireWorkspace();
    const playerId = StorageManager.activePlayerId;
    if (!playerId) throw new Error('Primero seleccioná un golfista.');
    const holes = Array.isArray(round.holes) ? round.holes : [];
    if (![9, 18].includes(holes.length)) throw new Error('La ronda debe contener 9 o 18 hoyos completos.');
    const invalidHole = holes.find((hole) => {
      const strokes = Number(hole.strokes);
      const putts = Number(hole.putts);
      const penalty = Number(hole.penalty || 0);
      return !Number.isInteger(strokes) || strokes < 1 || strokes > 20
        || !Number.isInteger(putts) || putts < 0 || putts > strokes
        || !Number.isInteger(penalty) || penalty < 0 || penalty > strokes;
    });
    if (invalidHole) throw new Error(`Revisá los datos del hoyo ${invalidHole.hole || ''}.`.trim());
    if (!String(round.course || '').trim()) throw new Error('Ingresá el nombre del campo.');
    const newRound = StorageManager.normalizeRound({
      ...round,
      id: round.id || StorageManager.makeId('round'),
      playerId,
      ownerId
    });
    const rounds = StorageManager.getRounds();
    rounds.unshift(newRound);
    if (StorageManager.persistenceAvailable) {
      await GolfDatabase.saveRound(newRound);
    } else {
      StorageManager.commitFallbackWrites([
        { key: StorageManager.getPlayerScopedStorageKey(STORAGE_KEYS.ROUNDS, playerId), value: rounds },
        { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.ROUNDS), value: rounds }
      ]);
    }
    StorageManager.activeRounds = rounds;
    if (StorageManager.persistenceAvailable) StorageManager.setWorkspaceValue(STORAGE_KEYS.ROUNDS, rounds);
    StorageManager.queueCloudSync(playerId);
    return StorageManager.clone(rounds);
  }

  static async getHandicapHistory(playerId = StorageManager.activePlayerId) {
    StorageManager.requireWorkspace();
    if (!playerId || !(await StorageManager.ownsPlayer(playerId))) return [];
    if (StorageManager.persistenceAvailable) {
      const history = await GolfDatabase.getAllByIndex(
        GOLF_DATABASE.STORES.HANDICAP_HISTORY,
        'playerId',
        playerId
      );
      return history.filter((entry) => entry.ownerId === StorageManager.workspaceOwnerId).sort((a, b) => {
        const byDate = String(b.date).localeCompare(String(a.date));
        return byDate || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      });
    }
    if (playerId === StorageManager.activePlayerId) {
      return StorageManager.getPlayerData(STORAGE_KEYS.HANDICAP_HISTORY, []);
    }
    return StorageManager.get(StorageManager.getPlayerScopedStorageKey(STORAGE_KEYS.HANDICAP_HISTORY, playerId), []);
  }

  static async addHandicapRecord(record) {
    const ownerId = StorageManager.requireWorkspace();
    const playerId = record.playerId || StorageManager.activePlayerId;
    const handicap = Number(record.handicap);
    if (!playerId || !(await StorageManager.ownsPlayer(playerId)) || !Number.isFinite(handicap) || handicap < -10 || handicap > 54) {
      throw new Error('Ingresá un hándicap válido entre -10 y 54.');
    }
    const recordDate = record.date || StorageManager.localDateISO();
    if (!StorageManager.isValidDateISO(recordDate)) throw new Error('Ingresá una fecha válida para el hándicap.');
    const entry = {
      id: record.id || StorageManager.makeId('hcp'),
      playerId,
      ownerId,
      date: recordDate,
      handicap,
      source: record.source || 'Manual',
      notes: String(record.notes || '').trim(),
      createdAt: record.createdAt || new Date().toISOString()
    };
    const isActivePlayer = playerId === StorageManager.activePlayerId;
    if (StorageManager.persistenceAvailable && isActivePlayer) {
      const profile = StorageManager.normalizeProfile({
        ...StorageManager.getProfile(),
        handicap
      }, { id: playerId, ownerId });
      await GolfDatabase.savePlayerProfile(profile, entry);
      StorageManager.activeProfile = profile;
      StorageManager.setWorkspaceValue(STORAGE_KEYS.PROFILE, profile);
    } else if (StorageManager.persistenceAvailable) {
      await GolfDatabase.put(GOLF_DATABASE.STORES.HANDICAP_HISTORY, entry);
    } else {
      const history = await StorageManager.getHandicapHistory(playerId);
      history.push(entry);
      const writes = [{
        key: StorageManager.getPlayerScopedStorageKey(STORAGE_KEYS.HANDICAP_HISTORY, playerId),
        value: history
      }];
      if (isActivePlayer) {
        const profile = StorageManager.normalizeProfile({
          ...StorageManager.getProfile(),
          handicap
        }, { id: playerId, ownerId });
        const players = StorageManager.getWorkspaceValue(STORAGE_KEYS.PLAYERS, []);
        const profileIndex = players.findIndex((candidate) => candidate.id === playerId);
        if (profileIndex < 0) throw new Error('La ficha activa ya no existe.');
        players[profileIndex] = profile;
        writes.push(
          { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.PLAYERS), value: players },
          { key: StorageManager.getWorkspaceStorageKey(STORAGE_KEYS.PROFILE), value: profile }
        );
        StorageManager.commitFallbackWrites(writes);
        StorageManager.activeProfile = profile;
      } else {
        StorageManager.commitFallbackWrites(writes);
      }
      if (isActivePlayer) StorageManager.playerDataCache[STORAGE_KEYS.HANDICAP_HISTORY] = StorageManager.clone(history);
    }
    StorageManager.queueCloudSync(playerId);
    return entry;
  }

  static async getTournaments(playerId = StorageManager.activePlayerId) {
    StorageManager.requireWorkspace();
    if (!playerId || !(await StorageManager.ownsPlayer(playerId))) return [];
    if (StorageManager.persistenceAvailable) {
      const tournaments = await GolfDatabase.getAllByIndex(
        GOLF_DATABASE.STORES.TOURNAMENTS,
        'playerId',
        playerId
      );
      return tournaments
        .filter((tournament) => tournament.ownerId === StorageManager.workspaceOwnerId)
        .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
    }
    if (playerId === StorageManager.activePlayerId) {
      return StorageManager.getPlayerData(STORAGE_KEYS.TOURNAMENTS, []);
    }
    return StorageManager.get(StorageManager.getPlayerScopedStorageKey(STORAGE_KEYS.TOURNAMENTS, playerId), []);
  }

  static async saveTournament(tournament) {
    const ownerId = StorageManager.requireWorkspace();
    const playerId = tournament.playerId || StorageManager.activePlayerId;
    if (!playerId || !(await StorageManager.ownsPlayer(playerId))) throw new Error('Primero seleccioná un golfista.');
    const today = StorageManager.localDateISO();
    const now = new Date().toISOString();
    const normalized = {
      ...StorageManager.clone(tournament),
      id: tournament.id || StorageManager.makeId('tournament'),
      playerId,
      ownerId,
      name: String(tournament.name || '').trim(),
      course: String(tournament.course || '').trim(),
      city: String(tournament.city || '').trim(),
      organizer: String(tournament.organizer || '').trim(),
      format: tournament.format || 'Stroke Play',
      status: tournament.status || 'Planificado',
      startDate: tournament.startDate || today,
      endDate: tournament.endDate || tournament.startDate || today,
      position: StorageManager.optionalNumber(tournament.position),
      totalScore: StorageManager.optionalNumber(tournament.totalScore),
      notes: String(tournament.notes || '').trim(),
      createdAt: tournament.createdAt || now,
      updatedAt: now
    };
    if (!normalized.name) throw new Error('El torneo necesita un nombre.');
    if (!StorageManager.isValidDateISO(normalized.startDate) || !StorageManager.isValidDateISO(normalized.endDate)) {
      throw new Error('Revisá las fechas del torneo.');
    }
    if (normalized.endDate < normalized.startDate) throw new Error('La fecha de fin no puede ser anterior al inicio.');
    if (normalized.position !== null && (!Number.isInteger(normalized.position) || normalized.position < 1)) {
      throw new Error('La posición final debe ser un número entero mayor a cero.');
    }
    if (normalized.totalScore !== null && (!Number.isInteger(normalized.totalScore) || normalized.totalScore < 0)) {
      throw new Error('El score total debe ser un número entero válido.');
    }
    if (StorageManager.persistenceAvailable) {
      await GolfDatabase.put(GOLF_DATABASE.STORES.TOURNAMENTS, normalized);
    } else {
      const tournaments = await StorageManager.getTournaments(playerId);
      const existingIndex = tournaments.findIndex((item) => item.id === normalized.id);
      if (existingIndex >= 0) tournaments[existingIndex] = normalized;
      else tournaments.push(normalized);
      await StorageManager.savePlayerDataFor(playerId, STORAGE_KEYS.TOURNAMENTS, tournaments);
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
