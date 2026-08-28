/**
 * GolfCoach Pro - Base de datos local
 *
 * IndexedDB permite que la aplicación siga funcionando sin servidor ni
 * conexión, pero guarda los datos de manera estructurada por golfista.
 * La capa StorageManager conserva una caché síncrona para no romper los
 * módulos existentes de la SPA.
 */

const GOLF_DATABASE = {
  NAME: 'GolfCoachProDB',
  VERSION: 3,
  STORES: {
    PLAYERS: 'players',
    HANDICAP_HISTORY: 'handicapHistory',
    TOURNAMENTS: 'tournaments',
    ROUNDS: 'rounds',
    ROUND_HOLES: 'roundHoles',
    SHOT_LOGS: 'shotLogs',
    PLAYER_DATA: 'playerData',
    SETTINGS: 'settings',
    SYNC_OUTBOX: 'syncOutbox'
  }
};

class GolfDatabase {
  static db = null;
  static openingPromise = null;

  static get isAvailable() {
    return typeof indexedDB !== 'undefined';
  }

  static createId(prefix = 'id') {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  static async open() {
    if (GolfDatabase.db) return GolfDatabase.db;
    if (!GolfDatabase.isAvailable) {
      throw new Error('IndexedDB no está disponible en este navegador.');
    }
    if (GolfDatabase.openingPromise) return GolfDatabase.openingPromise;

    GolfDatabase.openingPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(GOLF_DATABASE.NAME, GOLF_DATABASE.VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const transaction = event.target.transaction;
        const stores = GOLF_DATABASE.STORES;

        const ensureIndex = (storeName, indexName, keyPath, options = {}) => {
          const store = transaction.objectStore(storeName);
          if (!store.indexNames.contains(indexName)) {
            store.createIndex(indexName, keyPath, options);
          }
        };

        if (!db.objectStoreNames.contains(stores.PLAYERS)) {
          const players = db.createObjectStore(stores.PLAYERS, { keyPath: 'id' });
          players.createIndex('name', 'name', { unique: false });
          players.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(stores.HANDICAP_HISTORY)) {
          const handicapHistory = db.createObjectStore(stores.HANDICAP_HISTORY, { keyPath: 'id' });
          handicapHistory.createIndex('playerId', 'playerId', { unique: false });
          handicapHistory.createIndex('playerDate', ['playerId', 'date'], { unique: false });
        }

        if (!db.objectStoreNames.contains(stores.TOURNAMENTS)) {
          const tournaments = db.createObjectStore(stores.TOURNAMENTS, { keyPath: 'id' });
          tournaments.createIndex('playerId', 'playerId', { unique: false });
          tournaments.createIndex('playerStartDate', ['playerId', 'startDate'], { unique: false });
          tournaments.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains(stores.ROUNDS)) {
          const rounds = db.createObjectStore(stores.ROUNDS, { keyPath: 'id' });
          rounds.createIndex('playerId', 'playerId', { unique: false });
          rounds.createIndex('playerDate', ['playerId', 'date'], { unique: false });
          rounds.createIndex('tournamentId', 'tournamentId', { unique: false });
        }

        if (!db.objectStoreNames.contains(stores.ROUND_HOLES)) {
          const roundHoles = db.createObjectStore(stores.ROUND_HOLES, { keyPath: 'id' });
          roundHoles.createIndex('roundId', 'roundId', { unique: false });
          roundHoles.createIndex('playerId', 'playerId', { unique: false });
        }

        if (!db.objectStoreNames.contains(stores.SHOT_LOGS)) {
          const shotLogs = db.createObjectStore(stores.SHOT_LOGS, { keyPath: 'id' });
          shotLogs.createIndex('roundHoleId', 'roundHoleId', { unique: false });
          shotLogs.createIndex('playerId', 'playerId', { unique: false });
        }

        if (!db.objectStoreNames.contains(stores.PLAYER_DATA)) {
          const playerData = db.createObjectStore(stores.PLAYER_DATA, { keyPath: 'id' });
          playerData.createIndex('playerId', 'playerId', { unique: false });
          playerData.createIndex('playerKey', ['playerId', 'key'], { unique: true });
        }

        if (!db.objectStoreNames.contains(stores.SETTINGS)) {
          db.createObjectStore(stores.SETTINGS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(stores.SYNC_OUTBOX)) {
          const syncOutbox = db.createObjectStore(stores.SYNC_OUTBOX, { keyPath: 'id' });
          syncOutbox.createIndex('ownerId', 'ownerId', { unique: false });
          syncOutbox.createIndex('playerId', 'playerId', { unique: false });
          syncOutbox.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Desde v3, toda la información deportiva local pertenece a un
        // workspace de entrenador. Los registros anteriores quedan sin
        // ownerId hasta que una cuenta autenticada los reclame explícitamente.
        ensureIndex(stores.PLAYERS, 'ownerId', 'ownerId', { unique: false });
        ensureIndex(stores.PLAYERS, 'ownerUpdatedAt', ['ownerId', 'updatedAt'], { unique: false });
        ensureIndex(stores.HANDICAP_HISTORY, 'ownerId', 'ownerId', { unique: false });
        ensureIndex(stores.HANDICAP_HISTORY, 'ownerPlayer', ['ownerId', 'playerId'], { unique: false });
        ensureIndex(stores.TOURNAMENTS, 'ownerId', 'ownerId', { unique: false });
        ensureIndex(stores.TOURNAMENTS, 'ownerPlayer', ['ownerId', 'playerId'], { unique: false });
        ensureIndex(stores.ROUNDS, 'ownerId', 'ownerId', { unique: false });
        ensureIndex(stores.ROUNDS, 'ownerPlayer', ['ownerId', 'playerId'], { unique: false });
        ensureIndex(stores.ROUND_HOLES, 'ownerId', 'ownerId', { unique: false });
        ensureIndex(stores.SHOT_LOGS, 'ownerId', 'ownerId', { unique: false });
        ensureIndex(stores.PLAYER_DATA, 'ownerId', 'ownerId', { unique: false });
        ensureIndex(stores.PLAYER_DATA, 'ownerPlayer', ['ownerId', 'playerId'], { unique: false });
      };

      request.onsuccess = () => {
        GolfDatabase.db = request.result;
        GolfDatabase.db.onversionchange = () => {
          GolfDatabase.db?.close();
          GolfDatabase.db = null;
        };
        resolve(GolfDatabase.db);
      };
      request.onerror = () => reject(request.error || new Error('No se pudo abrir la base de datos.'));
      request.onblocked = () => {
        reject(new Error('La base de datos está bloqueada por otra pestaña. Cerrala y volvé a intentar.'));
      };
    });

    try {
      return await GolfDatabase.openingPromise;
    } finally {
      GolfDatabase.openingPromise = null;
    }
  }

  static async get(storeName, id) {
    const db = await GolfDatabase.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  static async getAll(storeName) {
    const db = await GolfDatabase.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  static async getAllByIndex(storeName, indexName, value) {
    const db = await GolfDatabase.open();
    return new Promise((resolve, reject) => {
      const index = db.transaction(storeName, 'readonly').objectStore(storeName).index(indexName);
      const request = index.getAll(IDBKeyRange.only(value));
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  static async put(storeName, value) {
    const db = await GolfDatabase.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).put(value);
      transaction.oncomplete = () => resolve(value);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  static async putMany(storeName, values) {
    if (!values.length) return values;
    const db = await GolfDatabase.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      values.forEach((value) => store.put(value));
      transaction.oncomplete = () => resolve(values);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  static async savePlayerProfile(player, handicapRecord = null) {
    const db = await GolfDatabase.open();
    const stores = GOLF_DATABASE.STORES;
    const storeNames = handicapRecord
      ? [stores.PLAYERS, stores.HANDICAP_HISTORY]
      : [stores.PLAYERS];
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeNames, 'readwrite');
      transaction.objectStore(stores.PLAYERS).put(player);
      if (handicapRecord) transaction.objectStore(stores.HANDICAP_HISTORY).put(handicapRecord);
      transaction.oncomplete = () => resolve(player);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  static async createPlayerBundle({ player, handicapRecords = [], playerDataRows = [], rounds = [], activeSetting }) {
    const db = await GolfDatabase.open();
    const stores = GOLF_DATABASE.STORES;
    const serializedRounds = rounds.map((round) => GolfDatabase.serializeRound(round));
    const storeNames = [
      stores.PLAYERS,
      stores.HANDICAP_HISTORY,
      stores.PLAYER_DATA,
      stores.ROUNDS,
      stores.ROUND_HOLES,
      stores.SETTINGS
    ];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeNames, 'readwrite');
      transaction.objectStore(stores.PLAYERS).put(player);
      const handicapStore = transaction.objectStore(stores.HANDICAP_HISTORY);
      handicapRecords.forEach((record) => handicapStore.put(record));
      const dataStore = transaction.objectStore(stores.PLAYER_DATA);
      playerDataRows.forEach((row) => dataStore.put(row));
      const roundStore = transaction.objectStore(stores.ROUNDS);
      const holeStore = transaction.objectStore(stores.ROUND_HOLES);
      serializedRounds.forEach(({ roundRecord, holesRecords }) => {
        roundStore.put(roundRecord);
        holesRecords.forEach((hole) => holeStore.put(hole));
      });
      transaction.objectStore(stores.SETTINGS).put(activeSetting);
      transaction.oncomplete = () => resolve(player);
      transaction.onerror = () => reject(transaction.error || new Error('No se pudo preparar la demostración.'));
      transaction.onabort = () => reject(transaction.error || new Error('No se pudo preparar la demostración.'));
    });
  }

  static async claimLegacyWorkspace(ownerId, players, activePlayerSetting) {
    if (!players.length) return players;
    const db = await GolfDatabase.open();
    const stores = GOLF_DATABASE.STORES;
    const childStoreNames = [
      stores.HANDICAP_HISTORY,
      stores.TOURNAMENTS,
      stores.ROUNDS,
      stores.ROUND_HOLES,
      stores.SHOT_LOGS,
      stores.PLAYER_DATA
    ];
    const storeNames = [stores.PLAYERS, stores.SETTINGS, ...childStoreNames];
    const legacyIds = new Set(players.map((player) => player.id));

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeNames, 'readwrite');
      const playerStore = transaction.objectStore(stores.PLAYERS);
      let conflictError = null;
      players.forEach((player) => {
        const request = playerStore.get(player.id);
        request.onsuccess = () => {
          const current = request.result;
          if (!current || (current.ownerId && current.ownerId !== ownerId)) {
            conflictError = new Error('Otra cuenta ya vinculó una de estas fichas. Recargá el espacio.');
            transaction.abort();
            return;
          }
          playerStore.put(player);
        };
        request.onerror = () => transaction.abort();
      });
      transaction.objectStore(stores.SETTINGS).put(activePlayerSetting);

      childStoreNames.forEach((storeName) => {
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => {
          request.result
            .filter((row) => legacyIds.has(row.playerId) && (!row.ownerId || row.ownerId === ownerId))
            .forEach((row) => store.put({ ...row, ownerId }));
        };
        request.onerror = () => transaction.abort();
      });

      transaction.oncomplete = () => resolve(players);
      transaction.onerror = () => reject(conflictError || transaction.error || new Error('No se pudieron vincular las fichas anteriores.'));
      transaction.onabort = () => reject(conflictError || transaction.error || new Error('No se pudieron vincular las fichas anteriores.'));
    });
  }

  static async delete(storeName, id) {
    const db = await GolfDatabase.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  static serializeRound(round) {
    const { holes = [], ...roundRecord } = round;
    const playerId = roundRecord.playerId;
    const ownerId = roundRecord.ownerId || null;
    const holesRecords = holes.map((hole, index) => ({
      ...hole,
      id: hole.id || `${roundRecord.id}_h${hole.hole || index + 1}`,
      roundId: roundRecord.id,
      playerId,
      ownerId: hole.ownerId || ownerId
    }));
    return { roundRecord, holesRecords };
  }

  static async saveRound(round) {
    const { roundRecord, holesRecords } = GolfDatabase.serializeRound(round);
    const db = await GolfDatabase.open();
    const stores = GOLF_DATABASE.STORES;
    const existingHoles = (await GolfDatabase.getAllByIndex(stores.ROUND_HOLES, 'roundId', roundRecord.id))
      .filter((hole) => hole.ownerId === roundRecord.ownerId);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([stores.ROUNDS, stores.ROUND_HOLES], 'readwrite');
      transaction.objectStore(stores.ROUNDS).put(roundRecord);
      const holeStore = transaction.objectStore(stores.ROUND_HOLES);
      existingHoles.forEach((hole) => holeStore.delete(hole.id));
      holesRecords.forEach((hole) => holeStore.put(hole));
      transaction.oncomplete = () => resolve(round);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  static async replacePlayerRounds(playerId, rounds, ownerId = rounds[0]?.ownerId ?? null) {
    const db = await GolfDatabase.open();
    const stores = GOLF_DATABASE.STORES;
    const [existingRounds, existingHoles] = await Promise.all([
      GolfDatabase.getAllByIndex(stores.ROUNDS, 'playerId', playerId),
      GolfDatabase.getAllByIndex(stores.ROUND_HOLES, 'playerId', playerId)
    ]);
    const ownedRounds = existingRounds.filter((round) => round.ownerId === ownerId);
    const ownedHoles = existingHoles.filter((hole) => hole.ownerId === ownerId);
    const serialized = rounds.map((round) => GolfDatabase.serializeRound({ ...round, playerId, ownerId }));

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([stores.ROUNDS, stores.ROUND_HOLES], 'readwrite');
      const roundStore = transaction.objectStore(stores.ROUNDS);
      const holeStore = transaction.objectStore(stores.ROUND_HOLES);
      ownedRounds.forEach((round) => roundStore.delete(round.id));
      ownedHoles.forEach((hole) => holeStore.delete(hole.id));
      serialized.forEach(({ roundRecord, holesRecords }) => {
        roundStore.put(roundRecord);
        holesRecords.forEach((hole) => holeStore.put(hole));
      });
      transaction.oncomplete = () => resolve(rounds);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  static async getPlayerRounds(playerId, ownerId = null) {
    const stores = GOLF_DATABASE.STORES;
    const [rounds, holes] = await Promise.all([
      GolfDatabase.getAllByIndex(stores.ROUNDS, 'playerId', playerId),
      GolfDatabase.getAllByIndex(stores.ROUND_HOLES, 'playerId', playerId)
    ]);
    const ownedRounds = ownerId === null
      ? rounds.filter((round) => !round.ownerId)
      : rounds.filter((round) => round.ownerId === ownerId);
    const ownedHoles = ownerId === null
      ? holes.filter((hole) => !hole.ownerId)
      : holes.filter((hole) => hole.ownerId === ownerId);
    const holesByRound = ownedHoles.reduce((result, hole) => {
      if (!result[hole.roundId]) result[hole.roundId] = [];
      result[hole.roundId].push(hole);
      return result;
    }, {});

    return ownedRounds
      .map((round) => ({
        ...round,
        holes: (holesByRound[round.id] || []).sort((a, b) => a.hole - b.hole)
      }))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }
}

window.GolfDatabase = GolfDatabase;
window.GOLF_DATABASE = GOLF_DATABASE;
