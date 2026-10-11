-- Movimientos de inventario y alertas de punto de pedido.

create table public.alertas (
  id bigint generated always as identity primary key,
  producto_id uuid not null references public.productos (id),
  existencias numeric(12,2) not null,
  punto_pedido numeric(12,2) not null,
  leida boolean not null default false,
  created_at timestamptz default now()
);

create index alertas_producto_idx on public.alertas (producto_id);

alter table public.alertas enable row level security;

create policy alertas_select on public.alertas
  for select to authenticated
  using ((select public.es_admin()));

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

create function public.marcar_alertas_leidas() returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.usuario_activo() or not public.es_admin() then
    raise exception 'NO_AUTORIZADO' using errcode = 'P0001';
  end if;
  update public.alertas set leida = true where not leida;
end $$;

revoke execute on function public.registrar_movimiento(uuid, public.tipo_movimiento, numeric, public.motivo_salida) from public, anon;
revoke execute on function public.marcar_alertas_leidas() from public, anon;
grant execute on function public.registrar_movimiento(uuid, public.tipo_movimiento, numeric, public.motivo_salida) to authenticated;
grant execute on function public.marcar_alertas_leidas() to authenticated;
