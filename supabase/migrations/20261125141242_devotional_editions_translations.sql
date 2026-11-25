begin;
-- Extend lifecycle and future dates; existing November content and release timestamps are untouched.
alter table public.devotional_entries drop constraint devotional_entries_status_check,
 drop constraint devotional_entries_publication_date_check,
 drop constraint devotional_entries_check,
 drop constraint devotional_entries_check1;
alter table public.devotional_entries add constraint devotional_entries_status_check check(status in('draft','under_review','approved','scheduled','published','archived')),
 add constraint devotional_entries_publication_date_check check(publication_date between date '2026-11-01' and date '2099-12-31'),
 add constraint devotional_entries_check check(status not in('approved','scheduled','published') or (reviewed_by is not null and reviewed_at is not null)),
 add constraint devotional_entries_release_check check(status not in('scheduled','published') or (release_at is not null and (release_at at time zone 'Africa/Lagos')::date>=publication_date));
create table public.devotional_editions(
 edition_key text primary key check(edition_key ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
 publication_name text not null default 'UNLEASH THE SUPERNATURAL' check(publication_name='UNLEASH THE SUPERNATURAL'),
 focus text not null,description text not null default '',cover_path text not null default '',
 status text not null default 'draft' check(status in('draft','announced','published','archived')),
 revision integer not null default 1 check(revision>0),updated_by uuid references auth.users(id),updated_at timestamptz not null default now()
);
create table public.devotional_translations(
 publication_date date not null references public.devotional_entries(publication_date),
 language text not null check(language in('yo','ig','ha','fr','nl','es','pt','de','ar','sw','el','he')),
 content jsonb not null check(jsonb_typeof(content)='object'),
 status text not null default 'in_progress' check(status in('not_started','in_progress','completed','language_reviewed','theology_reviewed','approved','published')),
 source_revision integer not null check(source_revision>0),revision integer not null default 1 check(revision>0),machine_assisted boolean not null default true,
 language_reviewed_by uuid references auth.users(id),theology_reviewed_by uuid references auth.users(id),approved_by uuid references auth.users(id),
 updated_by uuid references auth.users(id),updated_at timestamptz not null default now(),primary key(publication_date,language),
 check(status not in('language_reviewed','theology_reviewed','approved','published') or language_reviewed_by is not null),
 check(status not in('theology_reviewed','approved','published') or theology_reviewed_by is not null),
 check(status not in('approved','published') or approved_by is not null)
);
create index devotional_translations_status_idx on public.devotional_translations(language,status,publication_date);
create table public.devotional_editorial_audit(
 id bigint generated always as identity primary key,publication_date date,edition_key text,language text,
 resource text not null,action text not null,status text,revision integer,actor uuid references auth.users(id),created_at timestamptz not null default now()
);
create index devotional_editorial_audit_date_idx on public.devotional_editorial_audit(publication_date,created_at desc);
create table public.devotional_engagement(
 publication_date date primary key references public.devotional_entries(publication_date),opens bigint not null default 0 check(opens>=0)
);
create function public.crh_devotional_audit() returns trigger language plpgsql security invoker set search_path='' as $$
declare v jsonb := to_jsonb(new);
begin
 insert into public.devotional_editorial_audit(publication_date,edition_key,language,resource,action,status,revision,actor)
 values((v->>'publication_date')::date,coalesce(v->>'edition_key',left(v->>'publication_date',7)),v->>'language',tg_table_name,lower(tg_op),v->>'status',(v->>'revision')::integer,(v->>'updated_by')::uuid);
 return new;
end;$$;
revoke all on function public.crh_devotional_audit() from public,anon,authenticated;
grant execute on function public.crh_devotional_audit() to service_role;
create trigger devotional_entry_audit after insert or update on public.devotional_entries for each row execute function public.crh_devotional_audit();
create trigger devotional_edition_audit after insert or update on public.devotional_editions for each row execute function public.crh_devotional_audit();
create trigger devotional_translation_audit after insert or update on public.devotional_translations for each row execute function public.crh_devotional_audit();
create function public.crh_devotional_open(p_date date) returns void language sql security invoker set search_path='' as $$
 insert into public.devotional_engagement(publication_date,opens) select p_date,1 where exists(select 1 from public.devotional_entries where publication_date=p_date and status in('published','scheduled') and reviewed_by is not null and reviewed_at is not null and release_at<=now() and publication_date<=(now() at time zone 'Africa/Lagos')::date)
 on conflict(publication_date) do update set opens=public.devotional_engagement.opens+1;
$$;
revoke all on function public.crh_devotional_open(date) from public,anon,authenticated;
grant execute on function public.crh_devotional_open(date) to service_role;
alter table public.devotional_editions enable row level security;
alter table public.devotional_translations enable row level security;
alter table public.devotional_editorial_audit enable row level security;
alter table public.devotional_engagement enable row level security;
revoke all on public.devotional_editions,public.devotional_translations,public.devotional_editorial_audit,public.devotional_engagement from anon,authenticated;
grant select,insert,update on public.devotional_editions,public.devotional_translations,public.devotional_engagement to service_role;
grant select,insert on public.devotional_editorial_audit to service_role;
grant usage,select on sequence public.devotional_editorial_audit_id_seq to service_role;
insert into public.devotional_editions(edition_key,focus,description,cover_path,status) values
('2026-11','Thanksgiving and Supernatural Provision','The preserved November 2026 edition of UNLEASH THE SUPERNATURAL.','/assets/devotional/november-cover.svg','published'),
('2026-12','Christ Among Us: Life in the Spirit, Light for the World','Thirty-one daily encounters with Scripture: life in the Spirit, prayer, discernment, the coming of Christ and a faithful response to the year ahead.','/assets/devotional/2026-12/cover-art.png','announced') on conflict(edition_key) do nothing;
create or replace function public.search_ministry_devotional_archive(p_query text default '',p_theme text default '',p_at timestamptz default now()) returns jsonb language sql stable security invoker set search_path=pg_catalog,public as $$
 with params as (
  select left(trim(coalesce(p_query,'')),120) as term,websearch_to_tsquery('english'::regconfig,left(trim(coalesce(p_query,'')),120)) as query,
  regexp_replace(lower(left(trim(coalesce(p_query,'')),120)),'[^a-z0-9:-]','','g') as reference
 ), visible as not materialized (
  select publication_date,content from public.devotional_entries
  where status in('published','scheduled') and reviewed_by is not null and reviewed_at is not null and release_at is not null
  and release_at<=p_at and publication_date<=(p_at at time zone 'Africa/Lagos')::date
 ), matches as (
  select v.publication_date,v.content,p.term,p.query,
  ts_rank_cd(public.ministry_devotional_search_vector(v.content),p.query) as relevance
  from visible v cross join params p
  where (coalesce(p_theme,'')='' or v.content->>'monthlyTheme'=p_theme)
  and (p.term='' or public.ministry_devotional_search_vector(v.content)@@p.query
   or (p.term~'[0-9]' and length(p.reference)>=3 and
    (regexp_replace(replace(replace(lower(coalesce(v.content->>'mainReference','')||';'||coalesce(v.content->>'memoryReference','')||';'||coalesce(v.content->>'supportingReferences','')),'–','-'),'—','-'),'[^a-z0-9:;,\-]','','g') ~ ('(^|[;,])'||p.reference||'([^0-9]|$)'))))
  order by relevance desc,publication_date desc limit 366
 )
 select jsonb_build_object('entries',coalesce((select jsonb_agg(jsonb_build_object(
  'publicationDate',publication_date,'dayNumber',case when content->>'schemaVersion'='2' then extract(day from publication_date)::integer else publication_date-date '2026-11-01'+1 end,
  'title',content->>'title','monthlyTheme',content->>'monthlyTheme','dailyTheme',content->>'dailyTheme',
  'mainReference',content->>'mainReference','memoryReference',content->>'memoryReference',
  'excerpt',case when term='' then left(coalesce(content->>'centralTruth',content->>'message',''),220)
   else left(ts_headline('english'::regconfig,coalesce(content->>'message',''),query,'StartSel=[[, StopSel=]], MaxWords=30, MinWords=12, MaxFragments=1'),500) end
 ) order by relevance desc,publication_date desc) from matches),'[]'::jsonb),
 'themes',coalesce((select jsonb_agg(theme order by theme) from(select distinct content->>'monthlyTheme' as theme from visible where coalesce(content->>'monthlyTheme','')<>'') t),'[]'::jsonb));
$$;

notify pgrst,'reload schema';
commit;
