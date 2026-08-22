-- GolfCoach Pro · Supabase schema
--
-- This migration is intentionally separate from database/schema.sql. The latter
-- is a portable PostgreSQL reference; this file adds Supabase Auth, protected
-- roles and Row Level Security for the deployed application.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.golfcoach_account_role as enum ('coach', 'player');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  account_role public.golfcoach_account_role not null default 'player',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_unique_idx
  on public.profiles (lower(email))
  where email is not null;

-- The one-time setup code is stored only as a hash. It lets the owner turn
-- their first authenticated account into the first coach without exposing a
-- privileged key in GitHub Pages.
create table private.application_setup (
  singleton boolean primary key default true check (singleton),
  initial_coach_code_hash text,
  initial_coach_claimed_by uuid references public.profiles(id) on delete set null,
  initial_coach_claimed_at timestamptz
);

insert into private.application_setup (singleton)
values (true)
on conflict (singleton) do nothing;

create table public.players (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  client_record_id text,
  full_name text not null,
  email text,
  phone text,
  birth_date date,
  nationality text,
  current_handicap numeric(4, 1),
  target_handicap numeric(4, 1),
  home_club text,
  federation_license text,
  dominant_hand text not null default 'right',
  experience_years smallint,
  driver_distance_avg_meters numeric(5, 1),
  player_category text,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_full_name_not_blank check (btrim(full_name) <> ''),
  constraint players_email_format check (email is null or position('@' in email) > 1),
  constraint players_current_handicap_range check (current_handicap is null or current_handicap between -10 and 54),
  constraint players_target_handicap_range check (target_handicap is null or target_handicap between -10 and 54),
  constraint players_dominant_hand_check check (dominant_hand in ('right', 'left', 'ambidextrous')),
  constraint players_experience_years_check check (experience_years is null or experience_years between 0 and 100),
  constraint players_driver_distance_check check (driver_distance_avg_meters is null or driver_distance_avg_meters between 0 and 500)
);

create index players_full_name_idx on public.players (full_name);
alter table public.players
  add constraint players_creator_client_record_unique unique (created_by, client_record_id);
create unique index players_email_unique_idx
  on public.players (lower(email))
  where email is not null;

create table public.coach_player_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_user_id uuid not null references public.profiles(id) on delete restrict,
  player_id uuid not null references public.players(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (coach_user_id, player_id)
);

create index coach_player_assignments_coach_active_idx
  on public.coach_player_assignments (coach_user_id, player_id)
  where revoked_at is null;

create index coach_player_assignments_player_active_idx
  on public.coach_player_assignments (player_id, coach_user_id)
  where revoked_at is null;

-- Keeping this relationship private means the public API never exposes an
-- account identifier merely because a coach can read a golf profile.
create table private.player_accounts (
  player_id uuid primary key references public.players(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  linked_at timestamptz not null default now()
);

create table public.handicap_history (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  client_record_id text,
  handicap_index numeric(4, 1) not null,
  effective_date date not null,
  source text not null default 'manual',
  is_current boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  constraint handicap_history_index_range check (handicap_index between -10 and 54),
  constraint handicap_history_source_check check (source in ('manual', 'federation', 'imported', 'other'))
);

create index handicap_history_player_effective_date_idx
  on public.handicap_history (player_id, effective_date desc, created_at desc);
create unique index handicap_history_one_current_per_player_idx
  on public.handicap_history (player_id)
  where is_current;
alter table public.handicap_history
  add constraint handicap_history_player_client_record_unique unique (player_id, client_record_id);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  client_record_id text,
  name text not null,
  organizer text,
  course_name text,
  city text,
  country text,
  start_date date not null,
  end_date date not null,
  competition_format text not null default 'stroke_play',
  status text not null default 'scheduled',
  final_position smallint,
  total_score smallint,
  course_par smallint,
  course_rating numeric(4, 1),
  slope_rating smallint,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, player_id),
  unique (player_id, client_record_id),
  constraint tournaments_name_not_blank check (btrim(name) <> ''),
  constraint tournaments_dates_check check (end_date >= start_date),
  constraint tournaments_format_check check (competition_format in ('stroke_play', 'match_play', 'stableford', 'scramble', 'other')),
  constraint tournaments_status_check check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  constraint tournaments_final_position_check check (final_position is null or final_position > 0),
  constraint tournaments_total_score_check check (total_score is null or total_score between 1 and 360),
  constraint tournaments_course_par_check check (course_par is null or course_par between 54 and 90),
  constraint tournaments_course_rating_check check (course_rating is null or course_rating between 45 and 85),
  constraint tournaments_slope_rating_check check (slope_rating is null or slope_rating between 55 and 155)
);

create index tournaments_player_start_date_idx on public.tournaments (player_id, start_date desc);

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  client_record_id text,
  tournament_id uuid,
  round_number smallint not null default 1,
  played_on date not null,
  course_name text not null,
  tee_name text,
  kind text not null default 'practice',
  status text not null default 'completed',
  holes_played smallint not null default 18,
  course_par smallint,
  course_rating numeric(4, 1),
  slope_rating smallint,
  gross_score smallint,
  net_score smallint,
  score_to_par smallint,
  fairways_hit smallint,
  fairways_total smallint,
  gir_hit smallint,
  gir_total smallint,
  total_putts smallint,
  penalties smallint not null default 0,
  bunker_saves smallint,
  bunkers_total smallint,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, player_id),
  unique (player_id, client_record_id),
  constraint rounds_tournament_same_player_fk
    foreign key (tournament_id, player_id)
    references public.tournaments (id, player_id),
  constraint rounds_round_number_check check (round_number > 0),
  constraint rounds_course_name_not_blank check (btrim(course_name) <> ''),
  constraint rounds_kind_check check (kind in ('practice', 'casual', 'tournament', 'other')),
  constraint rounds_status_check check (status in ('in_progress', 'completed', 'withdrawn', 'cancelled')),
  constraint rounds_holes_played_check check (holes_played between 1 and 18),
  constraint rounds_course_par_check check (course_par is null or course_par between 54 and 90),
  constraint rounds_course_rating_check check (course_rating is null or course_rating between 45 and 85),
  constraint rounds_slope_rating_check check (slope_rating is null or slope_rating between 55 and 155),
  constraint rounds_gross_score_check check (gross_score is null or gross_score between holes_played and holes_played * 20),
  constraint rounds_net_score_check check (net_score is null or net_score between 0 and holes_played * 20),
  constraint rounds_score_to_par_check check (score_to_par is null or score_to_par between -72 and 72),
  constraint rounds_stat_non_negative_check check (
    coalesce(fairways_hit, 0) >= 0 and coalesce(fairways_total, 0) >= 0 and
    coalesce(gir_hit, 0) >= 0 and coalesce(gir_total, 0) >= 0 and
    coalesce(total_putts, 0) >= 0 and penalties >= 0 and
    coalesce(bunker_saves, 0) >= 0 and coalesce(bunkers_total, 0) >= 0
  )
);

create unique index rounds_player_tournament_round_number_idx
  on public.rounds (player_id, tournament_id, round_number)
  where tournament_id is not null;
create index rounds_player_played_on_idx on public.rounds (player_id, played_on desc);

create table public.round_holes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null,
  player_id uuid not null,
  client_record_id text,
  hole_number smallint not null,
  par smallint not null,
  strokes smallint not null,
  putts smallint,
  penalty_strokes smallint not null default 0,
  fairway_hit boolean,
  green_in_regulation boolean,
  sand_shots smallint not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, player_id),
  unique (player_id, client_record_id),
  unique (round_id, hole_number),
  constraint round_holes_round_same_player_fk
    foreign key (round_id, player_id)
    references public.rounds (id, player_id)
    on delete cascade,
  constraint round_holes_hole_number_check check (hole_number between 1 and 18),
  constraint round_holes_par_check check (par between 3 and 6),
  constraint round_holes_strokes_check check (strokes between 1 and 20),
  constraint round_holes_putts_check check (putts is null or putts between 0 and strokes),
  constraint round_holes_penalty_strokes_check check (penalty_strokes between 0 and strokes),
  constraint round_holes_sand_shots_check check (sand_shots between 0 and strokes)
);

create index round_holes_player_round_idx on public.round_holes (player_id, round_id);

create table public.shot_logs (
  id uuid primary key default gen_random_uuid(),
  round_hole_id uuid not null,
  player_id uuid not null,
  client_record_id text,
  shot_number smallint not null,
  shot_type text not null,
  club text,
  lie_before text,
  distance_to_hole_before_meters numeric(6, 1),
  shot_distance_meters numeric(6, 1),
  result text not null default 'in_play',
  is_penalty boolean not null default false,
  strokes_gained numeric(6, 3),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (round_hole_id, shot_number),
  unique (player_id, client_record_id),
  constraint shot_logs_hole_same_player_fk
    foreign key (round_hole_id, player_id)
    references public.round_holes (id, player_id)
    on delete cascade,
  constraint shot_logs_shot_number_check check (shot_number between 1 and 30),
  constraint shot_logs_type_check check (shot_type in ('tee', 'approach', 'layup', 'recovery', 'chip', 'pitch', 'bunker', 'putt', 'penalty', 'other')),
  constraint shot_logs_lie_before_check check (lie_before is null or lie_before in ('tee', 'fairway', 'rough', 'bunker', 'green', 'penalty_area', 'recovery', 'other')),
  constraint shot_logs_distance_to_hole_check check (distance_to_hole_before_meters is null or distance_to_hole_before_meters >= 0),
  constraint shot_logs_shot_distance_check check (shot_distance_meters is null or shot_distance_meters >= 0),
  constraint shot_logs_result_check check (result in ('in_play', 'hole_out', 'penalty', 'out_of_bounds', 'water', 'lost_ball', 'other'))
);

create index shot_logs_player_hole_idx on public.shot_logs (player_id, round_hole_id);

create table public.player_documents (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  client_record_id text,
  data_key text not null,
  payload jsonb not null default '{}'::jsonb,
  visibility text not null default 'shared',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, data_key),
  unique (player_id, client_record_id),
  constraint player_documents_key_check check (data_key in ('assessment', 'drills_progress', 'mental_routine', 'goals', 'chat_history', 'notes')),
  constraint player_documents_visibility_check check (visibility in ('shared', 'coach_private'))
);

create index player_documents_player_idx on public.player_documents (player_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger players_set_updated_at
  before update on public.players
  for each row execute function private.set_updated_at();
create trigger tournaments_set_updated_at
  before update on public.tournaments
  for each row execute function private.set_updated_at();
create trigger rounds_set_updated_at
  before update on public.rounds
  for each row execute function private.set_updated_at();
create trigger round_holes_set_updated_at
  before update on public.round_holes
  for each row execute function private.set_updated_at();
create trigger shot_logs_set_updated_at
  before update on public.shot_logs
  for each row execute function private.set_updated_at();
create trigger player_documents_set_updated_at
  before update on public.player_documents
  for each row execute function private.set_updated_at();

create or replace function private.link_player_account(p_player_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_user_id uuid;
begin
  if p_email is null or btrim(p_email) = '' then
    return;
  end if;

  select users.id
  into matched_user_id
  from auth.users as users
  where lower(users.email) = lower(p_email)
    and users.email_confirmed_at is not null
  order by users.created_at asc
  limit 1;

  if matched_user_id is not null then
    insert into private.player_accounts (player_id, user_id)
    values (p_player_id, matched_user_id)
    on conflict do nothing;
  end if;
end;
$$;

create or replace function private.handle_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_player record;
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email;

  if new.email_confirmed_at is not null then
    for matched_player in
      select players.id
      from public.players
      where lower(players.email) = lower(new.email)
    loop
      perform private.link_player_account(matched_player.id, new.email);
    end loop;
  end if;
  return new;
end;
$$;

create or replace function private.handle_new_player()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.coach_player_assignments (coach_user_id, player_id)
  values (new.created_by, new.id)
  on conflict (coach_user_id, player_id) do update
    set revoked_at = null;

  perform private.link_player_account(new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_auth_user();
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (new.email_confirmed_at is not null and old.email_confirmed_at is null)
  execute function private.handle_auth_user();
create trigger on_player_created
  after insert on public.players
  for each row execute function private.handle_new_player();

create or replace function private.is_coach()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and account_role = 'coach'
  );
$$;

create or replace function private.owns_player(target_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.player_accounts
    where player_id = target_player_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.can_edit_player(target_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.coach_player_assignments as assignment
    join public.profiles as coach on coach.id = assignment.coach_user_id
    where assignment.player_id = target_player_id
      and assignment.coach_user_id = (select auth.uid())
      and assignment.revoked_at is null
      and coach.account_role = 'coach'
  );
$$;

create or replace function private.can_read_player(target_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_edit_player(target_player_id)
      or private.owns_player(target_player_id);
$$;

create or replace function private.can_log_round_for_player(target_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_edit_player(target_player_id)
      or private.owns_player(target_player_id);
$$;

create or replace function public.claim_initial_coach(p_setup_code text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_hash text;
  claimed_by uuid;
  claimed_profile public.profiles;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(904271);

  select initial_coach_code_hash, initial_coach_claimed_by
  into expected_hash, claimed_by
  from private.application_setup
  where singleton = true
  for update;

  if expected_hash is null then
    raise exception 'The initial coach setup code has not been configured.';
  end if;

  if claimed_by is not null or exists (
    select 1 from public.profiles where account_role = 'coach'
  ) then
    raise exception 'The initial coach has already been configured.';
  end if;

  if expected_hash <> encode(extensions.digest(p_setup_code, 'sha256'), 'hex') then
    raise exception 'Invalid setup code.';
  end if;

  update public.profiles
  set account_role = 'coach'
  where id = (select auth.uid())
  returning * into claimed_profile;

  update private.application_setup
  set initial_coach_claimed_by = (select auth.uid()),
      initial_coach_claimed_at = now(),
      initial_coach_code_hash = null
  where singleton = true;

  return claimed_profile;
end;
$$;

revoke all on function private.is_coach() from public;
revoke all on function private.owns_player(uuid) from public;
revoke all on function private.can_edit_player(uuid) from public;
revoke all on function private.can_read_player(uuid) from public;
revoke all on function private.can_log_round_for_player(uuid) from public;
revoke all on function public.claim_initial_coach(text) from public;
grant execute on function private.is_coach() to authenticated;
grant execute on function private.owns_player(uuid) to authenticated;
grant execute on function private.can_edit_player(uuid) to authenticated;
grant execute on function private.can_read_player(uuid) to authenticated;
grant execute on function private.can_log_round_for_player(uuid) to authenticated;
grant execute on function public.claim_initial_coach(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.coach_player_assignments enable row level security;
alter table public.handicap_history enable row level security;
alter table public.tournaments enable row level security;
alter table public.rounds enable row level security;
alter table public.round_holes enable row level security;
alter table public.shot_logs enable row level security;
alter table public.player_documents enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.players from anon, authenticated;
revoke all on table public.coach_player_assignments from anon, authenticated;
revoke all on table public.handicap_history from anon, authenticated;
revoke all on table public.tournaments from anon, authenticated;
revoke all on table public.rounds from anon, authenticated;
revoke all on table public.round_holes from anon, authenticated;
revoke all on table public.shot_logs from anon, authenticated;
revoke all on table public.player_documents from anon, authenticated;

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.players to authenticated;
grant select on public.coach_player_assignments to authenticated;
grant select, insert, update, delete on public.handicap_history to authenticated;
grant select, insert, update, delete on public.tournaments to authenticated;
grant select, insert, update, delete on public.rounds to authenticated;
grant select, insert, update, delete on public.round_holes to authenticated;
grant select, insert, update, delete on public.shot_logs to authenticated;
grant select, insert, update, delete on public.player_documents to authenticated;

create policy profiles_read_self on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy players_read_authorized on public.players
  for select to authenticated
  using (private.can_read_player(id));
create policy players_insert_coach on public.players
  for insert to authenticated
  with check (private.is_coach() and created_by = (select auth.uid()));
create policy players_update_assigned_coach on public.players
  for update to authenticated
  using (private.can_edit_player(id))
  with check (private.can_edit_player(id));
create policy players_delete_assigned_coach on public.players
  for delete to authenticated
  using (private.can_edit_player(id));

create policy coach_assignments_read_own on public.coach_player_assignments
  for select to authenticated
  using (coach_user_id = (select auth.uid()));

create policy handicap_read_authorized on public.handicap_history
  for select to authenticated
  using (private.can_read_player(player_id));
create policy handicap_write_coach on public.handicap_history
  for all to authenticated
  using (private.can_edit_player(player_id))
  with check (private.can_edit_player(player_id));

create policy tournaments_read_authorized on public.tournaments
  for select to authenticated
  using (private.can_read_player(player_id));
create policy tournaments_write_coach on public.tournaments
  for all to authenticated
  using (private.can_edit_player(player_id))
  with check (private.can_edit_player(player_id));

create policy rounds_read_authorized on public.rounds
  for select to authenticated
  using (private.can_read_player(player_id));
create policy rounds_write_authorized on public.rounds
  for all to authenticated
  using (private.can_log_round_for_player(player_id))
  with check (private.can_log_round_for_player(player_id));

create policy round_holes_read_authorized on public.round_holes
  for select to authenticated
  using (private.can_read_player(player_id));
create policy round_holes_write_authorized on public.round_holes
  for all to authenticated
  using (private.can_log_round_for_player(player_id))
  with check (private.can_log_round_for_player(player_id));

create policy shot_logs_read_authorized on public.shot_logs
  for select to authenticated
  using (private.can_read_player(player_id));
create policy shot_logs_write_authorized on public.shot_logs
  for all to authenticated
  using (private.can_log_round_for_player(player_id))
  with check (private.can_log_round_for_player(player_id));

create policy player_documents_read_authorized on public.player_documents
  for select to authenticated
  using (
    private.can_edit_player(player_id)
    or (private.owns_player(player_id) and visibility = 'shared')
  );
create policy player_documents_write_coach on public.player_documents
  for all to authenticated
  using (private.can_edit_player(player_id))
  with check (private.can_edit_player(player_id));
