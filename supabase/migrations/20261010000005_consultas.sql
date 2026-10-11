-- Consultas de lectura: inicio, productos a pedir, reportes e historial.

-- Totales por unidad de medida (nunca mezcla unidades distintas).
create function public.resumen_existencias()
returns table (unidad public.unidad_medida, total numeric, productos int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.usuario_activo() then
    raise exception 'NO_AUTORIZADO' using errcode = 'P0001';
  end if;
  return query
    select p.unidad, sum(p.existencias), count(*)::int
    from public.productos p
    where p.activo
    group by p.unidad
    order by p.unidad;
end $$;

-- Productos activos en o bajo el punto de pedido, los mas criticos primero.
create view public.productos_a_pedir
with (security_invoker = true) as
select p.id, p.nombre, p.codigo, p.unidad, p.existencias, p.punto_pedido
from public.productos p
where p.activo and p.existencias <= p.punto_pedido
order by p.existencias / nullif(p.punto_pedido, 0) asc nulls first, p.nombre;

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

revoke all on public.productos_a_pedir from public, anon;
revoke all on public.historial_movimientos from public, anon;
grant select on public.productos_a_pedir to authenticated;
grant select on public.historial_movimientos to authenticated;

revoke execute on function public.resumen_existencias() from public, anon;
revoke execute on function public.reporte_movimientos(public.tipo_movimiento, timestamptz, timestamptz, uuid) from public, anon;
grant execute on function public.resumen_existencias() to authenticated;
grant execute on function public.reporte_movimientos(public.tipo_movimiento, timestamptz, timestamptz, uuid) to authenticated;
