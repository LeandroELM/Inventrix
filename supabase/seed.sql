-- Datos de desarrollo (solo local; se aplica con `supabase db reset`).
-- Usuarios: ana.lopez / Admin123!  (admin) y carlos.m / Operativo123! (operativo).

do $$
declare
  v_admin uuid := '00000000-0000-4000-a000-000000000001';
  v_oper  uuid := '00000000-0000-4000-a000-000000000002';
  v_u record;
begin
  for v_u in
    select * from (values
      (v_admin, 'ana.lopez', 'Ana López',   'admin',     'Admin123!'),
      (v_oper,  'carlos.m',  'Carlos Mejía', 'operativo', 'Operativo123!')
    ) as t(id, usuario, nombre, rol, clave)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, reauthentication_token, phone_change, phone_change_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_u.id, 'authenticated', 'authenticated',
      v_u.usuario || '@usuarios.inventrix.app',
      extensions.crypt(v_u.clave, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('usuario', v_u.usuario, 'nombre', v_u.nombre, 'rol', v_u.rol),
      now(), now(), '', '', '', '', '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_u.id, v_u.id::text, 'email',
      jsonb_build_object('sub', v_u.id::text, 'email', v_u.usuario || '@usuarios.inventrix.app',
                         'email_verified', true),
      now(), now(), now()
    );
  end loop;

  -- Productos vía RPC, actuando como el admin.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  perform public.registrar_producto(p.nombre, p.codigo, p.unidad::public.unidad_medida, p.cant, p.punto)
  from (values
    ('Arroz blanco',     'ARR-001', 'libra',    10, 15),
    ('Frijol rojo',      'FRI-001', 'libra',    60, 20),
    ('Aceite 900 ml',    'ACE-001', 'unidad',    4,  8),
    ('Leche entera 1 L', 'LEC-001', 'litro',    24, 10),
    ('Detergente 1 kg',  'DET-001', 'unidad',    3, 10),
    ('Café molido 400 g','CAF-001', 'paquete',  18,  6),
    ('Jabón de baño',    'JAB-001', 'caja',      0,  2),
    ('Azúcar',           'AZU-001', 'libra',    12, 20)
  ) as p(nombre, codigo, unidad, cant, punto);

  perform set_config('request.jwt.claims', '', true);
end $$;
