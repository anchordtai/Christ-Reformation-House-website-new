-- Review existing grants/policies in the confirmed church project before applying.
-- The React app accesses donations through the validated backend, not direct SQL.
-- This script preserves data and allows only the backend service role table access.
do $$
declare table_name text;
begin
  foreach table_name in array array['donation_types','donations','payment_events'] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on table public.%I from anon, authenticated', table_name);
      execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);
    end if;
  end loop;
end $$;
