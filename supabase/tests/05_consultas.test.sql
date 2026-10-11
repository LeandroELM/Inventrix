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

select plan(9);

select pg_temp.crear_usuario('adm', 'admin') as adm \gset
select pg_temp.crear_usuario('ope', 'operativo') as ope \gset

select pg_temp.como(:'adm');
select public.registrar_producto('Harina', 'H1', 'libra', 10, 2);
select public.registrar_producto('Azucar', 'A1', 'libra', 5, 5);
select public.registrar_producto('Aceite', 'L1', 'litro', 3, 1);
select public.registrar_producto('Viejo', 'V1', 'libra', 0, 9);
select public.dar_baja_producto((select id from public.productos where codigo = 'V1'), 'descontinuado');
select id as harina from public.productos where codigo = 'H1' \gset

select public.registrar_movimiento(:'harina', 'salida', 1, 'venta');
select public.registrar_movimiento(:'harina', 'entrada', 4);
select count(*)::int as n_adm from public.movimientos where usuario_id = :'adm' \gset

-- 1. resumen por unidad
select results_eq(
  $$select unidad::text, total, productos from public.resumen_existencias() order by unidad::text$$,
  $$values ('libra', 18.00::numeric, 2), ('litro', 3.00::numeric, 1)$$,
  'resumen_existencias agrupa por unidad solo activos');

-- 2. a pedir
select results_eq(
  $$select codigo from public.productos_a_pedir order by codigo$$,
  $$values ('A1'::text)$$,
  'productos_a_pedir incluye existencias <= punto y excluye inactivos');

-- 3. reporte salidas en rango
select results_eq(
  format($$select tipo::text, cantidad from public.reporte_movimientos('salida', now() - interval '1 hour', now() + interval '1 hour', %L)$$, :'harina'),
  $$values ('salida', 1.00::numeric)$$,
  'reporte_movimientos filtra por tipo, rango y producto');

-- 4. rango que excluye todo
select is((select count(*)::int from public.reporte_movimientos(null, now() + interval '1 hour', null, null)),
          0, 'reporte_movimientos respeta p_desde');

-- 5. historial expone usuario
select is((select usuario from public.historial_movimientos where producto_id = :'harina' and tipo = 'salida'),
          'adm', 'historial_movimientos expone nombre de usuario');

-- Operativo
select pg_temp.como(:'ope');
select throws_ok($$select * from public.reporte_movimientos()$$,
                 'P0001', 'NO_AUTORIZADO', 'operativo no usa reporte_movimientos');
select is((select count(*)::int from public.historial_movimientos where usuario = 'adm'),
          (:n_adm)::int,
          'operativo ve historial con nombre de otro usuario');
select lives_ok($$select * from public.resumen_existencias()$$, 'operativo usa resumen_existencias');

-- Anon
reset role;
select ok(not has_table_privilege('anon', 'public.productos_a_pedir', 'SELECT')
          and not has_table_privilege('anon', 'public.historial_movimientos', 'SELECT')
          and has_table_privilege('authenticated', 'public.productos_a_pedir', 'SELECT')
          and has_table_privilege('authenticated', 'public.historial_movimientos', 'SELECT'),
          'vistas: authenticated select, anon sin acceso');

select * from finish();
rollback;
