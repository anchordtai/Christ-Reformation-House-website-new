-- Additional channel; existing email status/consent remains independent.
alter table public.communication_contacts alter column email drop not null;
create table public.communication_channel_identities (
 channel text not null check(channel in ('email','whatsapp','sms','push')),
 address text not null, contact_id uuid not null references public.communication_contacts(id),
 verified_at timestamptz not null, primary key(channel,address)
);
create index communication_channel_identity_contact on public.communication_channel_identities(contact_id);
-- Email rows are an index of existing confirmed identity, not a second consent store.
insert into public.communication_channel_identities(channel,address,contact_id,verified_at)
 select 'email',email,id,confirmed_at from public.communication_contacts where email is not null and confirmed_at is not null;
create table public.communication_whatsapp_requests (
 hash text primary key check(length(hash)=64), manage_hash text unique not null check(length(manage_hash)=64),
 phone text not null check(phone ~ '^\+[1-9][0-9]{7,14}$'), name text not null check(length(name) between 1 and 100),
 categories text[] not null check(cardinality(categories)>0 and categories <@ array['devotional','events','services','newsletter']::text[]),
 delivery_time text not null check(delivery_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'), timezone text not null,
 link_contact_id uuid references public.communication_contacts(id),
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '24 hours',used_at timestamptz,
 source text not null default 'website_whatsapp_form', consent_version text not null default 'crh-whatsapp-2026-11-04'
);
create index communication_whatsapp_request_phone on public.communication_whatsapp_requests(phone,created_at);
create index communication_whatsapp_request_contact on public.communication_whatsapp_requests(link_contact_id);
create table public.communication_whatsapp_subscriptions (
 id uuid primary key default gen_random_uuid(), contact_id uuid not null unique references public.communication_contacts(id),
 phone text not null unique check(phone ~ '^\+[1-9][0-9]{7,14}$'),
 status text not null check(status in ('active','unsubscribed','suppressed')),
 categories text[] not null check(categories <@ array['devotional','events','services','newsletter']::text[]),
 delivery_time text not null default '06:00' check(delivery_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),timezone text not null default 'Africa/Lagos',
 opted_in_at timestamptz not null, opted_out_at timestamptz, last_inbound_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index communication_whatsapp_subscriptions_active on public.communication_whatsapp_subscriptions(status,id);
create table public.communication_whatsapp_consents (
 id bigint generated always as identity primary key, subscription_id uuid not null references public.communication_whatsapp_subscriptions(id),
 action text not null,source text not null,version text not null default 'crh-whatsapp-2026-11-04',
 categories text[] not null,created_at timestamptz not null default now()
);
create index communication_whatsapp_consents_subscription on public.communication_whatsapp_consents(subscription_id,created_at);
create table public.communication_whatsapp_templates (
 id uuid primary key default gen_random_uuid(), name text not null,language text not null,category text not null check(category in ('MARKETING','UTILITY')),
 body text not null check(length(body) between 1 and 1024),examples jsonb not null default '[]',variable_count int not null check(variable_count between 0 and 8),
 status text not null default 'LOCAL_DRAFT' check(status in ('LOCAL_DRAFT','SUBMITTING','PENDING','APPROVED','REJECTED','PAUSED','DISABLED','NEEDS_REVIEW')),
 provider_id text unique,created_by uuid not null references auth.users(id),revision int not null default 1,
 synced_at timestamptz,created_at timestamptz not null default now(),unique(name,language)
);
create index communication_whatsapp_templates_creator on public.communication_whatsapp_templates(created_by);
create table public.communication_whatsapp_campaigns (
 id uuid primary key default gen_random_uuid(),creation_key uuid not null unique,
 title text not null,type text not null check(type in ('devotional','sunday','midweek','event','registration','reminder','cancellation','update')),
 category text not null check(category in ('devotional','events','services','newsletter')),
 template_id uuid not null references public.communication_whatsapp_templates(id),template_revision int not null,parameters jsonb not null,
 event_id uuid references public.ministry_events(id),target_subscription_id uuid references public.communication_whatsapp_subscriptions(id),
 check(type<>'registration' or (event_id is not null and target_subscription_id is not null)),
 text text not null,planned_at timestamptz not null,expires_at timestamptz,
 status text not null default 'planned' check(status in ('planned','scheduled','cancelled','completed')),
 created_by uuid not null references auth.users(id),approved_by uuid references auth.users(id),approved_at timestamptz,
 source_key text unique,source_revision int,revision int not null default 1,created_at timestamptz not null default now(),
 -- Free-only deployment cannot bypass its cost gate using a direct REST update.
 check(status<>'scheduled')
);
create index communication_whatsapp_campaigns_event on public.communication_whatsapp_campaigns(event_id);
create index communication_whatsapp_campaigns_target on public.communication_whatsapp_campaigns(target_subscription_id);
create index communication_whatsapp_campaigns_template on public.communication_whatsapp_campaigns(template_id);
create index communication_whatsapp_campaigns_creator on public.communication_whatsapp_campaigns(created_by);
create index communication_whatsapp_campaigns_approver on public.communication_whatsapp_campaigns(approved_by);
create table public.communication_whatsapp_jobs (
 id uuid primary key default gen_random_uuid(),campaign_id uuid not null references public.communication_whatsapp_campaigns(id),
 subscription_id uuid not null references public.communication_whatsapp_subscriptions(id),
 status text not null default 'queued' check(status in ('queued','attempting','submitted','sent','delivered','read','failed','needs_review','cancelled')),
 provider_id text unique,error_code text,attempted_at timestamptz,last_event_at timestamptz,
 submitted_at timestamptz,delivered_at timestamptz,read_at timestamptz,
 pricing jsonb,actual_cost numeric,currency text,created_at timestamptz not null default now(),
 unique(campaign_id,subscription_id)
);
create index communication_whatsapp_jobs_subscription on public.communication_whatsapp_jobs(subscription_id);
create index communication_whatsapp_jobs_status on public.communication_whatsapp_jobs(status,created_at);
create table public.communication_whatsapp_events (
 event_key text primary key,provider_id text,event text not null,occurred_at timestamptz not null,
 created_at timestamptz not null default now()
);
-- No full inbound chat bodies, tokens, phone numbers or webhook secrets in event logs.
create function public.crh_whatsapp_inbound(p_key text,p_phone text,p_action text,p_hash text,p_at timestamptz)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare r communication_whatsapp_requests;s communication_whatsapp_subscriptions;c uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_phone,44));
 if p_at>now()+interval '5 minutes' or p_at<now()-interval '7 days' then return false;end if;
 insert into communication_whatsapp_events(event_key,event,occurred_at) values(p_key,'inbound_'||p_action,p_at) on conflict do nothing;
 if not found then return true;end if;
 select * into s from communication_whatsapp_subscriptions where phone=p_phone for update;
 if p_action='stop' then
  if s.id is not null then
   update communication_whatsapp_subscriptions set status=case when status='suppressed' then 'suppressed' else 'unsubscribed' end,opted_out_at=now(),updated_at=now(),last_inbound_at=p_at where id=s.id;
   update communication_whatsapp_jobs set status='cancelled',error_code='opted_out' where subscription_id=s.id and status='queued';
   insert into communication_whatsapp_consents(subscription_id,action,source,categories) values(s.id,'unsubscribed','whatsapp_inbound',s.categories);
  end if;
  -- Invalidate outstanding JOIN links; delayed/replayed JOIN cannot undo a STOP.
  update communication_whatsapp_requests set expires_at=least(expires_at,now()) where phone=p_phone and used_at is null;
  return true;
 end if;
 if p_action<>'join' then return true;end if;
 select * into r from communication_whatsapp_requests where hash=p_hash and phone=p_phone and used_at is null and expires_at>now() for update;
 if r.hash is null or s.status='suppressed' then return false;end if;
 if s.id is not null then c=s.contact_id;
 else
  select contact_id into c from communication_channel_identities where channel='whatsapp' and address=p_phone;
  if c is null then c=r.link_contact_id;end if;
  if c is null then insert into communication_contacts(name,email,status,categories) values(r.name,null,'pending','{}') returning id into c;end if;
  -- Do not silently overwrite another WhatsApp identity on this contact.
  if exists(select 1 from communication_whatsapp_subscriptions where contact_id=c and phone<>p_phone) then return false;end if;
 end if;
 insert into communication_channel_identities(channel,address,contact_id,verified_at) values('whatsapp',p_phone,c,now()) on conflict do nothing;
 insert into communication_whatsapp_subscriptions(contact_id,phone,status,categories,delivery_time,timezone,opted_in_at,last_inbound_at)
 values(c,p_phone,'active',r.categories,r.delivery_time,r.timezone,now(),p_at)
 on conflict(phone) do update set status='active',categories=excluded.categories,delivery_time=excluded.delivery_time,timezone=excluded.timezone,opted_in_at=now(),opted_out_at=null,last_inbound_at=p_at,updated_at=now()
 returning * into s;
 update communication_whatsapp_requests set used_at=now(),link_contact_id=c where hash=p_hash;
 insert into communication_whatsapp_consents(subscription_id,action,source,categories) values(s.id,'confirmed',r.source,r.categories);
 return true;
end $$;
create function public.crh_whatsapp_preferences(p_hash text,p_categories text[],p_time text,p_timezone text,p_stop boolean)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare r communication_whatsapp_requests;s communication_whatsapp_subscriptions;
begin
 select * into r from communication_whatsapp_requests where manage_hash=p_hash and used_at is not null and created_at>now()-interval '365 days';
 if r.hash is null then return false;end if;
 select * into s from communication_whatsapp_subscriptions where phone=r.phone and contact_id=r.link_contact_id for update;
 if s.id is null or s.status<>'active' then return false;end if;
 update communication_whatsapp_subscriptions set status=case when p_stop then 'unsubscribed' else status end,
 categories=case when p_stop then categories else p_categories end,delivery_time=case when p_stop then delivery_time else p_time end,
 timezone=case when p_stop then timezone else p_timezone end,opted_out_at=case when p_stop then now() else opted_out_at end,updated_at=now() where id=s.id;
 if p_stop then update communication_whatsapp_jobs set status='cancelled',error_code='opted_out' where subscription_id=s.id and status='queued';end if;
 insert into communication_whatsapp_consents(subscription_id,action,source,categories) values(s.id,case when p_stop then 'unsubscribed' else 'preferences_updated' end,'website_preferences',p_categories);
 return true;
end $$;
create function public.crh_whatsapp_delivery(p_key text,p_provider text,p_event text,p_at timestamptz,p_pricing jsonb,p_error text)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare j communication_whatsapp_jobs;
begin
 select * into j from communication_whatsapp_jobs where provider_id=p_provider for update;
 if j.id is null then return false;end if;
 if p_event not in ('sent','delivered','read','failed') then return true;end if;
 insert into communication_whatsapp_events(event_key,provider_id,event,occurred_at) values(p_key,p_provider,p_event,p_at) on conflict do nothing;
 if not found then return true;end if;
 -- Milestones never regress when Meta retries or delivers events out of order.
 update communication_whatsapp_jobs set
 submitted_at=coalesce(submitted_at,p_at),
 delivered_at=case when p_event in ('delivered','read') then coalesce(delivered_at,p_at) else delivered_at end,
 read_at=case when p_event='read' then coalesce(read_at,p_at) else read_at end,
 status=case when read_at is not null or p_event='read' then 'read' when delivered_at is not null or p_event='delivered' then 'delivered' when p_event='failed' then 'failed' else 'sent' end,
 error_code=case when p_event='failed' and delivered_at is null and read_at is null then p_error else null end,
 last_event_at=greatest(last_event_at,p_at),pricing=coalesce(p_pricing,pricing) where id=j.id;
 return true;
end $$;
create function public.crh_whatsapp_metrics() returns jsonb language sql security invoker set search_path=public,pg_temp as $$
 select jsonb_build_object(
 'total',(select count(*) from communication_whatsapp_subscriptions),
 'active',(select count(*) from communication_whatsapp_subscriptions where status='active'),
 'submitted',(select count(*) from communication_whatsapp_jobs where submitted_at is not null),
 'delivered',(select count(*) from communication_whatsapp_jobs where delivered_at is not null),
 'read',(select count(*) from communication_whatsapp_jobs where read_at is not null),
 'failed',(select count(*) from communication_whatsapp_jobs where status='failed'),
 'actualCost',null,'creditsConsumed',null,'creditsAvailable',null,
 'costNote','Meta billing is not connected. Unknown is not zero. Free-only policy blocks all outbound messages.');
$$;
-- Backend-only storage and RPCs. New channels never grant marketing consent to email.
do $$ declare t text; f regprocedure;begin
 foreach t in array array['communication_channel_identities','communication_whatsapp_requests','communication_whatsapp_subscriptions','communication_whatsapp_consents','communication_whatsapp_templates','communication_whatsapp_campaigns','communication_whatsapp_jobs','communication_whatsapp_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to service_role',t);
 end loop;
 grant usage,select on sequence public.communication_whatsapp_consents_id_seq to service_role;
 for f in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname like 'crh_whatsapp_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',f);
  execute format('grant execute on function %s to service_role',f);
 end loop;
end $$;
-- Explicit guard for channel-only contacts; preserve all other email queue behavior.
create or replace function public.crh_communication_recipients(p_campaign uuid) returns setof public.communication_contacts language sql security invoker set search_path=public,pg_temp as $$
 select c.* from communication_contacts c join communication_campaigns a on a.id=p_campaign
 where a.status='scheduled' and a.channel='email' and a.scheduled_at<=now() and c.email is not null and c.status='active' and a.category=any(c.categories)
 and not exists(select 1 from communication_jobs j where j.campaign_id=a.id and j.contact_id=c.id)
 order by c.id limit 10;
$$;
create function public.crh_whatsapp_audience_count(p_category text) returns bigint language sql security invoker set search_path=public,pg_temp as $$
 select count(*) from communication_whatsapp_subscriptions where status='active' and p_category=any(categories);
$$;
revoke all on function public.crh_whatsapp_audience_count(text) from public,anon,authenticated;
grant execute on function public.crh_whatsapp_audience_count(text) to service_role;
