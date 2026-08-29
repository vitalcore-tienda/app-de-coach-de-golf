/*
 * GolfCoach Pro - Respaldo cloud opcional
 *
 * La base local sigue siendo la fuente inmediata para que la app funcione sin
 * conexión. Cuando un entrenador activa el respaldo, una cola de IndexedDB
 * sube snapshots completos por golfista a Supabase bajo las políticas RLS.
 * No se usan claves administrativas en el navegador.
 */

class CloudSync {
  static SETTING_PREFIX = 'cloud-sync-enabled:';
  static LAST_SYNC_PREFIX = 'cloud-sync-last-result:';
  static OUTBOX_PREFIX = 'cloud-sync-job:';
  static flushPromise = null;
  static flushTimer = null;
  static lastResult = null;

  static documentKeys = Object.freeze({
    [STORAGE_KEYS.ASSESSMENT]: 'assessment',
    [STORAGE_KEYS.DRILLS_PROGRESS]: 'drills_progress',
    [STORAGE_KEYS.MENTAL_ROUTINE]: 'mental_routine',
    [STORAGE_KEYS.GOALS]: 'goals',
    [STORAGE_KEYS.CHAT_HISTORY]: 'chat_history',
    [STORAGE_KEYS.NOTES]: 'notes'
  });

  static privateDocumentKeys = new Set([
    STORAGE_KEYS.CHAT_HISTORY,
    STORAGE_KEYS.NOTES
  ]);

  static isCoachReady() {
    return Boolean(
      window.AuthEngine?.client &&
      AuthEngine.user?.id &&
      AuthEngine.isCoach?.()
    );
  }

  static currentOwnerId() {
    return CloudSync.isCoachReady() ? AuthEngine.user.id : null;
  }

  static settingId(ownerId) {
    return `${CloudSync.SETTING_PREFIX}${ownerId}`;
  }

  static lastSyncId(ownerId) {
    return `${CloudSync.LAST_SYNC_PREFIX}${ownerId}`;
  }

  static jobId(ownerId, playerId) {
    return `${CloudSync.OUTBOX_PREFIX}${ownerId}:${playerId}`;
  }

  static async onAuthStateChanged() {
    CloudSync.updateButton();
    const ownerId = CloudSync.currentOwnerId();
    if (!ownerId || navigator.onLine === false) return;

    try {
      if (await CloudSync.isEnabled(ownerId)) CloudSync.scheduleFlush();
    } catch (error) {
      console.warn('No se pudo revisar la cola de respaldo cloud:', error);
    }
  }

  static updateButton() {
    const button = document.getElementById('cloud-sync-btn');
    if (!button) return;

    const enabled = CloudSync.isCoachReady();
    button.hidden = !enabled;
    if (!enabled) return;

    const icon = button.querySelector('.topbar-action-icon');
    if (icon) icon.textContent = '☁️';
    else button.textContent = '☁️';
    button.title = 'Respaldo y sincronización cloud';
    button.setAttribute('aria-label', button.title);
    CloudSync.refreshButtonState(button).catch((error) => {
      console.warn('No se pudo actualizar el indicador de sincronización:', error);
    });
  }

  static async refreshButtonState(button = document.getElementById('cloud-sync-btn')) {
    if (!button || !CloudSync.isCoachReady()) return;
    const pending = await CloudSync.pendingCount();
    let badge = button.querySelector('.sync-button-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'sync-button-badge';
      badge.setAttribute('aria-hidden', 'true');
      button.append(badge);
    }
    badge.textContent = pending > 9 ? '9+' : String(pending);
    badge.hidden = pending === 0;
    button.classList.toggle('has-sync-pending', pending > 0);
    button.title = pending
      ? `Respaldo cloud: ${pending} cambio${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'}`
      : 'Respaldo cloud actualizado';
    button.setAttribute('aria-label', button.title);
  }

  static async isEnabled(ownerId = CloudSync.currentOwnerId()) {
    if (!ownerId || !window.GolfDatabase?.isAvailable) return false;
    const setting = await GolfDatabase.get(GOLF_DATABASE.STORES.SETTINGS, CloudSync.settingId(ownerId));
    return setting?.value === true;
  }

  static async setEnabled(ownerId, value) {
    if (!ownerId) throw new Error('Necesitás una cuenta de entrenador para activar el respaldo.');
    await GolfDatabase.put(GOLF_DATABASE.STORES.SETTINGS, {
      id: CloudSync.settingId(ownerId),
      value: Boolean(value),
      updatedAt: new Date().toISOString()
    });
  }

  static async getLastResult(ownerId = CloudSync.currentOwnerId()) {
    if (!ownerId || !window.GolfDatabase?.isAvailable) return null;
    const setting = await GolfDatabase.get(GOLF_DATABASE.STORES.SETTINGS, CloudSync.lastSyncId(ownerId));
    return setting?.value || null;
  }

  static async getJobs(ownerId = CloudSync.currentOwnerId()) {
    if (!ownerId || !window.GolfDatabase?.isAvailable) return [];
    return GolfDatabase.getAllByIndex(GOLF_DATABASE.STORES.SYNC_OUTBOX, 'ownerId', ownerId);
  }

  static async pendingCount(ownerId = CloudSync.currentOwnerId()) {
    return (await CloudSync.getJobs(ownerId)).length;
  }

  static async queueLocalPlayer(playerId) {
    const ownerId = CloudSync.currentOwnerId();
    if (!ownerId || !playerId || !(await CloudSync.isEnabled(ownerId))) return false;
    if (StorageManager.workspaceOwnerId !== ownerId || !(await StorageManager.ownsPlayer(playerId))) {
      console.warn('Se omitió un respaldo porque la ficha no pertenece al workspace autenticado.');
      return false;
    }
    const queued = await CloudSync.queuePlayer(ownerId, playerId);
    if (!queued) return false;
    CloudSync.scheduleFlush();
    return true;
  }

  static async queuePlayer(ownerId, playerId) {
    const player = await GolfDatabase.get(GOLF_DATABASE.STORES.PLAYERS, playerId);
    if (!player || player.ownerId !== ownerId || StorageManager.isDemoPlayer(player)) return false;
    const id = CloudSync.jobId(ownerId, playerId);
    const existing = await GolfDatabase.get(GOLF_DATABASE.STORES.SYNC_OUTBOX, id);
    const now = new Date().toISOString();
    await GolfDatabase.put(GOLF_DATABASE.STORES.SYNC_OUTBOX, {
      ...existing,
      id,
      ownerId,
      playerId,
      queuedAt: existing?.queuedAt || now,
      updatedAt: now,
      attempts: existing?.attempts || 0,
      lastError: null
    });
    return true;
  }

  static scheduleFlush() {
    if (CloudSync.flushTimer || !CloudSync.isCoachReady() || navigator.onLine === false) return;
    CloudSync.flushTimer = window.setTimeout(() => {
      CloudSync.flushTimer = null;
      CloudSync.flush().catch((error) => console.warn('No se pudo sincronizar en segundo plano:', error));
    }, 400);
  }

  static async openSyncModal() {
    await AuthEngine.init();
    if (!CloudSync.isCoachReady()) {
      AuthEngine.toast('Iniciá sesión con una cuenta de entrenador para usar el respaldo cloud.');
      return;
    }

    const [enabled, jobs, lastResult] = await Promise.all([
      CloudSync.isEnabled(),
      CloudSync.getJobs(),
      CloudSync.getLastResult()
    ]);
    const pending = jobs.length;
    const actionLabel = enabled ? 'Sincronizar ahora' : 'Activar respaldo y sincronizar';
    const description = enabled
      ? 'Los cambios se guardan primero en este dispositivo y se respaldan de forma segura cuando haya conexión.'
      : 'Al activarlo, las fichas de este dispositivo se respaldarán en la base privada de GolfCoach. No se enviará ningún dato hasta que confirmes esta acción.';

    AuthEngine.renderModal(`
      <div class="modal-handle-bar"></div>
      <div class="modal-header">
        <div>
          <span class="badge badge-blue">Respaldo cloud</span>
          <h3 style="margin-top:0.3rem;">Datos de GolfCoach</h3>
        </div>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <p style="color:var(--text-muted); line-height:1.55; margin-top:-0.45rem;">${description}</p>
      <div class="offline-info-card" style="margin-top:1rem;">
        <span>🔒</span><span>Solo tu cuenta de entrenador y los golfistas asignados pueden acceder a estos datos. La app sigue funcionando sin conexión.</span>
      </div>
      <div id="cloud-sync-status" class="sync-status-panel ${lastResult?.failed ? 'error' : ''}" role="status" aria-live="polite">${lastResult?.failed
        ? `${pending || lastResult.failed} ficha${(pending || lastResult.failed) === 1 ? '' : 's'} pendiente${(pending || lastResult.failed) === 1 ? '' : 's'}. El último intento no pudo completarse; podés reintentar sin perder los datos locales.`
        : pending
          ? `${pending} ficha${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'} de respaldo.`
          : 'No hay cambios pendientes. El respaldo está actualizado.'}</div>
      <button class="btn btn-primary" id="cloud-sync-now-btn" style="width:100%; min-height:46px; margin-top:0.75rem;" onclick="CloudSync.syncAllLocalData()">${actionLabel}</button>
    `);
  }

  static setModalStatus(message, type = 'neutral') {
    const status = document.getElementById('cloud-sync-status');
    if (!status) return;
    status.textContent = message;
    status.className = `sync-status-panel ${type === 'neutral' ? '' : type}`.trim();
  }

  static async syncAllLocalData() {
    const ownerId = CloudSync.currentOwnerId();
    const button = document.getElementById('cloud-sync-now-btn');
    if (!ownerId) {
      CloudSync.setModalStatus('Iniciá sesión con una cuenta de entrenador para continuar.', 'error');
      return;
    }
    if (!StorageManager.persistenceAvailable) {
      CloudSync.setModalStatus('Este navegador no tiene almacenamiento local disponible para preparar el respaldo.', 'error');
      return;
    }
    if (navigator.onLine === false) {
      CloudSync.setModalStatus('Necesitás conexión para enviar el respaldo. Tus cambios siguen guardados localmente.', 'error');
      return;
    }

    GolfForm.setBusy(button, true, 'Sincronizando…');
    CloudSync.setModalStatus('Preparando las fichas locales…');

    try {
      await CloudSync.setEnabled(ownerId, true);
      const players = (await StorageManager.getPlayers())
        .filter((player) => !StorageManager.isDemoPlayer(player));
      for (const player of players) {
        await CloudSync.queuePlayer(ownerId, player.id);
      }

      const result = await CloudSync.flush();
      if (result.failed > 0) {
        const message = `Se respaldaron ${result.synced} ficha${result.synced === 1 ? '' : 's'}; quedaron ${result.pending || result.failed} para reintentar. Tus datos locales están seguros.`;
        CloudSync.setModalStatus(message, 'error');
        window.PWAEngine?.reportSyncIssue?.(message);
      } else {
        CloudSync.setModalStatus(`Respaldo actualizado: ${result.synced} ficha${result.synced === 1 ? '' : 's'} sincronizada${result.synced === 1 ? '' : 's'}.`, 'success');
        window.PWAEngine?.clearSyncIssue?.();
        App.showSaveConfirmation('Respaldo cloud actualizado', 'Los cambios ya están disponibles para las cuentas vinculadas.');
      }
    } catch (error) {
      console.warn('No se pudo completar el respaldo cloud:', error);
      const message = CloudSync.readableError(error);
      CloudSync.setModalStatus(message, 'error');
      window.PWAEngine?.reportSyncIssue?.(message);
    } finally {
      GolfForm.setBusy(button, false);
      if (button) button.textContent = 'Sincronizar ahora';
      CloudSync.updateButton();
    }
  }

  static async flush() {
    if (CloudSync.flushPromise) return CloudSync.flushPromise;
    const ownerId = CloudSync.currentOwnerId();
    if (!ownerId) return { synced: 0, failed: 0, pending: 0 };
    if (navigator.onLine === false) return { synced: 0, failed: 0, pending: await CloudSync.pendingCount(ownerId), offline: true };

    CloudSync.flushPromise = CloudSync.runFlush(ownerId)
      .finally(() => {
        CloudSync.flushPromise = null;
        CloudSync.updateButton();
      });
    return CloudSync.flushPromise;
  }

  static async runFlush(ownerId) {
    const jobs = (await CloudSync.getJobs(ownerId))
      .sort((a, b) => String(a.queuedAt).localeCompare(String(b.queuedAt)));
    const result = { synced: 0, failed: 0, pending: jobs.length, lastError: null };

    for (const job of jobs) {
      if (AuthEngine.user?.id !== ownerId || !AuthEngine.isCoach()) break;
      try {
        await CloudSync.syncPlayerSnapshot(job.playerId, ownerId);
        await GolfDatabase.delete(GOLF_DATABASE.STORES.SYNC_OUTBOX, job.id);
        result.synced += 1;
      } catch (error) {
        console.warn('Falló el respaldo de una ficha:', error);
        result.failed += 1;
        result.lastError = CloudSync.readableError(error);
        await GolfDatabase.put(GOLF_DATABASE.STORES.SYNC_OUTBOX, {
          ...job,
          attempts: Number(job.attempts || 0) + 1,
          updatedAt: new Date().toISOString(),
          lastError: CloudSync.readableError(error)
        });
      }
    }

    result.pending = await CloudSync.pendingCount(ownerId);
    CloudSync.lastResult = result;
    await GolfDatabase.put(GOLF_DATABASE.STORES.SETTINGS, {
      id: CloudSync.lastSyncId(ownerId),
      value: result,
      updatedAt: new Date().toISOString()
    });
    if (result.failed > 0) {
      window.PWAEngine?.reportSyncIssue?.(result.lastError || 'Quedaron cambios pendientes de respaldo.');
    } else if (result.pending === 0) {
      window.PWAEngine?.clearSyncIssue?.();
    }
    return result;
  }

  static async syncPlayerSnapshot(localPlayerId, ownerId) {
    const stores = GOLF_DATABASE.STORES;
    const player = await GolfDatabase.get(stores.PLAYERS, localPlayerId);
    if (!player || StorageManager.isDemoPlayer(player)) return;
    if (player.ownerId !== ownerId || StorageManager.workspaceOwnerId !== ownerId) {
      throw new Error('La ficha local no pertenece a la cuenta autenticada.');
    }

    const remotePlayerId = await CloudSync.upsertPlayer(player, ownerId);
    const [history, tournaments, rounds, documents] = await Promise.all([
      GolfDatabase.getAllByIndex(stores.HANDICAP_HISTORY, 'playerId', localPlayerId),
      GolfDatabase.getAllByIndex(stores.TOURNAMENTS, 'playerId', localPlayerId),
      GolfDatabase.getPlayerRounds(localPlayerId, ownerId),
      GolfDatabase.getAllByIndex(stores.PLAYER_DATA, 'playerId', localPlayerId)
    ]);
    const ownedHistory = history.filter((entry) => entry.ownerId === ownerId);
    const ownedTournaments = tournaments.filter((entry) => entry.ownerId === ownerId);
    const ownedDocuments = documents.filter((entry) => entry.ownerId === ownerId);

    await CloudSync.syncHandicapHistory(ownedHistory, remotePlayerId);
    const tournamentIds = await CloudSync.syncTournaments(ownedTournaments, remotePlayerId);
    await CloudSync.syncRounds(rounds, remotePlayerId, tournamentIds);
    await CloudSync.syncDocuments(ownedDocuments, remotePlayerId);
  }

  static async upsertPlayer(player, ownerId) {
    const payload = {
      created_by: ownerId,
      client_record_id: String(player.id),
      full_name: CloudSync.text(player.name, 'Golfista sin nombre'),
      email: CloudSync.emailOrNull(player.email),
      phone: CloudSync.nullableText(player.phone),
      birth_date: CloudSync.dateOrNull(player.birthDate),
      current_handicap: CloudSync.decimalInRange(player.handicap, -10, 54, 1),
      target_handicap: CloudSync.decimalInRange(player.targetHandicap, -10, 54, 1),
      home_club: CloudSync.nullableText(player.homeClub),
      federation_license: CloudSync.nullableText(player.federationLicense),
      dominant_hand: CloudSync.dominantHand(player.dominantHand),
      experience_years: CloudSync.integerInRange(player.experienceYears, 0, 100),
      driver_distance_avg_meters: CloudSync.decimalInRange(player.driverDistanceAvg, 0, 500, 1),
      player_category: CloudSync.nullableText(player.playerCategory),
      notes: CloudSync.nullableText(player.notes)
    };
    const { data, error } = await AuthEngine.client
      .from('players')
      .upsert(payload, { onConflict: 'created_by,client_record_id' })
      .select('id')
      .single();
    if (error) throw error;

    if (data?.id && (player.remoteId !== data.id || player.cloudOwnerId !== ownerId)) {
      await GolfDatabase.put(GOLF_DATABASE.STORES.PLAYERS, {
        ...player,
        remoteId: data.id,
        cloudOwnerId: ownerId,
        updatedAt: player.updatedAt || new Date().toISOString()
      });
    }
    return data.id;
  }

  static async syncHandicapHistory(history, remotePlayerId) {
    const ordered = [...history].sort((a, b) => {
      const dateOrder = String(b.date || '').localeCompare(String(a.date || ''));
      return dateOrder || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
    if (!ordered.length) return;

    const { error: resetError } = await AuthEngine.client
      .from('handicap_history')
      .update({ is_current: false })
      .eq('player_id', remotePlayerId)
      .eq('is_current', true);
    if (resetError) throw resetError;

    for (const [index, record] of ordered.entries()) {
      const payload = {
        player_id: remotePlayerId,
        client_record_id: String(record.id),
        handicap_index: CloudSync.decimalInRange(record.handicap, -10, 54, 1),
        effective_date: CloudSync.dateOrNull(record.date) || GolfUtils.localDateISO(),
        source: CloudSync.handicapSource(record.source),
        is_current: index === 0,
        notes: CloudSync.nullableText(record.notes)
      };
      const { error } = await AuthEngine.client
        .from('handicap_history')
        .upsert(payload, { onConflict: 'player_id,client_record_id' });
      if (error) throw error;
    }
  }

  static async syncTournaments(tournaments, remotePlayerId) {
    const remoteIds = new Map();
    for (const tournament of tournaments) {
      const startDate = CloudSync.dateOrNull(tournament.startDate) || GolfUtils.localDateISO();
      const endDate = CloudSync.dateOrNull(tournament.endDate) || startDate;
      const payload = {
        player_id: remotePlayerId,
        client_record_id: String(tournament.id),
        name: CloudSync.text(tournament.name, 'Torneo sin nombre'),
        organizer: CloudSync.nullableText(tournament.organizer),
        course_name: CloudSync.nullableText(tournament.course),
        city: CloudSync.nullableText(tournament.city),
        start_date: startDate,
        end_date: endDate < startDate ? startDate : endDate,
        competition_format: CloudSync.tournamentFormat(tournament.format),
        status: CloudSync.tournamentStatus(tournament.status),
        final_position: CloudSync.integerInRange(tournament.position, 1, 32767),
        total_score: CloudSync.integerInRange(tournament.totalScore, 1, 360),
        notes: CloudSync.nullableText(tournament.notes)
      };
      const { data, error } = await AuthEngine.client
        .from('tournaments')
        .upsert(payload, { onConflict: 'player_id,client_record_id' })
        .select('id')
        .single();
      if (error) throw error;
      remoteIds.set(tournament.id, data.id);

      if (tournament.remoteId !== data.id) {
        await GolfDatabase.put(GOLF_DATABASE.STORES.TOURNAMENTS, {
          ...tournament,
          remoteId: data.id,
          updatedAt: tournament.updatedAt || new Date().toISOString()
        });
      }
    }
    return remoteIds;
  }

  static async syncRounds(rounds, remotePlayerId, tournamentIds) {
    const ordered = [...rounds].sort((a, b) => {
      const tournamentOrder = String(a.tournamentId || '').localeCompare(String(b.tournamentId || ''));
      const dateOrder = String(a.date || '').localeCompare(String(b.date || ''));
      return tournamentOrder || dateOrder || String(a.id).localeCompare(String(b.id));
    });
    const roundNumbers = new Map();
    const counters = new Map();
    ordered.forEach((round) => {
      if (!round.tournamentId) return;
      const next = (counters.get(round.tournamentId) || 0) + 1;
      counters.set(round.tournamentId, next);
      roundNumbers.set(round.id, next);
    });

    for (const round of ordered) {
      const holesPlayed = CloudSync.integerInRange(
        round.holesCount || round.holes?.length || 18,
        1,
        18
      ) || 18;
      const totalScore = CloudSync.integerInRange(round.totalScore, holesPlayed, holesPlayed * 20);
      const totalPar = CloudSync.integerInRange(round.totalPar, 27, 90);
      const remoteTournamentId = round.tournamentId ? (tournamentIds.get(round.tournamentId) || null) : null;
      const payload = {
        player_id: remotePlayerId,
        client_record_id: String(round.id),
        tournament_id: remoteTournamentId,
        round_number: remoteTournamentId ? (roundNumbers.get(round.id) || 1) : 1,
        played_on: CloudSync.dateOrNull(round.date) || GolfUtils.localDateISO(),
        course_name: CloudSync.text(round.course, 'Club de Golf'),
        kind: CloudSync.roundKind(round.kind),
        status: 'completed',
        holes_played: holesPlayed,
        course_par: totalPar,
        gross_score: totalScore,
        score_to_par: totalScore !== null && totalPar !== null ? totalScore - totalPar : null,
        fairways_hit: CloudSync.integerInRange(round.fairwaysHit, 0, 18),
        fairways_total: CloudSync.integerInRange(round.fairwaysTotal, 0, 18),
        gir_hit: CloudSync.integerInRange(round.girHit, 0, 18),
        gir_total: CloudSync.integerInRange(round.girTotal, 0, 18),
        total_putts: CloudSync.integerInRange(round.totalPutts, 0, 100),
        penalties: CloudSync.integerInRange(round.penalties, 0, 100) || 0,
        bunker_saves: CloudSync.integerInRange(round.bunkerSaves, 0, 18),
        bunkers_total: CloudSync.integerInRange(round.bunkersTotal, 0, 18),
        notes: CloudSync.nullableText(round.notes)
      };
      const { data, error } = await AuthEngine.client
        .from('rounds')
        .upsert(payload, { onConflict: 'player_id,client_record_id' })
        .select('id')
        .single();
      if (error) throw error;

      await CloudSync.syncRoundHoles(round, remotePlayerId, data.id);
      if (round.remoteId !== data.id || round.remoteTournamentId !== remoteTournamentId) {
        await GolfDatabase.saveRound({
          ...round,
          remoteId: data.id,
          remoteTournamentId,
          updatedAt: round.updatedAt || new Date().toISOString()
        });
      }
    }
  }

  static async syncRoundHoles(round, remotePlayerId, remoteRoundId) {
    const holes = Array.isArray(round.holes) ? round.holes : [];
    if (!holes.length) return;
    const localIds = new Set();

    for (const [index, hole] of holes.entries()) {
      const holeNumber = CloudSync.integerInRange(hole.hole || index + 1, 1, 18);
      const clientRecordId = String(hole.id || `${round.id}_h${holeNumber}`);
      localIds.add(clientRecordId);
      const strokes = CloudSync.integerInRange(hole.strokes, 1, 20) || 1;
      const par = CloudSync.integerInRange(hole.par, 3, 6) || 4;
      const payload = {
        round_id: remoteRoundId,
        player_id: remotePlayerId,
        client_record_id: clientRecordId,
        hole_number: holeNumber,
        par,
        strokes,
        putts: CloudSync.integerInRange(hole.putts, 0, strokes),
        penalty_strokes: CloudSync.integerInRange(hole.penalty, 0, strokes) || 0,
        fairway_hit: par > 3 && typeof hole.fir === 'boolean' ? hole.fir : null,
        green_in_regulation: typeof hole.gir === 'boolean' ? hole.gir : null,
        notes: CloudSync.nullableText(hole.notes)
      };
      const { error } = await AuthEngine.client
        .from('round_holes')
        .upsert(payload, { onConflict: 'player_id,client_record_id' });
      if (error) throw error;
    }

    const { data: remoteHoles, error: remoteHolesError } = await AuthEngine.client
      .from('round_holes')
      .select('id, client_record_id')
      .eq('round_id', remoteRoundId);
    if (remoteHolesError) throw remoteHolesError;
    const staleIds = (remoteHoles || [])
      .filter((hole) => !localIds.has(String(hole.client_record_id)))
      .map((hole) => hole.id);
    if (staleIds.length) {
      const { error } = await AuthEngine.client
        .from('round_holes')
        .delete()
        .in('id', staleIds);
      if (error) throw error;
    }
  }

  static async syncDocuments(rows, remotePlayerId) {
    for (const row of rows) {
      const dataKey = CloudSync.documentKeys[row.key];
      if (!dataKey) continue;
      const payload = {
        player_id: remotePlayerId,
        client_record_id: String(row.id),
        data_key: dataKey,
        payload: row.value ?? {},
        visibility: CloudSync.privateDocumentKeys.has(row.key) ? 'coach_private' : 'shared'
      };
      const { error } = await AuthEngine.client
        .from('player_documents')
        .upsert(payload, { onConflict: 'player_id,data_key' });
      if (error) throw error;
    }
  }

  static text(value, fallback = '') {
    const text = String(value ?? '').trim();
    return text || fallback;
  }

  static nullableText(value) {
    const text = CloudSync.text(value, '');
    return text || null;
  }

  static emailOrNull(value) {
    const email = CloudSync.nullableText(value)?.toLowerCase();
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  }

  static dateOrNull(value) {
    const date = String(value ?? '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  }

  static decimalInRange(value, min, max, decimals = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < min || numeric > max) return null;
    const factor = 10 ** decimals;
    return Math.round(numeric * factor) / factor;
  }

  static integerInRange(value, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    const integer = Math.round(numeric);
    return integer >= min && integer <= max ? integer : null;
  }

  static dominantHand(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized.includes('izq') || normalized.includes('zurd') || normalized === 'left') return 'left';
    if (normalized.includes('ambi')) return 'ambidextrous';
    return 'right';
  }

  static handicapSource(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized.includes('feder')) return 'federation';
    if (normalized.includes('import')) return 'imported';
    if (normalized === 'manual' || normalized.includes('actualización') || normalized.includes('alta')) return 'manual';
    return 'other';
  }

  static tournamentFormat(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized.includes('match')) return 'match_play';
    if (normalized.includes('stableford')) return 'stableford';
    if (normalized.includes('scramble')) return 'scramble';
    if (normalized.includes('stroke') || !normalized) return 'stroke_play';
    return 'other';
  }

  static tournamentStatus(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized.includes('juego') || normalized.includes('progress')) return 'in_progress';
    if (normalized.includes('final') || normalized.includes('complet')) return 'completed';
    if (normalized.includes('cancel')) return 'cancelled';
    return 'scheduled';
  }

  static roundKind(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized.includes('torneo') || normalized.includes('tournament')) return 'tournament';
    if (normalized.includes('amist') || normalized.includes('casual')) return 'casual';
    if (normalized.includes('práct') || normalized.includes('pract')) return 'practice';
    return 'other';
  }

  static errorKind(error) {
    const code = String(error?.code || '').toUpperCase();
    const status = Number(error?.status || error?.statusCode || 0);
    const message = String(error?.message || error || '').toLowerCase();
    if (navigator.onLine === false || AuthEngine.isNetworkError?.(error) || /^PGRST00[0-3]$/.test(code) || /^08/.test(code) || [408, 503, 504, 520].includes(status)) return 'network';
    if (code === '42501' || status === 401 || status === 403 || message.includes('row-level security') || message.includes('permission denied')) return 'permission';
    if (code === '23505' || status === 409 || message.includes('duplicate') || message.includes('unique')) return 'duplicate';
    return 'unknown';
  }

  static readableError(error) {
    const kind = CloudSync.errorKind(error);
    if (kind === 'network') return 'No se pudo conectar con GolfCoach. El respaldo quedó en cola y se reintentará cuando haya conexión.';
    if (kind === 'permission') {
      return 'Tu cuenta no tiene permiso para respaldar esta ficha.';
    }
    if (kind === 'duplicate') {
      return 'Hay un dato duplicado que necesita revisión antes de respaldarse.';
    }
    return 'No se pudo completar el respaldo. Tus datos locales no se modificaron.';
  }
}

window.addEventListener('online', () => {
  if (CloudSync.isCoachReady()) CloudSync.scheduleFlush();
});

window.CloudSync = CloudSync;
