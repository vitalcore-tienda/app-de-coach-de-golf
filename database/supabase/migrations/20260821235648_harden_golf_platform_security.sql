-- Defense-in-depth hardening for the dedicated GolfCoach project.
--
-- This follows the initial platform migration without modifying its history:
-- * rejects NULL bootstrap codes;
-- * locks private tables and trigger helpers down explicitly;
-- * keeps player account links aligned with confirmed email changes; and
-- * supports legitimate nine-hole rounds.

alter table private.application_setup enable row level security;
alter table private.player_accounts enable row level security;

revoke all on table private.application_setup from public, anon, authenticated;
revoke all on table private.player_accounts from public, anon, authenticated;

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

  if p_setup_code is null
     or expected_hash is distinct from encode(extensions.digest(p_setup_code, 'sha256'), 'hex') then
    raise exception 'Invalid setup code.';
  end if;

  update public.profiles
  set account_role = 'coach'
  where id = (select auth.uid())
  returning * into claimed_profile;

  if claimed_profile.id is null then
    raise exception 'The authenticated profile could not be initialized.';
  end if;

  update private.application_setup
  set initial_coach_claimed_by = (select auth.uid()),
      initial_coach_claimed_at = now(),
      initial_coach_code_hash = null
  where singleton = true;

  return claimed_profile;
end;
$$;

-- Keep an email-based player login link accurate if the authenticated account
-- changes email. This runs only inside Auth triggers and never exposes private
-- account mapping data to clients.
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

  if tg_op = 'UPDATE' and new.email is distinct from old.email then
    delete from private.player_accounts
    where user_id = new.id;
  end if;

  if new.email_confirmed_at is not null then
    delete from private.player_accounts
    where user_id = new.id;

    if new.email is not null and btrim(new.email) <> '' then
      for matched_player in
        select players.id
        from public.players
        where lower(players.email) = lower(new.email)
      loop
        perform private.link_player_account(matched_player.id, new.email);
      end loop;
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.sync_player_account_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from private.player_accounts
  where player_id = new.id;

  perform private.link_player_account(new.id, new.email);
  return new;
end;
$$;

create or replace function private.protect_player_creator()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'The player creator cannot be changed.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function private.handle_auth_user();

drop trigger if exists on_player_email_changed on public.players;
create trigger on_player_email_changed
  after update of email on public.players
  for each row
  when (new.email is distinct from old.email)
  execute function private.sync_player_account_link();

drop trigger if exists players_creator_immutable on public.players;
create trigger players_creator_immutable
  before update of created_by on public.players
  for each row execute function private.protect_player_creator();

alter table public.rounds
  drop constraint if exists rounds_course_par_check;
alter table public.rounds
  add constraint rounds_course_par_check
  check (course_par is null or course_par between 27 and 90);

revoke all on function public.claim_initial_coach(text) from public, anon, authenticated;
grant execute on function public.claim_initial_coach(text) to authenticated;

revoke all on function private.is_coach() from public, anon, authenticated;
revoke all on function private.owns_player(uuid) from public, anon, authenticated;
revoke all on function private.can_edit_player(uuid) from public, anon, authenticated;
revoke all on function private.can_read_player(uuid) from public, anon, authenticated;
revoke all on function private.can_log_round_for_player(uuid) from public, anon, authenticated;
grant execute on function private.is_coach() to authenticated;
grant execute on function private.owns_player(uuid) to authenticated;
grant execute on function private.can_edit_player(uuid) to authenticated;
grant execute on function private.can_read_player(uuid) to authenticated;
grant execute on function private.can_log_round_for_player(uuid) to authenticated;

revoke all on function private.link_player_account(uuid, text) from public, anon, authenticated;
revoke all on function private.handle_auth_user() from public, anon, authenticated;
revoke all on function private.handle_new_player() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.sync_player_account_link() from public, anon, authenticated;
revoke all on function private.protect_player_creator() from public, anon, authenticated;
