create table public.devotional_likes (
  publication_date date not null references public.devotional_entries(publication_date) on delete cascade,
  visitor_hash text not null check (visitor_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  primary key(publication_date,visitor_hash)
);
create table public.devotional_comments (
  id uuid primary key default gen_random_uuid(),
  publication_date date not null references public.devotional_entries(publication_date) on delete cascade,
  visitor_hash text not null check (visitor_hash ~ '^[a-f0-9]{64}$'),
  submission_id uuid not null,
  display_name text not null check (length(display_name) between 2 and 60),
  body text not null check (length(body) between 3 and 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  unique(publication_date,visitor_hash,submission_id),
  check (status='pending' or (reviewed_by is not null and reviewed_at is not null))
);
create index devotional_comments_public on public.devotional_comments(publication_date,status,created_at,id);
create index devotional_comments_moderation on public.devotional_comments(status,created_at desc,id desc);
create index devotional_comments_reviewer on public.devotional_comments(reviewed_by);
alter table public.devotional_likes enable row level security;
alter table public.devotional_comments enable row level security;
revoke all on public.devotional_likes,public.devotional_comments from public,anon,authenticated;
grant select,insert,delete on public.devotional_likes to service_role;
grant select,insert,update on public.devotional_comments to service_role;
