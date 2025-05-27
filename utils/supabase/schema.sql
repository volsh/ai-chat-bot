-- Enable UUID support
create extension if not exists "uuid-ossp";

-- sessions
create table if not exists sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  created_at timestamp default now(),
  archived boolean default false,
  order_index integer default 0,
  goal text,
  emoji text,
  color text,
  shared_with uuid[] default '{}',
  folder_id uuid references folders(id),
  team_id uuid references teams(id),
  summary text
);

alter table sessions enable row level security;

create policy "users can view shared or owned sessions"
  on sessions for select
  using (auth.uid() = user_id or auth.uid() = any(shared_with));

create policy "users can update their own sessions"
  on sessions for update
  using (auth.uid() = user_id);

-- messages
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references sessions(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamp default now()
);

alter table messages enable row level security;

create policy "users can read messages of owned sessions"
  on messages for select
  using (
    session_id in (
      select id from sessions where user_id = auth.uid() or auth.uid() = any(shared_with)
    )
  );

create policy "users can insert messages"
  on messages for insert
  with check (
    session_id in (
      select id from sessions where user_id = auth.uid()
    )
  );

-- folders
create table if not exists folders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users,
  name text,
  emoji text,
  color text,
  shared_with uuid[] default '{}',
  parent_id uuid references folders(id)
);

alter table folders enable row level security;

create policy "users can view their folders"
  on folders for select
  using (auth.uid() = user_id or auth.uid() = any(shared_with));

-- teams
create table if not exists teams (
  id uuid primary key default uuid_generate_v4(),
  name text,
  created_by uuid references auth.users
);

-- team_members
create table if not exists team_members (
  id serial primary key,
  team_id uuid references teams(id),
  user_id uuid references auth.users,
  role text default 'member'
);

-- session_events
create table if not exists session_events (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  event_type text not null, -- e.g. rename, share, archive, delete
  description text,
  created_at timestamptz default now()
);

alter table session_events enable row level security;

create policy "users can view events of sessions they own"
  on session_events for select
  using (
    session_id in (
      select id from sessions where user_id = auth.uid() or auth.uid() = any(shared_with)
    )
  );
