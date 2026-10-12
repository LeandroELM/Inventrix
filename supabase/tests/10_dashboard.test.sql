begin;
create extension if not exists pgtap with schema extensions;
create function pg_temp.crear_usuario(p_usuario text, p_rol text) returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  values (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          p_usuario || '@usuarios.inventrix.app',
          jsonb_build_object('usuario', p_usuario, 'nombre', p_usuario, 'rol', p_rol));
  return v;
end $$;
create function pg_temp.como(p_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;
-- Registra un movimiento (como el admin) y lo fecha en p_cuando. Se usa como postgres.
create function pg_temp.mov(p_codigo text, p_tipo public.tipo_movimiento, p_cant numeric,
                            p_motivo public.motivo_salida, p_cuando timestamptz) returns void language plpgsql as $$
declare v_mov public.movimientos;
begin
  select * into v_mov from public.registrar_movimiento(
    (select id from public.productos where codigo = p_codigo), p_tipo, p_cant, p_motivo);
  update public.movimientos set created_at = p_cuando where id = v_mov.id;
end $$;

select plan(20);

select pg_temp.crear_usuario('adm', 'admin') as adm \gset
select pg_temp.crear_usuario('ope', 'operativo') as ope \gset

-- Datos de prueba (como postgres, actuando como el admin).
select set_config('request.jwt.claims', json_build_object('sub', :'adm', 'role', 'authenticated')::text, true);
select public.registrar_producto('Arroz', 'T-ARR', 'libra', 100, 5);
select public.registrar_producto('Azucar', 'T-AZU', 'libra', 100, 5);
select public.registrar_producto('Sal', 'T-SAL', 'libra', 100, 5);
select public.registrar_producto('Frijol', 'T-FRI', 'libra', 100, 5);
select public.registrar_producto('Aceite', 'T-ACE', 'unidad', 100, 5);
select public.registrar_producto('Harina', 'T-HAR', 'libra', 20, 5);

-- febrero: empate Arroz/Azucar en 10, Sal 3 y una caducidad de Sal que no cuenta
select pg_temp.mov('T-ARR', 'salida', 10, 'venta', '2026-02-10 09:00-06');
select pg_temp.mov('T-AZU', 'salida', 10, 'venta', '2026-02-11 09:00-06');
select pg_temp.mov('T-SAL', 'salida', 3, 'venta', '2026-02-12 09:00-06');
select pg_temp.mov('T-SAL', 'salida', 50, 'caducidad', '2026-02-12 10:00-06');
-- marzo: un solo producto vendido
select pg_temp.mov('T-FRI', 'salida', 4, 'venta', '2026-03-01 12:00-06');
-- abril: bordes de dia en hora local
select pg_temp.mov('T-ACE', 'salida', 1, 'venta', '2026-04-05 23:30-06');
select pg_temp.mov('T-ACE', 'salida', 1, 'venta', '2026-04-06 00:30-06');
-- mayo: Harina con inicial el 1, venta el 2 y baja (con existencias) el 3
update public.movimientos set created_at = '2026-05-01 10:00-06'
  where tipo = 'inicial' and producto_id = (select id from public.productos where codigo = 'T-HAR');
select pg_temp.mov('T-HAR', 'salida', 5, 'venta', '2026-05-02 10:00-06');
select public.dar_baja_producto((select id from public.productos where codigo = 'T-HAR'), 'descontinuado');
update public.movimientos set created_at = '2026-05-03 10:00-06'
  where tipo = 'baja' and producto_id = (select id from public.productos where codigo = 'T-HAR');
select set_config('request.jwt.claims', '', true);

select pg_temp.como(:'adm');

-- sin ventas
select is(public.dashboard_reportes('2026-01-01', '2026-01-07') -> 'mas_vendido', 'null'::jsonb, 'sin ventas: mas_vendido null');
select is(public.dashboard_reportes('2026-01-01', '2026-01-07') -> 'menos_vendido', 'null'::jsonb, 'sin ventas: menos_vendido null');
select is(jsonb_array_length(public.dashboard_reportes('2026-01-01', '2026-01-07') -> 'serie'), 7, 'serie con 7 dias');
select is(public.dashboard_reportes('2026-01-01', '2026-01-07') -> 'serie' -> 0,
          '{"fecha":"2026-01-01","entradas":0,"salidas":0}'::jsonb, 'dias vacios en cero');
-- febrero
select is(public.dashboard_reportes('2026-02-10', '2026-02-12') #>> '{mas_vendido,nombre}', 'Arroz', 'empate: gana por nombre');
select is(public.dashboard_reportes('2026-02-10', '2026-02-12') #>> '{menos_vendido,nombre}', 'Sal', 'menos vendido solo con ventas');
select is((public.dashboard_reportes('2026-02-10', '2026-02-12') #>> '{menos_vendido,cantidad}')::numeric, 3::numeric, 'caducidad no cuenta como venta');
-- marzo
select is(public.dashboard_reportes('2026-03-01', '2026-03-01') #>> '{mas_vendido,nombre}', 'Frijol', 'un solo vendido: mas vendido es Frijol');
select is(public.dashboard_reportes('2026-03-01', '2026-03-01') #>> '{menos_vendido,nombre}', 'Frijol', 'un solo vendido: menos vendido es Frijol');
-- abril
select is((public.dashboard_reportes('2026-04-01', '2026-04-05') #>> '{serie,4,salidas}')::int, 1, '23:30 local entra en su dia');
select is((public.dashboard_reportes('2026-04-01', '2026-04-05') ->> 'total_movimientos')::int, 1, '00:30 del dia siguiente queda fuera');
-- mayo
select is((public.dashboard_reportes('2026-05-03', '2026-05-03') #>> '{serie,0,salidas}')::int, 1, 'baja cuenta como salida en la serie');
select is((public.dashboard_reportes('2026-05-01', '2026-05-01') ->> 'total_movimientos')::int, 0, 'inicial no cuenta');
select is(public.dashboard_reportes('2026-05-02', '2026-05-02') #>> '{mas_vendido,nombre}', 'Harina', 'cuenta ventas de producto inactivo');
select is((public.dashboard_reportes('2026-01-01', '2026-01-01') ->> 'en_punto_pedido')::int,
          (select count(*)::int from public.productos_a_pedir), 'en_punto_pedido = productos_a_pedir');
select throws_ok($$select public.dashboard_reportes('2026-01-07', '2026-01-01')$$, 'P0001', 'RANGO_INVALIDO', 'hasta antes de desde');
select throws_ok($$select public.dashboard_reportes('2025-01-01', '2026-01-02')$$, 'P0001', 'RANGO_INVALIDO', 'mas de 366 dias');
select throws_ok($$select public.dashboard_reportes(null, '2026-01-02')$$, 'P0001', 'RANGO_INVALIDO', 'fecha nula');

select pg_temp.como(:'ope');
select throws_ok($$select public.dashboard_reportes('2026-01-01', '2026-01-07')$$, 'P0001', 'NO_AUTORIZADO', 'operativo no autorizado');
select ok(not has_function_privilege('anon', 'public.dashboard_reportes(date,date)', 'EXECUTE')
          and has_function_privilege('authenticated', 'public.dashboard_reportes(date,date)', 'EXECUTE'), 'permisos');

select * from finish();
rollback;
