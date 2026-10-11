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


select plan(5);

select pg_temp.crear_usuario('adm', 'admin') as adm \gset

select ok(exists (select 1 from pg_trigger
                  where tgrelid = 'public.alertas'::regclass and tgname = 'alertas_notificar' and not tgisinternal),
          'existe el trigger de notificación en alertas');

select ok(not exists (select 1 from vault.decrypted_secrets
                      where name in ('notificar_alerta_url', 'webhook_secret')),
          'precondición: no hay secretos de vault');

-- Salida que cruza el punto de pedido: no falla sin secretos
select pg_temp.como(:'adm');
select (public.registrar_producto('Prod webhook', 'WH-1', 'unidad', 5, 3)).id as prod \gset
select lives_ok(format('select public.registrar_movimiento(%L, %L, 4, %L)', :'prod', 'salida', 'venta'),
                'salida que cruza el punto funciona sin secretos de vault');
reset role;
select is((select count(*)::int from public.alertas where producto_id = :'prod'), 1,
          'la alerta se creó');

select ok(not has_function_privilege('anon', 'public.notificar_alerta_nueva()', 'execute')
          and not has_function_privilege('authenticated', 'public.notificar_alerta_nueva()', 'execute'),
          'anon y authenticated no ejecutan la función del trigger');

select * from finish();
rollback;
