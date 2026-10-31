-- Run only as a single transaction. All fixture writes are rolled back.
begin;
do $$
declare u uuid; result jsonb;
begin
 select id into u from auth.users where email_confirmed_at is not null and raw_app_meta_data->>'devotional_editor'='true' limit 1;
 if u is null then raise exception 'No staff fixture available'; end if;
 insert into public.devotional_entries(publication_date,status,release_at,reviewed_by,reviewed_at,revision,updated_by,content) values
 ('2027-08-01','published','2027-07-31T23:00Z',u,now(),1,u,jsonb_build_object('title','Forgiveness through Christ','monthlyTheme','CRH reader rollback fixture','mainReference','John 3:16','memoryReference','Psalm 103:2','message','We practise forgiveness and walk in steadfast mercy with Christ every day.')),
 ('2027-08-02','scheduled','2027-08-02T00:00Z',u,now(),1,u,jsonb_build_object('title','A faithful walk','monthlyTheme','CRH reader rollback fixture','mainReference','1 John 3:16','message','Faith makes forgiveness possible as we serve others.')),
 ('2027-08-03','draft',null,null,null,1,u,jsonb_build_object('title','Private draft fixture','monthlyTheme','PRIVATE FIXTURE THEME','message','forgiveness')),
 ('2027-08-04','scheduled','2027-08-04T00:00Z',u,now(),1,u,jsonb_build_object('title','Future reading fixture','monthlyTheme','FUTURE FIXTURE THEME','message','forgiveness')),
 ('2027-07-31','scheduled','2027-08-05T00:00Z',u,now(),1,u,jsonb_build_object('title','Delayed release fixture','monthlyTheme','DELAYED FIXTURE THEME','message','forgiveness'))
 on conflict(publication_date) do update set status=excluded.status,release_at=excluded.release_at,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at,content=excluded.content,updated_by=excluded.updated_by;
 result:=public.search_ministry_devotional_archive('forgiving','CRH reader rollback fixture','2027-08-03T12:00Z');
 if jsonb_array_length(result->'entries')<>2 or result#>>'{entries,0,title}'<>'Forgiveness through Christ' then raise exception 'Stemming or rank failed'; end if;
 if result#>'{entries,0,message}' is not null or result#>'{entries,0,reviewed_by}' is not null then raise exception 'Private or full manuscript fields leaked'; end if;
 if result->'themes' ? 'PRIVATE FIXTURE THEME' or result->'themes' ? 'FUTURE FIXTURE THEME' or result->'themes' ? 'DELAYED FIXTURE THEME' then raise exception 'Hidden themes leaked'; end if;
 result:=public.search_ministry_devotional_archive('John3:16','CRH reader rollback fixture','2027-08-03T12:00Z');
 if jsonb_array_length(result->'entries')<>1 or result#>>'{entries,0,mainReference}'<>'John 3:16' then raise exception 'Reference boundaries failed'; end if;
 result:=public.search_ministry_devotional_archive('John3:1','CRH reader rollback fixture','2027-08-03T12:00Z');
 if jsonb_array_length(result->'entries')<>0 then raise exception 'Verse prefix falsely matched'; end if;
 result:=public.search_ministry_devotional_archive('"steadfast mercy"','CRH reader rollback fixture','2027-08-03T12:00Z');
 if jsonb_array_length(result->'entries')<>1 then raise exception 'Phrase query failed'; end if;
 result:=public.search_ministry_devotional_archive('','CRH reader rollback fixture','2027-07-31T22:59Z');
 if jsonb_array_length(result->'entries')<>0 then raise exception 'Premature release'; end if;
 result:=public.search_ministry_devotional_archive('','CRH reader rollback fixture','2027-07-31T23:01Z');
 if jsonb_array_length(result->'entries')<>1 then raise exception 'Lagos release boundary failed'; end if;
end;$$;
select 'stemming, ranking, phrase/reference search, privacy and release timing passed; fixtures rolled back' as result;
rollback;
