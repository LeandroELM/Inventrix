-- Seguridad: funciones de rol, RLS y permisos. Toda escritura va por RPC.

create function public.usuario_activo() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles where id = (select auth.uid()) and activo
  );
$$;

create function public.es_admin() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and activo and rol = 'admin'
  );
$$;

revoke execute on function public.usuario_activo() from public, anon;
revoke execute on function public.es_admin() from public, anon;
grant execute on function public.usuario_activo() to authenticated, service_role;
grant execute on function public.es_admin() to authenticated, service_role;

alter table public.perfiles enable row level security;
alter table public.productos enable row level security;
alter table public.movimientos enable row level security;

create policy perfiles_select on public.perfiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.es_admin()));

create policy productos_select on public.productos
  for select to authenticated
  using ((select public.usuario_activo()));

create policy movimientos_select on public.movimientos
  for select to authenticated
  using ((select public.usuario_activo()));

revoke insert, update, delete on all tables in schema public from anon, authenticated;
revoke all on all tables in schema public from anon;

-- Tablas futuras: sin escritura directa para anon/authenticated.
alter default privileges in schema public revoke insert, update, delete on tables from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon;
