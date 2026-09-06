create table private.coach_invitations (
  id uuid primary key default gen_random_uuid(),
  code_hash text,
  email_hash text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  claimed_by uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  revoked_at timestamptz,
  constraint coach_invitations_code_hash_format
    check (code_hash is null or code_hash ~ '^[0-9a-f]{64}$'),
  constraint coach_invitations_email_hash_format
    check (email_hash ~ '^[0-9a-f]{64}$'),
  constraint coach_invitations_expiration_valid
    check (expires_at > created_at),
  constraint coach_invitations_claim_state
    check (
      (claimed_by is null and claimed_at is null)
      or (claimed_by is not null and claimed_at is not null)
    ),
  constraint coach_invitations_consumed_code
    check (claimed_at is null or code_hash is null)
);

create unique index coach_invitations_code_hash_idx
  on private.coach_invitations (code_hash)
  where code_hash is not null;

create index coach_invitations_created_by_idx
  on private.coach_invitations (created_by);

create index coach_invitations_claimed_by_idx
  on private.coach_invitations (claimed_by)
  where claimed_by is not null;

alter table private.coach_invitations enable row level security;

revoke all on table private.coach_invitations from public, anon, authenticated;

comment on table private.coach_invitations is
  'Single-use coach invitations. Email addresses and invitation codes are stored only as SHA-256 hashes.';

create or replace function public.claim_coach_access(p_setup_code text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  caller_email text;
  normalized_code text;
  code_digest text;
  email_digest text;
  expected_initial_hash text;
  initial_claimed_by uuid;
  invitation_id uuid;
  claimed_profile public.profiles;
begin
  if caller_id is null then
    raise exception 'Authentication is required.';
  end if;

  normalized_code := upper(btrim(coalesce(p_setup_code, '')));

  if char_length(normalized_code) < 12 or char_length(normalized_code) > 128 then
    raise exception 'Invalid or expired coach invitation.';
  end if;

  select lower(btrim(users.email))
  into caller_email
  from auth.users as users
  where users.id = caller_id
    and users.email_confirmed_at is not null;

  if caller_email is null or caller_email = '' then
    raise exception 'A confirmed email address is required.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(904271);

  select profiles.*
  into claimed_profile
  from public.profiles as profiles
  where profiles.id = caller_id
  for update;

  if claimed_profile.id is null then
    raise exception 'The authenticated profile could not be initialized.';
  end if;

  if claimed_profile.account_role = 'coach' then
    return claimed_profile;
  end if;

  if exists (
    select 1
    from private.player_accounts
    where user_id = caller_id
  ) then
    raise exception 'This account is already linked to a golfer.';
  end if;

  code_digest := encode(extensions.digest(normalized_code, 'sha256'), 'hex');
  email_digest := encode(extensions.digest(caller_email, 'sha256'), 'hex');

  select setup.initial_coach_code_hash, setup.initial_coach_claimed_by
  into expected_initial_hash, initial_claimed_by
  from private.application_setup as setup
  where setup.singleton = true
  for update;

  if expected_initial_hash is not null
     and initial_claimed_by is null
     and not exists (
       select 1 from public.profiles where account_role = 'coach'
     )
     and expected_initial_hash = code_digest then
    update public.profiles
    set account_role = 'coach'
    where id = caller_id
    returning * into claimed_profile;

    update private.application_setup
    set initial_coach_claimed_by = caller_id,
        initial_coach_claimed_at = now(),
        initial_coach_code_hash = null
    where singleton = true;

    return claimed_profile;
  end if;

  select invitations.id
  into invitation_id
  from private.coach_invitations as invitations
  where invitations.code_hash = code_digest
    and invitations.email_hash = email_digest
    and invitations.claimed_by is null
    and invitations.claimed_at is null
    and invitations.revoked_at is null
    and invitations.expires_at > now()
  for update;

  if invitation_id is null then
    raise exception 'Invalid or expired coach invitation.';
  end if;

  update public.profiles
  set account_role = 'coach'
  where id = caller_id
  returning * into claimed_profile;

  update private.coach_invitations
  set claimed_by = caller_id,
      claimed_at = now(),
      code_hash = null
  where id = invitation_id;

  return claimed_profile;
end;
$$;

-- Keep the public v26 client working while browsers refresh to the generic UI.
create or replace function public.claim_initial_coach(p_setup_code text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.claim_coach_access(p_setup_code);
end;
$$;

revoke all on function public.claim_coach_access(text) from public, anon, authenticated;
revoke all on function public.claim_initial_coach(text) from public, anon, authenticated;

grant execute on function public.claim_coach_access(text) to authenticated;
grant execute on function public.claim_initial_coach(text) to authenticated;
