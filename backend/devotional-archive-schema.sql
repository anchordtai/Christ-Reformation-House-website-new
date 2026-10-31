begin;
create function public.ministry_devotional_search_vector(c jsonb) returns tsvector language sql immutable strict parallel safe set search_path=pg_catalog as $$
 select setweight(to_tsvector('english'::regconfig,coalesce(c->>'title','')||' '||coalesce(c->>'mainReference','')||' '||coalesce(c->>'memoryReference','')),'A')
 || setweight(to_tsvector('english'::regconfig,coalesce(c->>'monthlyTheme','')||' '||coalesce(c->>'dailyTheme','')||' '||coalesce(c->>'centralTruth','')),'B')
 || setweight(to_tsvector('english'::regconfig,coalesce(c->>'message','')||' '||coalesce(c->>'supportingReferences','')||' '||coalesce(c->>'keyLessons','')||' '||coalesce(c->>'applications','')),'C');
$$;
revoke all on function public.ministry_devotional_search_vector(jsonb) from public,anon,authenticated;
grant execute on function public.ministry_devotional_search_vector(jsonb) to service_role;
create index ministry_devotional_released_search on public.devotional_entries using gin(public.ministry_devotional_search_vector(content)) where status in('published','scheduled');
create function public.search_ministry_devotional_archive(p_query text default '',p_theme text default '',p_at timestamptz default now()) returns jsonb language sql stable security invoker set search_path=pg_catalog,public as $$
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
  'publicationDate',publication_date,'dayNumber',publication_date-date '2026-11-01'+1,
  'title',content->>'title','monthlyTheme',content->>'monthlyTheme','dailyTheme',content->>'dailyTheme',
  'mainReference',content->>'mainReference','memoryReference',content->>'memoryReference',
  'excerpt',case when term='' then left(coalesce(content->>'centralTruth',content->>'message',''),220)
   else left(ts_headline('english'::regconfig,coalesce(content->>'message',''),query,'StartSel=[[, StopSel=]], MaxWords=30, MinWords=12, MaxFragments=1'),500) end
 ) order by relevance desc,publication_date desc) from matches),'[]'::jsonb),
 'themes',coalesce((select jsonb_agg(theme order by theme) from(select distinct content->>'monthlyTheme' as theme from visible where coalesce(content->>'monthlyTheme','')<>'') t),'[]'::jsonb));
$$;
revoke all on function public.search_ministry_devotional_archive(text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.search_ministry_devotional_archive(text,text,timestamptz) to service_role;
notify pgrst,'reload schema';
commit;
