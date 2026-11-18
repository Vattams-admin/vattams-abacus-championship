-- Module 58: service-only bridge to private staff_roles for Edge Function authorization.
begin;

create or replace function public.abacus_get_active_staff_role(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = pg_catalog, abacus
as $$
  select sr.role
  from abacus.staff_roles sr
  where sr.user_id = p_user_id
    and sr.revoked_at is null
  limit 1
$$;

revoke all on function public.abacus_get_active_staff_role(uuid) from public, anon, authenticated;
grant execute on function public.abacus_get_active_staff_role(uuid) to service_role;

commit;
