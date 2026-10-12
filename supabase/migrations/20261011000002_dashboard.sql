-- Dashboard de reportes (solo admin): mas/menos vendido, productos en punto de
-- pedido y serie diaria de entradas y salidas en un rango de fechas locales.
create function public.dashboard_reportes(p_desde date, p_hasta date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  -- Unica zona horaria del negocio; los dias se calculan en hora local.
  v_zona constant text := 'America/Managua';
  v_inicio timestamptz;
  v_fin timestamptz;
  v_mas jsonb;
  v_menos jsonb;
  v_pedir int;
  v_total int;
  v_serie jsonb;
begin
  if not public.usuario_activo() or not public.es_admin() then
    raise exception 'NO_AUTORIZADO' using errcode = 'P0001';
  end if;
  if p_desde is null or p_hasta is null or p_hasta < p_desde or p_hasta - p_desde > 365 then
    raise exception 'RANGO_INVALIDO' using errcode = 'P0001';
  end if;

  v_inicio := p_desde::timestamp at time zone v_zona;
  v_fin := (p_hasta + 1)::timestamp at time zone v_zona;

  -- Ventas por producto (incluye productos que luego se dieron de baja).
  with ventas as (
    select p.id, p.nombre, p.unidad, sum(m.cantidad) as cantidad
    from public.movimientos m
    join public.productos p on p.id = m.producto_id
    where m.tipo = 'salida' and m.motivo = 'venta'
      and m.created_at >= v_inicio and m.created_at < v_fin
    group by p.id, p.nombre, p.unidad
  )
  select
    (select jsonb_build_object('producto_id', v.id, 'nombre', v.nombre, 'unidad', v.unidad, 'cantidad', v.cantidad)
       from ventas v order by v.cantidad desc, v.nombre, v.id limit 1),
    (select jsonb_build_object('producto_id', v.id, 'nombre', v.nombre, 'unidad', v.unidad, 'cantidad', v.cantidad)
       from ventas v order by v.cantidad asc, v.nombre, v.id limit 1)
  into v_mas, v_menos;

  select count(*)::int into v_pedir from public.productos_a_pedir;

  select count(*)::int into v_total
  from public.movimientos m
  where m.tipo <> 'inicial' and m.created_at >= v_inicio and m.created_at < v_fin;

  select jsonb_agg(jsonb_build_object(
           'fecha', to_char(g.dia, 'YYYY-MM-DD'),
           'entradas', coalesce(c.entradas, 0),
           'salidas', coalesce(c.salidas, 0))
         order by g.dia)
  into v_serie
  from (select d::date as dia from generate_series(p_desde, p_hasta, interval '1 day') as s(d)) g
  left join (
    select (m.created_at at time zone v_zona)::date as dia,
           (count(*) filter (where m.tipo = 'entrada'))::int as entradas,
           (count(*) filter (where m.tipo in ('salida', 'baja')))::int as salidas
    from public.movimientos m
    where m.created_at >= v_inicio and m.created_at < v_fin
    group by 1
  ) c on c.dia = g.dia;

  return jsonb_build_object(
    'mas_vendido', v_mas,
    'menos_vendido', v_menos,
    'en_punto_pedido', v_pedir,
    'total_movimientos', v_total,
    'serie', v_serie);
end $$;

revoke execute on function public.dashboard_reportes(date, date) from public, anon;
grant execute on function public.dashboard_reportes(date, date) to authenticated;
