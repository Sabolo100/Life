-- LifeChapters AI - Initial Database Schema
-- Run this in Supabase SQL Editor

-- 1. Profiles table (always used)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  storage_preference text not null default 'cloud' check (storage_preference in ('local', 'cloud')),
  privacy_accepted_at timestamptz,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Chat Sessions
create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  title text not null default 'Új beszélgetés',
  mode text not null default 'free' check (mode in ('free', 'interview', 'timeline', 'family', 'career')),
  goal text check (goal in ('childhood', 'family', 'career', 'education', 'relationships', 'travel', 'hardships', 'fond_memories', 'turning_points', 'free', null)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table chat_sessions enable row level security;
create policy "Users can manage own sessions" on chat_sessions for all using (auth.uid() = user_id);

-- 3. Messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  content text not null,
  is_user boolean not null default true,
  draft boolean not null default false,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;
create policy "Users can manage own messages" on messages for all using (auth.uid() = user_id);

create index idx_messages_session on messages(session_id, created_at);

-- 4. Life Stories
create table if not exists life_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null unique,
  content text not null default '',
  title text not null default 'Az én életutam',
  last_updated timestamptz not null default now()
);

alter table life_stories enable row level security;
create policy "Users can manage own life story" on life_stories for all using (auth.uid() = user_id);

-- 5. Persons
create table if not exists persons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  nickname text,
  relationship_type text not null default '',
  related_period text,
  related_event_ids uuid[] default '{}',
  notes text,
  uncertainty text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table persons enable row level security;
create policy "Users can manage own persons" on persons for all using (auth.uid() = user_id);

-- 6. Locations (before Events, because Events references Locations)
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text not null default '',
  related_period text,
  coordinates jsonb,
  notes text
);

alter table locations enable row level security;
create policy "Users can manage own locations" on locations for all using (auth.uid() = user_id);

-- 7. Events
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  time_type text not null default 'uncertain' check (time_type in ('exact_date', 'estimated_year', 'life_phase', 'uncertain')),
  exact_date date,
  estimated_year integer,
  life_phase text,
  uncertain_time text,
  location_id uuid references locations on delete set null,
  person_ids uuid[] default '{}',
  category text not null default '',
  is_turning_point boolean not null default false,
  source text not null default 'self' check (source in ('self', 'invited_person')),
  created_at timestamptz not null default now()
);

alter table events enable row level security;
create policy "Users can manage own events" on events for all using (auth.uid() = user_id);

-- 8. Time Periods
create table if not exists time_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  label text not null,
  start_type text not null default 'uncertain' check (start_type in ('exact', 'estimated', 'uncertain')),
  start_value text not null default '',
  end_type text not null default 'ongoing' check (end_type in ('exact', 'estimated', 'uncertain', 'ongoing')),
  end_value text,
  category text not null default '',
  event_ids uuid[] default '{}',
  person_ids uuid[] default '{}'
);

alter table time_periods enable row level security;
create policy "Users can manage own time periods" on time_periods for all using (auth.uid() = user_id);

-- 9. Emotions
create table if not exists emotions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  event_id uuid references events on delete cascade not null,
  feeling text not null,
  valence text not null default 'neutral' check (valence in ('positive', 'negative', 'mixed', 'neutral')),
  importance integer not null default 3 check (importance between 1 and 5),
  long_term_impact text,
  notes text
);

alter table emotions enable row level security;
create policy "Users can manage own emotions" on emotions for all using (auth.uid() = user_id);

-- 10. Open Questions
create table if not exists open_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  question_type text not null default 'follow_up' check (question_type in ('incomplete_topic', 'unresolved_event', 'unclear_time', 'missing_detail', 'follow_up')),
  description text not null,
  related_event_id uuid references events on delete set null,
  related_person_id uuid references persons on delete set null,
  priority integer not null default 3 check (priority between 1 and 5),
  status text not null default 'open' check (status in ('open', 'addressed', 'closed')),
  created_at timestamptz not null default now(),
  addressed_at timestamptz
);

alter table open_questions enable row level security;
create policy "Users can manage own questions" on open_questions for all using (auth.uid() = user_id);

-- 11. Invitations (for future multi-user features)
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  invited_email text,
  token text not null unique,
  permission_level text not null default 'reader' check (permission_level in ('reader', 'commenter', 'contributor', 'editor')),
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table invitations enable row level security;
create policy "Users can manage own invitations" on invitations for all using (auth.uid() = user_id);
