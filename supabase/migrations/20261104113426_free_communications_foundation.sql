-- Additive, trusted-backend-only communication records. No existing contacts are imported.
create table public.communication_contacts (
 id uuid primary key default gen_random_uuid(), email text not null unique check(email=lower(email) and length(email)<=254),
 name text not null check(length(name) between 1 and 100), phone text not null default '',
 status text not null default 'pending' check(status in ('pending','active','unsubscribed','suppressed')),
 categories text[] not null default '{}' check(categories <@ array['devotional','events','newsletter','services']::text[]),
 sms_consent boolean not null default false, confirmed_at timestamptz, last_confirmation_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.communication_tokens (
 hash text primary key check(length(hash)=64), contact_id uuid not null references public.communication_contacts(id),
 purpose text not null check(purpose in ('confirm','manage')), expires_at timestamptz not null, used_at timestamptz,
 created_at timestamptz not null default now()
);
create index communication_tokens_contact on public.communication_tokens(contact_id);
create table public.communication_consents (
 id bigint generated always as identity primary key, contact_id uuid not null references public.communication_contacts(id),
 action text not null, categories text[] not null default '{}', sms_consent boolean not null default false,
 version text not null default '2026-11-04', created_at timestamptz not null default now()
);
create index communication_consents_contact on public.communication_consents(contact_id,created_at);
create table public.communication_campaigns (
 id uuid primary key default gen_random_uuid(), creation_key uuid unique, channel text not null check(channel in ('email','sms')),
 category text not null check(category in ('devotional','events','newsletter','services')),
 subject text not null check(length(subject) between 1 and 160), text text not null check(length(text) between 1 and 80000), image text not null default '',
 status text not null default 'draft' check(status in ('draft','scheduled','cancelled','completed')),
 scheduled_at timestamptz, created_by uuid not null references auth.users(id), approved_by uuid references auth.users(id), approved_at timestamptz,
 revision integer not null default 1, created_at timestamptz not null default now(),
 check(status not in ('scheduled','completed') or (channel='email' and approved_by is not null and approved_at is not null and scheduled_at is not null))
);
create index communication_campaigns_due on public.communication_campaigns(status,scheduled_at);
create table public.communication_jobs (
 id uuid primary key default gen_random_uuid(), contact_id uuid not null references public.communication_contacts(id),
 campaign_id uuid references public.communication_campaigns(id), kind text not null check(kind in ('confirm','welcome','campaign')),
 category text, email text not null, subject text not null, text text not null, html text not null,
 status text not null default 'queued' check(status in ('queued','attempting','accepted','delivered','failed','needs_review','cancelled')),
 provider_id text, error_code text, not_before timestamptz not null default now(), expires_at timestamptz not null,
 attempted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(campaign_id,contact_id)
);
create index communication_jobs_due on public.communication_jobs(status,not_before);
create index communication_jobs_contact on public.communication_jobs(contact_id);
create index communication_jobs_attempted on public.communication_jobs(attempted_at) where attempted_at is not null;
create index communication_jobs_provider on public.communication_jobs(provider_id) where provider_id is not null;
create table public.communication_activity (
 id bigint generated always as identity primary key, actor_id uuid references auth.users(id), action text not null,
 campaign_id uuid references public.communication_campaigns(id), created_at timestamptz not null default now()
);
create index communication_activity_campaign on public.communication_activity(campaign_id);
create function public.crh_communication_subscribe(p_email text,p_name text,p_phone text,p_categories text[],p_sms boolean,p_confirm_hash text,p_manage_hash text,p_text text,p_html text)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare c communication_contacts;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_email,10));
 select * into c from communication_contacts where email=p_email for update;
 if c.id is not null and (c.status='suppressed' or c.status='active' or c.last_confirmation_at > now()-interval '1 hour') then return; end if;
 if c.id is null then
  insert into communication_contacts(email,name,phone,categories,sms_consent) values(p_email,p_name,p_phone,p_categories,p_sms) returning * into c;
 else
  update communication_contacts set name=p_name,phone=p_phone,categories=p_categories,sms_consent=p_sms,status='pending',updated_at=now() where id=c.id returning * into c;
 end if;
 update communication_contacts set last_confirmation_at=now() where id=c.id;
 update communication_tokens set used_at=now() where contact_id=c.id and purpose='confirm' and used_at is null;
 update communication_jobs set status='cancelled' where contact_id=c.id and kind='confirm' and status='queued';
 insert into communication_tokens(hash,contact_id,purpose,expires_at) values(p_confirm_hash,c.id,'confirm',now()+interval '24 hours'),(p_manage_hash,c.id,'manage',now()+interval '365 days');
 insert into communication_consents(contact_id,action,categories,sms_consent) values(c.id,'requested',p_categories,p_sms);
 insert into communication_jobs(contact_id,kind,email,subject,text,html,expires_at) values(c.id,'confirm',p_email,'Confirm your CRH subscription',p_text,p_html,now()+interval '24 hours');
end $$;
create function public.crh_communication_confirm(p_hash text,p_text text,p_html text) returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare t communication_tokens; c communication_contacts;
begin
 select * into t from communication_tokens where hash=p_hash and purpose='confirm' and expires_at>now() for update;
 if t.hash is null then return false; end if;
 if t.used_at is not null then return false; end if;
 select * into c from communication_contacts where id=t.contact_id for update;
 if c.status<>'pending' then return false; end if;
 update communication_tokens set used_at=now() where hash=p_hash;
 update communication_contacts set status='active',confirmed_at=now(),updated_at=now() where id=c.id;
 insert into communication_consents(contact_id,action,categories,sms_consent) values(c.id,'confirmed',c.categories,c.sms_consent);
 insert into communication_jobs(contact_id,kind,email,subject,text,html,expires_at) values(c.id,'welcome',c.email,'Welcome to CRH updates',p_text,p_html,now()+interval '2 days');
 return true;
end $$;
create function public.crh_communication_preferences(p_hash text,p_categories text[],p_unsubscribe boolean) returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare t communication_tokens; c communication_contacts;
begin
 select * into t from communication_tokens where hash=p_hash and purpose='manage' and expires_at>now();
 if t.hash is null then return false; end if;
 select * into c from communication_contacts where id=t.contact_id for update;
 if c.status not in ('active','unsubscribed') then return false; end if;
 if not p_unsubscribe and c.status='unsubscribed' then return false; end if;
 update communication_contacts set categories=case when p_unsubscribe then '{}'::text[] else p_categories end,status=case when p_unsubscribe then 'unsubscribed' else status end,sms_consent=case when p_unsubscribe then false else sms_consent end,updated_at=now() where id=c.id;
 insert into communication_consents(contact_id,action,categories) values(c.id,case when p_unsubscribe then 'unsubscribed' else 'preferences_updated' end,p_categories);
 update communication_jobs set status='cancelled' where contact_id=c.id and status='queued' and (p_unsubscribe or (kind='campaign' and not(category=any(p_categories))));
 return true;
end $$;
create function public.crh_communication_claim() returns setof public.communication_jobs language plpgsql security invoker set search_path=public,pg_temp as $$
declare j communication_jobs;
begin
 perform pg_advisory_xact_lock(7758846,280);
 update communication_jobs set status='needs_review',error_code='interrupted_attempt',updated_at=now() where status='attempting' and attempted_at<now()-interval '5 minutes';
 update communication_jobs set status='cancelled',error_code='expired',updated_at=now() where status='queued' and expires_at<=now();
 if (select count(*) from communication_jobs where attempted_at>now()-interval '24 hours') >= 280 then return; end if;
 select q.* into j from communication_jobs q join communication_contacts c on c.id=q.contact_id
 where q.status='queued' and q.not_before<=now() and q.expires_at>now() and c.status<>'suppressed'
 and ((q.kind='confirm' and c.status='pending') or (c.status='active' and (q.kind='welcome' or q.category=any(c.categories))))
 and (q.campaign_id is null or exists(select 1 from communication_campaigns a where a.id=q.campaign_id and a.status='scheduled' and a.scheduled_at<=now()))
 order by case q.kind when 'confirm' then 0 when 'welcome' then 1 else 2 end,q.created_at for update of q skip locked limit 1;
 if j.id is null then return; end if;
 update communication_jobs set status='attempting',attempted_at=now(),updated_at=now() where id=j.id returning * into j;
 return next j;
end $$;
do $$ declare t text; f regprocedure; begin
 foreach t in array array['communication_contacts','communication_tokens','communication_consents','communication_campaigns','communication_jobs','communication_activity'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to service_role',t);
 end loop;
 grant usage,select on sequence public.communication_consents_id_seq,public.communication_activity_id_seq to service_role;
 for f in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname like 'crh_communication_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',f);
  execute format('grant execute on function %s to service_role',f);
 end loop;
end $$;
create function public.crh_communication_recipients(p_campaign uuid) returns setof public.communication_contacts language sql security invoker set search_path=public,pg_temp as $$
 select c.* from communication_contacts c join communication_campaigns a on a.id=p_campaign
 where a.status='scheduled' and a.channel='email' and a.scheduled_at<=now() and c.status='active' and a.category=any(c.categories)
 and not exists(select 1 from communication_jobs j where j.campaign_id=a.id and j.contact_id=c.id)
 order by c.id limit 10;
$$;
revoke all on function public.crh_communication_recipients(uuid) from public,anon,authenticated;
grant execute on function public.crh_communication_recipients(uuid) to service_role;
alter table public.communication_campaigns add column source_key text unique, add column source_revision integer, add column expires_at timestamptz;
create table public.communication_settings (
 id integer primary key check(id=1), daily_devotional boolean not null default false,
 daily_time text not null default '06:00' check(daily_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
insert into public.communication_settings(id) values(1);
alter table public.communication_settings enable row level security;
revoke all on public.communication_settings from anon,authenticated;
grant select,update on public.communication_settings to service_role;
alter table public.communication_jobs add column last_event_at timestamptz;
create table public.communication_delivery_events (
 event_key text primary key, job_id uuid not null references public.communication_jobs(id),
 event text not null, occurred_at timestamptz not null, created_at timestamptz not null default now()
);
create index communication_delivery_events_job on public.communication_delivery_events(job_id,occurred_at);
alter table public.communication_delivery_events enable row level security;
revoke all on public.communication_delivery_events from anon,authenticated;
grant select,insert on public.communication_delivery_events to service_role;
create function public.crh_communication_event(p_job uuid,p_key text,p_event text,p_at timestamptz) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare j communication_jobs;
begin
 select * into j from communication_jobs where id=p_job for update;
 if j.id is null then return; end if;
 insert into communication_delivery_events(event_key,job_id,event,occurred_at) values(p_key,p_job,p_event,p_at) on conflict do nothing;
 if p_event in ('hard_bounce','spam','unsubscribed','invalid_email','blocked') then
  update communication_contacts set status=case when status='suppressed' then 'suppressed' when p_event='unsubscribed' then 'unsubscribed' else 'suppressed' end,updated_at=now() where id=j.contact_id;
  update communication_jobs set status='cancelled',error_code='provider_suppressed' where contact_id=j.contact_id and status='queued';
 end if;
 if j.last_event_at is null or p_at>=j.last_event_at then
  update communication_jobs set status=case when p_event='delivered' then 'delivered' else 'failed' end,
   error_code=case when p_event='delivered' then null else p_event end,last_event_at=p_at,updated_at=now() where id=p_job;
 end if;
end $$;
revoke all on function public.crh_communication_event(uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.crh_communication_event(uuid,text,text,timestamptz) to service_role;

create index communication_campaigns_creator on public.communication_campaigns(created_by);
create index communication_campaigns_approver on public.communication_campaigns(approved_by);
create index communication_activity_actor on public.communication_activity(actor_id);
create index communication_settings_actor on public.communication_settings(updated_by);
