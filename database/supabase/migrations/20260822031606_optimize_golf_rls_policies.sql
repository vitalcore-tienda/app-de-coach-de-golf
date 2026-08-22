-- Evita que las políticas de escritura se apliquen también a SELECT.
-- Conserva exactamente las mismas condiciones de acceso que las políticas
-- FOR ALL originales, pero reduce el trabajo por fila para las lecturas.

drop policy if exists handicap_write_coach on public.handicap_history;
create policy handicap_insert_coach on public.handicap_history
  for insert to authenticated
  with check (private.can_edit_player(player_id));
create policy handicap_update_coach on public.handicap_history
  for update to authenticated
  using (private.can_edit_player(player_id))
  with check (private.can_edit_player(player_id));
create policy handicap_delete_coach on public.handicap_history
  for delete to authenticated
  using (private.can_edit_player(player_id));

drop policy if exists tournaments_write_coach on public.tournaments;
create policy tournaments_insert_coach on public.tournaments
  for insert to authenticated
  with check (private.can_edit_player(player_id));
create policy tournaments_update_coach on public.tournaments
  for update to authenticated
  using (private.can_edit_player(player_id))
  with check (private.can_edit_player(player_id));
create policy tournaments_delete_coach on public.tournaments
  for delete to authenticated
  using (private.can_edit_player(player_id));

drop policy if exists rounds_write_authorized on public.rounds;
create policy rounds_insert_authorized on public.rounds
  for insert to authenticated
  with check (private.can_log_round_for_player(player_id));
create policy rounds_update_authorized on public.rounds
  for update to authenticated
  using (private.can_log_round_for_player(player_id))
  with check (private.can_log_round_for_player(player_id));
create policy rounds_delete_authorized on public.rounds
  for delete to authenticated
  using (private.can_log_round_for_player(player_id));

drop policy if exists round_holes_write_authorized on public.round_holes;
create policy round_holes_insert_authorized on public.round_holes
  for insert to authenticated
  with check (private.can_log_round_for_player(player_id));
create policy round_holes_update_authorized on public.round_holes
  for update to authenticated
  using (private.can_log_round_for_player(player_id))
  with check (private.can_log_round_for_player(player_id));
create policy round_holes_delete_authorized on public.round_holes
  for delete to authenticated
  using (private.can_log_round_for_player(player_id));

drop policy if exists shot_logs_write_authorized on public.shot_logs;
create policy shot_logs_insert_authorized on public.shot_logs
  for insert to authenticated
  with check (private.can_log_round_for_player(player_id));
create policy shot_logs_update_authorized on public.shot_logs
  for update to authenticated
  using (private.can_log_round_for_player(player_id))
  with check (private.can_log_round_for_player(player_id));
create policy shot_logs_delete_authorized on public.shot_logs
  for delete to authenticated
  using (private.can_log_round_for_player(player_id));

drop policy if exists player_documents_write_coach on public.player_documents;
create policy player_documents_insert_coach on public.player_documents
  for insert to authenticated
  with check (private.can_edit_player(player_id));
create policy player_documents_update_coach on public.player_documents
  for update to authenticated
  using (private.can_edit_player(player_id))
  with check (private.can_edit_player(player_id));
create policy player_documents_delete_coach on public.player_documents
  for delete to authenticated
  using (private.can_edit_player(player_id));
