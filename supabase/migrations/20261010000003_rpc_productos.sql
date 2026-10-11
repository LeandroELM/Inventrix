-- Rechazar NaN (numeric lo ordena por encima de todo y pasa los CHECK >= 0).
alter table public.productos add constraint productos_existencias_no_nan check (existencias <> 'NaN'::numeric);
alter table public.productos add constraint productos_punto_pedido_no_nan check (punto_pedido <> 'NaN'::numeric);
alter table public.movimientos add constraint movimientos_cantidad_no_nan check (cantidad <> 'NaN'::numeric);

-- RPC de productos (solo admin). Escriben como definer; el rol authenticated no tiene DML.

create function public.registrar_producto(
  p_nombre text,
  p_codigo text,
  p_unidad public.unidad_medida,
  p_cantidad_inicial numeric,
  p_punto_pedido numeric
) returns public.productos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre text := trim(coalesce(p_nombre, ''));
  v_codigo text := trim(coalesce(p_codigo, ''));
  v_producto public.productos;
begin
  if not public.usuario_activo() or not public.es_admin() then
    raise exception 'NO_AUTORIZADO' using errcode = 'P0001';
  end if;
  if v_nombre = '' or length(v_nombre) > 120 or v_codigo = ''
     or p_unidad is null
     or p_cantidad_inicial is null or not (p_cantidad_inicial between 0 and 9999999999.99)
     or p_punto_pedido is null or not (p_punto_pedido between 0 and 9999999999.99) then
    raise exception 'DATOS_INVALIDOS' using errcode = 'P0001';
  end if;

  begin
    insert into public.productos (nombre, codigo, unidad, existencias, punto_pedido)
    values (v_nombre, v_codigo, p_unidad, p_cantidad_inicial, p_punto_pedido)
    returning * into v_producto;
  exception when unique_violation then
    raise exception 'CODIGO_DUPLICADO' using errcode = 'P0001';
  end;

  if v_producto.existencias > 0 then
    insert into public.movimientos
      (producto_id, tipo, cantidad, existencias_antes, existencias_despues, usuario_id)
    values (v_producto.id, 'inicial', v_producto.existencias, 0, v_producto.existencias, auth.uid());
  end if;
  return v_producto;
end $$;

create function public.actualizar_producto(
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

  update public.productos
     set nombre = v_nombre, unidad = p_unidad, punto_pedido = p_punto_pedido
   where id = p_id
   returning * into v_producto;
  return v_producto;
end $$;

create function public.dar_baja_producto(p_id uuid, p_motivo text) returns public.productos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_motivo text := trim(coalesce(p_motivo, ''));
  v_producto public.productos;
begin
  if not public.usuario_activo() or not public.es_admin() then
    raise exception 'NO_AUTORIZADO' using errcode = 'P0001';
  end if;
  if v_motivo = '' then
    raise exception 'MOTIVO_REQUERIDO' using errcode = 'P0001';
  end if;

  select * into v_producto from public.productos where id = p_id for update;
  if not found then
    raise exception 'PRODUCTO_NO_ENCONTRADO' using errcode = 'P0001';
  end if;
  if not v_producto.activo then
    raise exception 'PRODUCTO_INACTIVO' using errcode = 'P0001';
  end if;
  if v_producto.existencias > 0 then
    raise exception 'TIENE_EXISTENCIAS' using errcode = 'P0001';
  end if;

  update public.productos
     set activo = false, motivo_baja = v_motivo,
         dado_baja_por = auth.uid(), dado_baja_at = now()
   where id = p_id
   returning * into v_producto;
  return v_producto;
end $$;

revoke execute on function public.registrar_producto(text, text, public.unidad_medida, numeric, numeric) from public, anon;
revoke execute on function public.actualizar_producto(uuid, text, public.unidad_medida, numeric) from public, anon;
revoke execute on function public.dar_baja_producto(uuid, text) from public, anon;
grant execute on function public.registrar_producto(text, text, public.unidad_medida, numeric, numeric) to authenticated;
grant execute on function public.actualizar_producto(uuid, text, public.unidad_medida, numeric) to authenticated;
grant execute on function public.dar_baja_producto(uuid, text) to authenticated;
