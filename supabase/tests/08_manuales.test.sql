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

select plan(7);

select pg_temp.crear_usuario('adm', 'admin') as adm \gset

-- Aislar de datos ingestados localmente (se revierte con el rollback)
delete from public.manual_fragmentos;
-- Fragmentos de prueba: dos perfiles, vectores ortogonales conocidos
insert into public.manual_fragmentos (perfil, seccion, contenido, embedding) values
  ('admin', 'A1', 'cercano admin', (select array_agg(case when i = 1 then 1 else 0 end)::extensions.vector(384) from generate_series(1, 384) i)),
  ('admin', 'A2', 'lejano admin',  (select array_agg(case when i = 2 then 1 else 0 end)::extensions.vector(384) from generate_series(1, 384) i)),
  ('operativo', 'O1', 'cercano operativo', (select array_agg(case when i = 1 then 1 else 0 end)::extensions.vector(384) from generate_series(1, 384) i));

select is((select seccion from public.buscar_manual(
             (select array_agg(case when i = 1 then 1 else 0 end)::extensions.vector(384) from generate_series(1, 384) i),
             'admin', 1)),
          'A1', 'buscar_manual devuelve el fragmento más cercano');
select is((select count(*)::int from public.buscar_manual(
             (select array_agg(case when i = 1 then 1 else 0 end)::extensions.vector(384) from generate_series(1, 384) i),
             'operativo', 5)),
          1, 'buscar_manual filtra por perfil');
select ok((select similitud from public.buscar_manual(
             (select array_agg(case when i = 1 then 1 else 0 end)::extensions.vector(384) from generate_series(1, 384) i),
             'admin', 1)) > 0.99, 'similitud coseno ~1 para el mismo vector');

select pg_temp.como(:'adm');
select throws_ok(
  $$select * from public.buscar_manual((select array_agg(0)::extensions.vector(384) from generate_series(1, 384)), 'admin')$$,
  '42501', null, 'authenticated no puede ejecutar buscar_manual');
select throws_ok('select * from public.manual_fragmentos', '42501', null,
                 'select directo sobre manual_fragmentos denegado');
reset role;

set local role anon;
select throws_ok(
  $$select * from public.buscar_manual((select array_agg(0)::extensions.vector(384) from generate_series(1, 384)), 'admin')$$,
  '42501', null, 'anon no puede ejecutar buscar_manual');
reset role;

select ok((select relrowsecurity from pg_class where oid = 'public.manual_fragmentos'::regclass),
          'RLS habilitado en manual_fragmentos');

select * from finish();
rollback;
