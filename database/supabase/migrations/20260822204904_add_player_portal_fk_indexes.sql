-- Cover the user/profile foreign keys used by maintenance and joins.
create index training_assignments_assigned_by_idx
  on public.training_assignments (assigned_by);

create index player_messages_sender_user_idx
  on public.player_messages (sender_user_id);
