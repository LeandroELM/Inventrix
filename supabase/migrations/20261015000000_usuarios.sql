-- Gestión de usuarios: rol y estado. Crear y restablecer contraseña van por la Edge Function
-- admin-usuarios porque necesitan la API de administración de Auth.
--
-- Basta con prohibir actuar sobre uno mismo para que siempre quede un admin activo: quien llama
-- es un admin activo y no puede degradarse ni desactivarse.

create function public.cambiar_rol_usuario(p_id uuid, p_rol public.rol_usuario) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.usuario_activo() or not public.es_admin() then
    raise exception 'NO_AUTORIZADO' using errcode = 'P0001';
  end if;
  if p_id = (select auth.uid()) then
    raise exception 'ACCION_SOBRE_SI_MISMO' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.perfiles where id = p_id) then
    raise exception 'USUARIO_NO_ENCONTRADO' using errcode = 'P0001';
  end if;
  update public.perfiles set rol = p_rol where id = p_id;
end;
$$;

-- Al desactivar se borran sus dispositivos: deja de recibir notificaciones push.
create function public.cambiar_estado_usuario(p_id uuid, p_activo boolean) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.usuario_activo() or not public.es_admin() then
    raise exception 'NO_AUTORIZADO' using errcode = 'P0001';
  end if;
  if p_id = (select auth.uid()) then
    raise exception 'ACCION_SOBRE_SI_MISMO' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.perfiles where id = p_id) then
    raise exception 'USUARIO_NO_ENCONTRADO' using errcode = 'P0001';
  end if;
  update public.perfiles set activo = p_activo where id = p_id;
  if not p_activo then
    delete from public.dispositivos where usuario_id = p_id;
  end if;
end;
$$;

revoke execute on function public.cambiar_rol_usuario(uuid, public.rol_usuario) from public, anon;
revoke execute on function public.cambiar_estado_usuario(uuid, boolean) from public, anon;
grant execute on function public.cambiar_rol_usuario(uuid, public.rol_usuario) to authenticated;
grant execute on function public.cambiar_estado_usuario(uuid, boolean) to authenticated;
