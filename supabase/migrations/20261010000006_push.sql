-- Registro de dispositivos para notificaciones push. Sin acceso directo:
-- toda lectura/escritura pasa por RPC security definer.

create table public.dispositivos (
  token text primary key,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  actualizado_at timestamptz not null default now()
);

create index dispositivos_usuario_idx on public.dispositivos (usuario_id);

alter table public.dispositivos enable row level security;
revoke all on table public.dispositivos from anon, authenticated;

-- Upsert del token del dispositivo para el usuario actual.
create function public.registrar_dispositivo(p_token text) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.usuario_activo() then
    raise exception 'NO_AUTORIZADO' using errcode = 'P0001';
  end if;
  if p_token is null or btrim(p_token) = '' then
    raise exception 'DATOS_INVALIDOS' using errcode = 'P0001';
  end if;
  insert into public.dispositivos (token, usuario_id, actualizado_at)
  values (p_token, (select auth.uid()), now())
  on conflict (token) do update
    set usuario_id = excluded.usuario_id, actualizado_at = now();
end $$;

-- Elimina solo el token propio; no falla si no hay coincidencia.
create function public.eliminar_dispositivo(p_token text) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.usuario_activo() then
    raise exception 'NO_AUTORIZADO' using errcode = 'P0001';
  end if;
  delete from public.dispositivos
  where token = p_token and usuario_id = (select auth.uid());
end $$;

revoke execute on function public.registrar_dispositivo(text) from public, anon;
revoke execute on function public.eliminar_dispositivo(text) from public, anon;
grant execute on function public.registrar_dispositivo(text) to authenticated;
grant execute on function public.eliminar_dispositivo(text) to authenticated;
