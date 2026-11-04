-- Existing Supabase instance only. No paid worker or external service is provisioned.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create table public.communication_worker_invocations (
 id bigint generated always as identity primary key,
 request_id bigint not null, created_at timestamptz not null default now()
);
create index communication_worker_invocations_created on public.communication_worker_invocations(created_at);
alter table public.communication_worker_invocations enable row level security;
revoke all on public.communication_worker_invocations from anon,authenticated;
grant select on public.communication_worker_invocations to service_role;
-- Runs as the existing database cron owner; never as a public API caller.
-- The credential is provisioned separately in Vault, not in this function or Git.
create function public.crh_invoke_communication_worker() returns bigint
language plpgsql security invoker set search_path=pg_catalog,public as $$
declare worker_token text; request bigint;
begin
 select decrypted_secret into worker_token from vault.decrypted_secrets where name='crh_communication_worker';
 if worker_token is null or length(worker_token)<32 then raise exception 'Communication worker secret is not configured'; end if;
 request:=net.http_post(
  url:='https://christ-reformation-house-website-new-1.onrender.com/api/communications/process',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||worker_token),
  body:='{}'::jsonb,timeout_milliseconds:=240000
 );
 insert into public.communication_worker_invocations(request_id) values(request);
 delete from public.communication_worker_invocations where created_at<now()-interval '30 days';
 return request;
end $$;
revoke all on function public.crh_invoke_communication_worker() from public,anon,authenticated,service_role;
-- Only this one dispatcher; existing unrelated jobs are left intact.
select cron.schedule('crh-communication-queue','7,22,37,52 * * * *','select public.crh_invoke_communication_worker();');
