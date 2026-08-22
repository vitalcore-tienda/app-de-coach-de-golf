-- Cover composite foreign keys in the same column order used by their
-- constraints. These indexes keep deletes, joins and RLS-related lookups
-- efficient as a coach adds rounds and scorecards.
create index if not exists rounds_tournament_player_idx
  on public.rounds (tournament_id, player_id)
  where tournament_id is not null;

create index if not exists round_holes_round_player_idx
  on public.round_holes (round_id, player_id);

create index if not exists shot_logs_round_hole_player_idx
  on public.shot_logs (round_hole_id, player_id);
