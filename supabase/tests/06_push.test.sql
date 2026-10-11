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


select plan(3);

select pg_temp.crear_usuario('adm', 'admin') as adm \gset
select pg_temp.crear_usuario('ope', 'operativo') as ope \gset

-- Registrar el mismo token dos veces deja una sola fila
select pg_temp.como(:'adm');
select public.registrar_dispositivo('ExponentPushToken[abc]');
select public.registrar_dispositivo('ExponentPushToken[abc]');
reset role;
select is((select count(*)::int from public.dispositivos where token = 'ExponentPushToken[abc]'),
          1, 'registrar dos veces el mismo token deja 1 fila');

-- Otro usuario no puede eliminar el token ajeno
select pg_temp.como(:'ope');
select public.eliminar_dispositivo('ExponentPushToken[abc]');
reset role;
select is((select count(*)::int from public.dispositivos
           where token = 'ExponentPushToken[abc]' and usuario_id = :'adm'),
          1, 'un usuario no elimina el token de otro');

-- Sin acceso directo a la tabla
select pg_temp.como(:'adm');
select throws_ok('select * from public.dispositivos', '42501', null,
                 'select directo sobre dispositivos denegado');
reset role;

select * from finish();
rollback;
