-- Motivos de salida nuevos y baja de producto con motivo (aunque haya existencias).

-- 1. Objetos que dependen de los tipos viejos.
drop view public.historial_movimientos;
drop function public.reporte_movimientos(public.tipo_movimiento, timestamptz, timestamptz, uuid);
drop function public.registrar_movimiento(uuid, public.tipo_movimiento, numeric, public.motivo_salida);
drop function public.dar_baja_producto(uuid, text);

-- 2. Motivos de salida: consumo_interno y retiro_autorizado pasan a 'otros'.
create type public.motivo_salida_v2 as enum ('venta', 'caducidad', 'dano', 'otros');

alter table public.movimientos alter column motivo type public.motivo_salida_v2
  using (case motivo::text when 'venta' then 'venta' when 'consumo_interno' then 'otros'
                           when 'retiro_autorizado' then 'otros' end)::public.motivo_salida_v2;
drop type public.motivo_salida;
alter type public.motivo_salida_v2 rename to motivo_salida;

-- 3. Motivo de baja como enum; el texto libre anterior pasa a detalle_baja.
create type public.motivo_baja as enum ('descontinuado', 'ya_no_se_vende', 'error_registro', 'otro');

alter table public.productos add column detalle_baja text;
update public.productos set detalle_baja = motivo_baja where motivo_baja is not null;
alter table public.productos alter column motivo_baja type public.motivo_baja
  using (case when motivo_baja is null then null else 'otro' end)::public.motivo_baja;

-- 4. Objetos recreados con el mismo cuerpo y permisos.
-- Entrada o salida sobre un producto activo. La fila del producto se bloquea
-- (for update) para que dos salidas simultáneas no dejen existencias negativas.
create function public.registrar_movimiento(
  p_producto_id uuid,
  p_tipo public.tipo_movimiento,
  p_cantidad numeric,
  p_motivo public.motivo_salida default null
) returns public.movimientos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_producto public.productos;
  v_antes numeric(12,2);
  v_despues numeric;
  v_motivo public.motivo_salida;
  v_movimiento public.movimientos;
begin
  if not public.usuario_activo() then
    raise exception 'NO_AUTORIZADO' using errcode = 'P0001';
  end if;
  if p_tipo is null or p_tipo not in ('entrada', 'salida') then
    raise exception 'DATOS_INVALIDOS' using errcode = 'P0001';
  end if;
  if p_cantidad is null or not (p_cantidad > 0 and p_cantidad <= 9999999999.99)
     or p_cantidad <> round(p_cantidad, 2) then
    raise exception 'CANTIDAD_INVALIDA' using errcode = 'P0001';
  end if;
  if p_tipo = 'salida' then
    if p_motivo is null then
      raise exception 'MOTIVO_REQUERIDO' using errcode = 'P0001';
    end if;
    v_motivo := p_motivo;
  end if;

  select * into v_producto from public.productos where id = p_producto_id for update;
  if not found then
    raise exception 'PRODUCTO_NO_ENCONTRADO' using errcode = 'P0001';
  end if;
  if not v_producto.activo then
    raise exception 'PRODUCTO_INACTIVO' using errcode = 'P0001';
  end if;

  v_antes := v_producto.existencias;
  if p_tipo = 'salida' then
    if p_cantidad > v_antes then
      raise exception 'EXISTENCIAS_INSUFICIENTES' using errcode = 'P0001';
    end if;
    v_despues := v_antes - p_cantidad;
  else
    v_despues := v_antes + p_cantidad;
    if v_despues > 9999999999.99 then
      raise exception 'DATOS_INVALIDOS' using errcode = 'P0001';
    end if;
  end if;

  update public.productos set existencias = v_despues where id = p_producto_id;

  insert into public.movimientos
    (producto_id, tipo, cantidad, motivo, existencias_antes, existencias_despues, usuario_id)
  values (p_producto_id, p_tipo, p_cantidad, v_motivo, v_antes, v_despues, auth.uid())
  returning * into v_movimiento;

  if p_tipo = 'salida' and v_antes > v_producto.punto_pedido
     and v_despues <= v_producto.punto_pedido then
    insert into public.alertas (producto_id, existencias, punto_pedido)
    values (p_producto_id, v_despues, v_producto.punto_pedido);
  end if;

  return v_movimiento;
end $$;

-- Reporte de movimientos (solo admin), con filtros opcionales.
create function public.reporte_movimientos(
  p_tipo public.tipo_movimiento default null,
  p_desde timestamptz default null,
  p_hasta timestamptz default null,
  p_producto_id uuid default null
) returns table (
  fecha timestamptz,
  producto text,
  codigo text,
  unidad public.unidad_medida,
  tipo public.tipo_movimiento,
  cantidad numeric,
  motivo public.motivo_salida,
  usuario text,
  existencias_antes numeric,
  existencias_despues numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.usuario_activo() or not public.es_admin() then
    raise exception 'NO_AUTORIZADO' using errcode = 'P0001';
  end if;
  return query
    select m.created_at, p.nombre, p.codigo, p.unidad, m.tipo, m.cantidad, m.motivo,
           u.nombre, m.existencias_antes, m.existencias_despues
    from public.movimientos m
    join public.productos p on p.id = m.producto_id
    join public.perfiles u on u.id = m.usuario_id
    where (p_tipo is null or m.tipo = p_tipo)
      and (p_desde is null or m.created_at >= p_desde)
      and (p_hasta is null or m.created_at < p_hasta)
      and (p_producto_id is null or m.producto_id = p_producto_id)
    order by m.created_at desc, m.id desc;
end $$;

-- Historial para ambos roles. Vista del propietario (sin security_invoker) para
-- mostrar el nombre de otros usuarios pese a la RLS de perfiles.
create view public.historial_movimientos as
select m.id, m.created_at, m.producto_id, p.nombre as producto, p.codigo, p.unidad,
       m.tipo, m.cantidad, m.motivo, m.existencias_antes, m.existencias_despues,
       m.usuario_id, u.nombre as usuario
from public.movimientos m
join public.productos p on p.id = m.producto_id
join public.perfiles u on u.id = m.usuario_id
where (select public.usuario_activo());

revoke all on public.historial_movimientos from public, anon;
grant select on public.historial_movimientos to authenticated;

revoke execute on function public.registrar_movimiento(uuid, public.tipo_movimiento, numeric, public.motivo_salida) from public, anon;
revoke execute on function public.reporte_movimientos(public.tipo_movimiento, timestamptz, timestamptz, uuid) from public, anon;
grant execute on function public.registrar_movimiento(uuid, public.tipo_movimiento, numeric, public.motivo_salida) to authenticated;
grant execute on function public.reporte_movimientos(public.tipo_movimiento, timestamptz, timestamptz, uuid) to authenticated;

-- 5. Baja con motivo. Si quedan existencias, se registra un movimiento 'baja'
-- por lo restante y las existencias pasan a cero (sin alerta de punto de pedido).
create function public.dar_baja_producto(
  p_id uuid,
  p_motivo public.motivo_baja,
  p_detalle text default null
) returns public.productos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_detalle text := nullif(trim(coalesce(p_detalle, '')), '');
  v_producto public.productos;
begin
  if not public.usuario_activo() or not public.es_admin() then
    raise exception 'NO_AUTORIZADO' using errcode = 'P0001';
  end if;
  if p_motivo is null then
    raise exception 'MOTIVO_REQUERIDO' using errcode = 'P0001';
  end if;
  if char_length(coalesce(v_detalle, '')) > 200 then
    raise exception 'DATOS_INVALIDOS' using errcode = 'P0001';
  end if;
  if p_motivo = 'otro' and v_detalle is null then
    raise exception 'DETALLE_REQUERIDO' using errcode = 'P0001';
  end if;

  select * into v_producto from public.productos where id = p_id for update;
  if not found then
    raise exception 'PRODUCTO_NO_ENCONTRADO' using errcode = 'P0001';
  end if;
  if not v_producto.activo then
    raise exception 'PRODUCTO_INACTIVO' using errcode = 'P0001';
  end if;

  if v_producto.existencias > 0 then
    insert into public.movimientos
      (producto_id, tipo, cantidad, motivo, existencias_antes, existencias_despues, usuario_id)
    values (p_id, 'baja', v_producto.existencias, null, v_producto.existencias, 0, auth.uid());
  end if;

  update public.productos
     set activo = false, existencias = 0, motivo_baja = p_motivo, detalle_baja = v_detalle,
         dado_baja_por = auth.uid(), dado_baja_at = now()
   where id = p_id
   returning * into v_producto;
  return v_producto;
end $$;

revoke execute on function public.dar_baja_producto(uuid, public.motivo_baja, text) from public, anon;
grant execute on function public.dar_baja_producto(uuid, public.motivo_baja, text) to authenticated;
