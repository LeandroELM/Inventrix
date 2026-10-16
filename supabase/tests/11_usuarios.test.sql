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

select plan(11);

select pg_temp.crear_usuario('adm', 'admin') as adm \gset
select pg_temp.crear_usuario('adm2', 'admin') as adm2 \gset
select pg_temp.crear_usuario('ope', 'operativo') as ope \gset
insert into public.productos (nombre, codigo, unidad, existencias, punto_pedido)
values ('Arroz', 'U-ARROZ', 'libra', 10, 2);
insert into public.dispositivos (token, usuario_id) values ('ExponentPushToken[ope]', :'ope');

-- 1-2. El operativo no administra usuarios
select pg_temp.como(:'ope');
select throws_ok(format('select public.cambiar_rol_usuario(%L, %L)', :'adm2', 'operativo'),
                 'P0001', 'NO_AUTORIZADO', 'operativo no cambia roles');
select throws_ok(format('select public.cambiar_estado_usuario(%L, false)', :'adm2'),
                 'P0001', 'NO_AUTORIZADO', 'operativo no cambia estados');
reset role;

-- 3-5. Ni sobre sí mismo ni sobre un id inexistente
select pg_temp.como(:'adm');
select throws_ok(format('select public.cambiar_rol_usuario(%L, %L)', :'adm', 'operativo'),
                 'P0001', 'ACCION_SOBRE_SI_MISMO', 'el admin no cambia su propio rol');
select throws_ok(format('select public.cambiar_estado_usuario(%L, false)', :'adm'),
                 'P0001', 'ACCION_SOBRE_SI_MISMO', 'el admin no se desactiva');
select throws_ok(format('select public.cambiar_rol_usuario(%L, %L)', gen_random_uuid(), 'admin'),
                 'P0001', 'USUARIO_NO_ENCONTRADO', 'id inexistente');

-- 6. Cambiar rol
select public.cambiar_rol_usuario(:'ope', 'admin');
reset role;
select is((select rol::text from public.perfiles where id = :'ope'), 'admin', 'cambia el rol');

-- 7-8. Desactivar quita el acceso y los dispositivos
select pg_temp.como(:'adm');
select public.cambiar_estado_usuario(:'ope', false);
reset role;
select is((select activo from public.perfiles where id = :'ope'), false, 'queda inactivo');
select is((select count(*)::int from public.dispositivos where usuario_id = :'ope'), 0,
          'se borran sus dispositivos');

-- 9. Un usuario inactivo no lee productos
select pg_temp.como(:'ope');
select is((select count(*)::int from public.productos), 0, 'inactivo no lee productos');
reset role;

-- 10. Reactivar
select pg_temp.como(:'adm');
select public.cambiar_estado_usuario(:'ope', true);
reset role;
select is((select activo from public.perfiles where id = :'ope'), true, 'vuelve a quedar activo');

-- 11. anon no ejecuta
select is(has_function_privilege('anon', 'public.cambiar_estado_usuario(uuid, boolean)', 'execute'),
          false, 'anon no ejecuta cambiar_estado_usuario');

select * from finish();
rollback;
