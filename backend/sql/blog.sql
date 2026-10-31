-- Server-only blog. No sample articles and no browser table/storage grants.
create table public.ministry_blog_media (
 id uuid primary key, sha256 text not null, bytes integer not null check(bytes between 1 and 5242880),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.ministry_blog_posts (
 id uuid primary key, slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=120),
 title text not null check(length(title) between 1 and 160), excerpt text not null check(length(excerpt)<=500),
 body text not null check(length(body) between 1 and 40000), author text not null check(length(author) between 1 and 100),
 category text not null check(length(category) between 1 and 60), tags text[] not null default '{}',
 cover_id uuid references public.ministry_blog_media(id), cover_alt text not null default '' check(length(cover_alt)<=250),
 status text not null default 'draft' check(status in ('draft','published','scheduled')),
 publish_at timestamptz, reviewed_at timestamptz, updated_by uuid not null references auth.users(id),
 revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status='draft' or (publish_at is not null and reviewed_at is not null and cover_id is not null and length(cover_alt)>0)),
 search tsvector generated always as (to_tsvector('english',title||' '||excerpt||' '||body)) stored
);
create index ministry_blog_release_idx on public.ministry_blog_posts(publish_at desc,id) where status in ('published','scheduled');
create index ministry_blog_search_idx on public.ministry_blog_posts using gin(search);
create table public.ministry_blog_likes(post_id uuid not null references public.ministry_blog_posts(id), visitor_hash text not null, primary key(post_id,visitor_hash));
create table public.ministry_blog_comments(
 id uuid primary key, post_id uuid not null references public.ministry_blog_posts(id), visitor_hash text not null,
 alias text not null check(length(alias) between 1 and 60), body text not null check(length(body) between 1 and 2000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(), moderated_by uuid references auth.users(id), moderated_at timestamptz
);
create index ministry_blog_comment_public_idx on public.ministry_blog_comments(post_id,status,created_at desc);
create index ministry_blog_comment_queue_idx on public.ministry_blog_comments(status,created_at desc);
create table public.ministry_blog_ai_usage(actor uuid not null references auth.users(id), day date not null, calls integer not null, primary key(actor,day));
-- Invoker RPCs: execute is restricted to service_role; website roles cannot call them.
create function public.crh_blog_interact(p_post uuid,p_visitor text,p_like boolean default null,p_comment uuid default null,p_alias text default null,p_body text default null)
returns jsonb language plpgsql set search_path='' as $$
declare result_id uuid;
begin
 perform id from public.ministry_blog_posts where id=p_post and status in ('published','scheduled') and reviewed_at is not null and publish_at<=now() for share;
 if not found then raise exception 'Article not available' using errcode='P0002'; end if;
 if p_visitor !~ '^[a-f0-9]{64}$' then raise exception 'Invalid reader'; end if;
 if p_like is not null then
  if p_like then insert into public.ministry_blog_likes values(p_post,p_visitor) on conflict do nothing;
  else delete from public.ministry_blog_likes where post_id=p_post and visitor_hash=p_visitor; end if;
 elsif p_comment is not null then
  insert into public.ministry_blog_comments(id,post_id,visitor_hash,alias,body) values(p_comment,p_post,p_visitor,p_alias,p_body) on conflict(id) do nothing;
  if not exists(select 1 from public.ministry_blog_comments where id=p_comment and post_id=p_post and visitor_hash=p_visitor and alias=p_alias and body=p_body) then raise exception 'Comment reference already used' using errcode='23505'; end if;
 end if;
 return jsonb_build_object('saved',true);
end $$;
create function public.crh_blog_ai_claim(p_actor uuid) returns boolean language plpgsql set search_path='' as $$
declare n integer;
begin
 insert into public.ministry_blog_ai_usage values(p_actor,(now() at time zone 'Africa/Lagos')::date,1)
 on conflict(actor,day) do update set calls=public.ministry_blog_ai_usage.calls+1 where public.ministry_blog_ai_usage.calls<10 returning calls into n;
 return n is not null;
end $$;
do $$ declare t text; begin
 foreach t in array array['ministry_blog_media','ministry_blog_posts','ministry_blog_likes','ministry_blog_comments','ministry_blog_ai_usage'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select,insert,update,delete on public.%I to service_role',t);
 end loop;
end $$;
revoke all on function public.crh_blog_interact(uuid,text,boolean,uuid,text,text) from public,anon,authenticated;
grant execute on function public.crh_blog_interact(uuid,text,boolean,uuid,text,text) to service_role;
revoke all on function public.crh_blog_ai_claim(uuid) from public,anon,authenticated;
grant execute on function public.crh_blog_ai_claim(uuid) to service_role;
create function public.crh_blog_counts(p_post uuid) returns bigint language sql stable set search_path='' as $$select count(*) from public.ministry_blog_likes where post_id=p_post$$;
revoke all on function public.crh_blog_counts(uuid) from public,anon,authenticated;
grant execute on function public.crh_blog_counts(uuid) to service_role;
create index ministry_blog_media_creator_idx on public.ministry_blog_media(created_by);
create index ministry_blog_posts_cover_idx on public.ministry_blog_posts(cover_id);
create index ministry_blog_posts_editor_idx on public.ministry_blog_posts(updated_by);
create index ministry_blog_comments_moderator_idx on public.ministry_blog_comments(moderated_by);
