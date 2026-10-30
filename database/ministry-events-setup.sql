-- Staff-authorized Express routes are the only access path to these tables.
create table public.ministry_events (
  id uuid primary key default gen_random_uuid(),
  creation_key uuid not null unique default gen_random_uuid(),
  title text not null check (length(title) between 1 and 160),
  description text not null check (length(description) between 1 and 5000),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  location text not null check (length(location) between 1 and 200),
  category text not null check (length(category) between 1 and 50),
  image_path text not null default '',
  meeting_room text,
  published boolean not null default false,
  registration_enabled boolean not null default false,
  revision integer not null default 1 check (revision > 0),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ministry_events_public_dates on public.ministry_events(starts_at) where published;
create table public.ministry_event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.ministry_events(id),
  name text not null check (length(name) between 1 and 100),
  email text not null check (length(email) between 3 and 254 and email = lower(email)),
  attendees integer not null check (attendees between 1 and 10),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(event_id,email)
);
create index ministry_event_registrations_dates on public.ministry_event_registrations(event_id,created_at desc);
alter table public.ministry_events enable row level security;
alter table public.ministry_event_registrations enable row level security;
revoke all on public.ministry_events,public.ministry_event_registrations from public,anon,authenticated;
grant select,insert,update on public.ministry_events to service_role;
grant select,insert on public.ministry_event_registrations to service_role;
-- Check the event and save the registration in one transaction. The shared lock
-- prevents a simultaneous closure/unpublication from racing the registration.
create function public.register_ministry_event(p_event uuid,p_name text,p_email text,p_attendees integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare event_row public.ministry_events%rowtype;
begin
  select * into event_row from public.ministry_events where id = p_event for share;
  if not found or not event_row.published or not event_row.registration_enabled or event_row.ends_at <= now() then
    raise exception 'Registration closed';
  end if;
  insert into public.ministry_event_registrations(event_id,name,email,attendees)
  values(p_event,p_name,lower(trim(p_email)),p_attendees)
  on conflict(event_id,email) do nothing;
end;
$$;
revoke all on function public.register_ministry_event(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.register_ministry_event(uuid,text,text,integer) to service_role;
