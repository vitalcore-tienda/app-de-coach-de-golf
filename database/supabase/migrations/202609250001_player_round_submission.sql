-- Atomic, idempotent scorecards submitted by the authenticated golfer.
alter table public.rounds drop constraint rounds_course_par_check;
alter table public.rounds add constraint rounds_course_par_check
  check (course_par is null or course_par between holes_played * 3 and holes_played * 6);
alter table public.rounds drop constraint rounds_score_to_par_check;
alter table public.rounds add constraint rounds_score_to_par_check
  check (score_to_par is null or score_to_par between -90 and 306);

create or replace function public.submit_player_round(
  p_player_id uuid, p_submission_id uuid, p_round jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  result_id uuid;
  h jsonb;
  hole_count integer;
  hole_index integer := 0;
  total_par integer := 0;
  total_score integer := 0;
  total_putts integer := 0;
  total_penalties integer := 0;
  fir_hit integer := 0;
  fir_count integer := 0;
  gir_hit integer := 0;
  gir_count integer := 0;
  par_value integer;
  strokes_value integer;
  putts_value integer;
  penalty_value integer;
begin
  if (select auth.uid()) is null or not private.owns_player(p_player_id)
     or not exists (select 1 from public.profiles where id = (select auth.uid()) and account_role = 'player') then
    raise exception 'Player access required.';
  end if;
  if p_submission_id is null then raise exception 'Submission identifier required.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_submission_id::text, 0));
  select id into result_id from public.rounds
    where player_id = p_player_id and client_record_id = 'student:' || p_submission_id::text;
  if result_id is not null then return result_id; end if;

  if jsonb_typeof(p_round->'holes') is distinct from 'array' then raise exception 'Invalid holes.'; end if;
  hole_count := jsonb_array_length(p_round->'holes');
  if hole_count not in (9,18) or nullif(btrim(p_round->>'course'), '') is null
     or length(p_round->>'course') > 160 or length(coalesce(p_round->>'notes','')) > 1200
     or nullif(p_round->>'date','') is null then
    raise exception 'Invalid round.';
  end if;
  for h in select value from jsonb_array_elements(p_round->'holes') loop
    hole_index := hole_index + 1;
    par_value := (h->>'par')::integer;
    strokes_value := (h->>'strokes')::integer;
    putts_value := (h->>'putts')::integer;
    penalty_value := coalesce((h->>'penalty')::integer,0);
    if par_value is null or strokes_value is null or putts_value is null
       or par_value not between 3 and 6 or strokes_value not between 1 and 20
       or putts_value not between 0 and strokes_value or penalty_value not between 0 and strokes_value then
      raise exception 'Invalid score at hole %.', hole_index;
    end if;
    total_par := total_par + par_value;
    total_score := total_score + strokes_value;
    total_putts := total_putts + putts_value;
    total_penalties := total_penalties + penalty_value;
    if par_value > 3 and jsonb_typeof(h->'fir') = 'boolean' then
      fir_count := fir_count + 1;
      fir_hit := fir_hit + case when (h->>'fir')::boolean then 1 else 0 end;
    end if;
    if jsonb_typeof(h->'gir') = 'boolean' then
      gir_count := gir_count + 1;
      gir_hit := gir_hit + case when (h->>'gir')::boolean then 1 else 0 end;
    end if;
  end loop;
  insert into public.rounds (
    player_id, client_record_id, played_on, course_name, kind, holes_played,
    course_par, gross_score, score_to_par, total_putts, penalties,
    fairways_hit, fairways_total, gir_hit, gir_total, notes
  ) values (
    p_player_id, 'student:' || p_submission_id::text, (p_round->>'date')::date,
    btrim(p_round->>'course'),
    case p_round->>'kind' when 'Amistosa' then 'casual' when 'Torneo' then 'tournament' else 'practice' end,
    hole_count, total_par, total_score, total_score-total_par, total_putts, total_penalties,
    fir_hit, fir_count, gir_hit, gir_count, p_round->>'notes'
  ) returning id into result_id;
  insert into public.round_holes (
    round_id, player_id, hole_number, par, strokes, putts, penalty_strokes,
    fairway_hit, green_in_regulation, notes
  ) select result_id, p_player_id, ordinality, (value->>'par')::integer,
    (value->>'strokes')::integer, (value->>'putts')::integer,
    coalesce((value->>'penalty')::integer,0),
    case when (value->>'par')::integer > 3 then (value->>'fir')::boolean else null end,
    (value->>'gir')::boolean,
    case when (value->>'bunker')::boolean then 'Paso por bunker' else null end
  from jsonb_array_elements(p_round->'holes') with ordinality;
  return result_id;
end;
$$;
revoke all on function public.submit_player_round(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.submit_player_round(uuid,uuid,jsonb) to authenticated;
