BEGIN;
DO $$
DECLARE fixture_actor uuid; p uuid:=gen_random_uuid(); m uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); n integer;
BEGIN
 select id into fixture_actor from auth.users where raw_app_meta_data->>'devotional_editor'='true' limit 1;
 if fixture_actor is null then raise exception 'No existing editor for rollback fixture'; end if;
 insert into public.ministry_blog_media values(m,repeat('0',64),100,fixture_actor,now());
 insert into public.ministry_blog_posts(id,slug,title,excerpt,body,author,category,cover_id,cover_alt,status,publish_at,reviewed_at,updated_by)
 values(p,'rollback-'||p,'Rollback fixture','Never committed','Prayer and faith','Test fixture','Test',m,'Fixture image','scheduled',now()+interval '1 day',now(),fixture_actor);
 BEGIN perform public.crh_blog_interact(p,repeat('a',64),true); raise exception 'Future post accepted like'; EXCEPTION WHEN no_data_found THEN NULL; END;
 update public.ministry_blog_posts set publish_at=now()-interval '1 second' where id=p;
 perform public.crh_blog_interact(p,repeat('a',64),true);
 perform public.crh_blog_interact(p,repeat('a',64),true);
 if public.crh_blog_counts(p)<>1 then raise exception 'Duplicate like counted'; end if;
 perform public.crh_blog_interact(p,repeat('a',64),false);
 if public.crh_blog_counts(p)<>0 then raise exception 'Unlike failed'; end if;
 perform public.crh_blog_interact(p,repeat('a',64),null,c,'Test reader','Rollback comment');
 perform public.crh_blog_interact(p,repeat('a',64),null,c,'Test reader','Rollback comment');
 select count(*) into n from public.ministry_blog_comments where id=c and status='pending';
 if n<>1 then raise exception 'Comment retry not idempotent or not pending'; end if;
 BEGIN perform public.crh_blog_interact(p,repeat('a',64),null,c,'Test reader','Changed content');raise exception 'Changed retry accepted';EXCEPTION WHEN unique_violation THEN NULL;END;
 update public.ministry_blog_posts set status='draft',reviewed_at=null where id=p;
 BEGIN perform public.crh_blog_interact(p,repeat('b',64),true);raise exception 'Withdrawn post accepted interaction';EXCEPTION WHEN no_data_found THEN NULL;END;
 if has_table_privilege('anon','public.ministry_blog_posts','SELECT') or has_table_privilege('authenticated','public.ministry_blog_posts','SELECT') then raise exception 'Browser table access';end if;
 if has_function_privilege('anon','public.crh_blog_interact(uuid,text,boolean,uuid,text,text)','EXECUTE') or has_function_privilege('authenticated','public.crh_blog_ai_claim(uuid)','EXECUTE') then raise exception 'Browser RPC access';end if;
 delete from public.ministry_blog_ai_usage where ministry_blog_ai_usage.actor=fixture_actor;
 for n in 1..10 loop if not public.crh_blog_ai_claim(fixture_actor) then raise exception 'Quota denied too early';end if;end loop;
 if public.crh_blog_ai_claim(fixture_actor) then raise exception 'Quota exceeded';end if;
END $$;
select 'Blog transaction, privacy, moderation, idempotency and quota assertions passed' as result;
ROLLBACK;
