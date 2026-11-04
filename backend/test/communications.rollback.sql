-- Run inside BEGIN, after loading the proposed migration, then ROLLBACK.
-- Fixtures never contact a delivery provider. Use a non-production isolated database where possible.
do $$ declare c uuid; n int; begin
 perform crh_communication_subscribe('fixture@example.test','Fixture','',array['devotional'],false,repeat('a',64),repeat('b',64),'Fixture','Fixture');
 perform crh_communication_subscribe('fixture@example.test','Changed','',array['events'],false,repeat('c',64),repeat('d',64),'Fixture','Fixture');
 select count(*) into n from communication_contacts where email='fixture@example.test'; if n<>1 then raise exception 'duplicate contacts'; end if;
 if (select count(*) from crh_communication_claim())<>1 then raise exception 'confirmation not claimed'; end if;
 if (select count(*) from crh_communication_claim())<>0 then raise exception 'duplicate claim'; end if;
 if not crh_communication_confirm(repeat('a',64),'Welcome','Welcome') then raise exception 'confirmation failed'; end if;
 if crh_communication_confirm(repeat('a',64),'Welcome','Welcome') then raise exception 'token replay'; end if;
 if (select count(*) from communication_jobs where kind='welcome')<>1 then raise exception 'duplicate welcome'; end if;
 if not crh_communication_preferences(repeat('b',64),'{}',true) then raise exception 'unsubscribe failed'; end if;
 if (select count(*) from crh_communication_claim())<>0 then raise exception 'unsubscribe did not suppress'; end if;
 if has_table_privilege('anon','public.communication_contacts','select') or has_function_privilege('anon','public.crh_communication_claim()','execute') then raise exception 'browser access leak'; end if;
 insert into communication_contacts(email,name,status,categories) values('quota@example.test','Quota','active',array['newsletter']) returning id into c;
 insert into communication_jobs(contact_id,kind,email,subject,text,html,status,attempted_at,expires_at)
 select c,'welcome','quota@example.test','Fixture','Fixture','Fixture','accepted',now(),now()+interval '1 day' from generate_series(1,280);
 insert into communication_jobs(contact_id,kind,email,subject,text,html,expires_at) values(c,'welcome','quota@example.test','Fixture','Fixture','Fixture',now()+interval '1 day');
 if (select count(*) from crh_communication_claim())<>0 then raise exception 'free quota exceeded'; end if;
 select id into c from communication_jobs where email='quota@example.test' limit 1;
 perform crh_communication_event(c,'fixture-event-key','hard_bounce',now());
 perform crh_communication_event(c,'fixture-event-key','hard_bounce',now());
 if (select count(*) from communication_delivery_events where event_key='fixture-event-key')<>1 then raise exception 'duplicate delivery event'; end if;
 if (select status from communication_contacts where email='quota@example.test')<>'suppressed' then raise exception 'hard bounce not suppressed'; end if;
 if exists(select 1 from pg_tables where schemaname='public' and tablename like 'communication_%' and not rowsecurity) then raise exception 'RLS missing'; end if;
end $$;
select 'PASS: consent, duplicate prevention, claim isolation, token replay, unsubscribe, quota, event deduplication, hard-bounce suppression and RLS' as result;
