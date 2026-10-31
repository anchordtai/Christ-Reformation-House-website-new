begin;
create table public.ministry_broadcast (
  id integer primary key check (id = 1),
  title text not null default 'Gather around the Word' check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  video_id text not null default '' check (video_id = '' or video_id ~ '^[A-Za-z0-9_-]{11}$'),
  state text not null default 'offline' check (state in ('offline','scheduled','live','replay')),
  starts_at timestamptz,
  ends_at timestamptz,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  check (state = 'offline' or video_id <> ''),
  check (state not in ('scheduled','live') or (starts_at is not null and ends_at is not null and ends_at > starts_at and ends_at <= starts_at + interval '12 hours'))
);
alter table public.ministry_broadcast enable row level security;
revoke all on table public.ministry_broadcast from public, anon, authenticated;
grant select, update on table public.ministry_broadcast to service_role;
insert into public.ministry_broadcast(id) values (1);
notify pgrst, 'reload schema';
commit;
