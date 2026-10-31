begin;
create table public.ministry_contact_messages (
 id uuid primary key, name text not null check(length(name) between 1 and 100), email text not null check(length(email)<=254), phone text not null default '' check(length(phone)<=40), subject text not null check(length(subject) between 1 and 160), message text not null check(length(message) between 1 and 5000), content_hash text not null check(length(content_hash)=64), status text not null default 'new' check(status in('new','read','replied','archived')), created_at timestamptz not null default now()
);
create index ministry_contact_status_date on public.ministry_contact_messages(status,created_at desc);
alter table public.ministry_contact_messages enable row level security;
revoke all on public.ministry_contact_messages from public,anon,authenticated;
grant select,insert,update on public.ministry_contact_messages to service_role;
create table public.ministry_store_products (
 id uuid primary key, name text not null check(length(name) between 1 and 150), description text not null default '' check(length(description)<=3000), category text not null check(length(category) between 1 and 60), image_path text not null default '/assets/img/crhlogo.jpg', price_minor integer not null check(price_minor between 1 and 100000000), stock integer not null default 0 check(stock between 0 and 100000), published boolean not null default false, revision integer not null default 1 check(revision>0), updated_at timestamptz not null default now(), updated_by uuid references auth.users(id) on delete set null
);
create index ministry_store_public on public.ministry_store_products(published,name);
alter table public.ministry_store_products enable row level security;
revoke all on public.ministry_store_products from public,anon,authenticated;
grant select,insert,update on public.ministry_store_products to service_role;
create table public.ministry_store_orders (
 id uuid primary key, access_hash text not null check(length(access_hash)=64), request_hash text not null check(length(request_hash)=64), name text not null check(length(name) between 1 and 100), email text not null check(length(email)<=254), phone text not null check(length(phone) between 1 and 40), currency text not null default 'NGN' check(currency='NGN'), total_minor integer not null check(total_minor between 1 and 1000000000), items jsonb not null check(jsonb_typeof(items)='array'), tx_ref text not null unique, status text not null default 'pending' check(status in('pending','initializing','awaiting_payment','paid','cancelled')), reserved_until timestamptz not null default now()+interval '15 minutes', customer_id text, transfer jsonb, charge_id text unique, paid_at timestamptz, collected_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index ministry_store_orders_pending on public.ministry_store_orders(status,reserved_until);
create index ministry_store_orders_date on public.ministry_store_orders(created_at desc);
alter table public.ministry_store_orders enable row level security;
revoke all on public.ministry_store_orders from public,anon,authenticated;
grant select,insert,update on public.ministry_store_orders to service_role;
create function public.create_ministry_store_order(p_id uuid,p_access text,p_request text,p_name text,p_email text,p_phone text,p_items jsonb) returns jsonb language plpgsql security invoker set search_path=public,pg_catalog as $$
declare old_order public.ministry_store_orders%rowtype; product public.ministry_store_products%rowtype; line jsonb; qty integer; total bigint:=0; snapshot jsonb:='[]';
begin
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into old_order from public.ministry_store_orders where id=p_id;
 if found then
  if old_order.access_hash<>p_access or old_order.request_hash<>p_request then raise exception 'Order request conflict' using errcode='P0001'; end if;
  return to_jsonb(old_order);
 end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 20 or (select count(distinct value->>'id') from jsonb_array_elements(p_items))<>jsonb_array_length(p_items) then raise exception 'Invalid cart' using errcode='P0001'; end if;
 for line in select value from jsonb_array_elements(p_items) order by value->>'id' loop
  qty:=(line->>'quantity')::integer;
  if qty not between 1 and 10 then raise exception 'Invalid quantity' using errcode='P0001'; end if;
  select * into product from public.ministry_store_products where id=(line->>'id')::uuid for update;
  if not found or not product.published or product.stock<qty then raise exception 'Product unavailable or stock changed' using errcode='P0001'; end if;
  total:=total+product.price_minor::bigint*qty;
  if total>1000000000 then raise exception 'Order total exceeds limit' using errcode='P0001'; end if;
  snapshot:=snapshot||jsonb_build_array(jsonb_build_object('id',product.id,'name',product.name,'price_minor',product.price_minor,'quantity',qty));
  update public.ministry_store_products set stock=stock-qty,revision=revision+1,updated_at=now() where id=product.id;
 end loop;
 insert into public.ministry_store_orders(id,access_hash,request_hash,name,email,phone,total_minor,items,tx_ref) values(p_id,p_access,p_request,p_name,p_email,p_phone,total,snapshot,'crh-s-'||p_id::text) returning * into old_order;
 return to_jsonb(old_order);
end;$$;
create function public.cancel_ministry_store_order(p_id uuid,p_access text) returns boolean language plpgsql security invoker set search_path=public,pg_catalog as $$
declare o public.ministry_store_orders%rowtype; line jsonb;
begin
 select * into o from public.ministry_store_orders where id=p_id and access_hash=p_access for update;
 if not found then return false; end if;
 if o.status='cancelled' then return true; end if;
 if o.status<>'pending' then raise exception 'Payment has started; verify it before contacting the ministry about cancellation' using errcode='P0001'; end if;
 for line in select value from jsonb_array_elements(o.items) order by value->>'id' loop
  update public.ministry_store_products set stock=stock+(line->>'quantity')::integer,revision=revision+1,updated_at=now() where id=(line->>'id')::uuid;
 end loop;
 update public.ministry_store_orders set status='cancelled',updated_at=now() where id=p_id;
 return true;
end;$$;
create function public.release_expired_ministry_store_orders() returns integer language plpgsql security invoker set search_path=public,pg_catalog as $$
declare o public.ministry_store_orders%rowtype; line jsonb; released integer:=0;
begin
 for o in select * from public.ministry_store_orders where status='pending' and reserved_until<now() order by created_at limit 100 for update skip locked loop
  for line in select value from jsonb_array_elements(o.items) order by value->>'id' loop
   update public.ministry_store_products set stock=stock+(line->>'quantity')::integer,revision=revision+1,updated_at=now() where id=(line->>'id')::uuid;
  end loop;
  update public.ministry_store_orders set status='cancelled',updated_at=now() where id=o.id;
  released:=released+1;
 end loop;
 return released;
end;$$;
revoke all on function public.create_ministry_store_order(uuid,text,text,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.cancel_ministry_store_order(uuid,text) from public,anon,authenticated;
revoke all on function public.release_expired_ministry_store_orders() from public,anon,authenticated;
grant execute on function public.create_ministry_store_order(uuid,text,text,text,text,text,jsonb) to service_role;
grant execute on function public.cancel_ministry_store_order(uuid,text) to service_role;
grant execute on function public.release_expired_ministry_store_orders() to service_role;
notify pgrst,'reload schema';
commit;
