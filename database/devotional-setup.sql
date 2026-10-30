-- Prepared setup, not applied. Review against the intended church project first.
-- The Express API is the only data access path; no browser table grants.
begin;
create table public.devotional_entries (
  publication_date date primary key check (publication_date between date '2026-11-01' and date '2027-10-31'),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  status text not null default 'draft' check (status in ('draft','scheduled','published')),
  release_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  revision integer not null default 1 check (revision > 0),
  check (status = 'draft' or (release_at is not null and reviewed_by is not null and reviewed_at is not null)),
  check (status = 'draft' or (release_at at time zone 'Africa/Lagos')::date >= publication_date)
);
alter table public.devotional_entries enable row level security;
revoke all on public.devotional_entries from public, anon, authenticated;
grant select, insert, update on public.devotional_entries to service_role;
commit;
