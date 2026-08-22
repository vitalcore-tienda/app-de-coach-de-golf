-- Security hardening for the first-coach bootstrap flow.
-- Supabase can grant EXECUTE to anon by default for routines created in the
-- public schema, so remove that grant explicitly and restore only the
-- authenticated role required by the RPC.

revoke all on function public.claim_initial_coach(text) from public;
revoke all on function public.claim_initial_coach(text) from anon;
grant execute on function public.claim_initial_coach(text) to authenticated;

create index if not exists application_setup_initial_coach_claimed_by_idx
  on private.application_setup (initial_coach_claimed_by);
