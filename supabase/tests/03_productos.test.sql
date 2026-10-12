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

select plan(30);

select pg_temp.crear_usuario('adm', 'admin') as adm \gset
select pg_temp.crear_usuario('ope', 'operativo') as ope \gset

select pg_temp.como(:'adm');

select is((select existencias from public.registrar_producto('Arroz', ' 750 ', 'libra', 45, 15)),
          45.00::numeric, 'registrar_producto guarda existencias iniciales');
select is((select count(*)::int from public.movimientos m join public.productos p on p.id = m.producto_id
           where p.codigo = '750' and m.tipo = 'inicial' and m.cantidad = 45
             and m.existencias_antes = 0 and m.existencias_despues = 45 and m.usuario_id = :'adm'),
          1, 'registra un movimiento inicial de 45');
select throws_ok($$select public.registrar_producto('Arroz 2', '750', 'libra', 1, 1)$$,
                 'P0001', 'CODIGO_DUPLICADO', 'codigo duplicado');
select throws_ok($$select public.registrar_producto('  ', 'X1', 'libra', 1, 1)$$,
                 'P0001', 'DATOS_INVALIDOS', 'nombre vacio');
select throws_ok($$select public.registrar_producto('Sal', 'X2', 'libra', -1, 1)$$,
                 'P0001', 'DATOS_INVALIDOS', 'cantidad negativa');

select lives_ok($$select public.actualizar_producto((select id from public.productos where codigo = '750'), 'Arroz', 'libra', 20)$$, 'actualizar ok');
select is((select existencias from public.productos where codigo = '750'), 45.00::numeric,
          'actualizar_producto no toca existencias');
select is((select punto_pedido from public.productos where codigo = '750'), 20.00::numeric,
          'actualizar_producto cambia punto_pedido');

select (public.registrar_producto('Aceite', 'F1', 'litro', 2.5, 1)).id as f1 \gset
select throws_ok($$select public.actualizar_producto((select id from public.productos where codigo = 'F1'), 'Aceite', 'unidad', 1)$$,
                 'P0001', 'DATOS_INVALIDOS', 'no pasa a unidad entera con existencias fraccionarias');
select lives_ok($$select public.actualizar_producto((select id from public.productos where codigo = 'F1'), 'Aceite', 'kilogramo', 1)$$,
                'cambio entre unidades decimales permitido');
select (public.registrar_producto('Cajas', 'F2', 'libra', 3, 1)).id as f2 \gset
select lives_ok($$select public.actualizar_producto((select id from public.productos where codigo = 'F2'), 'Cajas', 'caja', 1)$$,
                'a unidad entera con existencias enteras permitido');

select throws_ok($$select public.dar_baja_producto((select id from public.productos where codigo = '750'), null)$$,
                 'P0001', 'MOTIVO_REQUERIDO', 'motivo nulo');
select throws_ok($$select public.dar_baja_producto((select id from public.productos where codigo = '750'), 'otro', '  ')$$,
                 'P0001', 'DETALLE_REQUERIDO', 'otro sin detalle');
select throws_ok($$select public.dar_baja_producto((select id from public.productos where codigo = '750'), 'otro', repeat('x', 201))$$,
                 'P0001', 'DATOS_INVALIDOS', 'detalle demasiado largo');

-- baja con existencias: registra movimiento baja y deja en cero
select (public.registrar_producto('Dos', 'D1', 'libra', 2.5, 1)).id as d1 \gset
select lives_ok($$select public.dar_baja_producto((select id from public.productos where codigo = 'D1'), 'descontinuado')$$, 'baja con existencias');
select is((select existencias from public.productos where codigo = 'D1'), 0.00::numeric, 'existencias en cero');
select is((select count(*)::int from public.movimientos m join public.productos p on p.id = m.producto_id
           where p.codigo = 'D1' and m.tipo = 'baja' and m.cantidad = 2.50 and m.motivo is null
             and m.existencias_antes = 2.50 and m.existencias_despues = 0), 1, 'movimiento baja por lo restante');
select is((select count(*)::int from public.alertas a join public.productos p on p.id = a.producto_id where p.codigo = 'D1'),
          0, 'la baja no genera alerta');
select public.registrar_producto('Otro', 'O1', 'unidad', 0, 0);
select public.dar_baja_producto((select id from public.productos where codigo = 'O1'), 'otro', '  Se vendió el local  ');
select is((select (motivo_baja, detalle_baja)::text from public.productos where codigo = 'O1'),
          '(otro,"Se vendió el local")', 'otro guarda el detalle recortado');

select lives_ok($$select public.registrar_producto('Vacio', 'V1', 'unidad', 5, 0)$$, 'registrar V1');
-- simula que V1 se agoto (la RPC de salida llega en otra tarea)
reset role;
update public.productos set existencias = 0 where codigo = 'V1';
select pg_temp.como(:'adm');
select lives_ok($$select public.dar_baja_producto((select id from public.productos where codigo = 'V1'), 'descontinuado')$$, 'baja ok');
select is((select activo from public.productos where codigo = 'V1'), false, 'baja marca inactivo');
select is((select count(*)::int from public.movimientos m join public.productos p on p.id = m.producto_id
           where p.codigo = 'V1' and m.tipo = 'baja'), 0, 'baja sin existencias no registra movimiento baja');
select throws_ok($$select public.dar_baja_producto((select id from public.productos where codigo = 'V1'), 'descontinuado')$$,
                 'P0001', 'PRODUCTO_INACTIVO', 'repetir la baja');

select is((select count(*)::int from public.movimientos m join public.productos p on p.id = m.producto_id
           where p.codigo = 'V1'), 1, 'movimientos conservados tras la baja');
select throws_ok($$select public.registrar_producto('N', 'N1', 'unidad', 'NaN', 1)$$,
                 'P0001', 'DATOS_INVALIDOS', 'cantidad NaN');
select throws_ok($$select public.actualizar_producto((select id from public.productos where codigo = '750'), 'Arroz', 'libra', 'NaN')$$,
                 'P0001', 'DATOS_INVALIDOS', 'punto_pedido NaN');

select pg_temp.como(:'ope');
select throws_ok($$select public.dar_baja_producto((select id from public.productos where codigo = 'V1'), 'descontinuado')$$,
                 'P0001', 'NO_AUTORIZADO', 'operativo no da de baja');
select throws_ok($$select public.registrar_producto('Z', 'Z1', 'unidad', 1, 1)$$,
                 'P0001', 'NO_AUTORIZADO', 'operativo no registra');
reset role;
select ok(not has_function_privilege('anon', 'public.registrar_producto(text,text,public.unidad_medida,numeric,numeric)', 'EXECUTE')
          and not has_function_privilege('anon', 'public.actualizar_producto(uuid,text,public.unidad_medida,numeric)', 'EXECUTE')
          and not has_function_privilege('anon', 'public.dar_baja_producto(uuid,public.motivo_baja,text)', 'EXECUTE'),
          'anon sin EXECUTE en RPC de productos');
select * from finish();
rollback;
