-- Correcciones de la revisión final.

-- 1) Trigger de alertas: toda la lógica (incluida la lectura de Vault) dentro del
--    bloque de excepción, para que un fallo de Vault nunca revierta una salida.
create or replace function public.notificar_alerta_nueva() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secreto text;
begin
  begin
    select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'notificar_alerta_url';
    select decrypted_secret into v_secreto
    from vault.decrypted_secrets where name = 'webhook_secret';

    if v_url is not null and v_secreto is not null then
      perform net.http_post(
        url := v_url,
        body := jsonb_build_object('record', row_to_json(new)),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-webhook-secret', v_secreto
        )
      );
    end if;
  exception when others then
    -- Un fallo de notificación nunca debe revertir la salida de inventario.
    null;
  end;
  return new;
end $$;

revoke execute on function public.notificar_alerta_nueva() from public, anon, authenticated;

-- 2) Cambiar a unidad entera con existencias fraccionarias dejaría la fracción atrapada.
create or replace function public.actualizar_producto(
  p_id uuid,
  p_nombre text,
  p_unidad public.unidad_medida,
  p_punto_pedido numeric
) returns public.productos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre text := trim(coalesce(p_nombre, ''));
  v_producto public.productos;
begin
  if not public.usuario_activo() or not public.es_admin() then
    raise exception 'NO_AUTORIZADO' using errcode = 'P0001';
  end if;
  if v_nombre = '' or length(v_nombre) > 120 or p_unidad is null
     or p_punto_pedido is null or not (p_punto_pedido between 0 and 9999999999.99) then
    raise exception 'DATOS_INVALIDOS' using errcode = 'P0001';
  end if;

  select * into v_producto from public.productos where id = p_id for update;
  if not found then
    raise exception 'PRODUCTO_NO_ENCONTRADO' using errcode = 'P0001';
  end if;
  if not v_producto.activo then
    raise exception 'PRODUCTO_INACTIVO' using errcode = 'P0001';
  end if;
  if p_unidad in ('unidad', 'caja', 'paquete') and v_producto.existencias <> trunc(v_producto.existencias) then
    raise exception 'DATOS_INVALIDOS' using errcode = 'P0001';
  end if;

  update public.productos
     set nombre = v_nombre, unidad = p_unidad, punto_pedido = p_punto_pedido
   where id = p_id
   returning * into v_producto;
  return v_producto;
end $$;

revoke execute on function public.actualizar_producto(uuid, text, public.unidad_medida, numeric) from public, anon;
grant execute on function public.actualizar_producto(uuid, text, public.unidad_medida, numeric) to authenticated;
