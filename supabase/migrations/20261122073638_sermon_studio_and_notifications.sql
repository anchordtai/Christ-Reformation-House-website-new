-- Additive only: existing meetings, donations, publications and identities are untouched.
begin;
create table public.ministry_sermon_settings (
 id integer primary key check(id=1), recording_mode text not null default 'manual' check(recording_mode in ('manual','host_automatic','automatic')),
 publishing_mode text not null default 'review' check(publishing_mode in ('review','automatic','exception')),
 email_sermons boolean not null default false,email_sermons_since timestamptz,
 revision integer not null default 1, updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);
insert into public.ministry_sermon_settings(id) values(1);
create table public.ministry_sermons (
 id uuid primary key, slug text unique not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),title text not null,speaker text not null,sermon_date date not null,
 theme text not null default '',scripture text not null default '',summary text not null default '',series text not null default '',notes text not null default '',category text not null,
 visibility text not null default 'private' check(visibility in ('public','private')),status text not null default 'draft' check(status in ('draft','awaiting_review','scheduled','published','archived')),
 consent boolean not null default false, automation_approved boolean not null default false, original_id uuid,enhanced_id uuid,video_id text not null default '',chapters jsonb not null default '[]',translations jsonb not null default '{}',
 reviewed_at timestamptz,publish_at timestamptz,revision integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid references auth.users(id),
 check(status not in ('published','scheduled') or (visibility='public' and consent and reviewed_at is not null and publish_at is not null and original_id is not null))
);
alter table public.ministry_sermons add column search_text tsvector generated always as (to_tsvector('simple'::regconfig,title||' '||scripture||' '||theme||' '||case when translations->'en'->>'status'='reviewed' then coalesce(translations->'en'->>'transcript','') else '' end)) stored;
create index ministry_sermons_search_idx on public.ministry_sermons using gin(search_text);
create index ministry_sermons_release_idx on public.ministry_sermons(status,publish_at desc);
create table public.ministry_sermon_assets (
 id uuid primary key,sermon_id uuid not null references public.ministry_sermons(id),kind text not null check(kind in ('original','enhanced','translation')),language text not null,
 path text unique not null,mime text not null check(mime in ('audio/webm','audio/ogg','audio/wav','audio/mpeg','audio/mp4')),
 expected_bytes bigint not null check(expected_bytes between 12 and 20971520),sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),state text not null default 'pending' check(state in ('pending','ready','failed')),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '3 hours',verified_at timestamptz,error text
);
create index ministry_sermon_assets_sermon_idx on public.ministry_sermon_assets(sermon_id);
alter table public.ministry_sermons add constraint sermon_original_fk foreign key(original_id) references public.ministry_sermon_assets(id);
alter table public.ministry_sermons add constraint sermon_enhanced_fk foreign key(enhanced_id) references public.ministry_sermon_assets(id);
create table public.ministry_sermon_sessions (
 sermon_id uuid primary key references public.ministry_sermons(id),room text not null,actor uuid not null references auth.users(id),state text not null check(state in ('recording','paused','ended','failed')),
 updated_at timestamptz not null default now(),expires_at timestamptz not null,started_at timestamptz not null default now()
);
create table public.ministry_announcements (
 id uuid primary key,title text not null,body text not null default '',href text not null,category text not null,
 pages jsonb not null default '["*"]',priority text not null default 'normal' check(priority in ('normal','important','urgent')),pinned boolean not null default false,
 status text not null default 'draft' check(status in ('draft','published','cancelled')),starts_at timestamptz not null,expires_at timestamptz not null,
 revision integer not null default 1,updated_by uuid references auth.users(id),updated_at timestamptz not null default now(),check(expires_at>starts_at)
);
create index ministry_announcements_release_idx on public.ministry_announcements(status,starts_at,expires_at);
create table public.ministry_sermon_history (
 id bigint generated always as identity primary key,sermon_id uuid references public.ministry_sermons(id),actor uuid references auth.users(id),action text not null,detail jsonb not null default '{}',created_at timestamptz not null default now()
);
-- Originals remain immutable, including after a sermon is archived.
create function public.crh_sermon_asset_immutable() returns trigger language plpgsql set search_path='' as $$
begin
 if old.state='ready' and new is distinct from old then raise exception 'Verified recording metadata is immutable';end if;
 return new;
end $$;
create trigger crh_sermon_asset_immutable before update on public.ministry_sermon_assets for each row execute function public.crh_sermon_asset_immutable();
-- Reserve the maximum possible upload size, not a client-supplied small size.
-- Aggregate physical usage includes all buckets, leaving headroom in the free project.
create function public.crh_sermon_reserve(p_id uuid,p_sermon uuid,p_actor uuid,p_kind text,p_language text,p_mime text,p_bytes bigint,p_sha text,p_path text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare occupied bigint;project_used bigint;reserved bigint;
begin
 perform pg_advisory_xact_lock(7264722);
 -- The service-only API resolves and verifies p_actor through Auth and checks trusted app_metadata.
 -- This quota RPC does not require raw auth.users SELECT privileges.
 if p_actor is null then raise exception 'Verified actor required';end if;
 if not exists(select 1 from public.ministry_sermons where id=p_sermon and status not in ('published','scheduled','archived')) then raise exception 'Use a draft sermon';end if;
 select coalesce(sum(coalesce((metadata->>'size')::bigint,0)),0) into occupied from storage.objects where bucket_id='crh-sermon-media';
 select coalesce(sum(coalesce((metadata->>'size')::bigint,0)),0) into project_used from storage.objects;
 select count(*)*20971520 into reserved from public.ministry_sermon_assets a where a.state='pending' and a.expires_at>now() and not exists(select 1 from storage.objects o where o.bucket_id='crh-sermon-media' and o.name=a.path);
 if occupied+reserved+20971520>209715200 or project_used+reserved+20971520>943718400 then raise exception 'Free storage safety limit reached';end if;
 if p_path<>p_sermon::text||'/'||p_id::text then raise exception 'Invalid upload path';end if;
 insert into public.ministry_sermon_assets(id,sermon_id,created_by,kind,language,mime,expected_bytes,sha256,path) values(p_id,p_sermon,p_actor,p_kind,p_language,p_mime,p_bytes,p_sha,p_path);
 return p_id;
end $$;
revoke all on function public.crh_sermon_reserve(uuid,uuid,uuid,text,text,text,bigint,text,text) from public,anon,authenticated;
grant execute on function public.crh_sermon_reserve(uuid,uuid,uuid,text,text,text,bigint,text,text) to service_role;
revoke all on function public.crh_sermon_asset_immutable() from public,anon,authenticated;
-- Service-only tables: authorization is performed by the existing verified staff API.
alter table public.ministry_sermon_settings enable row level security;
alter table public.ministry_sermons enable row level security;
alter table public.ministry_sermon_assets enable row level security;
alter table public.ministry_sermon_sessions enable row level security;
alter table public.ministry_announcements enable row level security;
alter table public.ministry_sermon_history enable row level security;
revoke all on public.ministry_sermon_settings,public.ministry_sermons,public.ministry_sermon_assets,public.ministry_sermon_sessions,public.ministry_announcements,public.ministry_sermon_history from public,anon,authenticated;
grant all on public.ministry_sermon_settings,public.ministry_sermons,public.ministry_sermon_assets,public.ministry_sermon_sessions,public.ministry_announcements,public.ministry_sermon_history to service_role;
grant usage,select on sequence public.ministry_sermon_history_id_seq to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('crh-sermon-media','crh-sermon-media',false,20971520,array['audio/webm','audio/ogg','audio/wav','audio/mpeg','audio/mp4']);
commit;
