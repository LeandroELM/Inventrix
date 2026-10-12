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

select plan(36);

select pg_temp.crear_usuario('adm', 'admin') as adm \gset
select pg_temp.crear_usuario('ope', 'operativo') as ope \gset

select pg_temp.como(:'adm');
select public.registrar_producto('Detergente', 'D1', 'unidad', 12, 10);
select id as det from public.productos where codigo = 'D1' \gset

-- Entrada
select is((select existencias_despues from public.registrar_movimiento(:'det', 'entrada', 5)),
          17.00::numeric, 'entrada 5 devuelve existencias_despues 17');
select is((select existencias from public.productos where id = :'det'), 17.00::numeric,
          'entrada 5 deja existencias en 17');
select is((select count(*)::int from public.movimientos
           where producto_id = :'det' and tipo = 'entrada' and cantidad = 5 and motivo is null
             and existencias_antes = 12 and existencias_despues = 17 and usuario_id = :'adm'),
          1, 'movimiento de entrada con antes 12 / despues 17 y usuario');

-- Validaciones
select throws_ok(format('select public.registrar_movimiento(%L, %L, 3)', :'det', 'salida'),
                 'P0001', 'MOTIVO_REQUERIDO', 'salida sin motivo');
select throws_ok(format('select public.registrar_movimiento(%L, %L, 0, %L)', :'det', 'salida', 'venta'),
                 'P0001', 'CANTIDAD_INVALIDA', 'salida 0');
select throws_ok(format('select public.registrar_movimiento(%L, %L, -1, %L)', :'det', 'salida', 'venta'),
                 'P0001', 'CANTIDAD_INVALIDA', 'salida -1');
select throws_ok(format('select public.registrar_movimiento(%L, %L, %L, %L)', :'det', 'salida', 'NaN', 'venta'),
                 'P0001', 'CANTIDAD_INVALIDA', 'salida NaN');
select throws_ok(format('select public.registrar_movimiento(%L, %L, 1.005, %L)', :'det', 'salida', 'venta'),
                 'P0001', 'CANTIDAD_INVALIDA', 'mas de 2 decimales');
select throws_ok(format('select public.registrar_movimiento(%L, %L, 1)', :'det', 'inicial'),
                 'P0001', 'DATOS_INVALIDOS', 'tipo inicial no permitido');
select throws_ok(format('select public.registrar_movimiento(%L, %L, 9999999999.99)', :'det', 'entrada'),
                 'P0001', 'DATOS_INVALIDOS', 'entrada que desborda existencias');
select throws_ok(format('select public.registrar_movimiento(%L, %L, 1)', gen_random_uuid(), 'entrada'),
                 'P0001', 'PRODUCTO_NO_ENCONTRADO', 'producto inexistente');
select throws_ok(format('select public.registrar_movimiento(%L, %L, 18, %L)', :'det', 'salida', 'venta'),
                 'P0001', 'EXISTENCIAS_INSUFICIENTES', 'salida 18 > 17');
select is((select existencias from public.productos where id = :'det'), 17.00::numeric,
          'existencias siguen 17 tras salida rechazada');

-- Salida que cruza el punto de pedido -> alerta
select is((select existencias_despues from public.registrar_movimiento(:'det', 'salida', 7, 'venta')),
          10.00::numeric, 'salida 7 deja existencias 10 (= punto)');
select is((select count(*)::int from public.alertas
           where producto_id = :'det' and existencias = 10 and punto_pedido = 10 and not leida),
          1, 'una alerta al llegar al punto de pedido');
select lives_ok(format('select public.registrar_movimiento(%L, %L, 1, %L)', :'det', 'salida', 'otros'),
                'salida 1 mas con motivo otros');
select is((select count(*)::int from public.alertas where producto_id = :'det'),
          1, 'la alerta no se duplica bajo el punto de pedido');

-- Motivos nuevos
select lives_ok(format('select public.registrar_movimiento(%L, %L, 1, %L)', :'det', 'salida', 'caducidad'), 'salida por caducidad');
select is((select activo from public.productos where id = :'det'), true, 'caducidad deja el producto activo');
select lives_ok(format('select public.registrar_movimiento(%L, %L, 1, %L)', :'det', 'salida', 'dano'), 'salida por dano');
select throws_ok(format('select public.registrar_movimiento(%L, %L, 1)', :'det', 'baja'),
                 'P0001', 'DATOS_INVALIDOS', 'tipo baja no permitido');
select is((select count(*)::int from public.movimientos where producto_id = :'det' and motivo in ('caducidad', 'dano', 'otros')),
          3, 'motivos caducidad, dano y otros guardados');

-- Bloqueo de fila contra salidas concurrentes
select ok(pg_get_functiondef('public.registrar_movimiento(uuid,public.tipo_movimiento,numeric,public.motivo_salida)'::regprocedure)
          ilike '%for update%', 'registrar_movimiento bloquea la fila del producto');

-- Producto dado de baja
select public.registrar_producto('Viejo', 'V1', 'unidad', 0, 0);
select public.dar_baja_producto((select id from public.productos where codigo = 'V1'), 'descontinuado');
select throws_ok(format('select public.registrar_movimiento(%L, %L, 1)',
                        (select id from public.productos where codigo = 'V1'), 'entrada'),
                 'P0001', 'PRODUCTO_INACTIVO', 'movimiento sobre producto inactivo');

-- Operativo
select pg_temp.como(:'ope');
select lives_ok(format('select public.registrar_movimiento(%L, %L, 2)', :'det', 'entrada'),
                'operativo registra entrada');
select is((select count(*)::int from public.movimientos
           where producto_id = :'det' and tipo = 'entrada' and usuario_id = :'ope'),
          1, 'movimiento del operativo con su usuario');
select is((select count(*)::int from public.alertas), 0, 'operativo no ve alertas');
select throws_ok($$select public.marcar_alertas_leidas()$$,
                 'P0001', 'NO_AUTORIZADO', 'operativo no marca alertas');
select throws_ok($$update public.movimientos set cantidad = 1$$,
                 '42501', null, 'operativo no puede actualizar movimientos');

-- Permisos de alertas: authenticated solo SELECT, anon nada
reset role;
select ok(has_table_privilege('authenticated', 'public.alertas', 'SELECT')
          and not has_table_privilege('authenticated', 'public.alertas', 'INSERT,UPDATE,DELETE,TRUNCATE')
          and not has_table_privilege('anon', 'public.alertas', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'),
          'alertas: authenticated solo SELECT, anon sin acceso');

-- Admin marca alertas
select pg_temp.como(:'adm');
select lives_ok($$select public.marcar_alertas_leidas()$$, 'admin marca alertas leidas');
select is((select count(*)::int from public.alertas where not leida), 0, 'no quedan alertas sin leer');

reset role;
select pg_temp.crear_usuario('ina', 'operativo') as ina \gset
update public.perfiles set activo = false where id = :'ina';
select pg_temp.como(:'ina');
select throws_ok(format('select public.registrar_movimiento(%L, %L, 1)', :'det', 'entrada'),
                 'P0001', 'NO_AUTORIZADO', 'usuario inactivo no registra movimientos');
reset role;
select ok(not has_function_privilege('anon', 'public.registrar_movimiento(uuid,public.tipo_movimiento,numeric,public.motivo_salida)', 'EXECUTE'),
          'anon sin EXECUTE en registrar_movimiento');
select ok(not has_function_privilege('anon', 'public.registrar_movimiento(uuid,public.tipo_movimiento,numeric,public.motivo_salida)', 'EXECUTE')
          and has_function_privilege('authenticated', 'public.registrar_movimiento(uuid,public.tipo_movimiento,numeric,public.motivo_salida)', 'EXECUTE'),
          'registrar_movimiento recreada conserva permisos');
select ok(not has_function_privilege('anon', 'public.marcar_alertas_leidas()', 'EXECUTE'),
          'anon sin EXECUTE en marcar_alertas_leidas');

select * from finish();
rollback;
