begin;
create table public.ministry_chat_threads (
 id uuid primary key, access_hash text not null check(length(access_hash)=64), visitor_name text not null check(length(visitor_name) between 1 and 60), status text not null default 'open' check(status in('open','closed')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '7 days', message_count integer not null default 0 check(message_count between 0 and 100)
);
create index ministry_chat_threads_queue on public.ministry_chat_threads(status,updated_at desc);
create table public.ministry_chat_messages (
 id uuid primary key, thread_id uuid not null references public.ministry_chat_threads(id) on delete cascade, author text not null check(author in('visitor','staff')), body text not null check(length(body) between 1 and 2000), staff_id uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create index ministry_chat_messages_thread on public.ministry_chat_messages(thread_id,created_at,id);
create table public.ministry_chat_presence (user_id uuid primary key references auth.users(id) on delete cascade, until_at timestamptz not null);
create table public.ministry_security_events (id bigint generated always as identity primary key, actor_id uuid references auth.users(id) on delete set null, action text not null check(length(action)<=160), outcome integer not null, created_at timestamptz not null default now());
create index ministry_security_events_date on public.ministry_security_events(created_at desc);
alter table public.ministry_chat_threads enable row level security;
alter table public.ministry_chat_messages enable row level security;
alter table public.ministry_chat_presence enable row level security;
alter table public.ministry_security_events enable row level security;
revoke all on public.ministry_chat_threads,public.ministry_chat_messages,public.ministry_chat_presence,public.ministry_security_events from public,anon,authenticated;
grant select,insert,update on public.ministry_chat_threads,public.ministry_chat_messages,public.ministry_chat_presence to service_role;
grant select,insert on public.ministry_security_events to service_role;
grant usage,select on sequence public.ministry_security_events_id_seq to service_role;
create function public.append_ministry_chat(p_thread uuid,p_access text,p_message uuid,p_name text,p_body text,p_staff uuid default null) returns boolean language plpgsql security invoker set search_path=public,pg_catalog as $$
declare t public.ministry_chat_threads%rowtype; existing public.ministry_chat_messages%rowtype; sender text;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_thread::text,0));
 select * into t from public.ministry_chat_threads where id=p_thread for update;
 if not found then
  if p_staff is not null or p_access is null or length(p_access)<>64 then raise exception 'Chat unavailable' using errcode='P0001'; end if;
  insert into public.ministry_chat_threads(id,access_hash,visitor_name) values(p_thread,p_access,p_name) returning * into t;
 end if;
 if p_staff is null and (p_access is null or t.access_hash<>p_access) then raise exception 'Chat unavailable' using errcode='P0001'; end if;
 sender:=case when p_staff is null then 'visitor' else 'staff' end;
 select * into existing from public.ministry_chat_messages where id=p_message;
 if found then
  if existing.thread_id<>p_thread or existing.author<>sender or existing.body<>p_body or existing.staff_id is distinct from p_staff then raise exception 'Message conflict' using errcode='P0001'; end if;
  return true;
 end if;
 if t.status<>'open' or t.expires_at<=now() or t.message_count>=100 then raise exception 'Chat ended or message limit reached' using errcode='P0001'; end if;
 insert into public.ministry_chat_messages(id,thread_id,author,body,staff_id) values(p_message,p_thread,sender,p_body,p_staff);
 update public.ministry_chat_threads set message_count=message_count+1,updated_at=now() where id=p_thread;
 return true;
end;$$;
revoke all on function public.append_ministry_chat(uuid,text,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.append_ministry_chat(uuid,text,uuid,text,text,uuid) to service_role;
alter function public.set_updated_at() set search_path=pg_catalog,public;
notify pgrst,'reload schema';
commit;
