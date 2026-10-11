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

select plan(6);

select has_table('public'::name, 'productos'::name);
select has_table('public'::name, 'movimientos'::name);
select has_table('public'::name, 'perfiles'::name);

select pg_temp.crear_usuario('ana', 'admin');
select results_eq(
  $$select rol::text from public.perfiles where usuario = 'ana'$$,
  $$values ('admin')$$
);

select throws_ok(
  $$insert into public.productos(nombre,codigo,unidad,existencias,punto_pedido) values ('X','1','unidad',-1,0)$$,
  '23514'
);

insert into public.productos(nombre,codigo,unidad,existencias,punto_pedido) values ('A','dup','unidad',0,0);
select throws_ok(
  $$insert into public.productos(nombre,codigo,unidad,existencias,punto_pedido) values ('B','dup','unidad',0,0)$$,
  '23505'
);

select * from finish();
rollback;
