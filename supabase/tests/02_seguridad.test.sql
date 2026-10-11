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
-- volver a superusuario: reset role;

select plan(7);

select pg_temp.crear_usuario('op1', 'operativo') as op_id \gset
select pg_temp.crear_usuario('inactivo1', 'operativo') as ina_id \gset
update public.perfiles set activo = false where id = :'ina_id';
insert into public.productos(nombre,codigo,unidad,existencias,punto_pedido) values ('P','seg-1','unidad',5,1);

select pg_temp.como(:'op_id'::uuid);
select is((select count(*) from public.productos), 1::bigint, 'operativo activo ve productos');
select throws_ok(
  $$insert into public.productos(nombre,codigo,unidad,existencias,punto_pedido) values ('Q','seg-2','unidad',1,1)$$,
  '42501', null, 'operativo no puede insertar productos');
select throws_ok($$update public.movimientos set cantidad = 1$$, '42501', null, 'operativo no puede actualizar movimientos');
select throws_ok($$delete from public.movimientos$$, '42501', null, 'operativo no puede borrar movimientos');
select throws_ok($$truncate public.movimientos$$, '42501', null, 'operativo no puede truncar movimientos');

reset role;
select pg_temp.como(:'ina_id'::uuid);
select is((select count(*) from public.productos), 0::bigint, 'usuario inactivo ve 0 productos');

reset role;
select set_config('role', 'anon', true);
select throws_ok($$select count(*) from public.productos$$, '42501', null, 'anon no lee productos');

reset role;
select * from finish();
rollback;
