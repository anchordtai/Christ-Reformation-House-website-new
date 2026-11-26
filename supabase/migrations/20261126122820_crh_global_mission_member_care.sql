begin;
create table public.crh_members (
 user_id uuid primary key references auth.users(id),display_name text not null check(length(display_name) between 2 and 120),email text not null,
 country text not null,language text not null default 'en' check(language in('en','yo','ig','ha','fr')),timezone text not null default 'Africa/Lagos',
 consent_at timestamptz not null,created_at timestamptz not null default now()
);
create table public.crh_mission_staff (
 user_id uuid primary key references auth.users(id),granted_by uuid not null references auth.users(id),active boolean not null default true,created_at timestamptz not null default now()
);
create table public.crh_mission_projects (
 id uuid primary key default gen_random_uuid(),title text not null,country text not null,location text not null,summary text not null,goals text not null,
 report text not null default '',status text not null default 'draft' check(status in('draft','published','archived')),revision integer not null default 1,
 updated_by uuid not null references auth.users(id),updated_at timestamptz not null default now()
);
create table public.crh_mission_applications (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),project_id uuid references public.crh_mission_projects(id),
 interest text not null check(interest in('volunteer','partner','prayer')),message text not null check(length(message) between 20 and 4000),consent_at timestamptz not null,
 status text not null default 'submitted' check(status in('submitted','contacted','accepted','closed')),assigned_to uuid references auth.users(id),reply text not null default '',
 revision integer not null default 1,created_at timestamptz not null default now()
);
create table public.crh_care_requests (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),category text not null check(category in('new_believer','prayer','discipleship','fellowship')),
 message text not null check(length(message) between 20 and 4000),consent_at timestamptz not null,status text not null default 'requested' check(status in('requested','assigned','in_progress','closed')),
 assigned_to uuid references auth.users(id),reply text not null default '',revision integer not null default 1,created_at timestamptz not null default now()
);
create table public.crh_fellowships (
 id uuid primary key default gen_random_uuid(),name text not null,country text not null,city text not null,description text not null,
 contact_url text not null,meeting_info text not null,status text not null default 'draft' check(status in('draft','published','archived')),
 revision integer not null default 1,updated_by uuid not null references auth.users(id)
);
create table public.crh_discipleship_lessons (
 id uuid primary key default gen_random_uuid(),title text not null,body text not null,scripture text not null,position integer not null unique,
 status text not null default 'draft' check(status in('draft','published','archived')),revision integer not null default 1,updated_by uuid not null references auth.users(id)
);
create table public.crh_discipleship_progress (
 user_id uuid not null references auth.users(id),lesson_id uuid not null references public.crh_discipleship_lessons(id),completed_at timestamptz not null default now(),primary key(user_id,lesson_id)
);
create table public.crh_mission_audit (
 id bigint generated always as identity primary key,actor uuid not null references auth.users(id),action text not null,resource text not null,record_id text,created_at timestamptz not null default now()
);
do $$declare t text;begin foreach t in array array['crh_members','crh_mission_staff','crh_mission_projects','crh_mission_applications','crh_care_requests','crh_fellowships','crh_discipleship_lessons','crh_discipleship_progress','crh_mission_audit'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);execute format('grant select,insert,update on public.%I to service_role',t);
end loop;end $$;
revoke update on public.crh_mission_audit from service_role;
grant usage,select on sequence public.crh_mission_audit_id_seq to service_role;
create index crh_mission_applications_user_idx on public.crh_mission_applications(user_id);
create index crh_mission_applications_assigned_idx on public.crh_mission_applications(assigned_to);
create index crh_mission_applications_project_idx on public.crh_mission_applications(project_id);
create index crh_care_requests_user_idx on public.crh_care_requests(user_id);
create index crh_care_requests_assigned_idx on public.crh_care_requests(assigned_to);
create index crh_discipleship_progress_lesson_idx on public.crh_discipleship_progress(lesson_id);
-- Index relationship lookups without changing any pre-existing ministry table.
do $$declare r record;begin
 for r in select c.relname as tab,a.attname as col from pg_constraint f join pg_class c on c.oid=f.conrelid join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid and a.attnum=f.conkey[1]
 where f.contype='f' and n.nspname='public' and c.relname like 'crh_%' and array_length(f.conkey,1)=1 and not exists(select 1 from pg_index i where i.indrelid=c.oid and i.indkey[0]=f.conkey[1])
 loop execute format('create index if not exists %I on public.%I(%I)',r.tab||'_'||r.col||'_fk_idx',r.tab,r.col);end loop;
end $$;
notify pgrst,'reload schema';
commit;
