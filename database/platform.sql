-- Apply in the ministry's Supabase project before enabling platform features.
-- No fabricated sermons, events, products, or meetings are inserted.
create table if not exists public.platform_records (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('sermon','event','blog','devotional','product','contact','prayer','registration','order','meeting')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists platform_records_kind_created on public.platform_records(kind,created_at desc);
alter table public.platform_records enable row level security;
revoke all on public.platform_records from anon, authenticated;
grant select,insert,update,delete on public.platform_records to service_role;
-- Browser clients must use the validated API. Contact, prayer, registration,
-- and order records are never exposed through public listing routes.
-- Administrator status is assigned only through trusted auth app_metadata.role.

create index if not exists platform_records_owner on public.platform_records(owner_id) where owner_id is not null;
