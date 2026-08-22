-- Player portal collaboration layer.
--
-- The coach can assign focused practice and exchange private messages with an
-- assigned golfer. Golfers can only read their own records, update assignment
-- status, and participate in their own conversation.

create table public.training_assignments (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  category text not null default 'general',
  instructions text,
  due_date date,
  status text not null default 'assigned',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_assignments_title_not_blank check (
    btrim(title) <> '' and char_length(title) <= 160
  ),
  constraint training_assignments_instructions_length check (
    instructions is null or char_length(instructions) <= 4000
  ),
  constraint training_assignments_category_check check (
    category in ('swing', 'putting', 'short_game', 'bunker', 'fitness', 'mental', 'strategy', 'general')
  ),
  constraint training_assignments_status_check check (
    status in ('assigned', 'in_progress', 'completed', 'cancelled')
  ),
  constraint training_assignments_completion_check check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create index training_assignments_player_status_due_idx
  on public.training_assignments (player_id, status, due_date, created_at desc);

create table public.player_messages (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  sender_user_id uuid not null references public.profiles(id) on delete restrict,
  sender_role public.golfcoach_account_role not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint player_messages_body_not_blank check (
    btrim(body) <> '' and char_length(body) <= 2000
  )
);

create index player_messages_player_created_idx
  on public.player_messages (player_id, created_at desc);
create index player_messages_player_unread_idx
  on public.player_messages (player_id, sender_role, created_at desc)
  where read_at is null;

create or replace function private.prepare_training_assignment_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.player_id is distinct from old.player_id
     or new.assigned_by is distinct from old.assigned_by
     or new.title is distinct from old.title
     or new.category is distinct from old.category
     or new.instructions is distinct from old.instructions
     or new.due_date is distinct from old.due_date
     or new.created_at is distinct from old.created_at then
    raise exception 'Training assignment identity and content are immutable.';
  end if;

  if new.status = 'completed' and old.status <> 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'completed' then
    new.completed_at := null;
  end if;

  return new;
end;
$$;

create or replace function private.protect_player_message()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.player_id is distinct from old.player_id
     or new.sender_user_id is distinct from old.sender_user_id
     or new.sender_role is distinct from old.sender_role
     or new.body is distinct from old.body
     or new.created_at is distinct from old.created_at then
    raise exception 'Messages cannot be rewritten.';
  end if;

  return new;
end;
$$;

revoke all on function private.prepare_training_assignment_update() from public, anon, authenticated;
revoke all on function private.protect_player_message() from public, anon, authenticated;

create trigger training_assignments_prepare_update
  before update on public.training_assignments
  for each row execute function private.prepare_training_assignment_update();

create trigger training_assignments_set_updated_at
  before update on public.training_assignments
  for each row execute function private.set_updated_at();

create trigger player_messages_protect_update
  before update on public.player_messages
  for each row execute function private.protect_player_message();

alter table public.training_assignments enable row level security;
alter table public.player_messages enable row level security;

revoke all on table public.training_assignments from public, anon, authenticated;
revoke all on table public.player_messages from public, anon, authenticated;

grant select, insert on table public.training_assignments to authenticated;
grant update (status, completed_at) on table public.training_assignments to authenticated;
grant select, insert on table public.player_messages to authenticated;
grant update (read_at) on table public.player_messages to authenticated;

create policy training_assignments_read_authorized
  on public.training_assignments
  for select to authenticated
  using (private.can_read_player(player_id));

create policy training_assignments_insert_coach
  on public.training_assignments
  for insert to authenticated
  with check (
    assigned_by = (select auth.uid())
    and private.is_coach()
    and private.can_edit_player(player_id)
  );

create policy training_assignments_update_authorized
  on public.training_assignments
  for update to authenticated
  using (private.can_read_player(player_id))
  with check (private.can_read_player(player_id));

create policy player_messages_read_authorized
  on public.player_messages
  for select to authenticated
  using (private.can_read_player(player_id));

create policy player_messages_insert_participant
  on public.player_messages
  for insert to authenticated
  with check (
    sender_user_id = (select auth.uid())
    and (
      (
        sender_role = 'coach'
        and private.is_coach()
        and private.can_edit_player(player_id)
      )
      or (
        sender_role = 'player'
        and private.owns_player(player_id)
      )
    )
  );

create policy player_messages_mark_received_read
  on public.player_messages
  for update to authenticated
  using (
    private.can_read_player(player_id)
    and sender_user_id <> (select auth.uid())
  )
  with check (
    private.can_read_player(player_id)
    and sender_user_id <> (select auth.uid())
  );

comment on table public.training_assignments is
  'Focused practice assigned by a coach and visible only to authorized participants.';
comment on table public.player_messages is
  'Private coach-player conversation protected by GolfCoach RLS.';
