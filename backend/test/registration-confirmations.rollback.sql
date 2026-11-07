-- Execute inside a transaction, then roll back; no provider is contacted.
do $$ declare ev uuid; reg uuid; j public.communication_jobs; n int; begin
 select id into ev from public.ministry_events where published and registration_enabled and ends_at>now() limit 1;
 if ev is null then raise exception 'An available event is required for this transactional fixture';end if;
 perform public.register_ministry_event(ev,'Receipt fixture','crh-receipt-fixture@example.test',2);
 perform public.register_ministry_event(ev,'Receipt fixture','crh-receipt-fixture@example.test',2);
 select id into reg from public.ministry_event_registrations where event_id=ev and email='crh-receipt-fixture@example.test';
 select count(*) into n from public.communication_jobs where source_key='event:'||reg;
 if n<>1 then raise exception 'Event receipt was not atomically deduplicated';end if;
 if exists(select 1 from public.communication_contacts where email='crh-receipt-fixture@example.test') then raise exception 'Receipt granted marketing consent';end if;
 insert into public.ministry_meeting_registrations(room,title,name,email,invitation_url) values('crh-receipt-fixture','Test meeting','Fixture','crh-meeting-fixture@example.test','https://www.christreformationhouse.org.ng/meetings/room/crh-receipt-fixture') on conflict(room,email) do nothing;
 insert into public.ministry_meeting_registrations(room,title,name,email,invitation_url) values('crh-receipt-fixture','Test meeting','Fixture','crh-meeting-fixture@example.test','https://www.christreformationhouse.org.ng/meetings/room/crh-receipt-fixture') on conflict(room,email) do nothing;
 if (select count(*) from public.communication_jobs where email='crh-meeting-fixture@example.test')<>1 then raise exception 'Duplicate meeting receipt';end if;
 insert into public.ministry_contact_messages(id,name,email,subject,message,content_hash) values(gen_random_uuid(),'Fixture','crh-contact-fixture@example.test','Private subject','Private message',repeat('a',64));
 if (select count(*) from public.communication_jobs where email='crh-contact-fixture@example.test' and text not like '%Private message%')<>1 then raise exception 'Contact acknowledgement missing or disclosed message';end if;
 select * into j from public.crh_communication_claim_next(true);
 if j.kind<>'registration' or j.contact_id is not null then raise exception 'Receipt incorrectly requires marketing contact';end if;
 perform public.crh_communication_event(j.id,'receipt-fixture-bounce','hard_bounce',now());
 if not exists(select 1 from public.communication_suppressions where email=j.email) then raise exception 'Receipt bounce was not suppressed';end if;
 insert into public.communication_jobs(kind,email,subject,text,html,expires_at) values('registration',j.email,'Fixture','Fixture','',now()+interval '1 day');
 perform public.crh_communication_claim_next(true);
 if exists(select 1 from public.communication_jobs where email=j.email and status in ('queued','attempting')) then raise exception 'Suppressed recipient was claimed';end if;
 if has_table_privilege('anon','public.ministry_meeting_registrations','select') or has_function_privilege('anon','public.crh_communication_claim_next(boolean)','execute') then raise exception 'Public access leak';end if;
 if exists(select 1 from pg_tables where schemaname='public' and tablename in ('ministry_meeting_registrations','communication_suppressions') and not rowsecurity) then raise exception 'RLS missing';end if;
 insert into public.communication_jobs(kind,email,subject,text,html,expires_at,status,attempted_at)
 select 'registration','quota-fixture@example.test','Quota','Quota','',now()+interval '1 day','accepted',now() from generate_series(1,280);
 if exists(select 1 from public.crh_communication_claim_next(true)) then raise exception 'Free cap exceeded';end if;
end $$;
