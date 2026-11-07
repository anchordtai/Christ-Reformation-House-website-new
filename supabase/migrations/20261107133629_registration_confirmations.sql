-- Transactional receipts share the existing durable queue and its free sending cap.
alter table public.communication_jobs alter column contact_id drop not null;
alter table public.communication_jobs drop constraint communication_jobs_kind_check;
alter table public.communication_jobs add constraint communication_jobs_kind_check check(kind in ('confirm','welcome','campaign','registration'));
alter table public.communication_jobs add column source_key text unique;
alter table public.communication_jobs add constraint communication_jobs_contact_check check(kind='registration' or contact_id is not null);
create index communication_jobs_email on public.communication_jobs(email);
create table public.communication_suppressions(email text primary key,reason text not null,created_at timestamptz not null default now());
alter table public.communication_suppressions enable row level security;
revoke all on public.communication_suppressions from anon,authenticated;
grant select,insert,update on public.communication_suppressions to service_role;
create table public.ministry_meeting_registrations (
 id uuid primary key default gen_random_uuid(),room text not null check(room ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{5,99}$'),
 title text not null check(length(title) between 1 and 100),name text not null check(length(name) between 1 and 100),
 email text not null check(email=lower(email) and length(email)<=254),invitation_url text not null check(invitation_url like 'https://www.christreformationhouse.org.ng/meetings/room/%'),
 consent_at timestamptz not null default now(),created_at timestamptz not null default now(),unique(room,email)
);
alter table public.ministry_meeting_registrations enable row level security;
revoke all on public.ministry_meeting_registrations from anon,authenticated;
grant select,insert on public.ministry_meeting_registrations to service_role;

create function public.crh_queue_registration_receipt() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare subject_line text; message text; source text; gathering ministry_events;
begin
 if TG_TABLE_NAME='ministry_event_registrations' then
  select * into gathering from ministry_events where id=new.event_id;
  subject_line:='Your CRH event registration is confirmed';source:='event:'||new.id;
  message:=format(E'Hello %s,\n\nYour registration has been saved.\n\nEvent: %s\nStarts: %s WAT (Nigeria time)\nEnds: %s WAT (Nigeria time)\nLocation: %s\nNumber attending: %s\nRegistration reference: %s\n\nFull event details: https://www.christreformationhouse.org.ng/events/register/%s\n\nCheck the event page for programme updates. This receipt does not subscribe you to ministry updates.',new.name,gathering.title,to_char(gathering.starts_at at time zone 'Africa/Lagos','DD Mon YYYY, HH24:MI'),to_char(gathering.ends_at at time zone 'Africa/Lagos','DD Mon YYYY, HH24:MI'),gathering.location,new.attendees,new.id,gathering.id);
 elsif TG_TABLE_NAME='ministry_meeting_registrations' then
  subject_line:='Your CRH meeting registration is confirmed';source:='meeting:'||new.id;
  message:=format(E'Hello %s,\n\nYour registration for %s has been saved.\n\nMeeting invitation: %s\nRegistration reference: %s\n\nPlease join at the time agreed with your host. Registration does not start the meeting or grant host access. Keep private invitations private. This receipt does not subscribe you to ministry updates.',new.name,new.title,new.invitation_url,new.id);
 else
  subject_line:='CRH has received your message';source:='contact:'||new.id;
  message:=format(E'Hello %s,\n\nYour message has been saved for the ministry team to review.\n\nYour reference: %s\n\nThis is an automatic acknowledgement, not a personal response. You can reply to this email to contact the ministry. This receipt does not subscribe you to ministry updates.',new.name,new.id);
 end if;
 insert into communication_jobs(kind,email,subject,text,html,expires_at,source_key)
 values('registration',new.email,subject_line,message,'',now()+interval '2 days',source) on conflict(source_key) do nothing;
 return new;
end $$;
revoke all on function public.crh_queue_registration_receipt() from public,anon,authenticated;
grant execute on function public.crh_queue_registration_receipt() to service_role;
create trigger crh_event_receipt after insert on public.ministry_event_registrations for each row execute function public.crh_queue_registration_receipt();
create trigger crh_meeting_receipt after insert on public.ministry_meeting_registrations for each row execute function public.crh_queue_registration_receipt();
create trigger crh_contact_receipt after insert on public.ministry_contact_messages for each row execute function public.crh_queue_registration_receipt();

create function public.crh_communication_claim_next(p_notifications boolean) returns setof public.communication_jobs language plpgsql security invoker set search_path=public,pg_temp as $$
declare j communication_jobs;
begin
 perform pg_advisory_xact_lock(7758846,280);
 update communication_jobs set status='needs_review',error_code='interrupted_attempt',updated_at=now() where status='attempting' and attempted_at<now()-interval '5 minutes';
 update communication_jobs set status='cancelled',error_code='expired',updated_at=now() where status='queued' and expires_at<=now();
 update communication_jobs q set status='cancelled',error_code='provider_suppressed',updated_at=now() where q.status='queued' and (exists(select 1 from communication_suppressions s where s.email=q.email) or exists(select 1 from communication_contacts c where c.email=q.email and c.status='suppressed'));
 if (select count(*) from communication_jobs where attempted_at>now()-interval '24 hours')>=280 then return; end if;
 select q.* into j from communication_jobs q left join communication_contacts c on c.id=q.contact_id
 where q.status='queued' and q.not_before<=now() and q.expires_at>now() and (not p_notifications or q.kind<>'campaign')
 and (q.kind='registration' or (q.kind='confirm' and c.status='pending') or (c.status='active' and (q.kind='welcome' or q.category=any(c.categories))))
 and (q.campaign_id is null or exists(select 1 from communication_campaigns a where a.id=q.campaign_id and a.status='scheduled' and a.scheduled_at<=now()))
 order by case q.kind when 'confirm' then 0 when 'welcome' then 1 when 'registration' then 2 else 3 end,q.created_at for update of q skip locked limit 1;
 if j.id is null then return; end if;
 update communication_jobs set status='attempting',attempted_at=now(),updated_at=now() where id=j.id returning * into j;return next j;
end $$;
revoke all on function public.crh_communication_claim_next(boolean) from public,anon,authenticated;
grant execute on function public.crh_communication_claim_next(boolean) to service_role;

-- Registration recipients need not be marketing contacts. Bounces still suppress future receipts.
create or replace function public.crh_communication_event(p_job uuid,p_key text,p_event text,p_at timestamptz) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare j communication_jobs;
begin
 select * into j from communication_jobs where id=p_job for update;if j.id is null then return;end if;
 insert into communication_delivery_events(event_key,job_id,event,occurred_at) values(p_key,p_job,p_event,p_at) on conflict do nothing;
 if p_event in ('hard_bounce','spam','invalid_email','blocked') then
  insert into communication_suppressions(email,reason) values(j.email,p_event) on conflict(email) do nothing;
  update communication_contacts set status='suppressed',updated_at=now() where email=j.email;
  update communication_jobs set status='cancelled',error_code='provider_suppressed' where email=j.email and status='queued';
 elsif p_event='unsubscribed' then
  update communication_contacts set status='unsubscribed',updated_at=now() where email=j.email and status<>'suppressed';
  update communication_jobs set status='cancelled',error_code='unsubscribed' where email=j.email and kind<>'registration' and status='queued';
 end if;
 if j.last_event_at is null or p_at>=j.last_event_at then
  update communication_jobs set status=case when p_event='delivered' then 'delivered' else 'failed' end,error_code=case when p_event='delivered' then null else p_event end,last_event_at=p_at,updated_at=now() where id=p_job;
 end if;
end $$;
