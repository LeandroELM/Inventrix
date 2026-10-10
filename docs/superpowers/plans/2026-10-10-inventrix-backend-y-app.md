# Inventrix — Plan de implementación (código, BD y servicios)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar Inventrix funcionando de punta a punta en Android (BD, seguridad, lógica, pantallas funcionales sin estilo, push, reportes, chatbot) para luego aplicar el diseño del prototipo.

**Architecture:** App Expo Router (TypeScript) que lee con `select` (RLS) y escribe **solo** mediante funciones SQL `security definer` en Supabase. Edge Functions para lo que necesita secretos (crear usuarios, push, chatbot). La lógica pura (cálculos, validaciones, permisos, formatos) vive en `src/features/*` con tests Jest; las reglas de negocio críticas se prueban en la BD con pgTAP.

**Tech Stack:** Expo (SDK más reciente al ejecutar `create-expo-app@latest`), Expo Router, TypeScript estricto, `@supabase/supabase-js`, TanStack Query, react-hook-form + zod, expo-camera, expo-notifications, expo-secure-store, expo-file-system, expo-sharing, SheetJS (`xlsx`), Supabase CLI (Postgres 15+, pgTAP, pgvector), Deno (Edge Functions), `@anthropic-ai/sdk`, EAS Build, GitHub Actions, Jest (`jest-expo`) + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-10-10-inventrix-design.md` (+ `MANUAL DE FUNCIONES.docx`)

## Global Constraints

- Solo Android. No agregar dependencias web (`react-native-web`) ni Vercel.
- TypeScript `strict: true`; prohibido `any` explícito (regla ESLint `@typescript-eslint/no-explicit-any: error`).
- El rol `authenticated` **no** tiene `INSERT/UPDATE/DELETE` sobre tablas de `public`; toda escritura es RPC.
- Roles: `admin` (Tipo A) y `operativo` (Tipo B). Nombres de enum exactos: `rol_usuario('admin','operativo')`, `unidad_medida('unidad','libra','kilogramo','litro','caja','paquete')`, `tipo_movimiento('inicial','entrada','salida')`, `motivo_salida('venta','consumo_interno','retiro_autorizado')`.
- Email sintético de Auth: `${usuario}@usuarios.inventrix.app` (constante `DOMINIO_USUARIOS = "usuarios.inventrix.app"`).
- Códigos de error lanzados por RPC (mensaje exacto de la excepción): `NO_AUTORIZADO`, `CANTIDAD_INVALIDA`, `EXISTENCIAS_INSUFICIENTES`, `PRODUCTO_INACTIVO`, `PRODUCTO_NO_ENCONTRADO`, `CODIGO_DUPLICADO`, `TIENE_EXISTENCIAS`, `MOTIVO_REQUERIDO`, `DATOS_INVALIDOS`.
- Textos de UI en español. UI de esta fase: componentes de React Native básicos, sin paleta ni estilos del prototipo (se hace en la fase de diseño).
- Secretos nunca en el repo: `.env*` en `.gitignore`; solo variables `EXPO_PUBLIC_*` llegan al cliente.
- Modelo del chatbot por variable `ANTHROPIC_MODEL` (por defecto `claude-opus-5-5`; ver Task 24).

## Review Focus

1. **Dos salidas simultáneas del mismo producto** (dos teléfonos): ninguna puede dejar existencias negativas → `registrar_movimiento` bloquea la fila con `FOR UPDATE` (test en Task 6).
2. **Operativo llamando RPC de admin desde un cliente modificado** (p. ej. `dar_baja_producto`): debe fallar con `NO_AUTORIZADO`, no confiar en ocultar botones (tests en Tasks 5–7).
3. **Cantidades decimales en unidades enteras** (`2.5` cajas): la app debe rechazarlas; en libras/kilos/litros sí se permiten 2 decimales (Task 12 `validarCantidad`).
4. **Salida que deja existencias exactamente en el punto de pedido** debe generar alerta; una segunda salida ya por debajo **no** genera otra (test en Task 6).
5. **Sesión expirada o usuario desactivado** (`perfiles.activo=false`) mientras la app está abierta: las RPC deben rechazar con `NO_AUTORIZADO` y la app volver al login (Task 5 `usuario_activo()`, Task 10 manejo de error).

---

## Estructura de archivos

```
app/                                   # Rutas Expo Router
  _layout.tsx                          # Providers (Query, Auth) + redirección por sesión
  login.tsx
  escaner.tsx                          # modal: devuelve código leído
  notificaciones.tsx
  soporte.tsx                          # chatbot
  (app)/_layout.tsx                    # Tabs filtradas por rol
  (app)/index.tsx                      # Inicio
  (app)/nuevo.tsx                      # solo admin (tab "+")
  (app)/administracion/_layout.tsx     # Stack
  (app)/administracion/index.tsx
  (app)/administracion/existencias.tsx
  (app)/administracion/producto/[id].tsx
  (app)/administracion/producto/[id]/editar.tsx
  (app)/administracion/pedir.tsx
  (app)/administracion/reportes.tsx
  (app)/administracion/baja.tsx
  (app)/movimientos/_layout.tsx
  (app)/movimientos/index.tsx
  (app)/movimientos/entrada.tsx
  (app)/movimientos/salida.tsx
  (app)/movimientos/historial.tsx
  (app)/configuracion.tsx
src/
  lib/supabase.ts                      # cliente + almacenamiento seguro de sesión
  lib/database.types.ts                # generado (supabase gen types)
  lib/errores.ts                       # código RPC -> mensaje en español
  lib/queryClient.ts
  features/auth/{AuthProvider.tsx, permisos.ts, usuario.ts, RequiereRol.tsx}
  features/productos/{api.ts, hooks.ts, estado.ts, unidades.ts, validacion.ts}
  features/movimientos/{api.ts, hooks.ts, calculo.ts}
  features/inicio/{api.ts, hooks.ts}
  features/alertas/{api.ts, hooks.ts, push.ts}
  features/reportes/{api.ts, excel.ts}
  features/soporte/{api.ts, whatsapp.ts}
  components/{Campo.tsx, Boton.tsx, Pantalla.tsx, Cantidad.tsx, ListaVacia.tsx}
supabase/
  config.toml
  migrations/2026101000000{1..8}_*.sql
  tests/*.test.sql                     # pgTAP
  functions/_shared/{cors.ts, auth.ts}
  functions/admin-usuarios/{index.ts, logica.ts, logica.test.ts}
  functions/notificar-alerta/{index.ts, logica.ts, logica.test.ts}
  functions/soporte-chat/{index.ts, logica.ts, logica.test.ts}
  seed.sql
scripts/{crear-admin.ts, ingestar-manuales.ts, chunks.ts}
docs/manuales/{manual-administrador.md, manual-operativo.md}
__tests__/                             # espejo de src/ para Jest
.github/workflows/ci.yml
```

---

# Sprint 0 — Fundación y servicios

### Task 1: Proyecto Expo, calidad de código y CI

**Files:**
- Create: proyecto Expo en la raíz (`package.json`, `app.json`, `tsconfig.json`, `app/`), `eslint.config.js`, `jest.config.js`, `.prettierrc`, `.env.example`, `.github/workflows/ci.yml`, `__tests__/smoke.test.ts`
- Modify: `.gitignore`, `README.md`

**Interfaces:**
- Produces: scripts npm `lint`, `typecheck`, `test`, `test:db`; alias de import `@/*` → `src/*`.

- [ ] **Step 1:** `npx create-expo-app@latest . --template default` (TypeScript + Expo Router). Eliminar ejemplos del template (`app/(tabs)`, `components/` de ejemplo).
- [ ] **Step 2:** En `app.json`: `name: "Inventrix"`, `slug: "inventrix"`, `scheme: "inventrix"`, `android.package: "app.inventrix"`, `platforms: ["android"]`, `userInterfaceStyle: "automatic"`.
- [ ] **Step 3:** `tsconfig.json`: `strict: true`, `paths: {"@/*": ["src/*"]}`. Instalar `jest-expo`, `@testing-library/react-native`, `@types/jest`; `jest.config.js` con `preset: "jest-expo"`.
- [ ] **Step 4: Test de humo**

```ts
// __tests__/smoke.test.ts
test("entorno de pruebas", () => { expect(1 + 1).toBe(2); });
```

Run: `npm test` → Expected: 1 passed.
- [ ] **Step 5:** `package.json` scripts: `"lint": "expo lint"`, `"typecheck": "tsc --noEmit"`, `"test": "jest"`, `"test:db": "supabase test db"`. Añadir regla `@typescript-eslint/no-explicit-any: "error"`.
- [ ] **Step 6:** `.env.example` con `EXPO_PUBLIC_SUPABASE_URL=`, `EXPO_PUBLIC_SUPABASE_ANON_KEY=`, `EXPO_PUBLIC_SOPORTE_WHATSAPP=` (número en formato internacional sin `+`). `.gitignore` incluye `.env`, `.env.local`, `google-services.json`.
- [ ] **Step 7:** `ci.yml` (push/PR a `main`): job `app` → `npm ci && npm run lint && npm run typecheck && npm test`; job `db` → `supabase/setup-cli@v1`, `supabase db start`, `supabase test db`.
- [ ] **Step 8:** Run `npm run lint && npm run typecheck && npm test` → todo pasa. Commit `chore: scaffold Expo + tooling + CI`.

### Task 2: Servicios externos (requiere acciones del usuario)

**Files:**
- Create: `supabase/config.toml` (vía `supabase init`), `eas.json`, `.env` (local, no versionado)
- Modify: `app.json` (`extra.eas.projectId`, `android.googleServicesFile`)

**Interfaces:**
- Produces: proyecto Supabase `inventrix-dev` (URL + anon key en `.env`), proyecto EAS con `projectId`, proyecto Firebase con `google-services.json`, clave de API de Anthropic guardada como secreto de Supabase.

- [ ] **Step 1 [Usuario]:** Instalar CLIs: `npm i -g eas-cli supabase` (o `npx supabase`). Iniciar sesión: `! supabase login`, `! eas login`.
- [ ] **Step 2:** `supabase init`. En `config.toml`: `[auth] enable_signup = false`; `[auth.email] enable_confirmations = false`; `site_url = "inventrix://"`.
- [ ] **Step 3:** Crear proyecto Supabase `inventrix-dev` (región más cercana a los usuarios) desde el dashboard o el MCP de Supabase; `supabase link --project-ref <ref>`. Copiar URL y anon key a `.env`.
- [ ] **Step 4:** `eas init` (guarda `projectId` en `app.json`). `eas.json` con perfiles `development` (`developmentClient: true`, `distribution: "internal"`, `android.buildType: "apk"`), `preview` (`distribution: "internal"`, `android.buildType: "apk"`), `production`.
- [ ] **Step 5 [Usuario]:** Crear proyecto Firebase, app Android con paquete `app.inventrix`, descargar `google-services.json` a la raíz; crear clave de cuenta de servicio FCM v1 y subirla con `eas credentials` (Android → Push Notifications). `app.json`: `android.googleServicesFile: "./google-services.json"`.
- [ ] **Step 6 [Usuario, más adelante]:** Crear API key en console.anthropic.com y ponerla en `supabase/functions/.env` (local) y `supabase secrets set ANTHROPIC_API_KEY=...` (remoto). Hasta entonces el chatbot responde "no configurado" y ofrece WhatsApp (Task 24).
- [ ] **Step 7:** Verificar: `supabase status` (local) y `supabase projects list` muestran el proyecto; `eas project:info` muestra el `projectId`. Commit `chore: link Supabase, EAS y Firebase` (sin secretos).

> **Ruling de ejecución (2026-10-10):** el usuario hará los inicios de sesión y la clave de Anthropic después. En esta ejecución Task 2 hace solo la parte local: Supabase CLI como devDependency (`npx supabase`), `supabase init` + `config.toml`, `eas.json`, `supabase/functions/.env.example` (`ANTHROPIC_API_KEY=`, `ANTHROPIC_MODEL=claude-opus-5-5`, `WEBHOOK_SECRET=`, `SUPABASE_SERVICE_ROLE_KEY=`), `.env` local apuntando a `supabase start`, y `docs/SETUP-SERVICIOS.md` con los pasos [Usuario] pendientes en orden (login Supabase/EAS, crear proyecto remoto + `link` + `db push` + `functions deploy` + secretos, `eas init`, Firebase + FCM, API key, crear primer admin, ingesta de manuales remota, builds). Todos los pasos de las demás tareas que requieran cuenta remota, teléfono o build EAS se omiten aquí y quedan listados en ese documento y en `docs/qa/checklist-funcional.md`.

---

# Sprint 1 — Base de datos y seguridad

**Encabezado común de los tests pgTAP** (cada `supabase/tests/*.test.sql` empieza así y termina con `select * from finish(); rollback;`):

```sql
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
```

### Task 3: Esquema base (enums, tablas, perfiles)

**Files:**
- Create: `supabase/migrations/20261010000001_esquema.sql`, `supabase/tests/01_esquema.test.sql`

**Interfaces:**
- Produces: tablas
  - `perfiles(id uuid pk → auth.users on delete cascade, usuario text unique not null, nombre text not null, rol rol_usuario not null, activo boolean not null default true, created_at timestamptz default now())`
  - `productos(id uuid pk default gen_random_uuid(), nombre text not null check (length(trim(nombre)) between 1 and 120), codigo text not null unique, unidad unidad_medida not null, existencias numeric(12,2) not null default 0 check (existencias >= 0), punto_pedido numeric(12,2) not null check (punto_pedido >= 0), activo boolean not null default true, motivo_baja text, dado_baja_por uuid → perfiles, dado_baja_at timestamptz, created_at, updated_at)`
  - `movimientos(id bigint generated always as identity pk, producto_id uuid not null → productos, tipo tipo_movimiento not null, cantidad numeric(12,2) not null check (cantidad > 0), motivo motivo_salida, existencias_antes numeric(12,2) not null, existencias_despues numeric(12,2) not null, usuario_id uuid not null → perfiles, created_at timestamptz not null default now())`
  - Índices: `productos(activo, nombre)`, `movimientos(producto_id, created_at desc)`, `movimientos(created_at desc)`.
  - Trigger `crear_perfil_desde_auth` (after insert on `auth.users`) que inserta en `perfiles` desde `raw_user_meta_data` (`usuario`, `nombre`, `rol`).

- [ ] **Step 1: Tests que fallan** — `01_esquema.test.sql` (`plan(6)`):
  - `has_table('public','productos')`, `has_table('public','movimientos')`, `has_table('public','perfiles')`
  - Tras `pg_temp.crear_usuario('ana','admin')`: `results_eq('select rol::text from perfiles where usuario = ''ana''', $$values ('admin')$$)`
  - `throws_ok($$insert into productos(nombre,codigo,unidad,existencias,punto_pedido) values ('X','1','unidad',-1,0)$$, '23514')` (check)
  - `throws_ok` insert de dos productos con mismo `codigo` → `'23505'`.
- [ ] **Step 2:** `supabase db reset && supabase test db` → FAIL (tablas no existen).
- [ ] **Step 3:** Escribir la migración con los enums de Global Constraints, tablas, índices y trigger (`security definer`, `set search_path = ''`).
- [ ] **Step 4:** `supabase db reset && supabase test db` → PASS.
- [ ] **Step 5:** Commit `feat(db): esquema base`.

### Task 4: RLS, grants y funciones auxiliares de rol

**Files:**
- Create: `supabase/migrations/20261010000002_seguridad.sql`, `supabase/tests/02_seguridad.test.sql`

**Interfaces:**
- Produces: `public.usuario_activo() returns boolean` (perfil de `auth.uid()` existe y `activo`), `public.es_admin() returns boolean` (activo y `rol='admin'`), ambas `stable security definer set search_path=''`.
- Políticas: `perfiles` select propio o si `es_admin()`; `productos` select si `usuario_activo()`; `movimientos` select si `usuario_activo()`.
- `revoke insert, update, delete on all tables in schema public from anon, authenticated;` `revoke all on all tables in schema public from anon;`

- [ ] **Step 1: Tests** (`plan(6)`): como operativo activo `select count(*) from productos` funciona; como operativo `insert into productos ...` → `throws_ok(..., '42501')`; `update movimientos set cantidad = 1` → `'42501'`; `delete from movimientos` → `'42501'`; como usuario con `activo=false` `select count(*) from productos` = 0; `anon` no lee `productos` (`set_config('role','anon',true)` → `'42501'`).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementar. **Step 4:** Run → PASS. **Step 5:** Commit `feat(db): RLS y permisos`.

### Task 5: RPC de productos

**Files:**
- Create: `supabase/migrations/20261010000003_rpc_productos.sql`, `supabase/tests/03_productos.test.sql`

**Interfaces (todas `security definer`, `set search_path=''`, `grant execute ... to authenticated`):**
- `registrar_producto(p_nombre text, p_codigo text, p_unidad unidad_medida, p_cantidad_inicial numeric, p_punto_pedido numeric) returns public.productos` — solo admin; inserta producto con `existencias = p_cantidad_inicial` y, si `> 0`, un movimiento `tipo='inicial'` (`antes 0`, `después = cantidad`). Errores: `NO_AUTORIZADO`, `CODIGO_DUPLICADO` (capturar `unique_violation`), `DATOS_INVALIDOS` (nombre vacío, cantidades negativas).
- `actualizar_producto(p_id uuid, p_nombre text, p_unidad unidad_medida, p_punto_pedido numeric) returns public.productos` — solo admin; no toca `existencias` ni `codigo`.
- `dar_baja_producto(p_id uuid, p_motivo text) returns public.productos` — solo admin; `MOTIVO_REQUERIDO` si motivo vacío; `TIENE_EXISTENCIAS` si `existencias > 0`; marca `activo=false`, `motivo_baja`, `dado_baja_por=auth.uid()`, `dado_baja_at=now()`.
- Toda RPC empieza con `if not usuario_activo() then raise exception 'NO_AUTORIZADO'; end if;` (y `es_admin()` donde aplica).

- [ ] **Step 1: Tests** (`plan(8)`):
  - admin `registrar_producto('Arroz','750','libra',45,15)` → `existencias = 45` y existe 1 movimiento `inicial` de 45.
  - mismo código otra vez → `throws_ok(..., 'P0001', 'CODIGO_DUPLICADO')`.
  - operativo `registrar_producto(...)` → `'NO_AUTORIZADO'`.
  - `actualizar_producto` cambia `punto_pedido` y `existencias` sigue 45.
  - `dar_baja_producto(id, '')` → `'MOTIVO_REQUERIDO'`.
  - `dar_baja_producto` con existencias 45 → `'TIENE_EXISTENCIAS'`.
  - producto con 0 existencias → baja OK, `activo=false`, movimientos conservados (`count = 1`).
  - operativo `dar_baja_producto` → `'NO_AUTORIZADO'`.
- [ ] **Step 2–5:** FAIL → implementar → PASS → commit `feat(db): RPC de productos`.

### Task 6: RPC de movimientos y alertas

**Files:**
- Create: `supabase/migrations/20261010000004_rpc_movimientos.sql`, `supabase/tests/04_movimientos.test.sql`

**Interfaces:**
- Tabla `alertas(id bigint identity pk, producto_id uuid not null → productos, existencias numeric(12,2) not null, punto_pedido numeric(12,2) not null, leida boolean not null default false, created_at timestamptz default now())`; RLS select solo `es_admin()`.
- `registrar_movimiento(p_producto_id uuid, p_tipo tipo_movimiento, p_cantidad numeric, p_motivo motivo_salida default null) returns public.movimientos` — admin u operativo activos. Algoritmo:
  1. `p_tipo` debe ser `entrada` o `salida` (`DATOS_INVALIDOS`); `p_cantidad > 0` (`CANTIDAD_INVALIDA`); salida exige `p_motivo` (`MOTIVO_REQUERIDO`).
  2. `select ... from productos where id = p_producto_id for update` → `PRODUCTO_NO_ENCONTRADO` / `PRODUCTO_INACTIVO`.
  3. Salida con `p_cantidad > existencias` → `EXISTENCIAS_INSUFICIENTES`.
  4. Actualizar existencias e insertar movimiento con `existencias_antes/despues` y `usuario_id = auth.uid()`.
  5. Si salida y `antes > punto_pedido` y `despues <= punto_pedido` → insertar `alertas`.
- `marcar_alertas_leidas() returns void` — solo admin.

- [ ] **Step 1: Tests** (`plan(9)`) con producto Detergente (existencias 12, punto 10):
  - entrada 5 → existencias 17, movimiento con antes 12/después 17.
  - salida 3 sin motivo → `'MOTIVO_REQUERIDO'`.
  - salida 0 → `'CANTIDAD_INVALIDA'`; salida -1 → `'CANTIDAD_INVALIDA'`.
  - salida 18 (> 17) → `'EXISTENCIAS_INSUFICIENTES'` y existencias siguen 17.
  - salida 7 (`venta`) → existencias 10 = punto → **1 alerta**.
  - salida 1 más → existencias 9 → **sigue 1 alerta** (no se duplica).
  - operativo puede registrar entrada; operativo no ve `alertas` (`count = 0`).
  - movimiento sobre producto dado de baja → `'PRODUCTO_INACTIVO'`.
  - `pg_temp.como(operativo)` + `update movimientos` sigue prohibido (`42501`).
- [ ] **Step 2–5:** FAIL → implementar → PASS → commit `feat(db): movimientos, alertas y bloqueo de fila`.

### Task 7: Consultas de lectura (inicio, a pedir, reportes)

**Files:**
- Create: `supabase/migrations/20261010000005_consultas.sql`, `supabase/tests/05_consultas.test.sql`

**Interfaces:**
- `resumen_existencias() returns table(unidad unidad_medida, total numeric, productos int)` — activos, agrupado por unidad (nunca suma unidades distintas).
- Vista `productos_a_pedir` (`security_invoker = true`): activos con `existencias <= punto_pedido`, ordenados por `existencias / nullif(punto_pedido,0)` asc. Solo útil para admin (en app se protege por rol; RLS de `productos` ya filtra activos).
- `reporte_movimientos(p_tipo tipo_movimiento default null, p_desde timestamptz default null, p_hasta timestamptz default null, p_producto_id uuid default null) returns table(fecha timestamptz, producto text, codigo text, unidad unidad_medida, tipo tipo_movimiento, cantidad numeric, motivo motivo_salida, usuario text, existencias_antes numeric, existencias_despues numeric)` — solo admin (`NO_AUTORIZADO`).
- Vista `historial_movimientos` (propietario, **sin** `security_invoker`, para poder mostrar el nombre de otros usuarios pese a la RLS de `perfiles`) con `where public.usuario_activo()`: movimientos + nombre/unidad de producto + `perfiles.nombre` como `usuario`, para el historial de ambos roles.

- [ ] **Step 1: Tests** (`plan(5)`): `resumen_existencias()` con 2 productos en libras (10 y 5) y 1 en litros (3) → filas `(libra, 15, 2)` y `(litro, 3, 1)`; `productos_a_pedir` incluye el de 5≤punto y excluye uno inactivo; `reporte_movimientos('salida', ...)` solo devuelve salidas en rango; operativo → `'NO_AUTORIZADO'`; `historial_movimientos` expone `usuario` con el nombre.
- [ ] **Step 2–5:** FAIL → implementar → PASS → commit `feat(db): consultas de inicio, a pedir y reportes`.

### Task 8: Tipos generados, seed y alta de usuarios

**Files:**
- Create: `supabase/seed.sql`, `src/lib/database.types.ts`, `supabase/functions/_shared/{cors.ts,auth.ts}`, `supabase/functions/admin-usuarios/{index.ts,logica.ts,logica.test.ts}`, `scripts/crear-admin.ts`

**Interfaces:**
- `seed.sql` (solo local): admin `ana.lopez` / `Admin123!`, operativo `carlos.m` / `Operativo123!`, 8 productos del prototipo (Arroz blanco lb 10/15, Frijol rojo lb 60/20, Aceite 900 ml unidad 4/8, Leche entera 1 L litro 24/10, Detergente 1 kg unidad 3/10, Café molido 400 g paquete 18/6, Jabón de baño caja 0/2, Azúcar lb 12/20) creados vía `registrar_producto`.
- `_shared/auth.ts`: `obtenerPerfil(req: Request): Promise<{ id: string; rol: "admin" | "operativo"; activo: boolean }>` (valida JWT con cliente anon + `Authorization`; lanza `Response` 401).
- `admin-usuarios/logica.ts`: `validarAltaUsuario(input: unknown): { usuario: string; nombre: string; rol: "admin" | "operativo"; password: string }` — `usuario` `^[a-z0-9._-]{3,30}$`, `password` ≥ 8, lanza `Error("DATOS_INVALIDOS")`; `emailDeUsuario(usuario: string): string`.
- `admin-usuarios/index.ts`: `POST` solo admin → `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { usuario, nombre, rol } })` con service role. Respuesta `201 { id }`; 403 si no admin; 409 si existe.
- `scripts/crear-admin.ts`: `node --env-file=.env scripts/crear-admin.ts <usuario> <nombre> <password>` usando `SUPABASE_SERVICE_ROLE_KEY` (solo en máquina del equipo) para el primer admin de cada cliente.

- [ ] **Step 1: Test Deno** `logica.test.ts`: `validarAltaUsuario({usuario:"Ana Lopez",...})` lanza `DATOS_INVALIDOS`; `validarAltaUsuario({usuario:"ana.lopez",nombre:"Ana",rol:"admin",password:"12345678"})` devuelve el objeto; `emailDeUsuario("ana.lopez") === "ana.lopez@usuarios.inventrix.app"`.
- [ ] **Step 2:** `deno test supabase/functions/admin-usuarios` → FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** `supabase db reset` (aplica seed) y `supabase gen types typescript --local > src/lib/database.types.ts`.
- [ ] **Step 6:** `supabase functions serve` + `curl` con token de `ana.lopez` crea usuario `prueba.uno` (201); con token de `carlos.m` → 403.
- [ ] **Step 7:** `supabase db push` y `supabase functions deploy admin-usuarios` al proyecto remoto; correr `scripts/crear-admin.ts` para el admin real. Commit `feat: seed, tipos y alta de usuarios`.

---

# Sprint 2 — Autenticación y navegación por rol

### Task 9: Cliente Supabase y lógica de usuario/permisos

**Files:**
- Create: `src/lib/supabase.ts`, `src/lib/errores.ts`, `src/lib/queryClient.ts`, `src/features/auth/usuario.ts`, `src/features/auth/permisos.ts`
- Test: `__tests__/auth/usuario.test.ts`, `__tests__/auth/permisos.test.ts`, `__tests__/lib/errores.test.ts`

**Interfaces:**
- `supabase: SupabaseClient<Database>` con `auth.storage` sobre `expo-secure-store` (adaptador `getItem/setItem/removeItem`), `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false`.
- `emailDeUsuario(usuario: string): string` (`trim().toLowerCase()` + dominio).
- `type Rol = "admin" | "operativo"`; `type Accion = "registrar_producto" | "editar_producto" | "dar_baja" | "ver_a_pedir" | "ver_reportes" | "ver_alertas" | "registrar_movimiento" | "ver_existencias" | "exportar_existencias" | "ver_historial"`; `puede(rol: Rol, accion: Accion): boolean` según la tabla del manual (§5).
- `mensajeDeError(e: unknown): string` — mapea los códigos de Global Constraints a español (p. ej. `EXISTENCIAS_INSUFICIENTES` → "La cantidad supera las existencias disponibles."), `Invalid login credentials` → "No fue posible iniciar sesión. Verifica tus datos.", otro → "Ocurrió un error. Intenta de nuevo."

- [ ] **Step 1: Tests**

```ts
expect(emailDeUsuario("  Ana.Lopez ")).toBe("ana.lopez@usuarios.inventrix.app");
expect(puede("operativo", "registrar_producto")).toBe(false);
expect(puede("operativo", "registrar_movimiento")).toBe(true);
expect(puede("operativo", "exportar_existencias")).toBe(true);
expect(puede("operativo", "ver_reportes")).toBe(false);
expect(puede("admin", "dar_baja")).toBe(true);
expect(mensajeDeError({ message: "EXISTENCIAS_INSUFICIENTES" })).toBe("La cantidad supera las existencias disponibles.");
expect(mensajeDeError(new Error("Invalid login credentials"))).toBe("No fue posible iniciar sesión. Verifica tus datos.");
```
- [ ] **Step 2–4:** `npm test` FAIL → implementar → PASS. **Step 5:** Commit `feat(auth): cliente supabase, permisos y errores`.

### Task 10: AuthProvider, login y redirección

**Files:**
- Create: `src/features/auth/AuthProvider.tsx`, `src/features/auth/RequiereRol.tsx`, `app/_layout.tsx`, `app/login.tsx`, `src/components/{Pantalla.tsx,Campo.tsx,Boton.tsx}`
- Test: `__tests__/auth/login.test.tsx`

**Interfaces:**
- `useAuth(): { estado: "cargando" | "anonimo" | "autenticado"; perfil: { id: string; usuario: string; nombre: string; rol: Rol } | null; iniciarSesion(usuario: string, password: string): Promise<void>; cerrarSesion(): Promise<void> }`. Tras `signInWithPassword` carga `perfiles`; si `activo=false` → `signOut` y error "No fue posible iniciar sesión…".
- `<RequiereRol rol="admin">` → si no cumple, `<Redirect href="/" />`.
- `app/_layout.tsx`: `QueryClientProvider` + `AuthProvider`; `anonimo` → `/login`; `autenticado` en `/login` → `/`. Un error `NO_AUTORIZADO` en cualquier query/mutación global (`queryClient` `onError`) llama `cerrarSesion()`.
- Login: campos "Usuario" y "Contraseña" (botón mostrar/ocultar), botón "Iniciar sesión", mensaje de error.

- [ ] **Step 1: Test** con `@testing-library/react-native` y `useAuth` mockeado: enviar credenciales llama `iniciarSesion("ana.lopez","x")`; si rechaza, se muestra "No fue posible iniciar sesión. Verifica tus datos."; el botón de ojo cambia `secureTextEntry`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Manual en dev build: login con `ana.lopez` y `carlos.m` (seed), cerrar app y reabrir conserva sesión. Commit `feat(auth): login y sesión persistente`.

### Task 11: Tabs por rol y esqueleto de rutas

**Files:**
- Create: `app/(app)/_layout.tsx`, todas las rutas de `app/(app)/**` listadas en la estructura como pantallas placeholder con su título, `app/configuracion` lógica de cerrar sesión.
- Test: `__tests__/navegacion/tabs.test.ts`

**Interfaces:**
- `tabsPara(rol: Rol): Array<"index" | "administracion" | "nuevo" | "movimientos" | "configuracion">` — admin: las 5 en ese orden; operativo: sin `"nuevo"`.
- En `_layout.tsx` cada `Tabs.Screen` no incluido usa `href: null`. Rutas admin-only (`nuevo`, `administracion/pedir`, `reportes`, `baja`, `producto/[id]/editar`) envueltas en `<RequiereRol rol="admin">`.
- `(app)/configuracion.tsx`: muestra nombre, usuario y rol; botón "Cerrar sesión".

- [ ] **Step 1: Test** `tabsPara("admin")` = `["index","administracion","nuevo","movimientos","configuracion"]`; `tabsPara("operativo")` = `["index","administracion","movimientos","configuracion"]`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** `eas build --profile development --platform android`; instalar; verificar que `carlos.m` no ve "+" y que navegar a `/nuevo` por deep link `inventrix:///nuevo` redirige a inicio. Commit `feat(nav): tabs por rol`.

---

# Sprint 3 — Productos y existencias

### Task 12: Lógica de productos (estado, unidades, validación)

**Files:**
- Create: `src/features/productos/{estado.ts,unidades.ts,validacion.ts}`
- Test: `__tests__/productos/{estado,unidades,validacion}.test.ts`

**Interfaces:**
- Tipos: `type Unidad = Database["public"]["Enums"]["unidad_medida"]`, `type Producto = Database["public"]["Tables"]["productos"]["Row"]`, `type Estado = "disponible" | "bajo" | "sin"` (exportados desde `unidades.ts` / `estado.ts`).
- `estadoInventario(existencias: number, puntoPedido: number): Estado` — `0` → `sin`; `<= punto` → `bajo`; resto `disponible`.
- `ETIQUETA_ESTADO: Record<Estado, string>` = `{disponible:"Disponible", bajo:"Bajo inventario", sin:"Sin existencias"}`.
- `UNIDADES: Record<Unidad, { nombre: string; abreviatura: string; entera: boolean }>` — unidad `unid.` entera; libra `lb`; kilogramo `kg`; litro `L`; caja `cajas` entera; paquete `paq.` entera.
- `formatearCantidad(cantidad: number, unidad: Unidad): string` → `"10 lb"`, `"4 unid."`, `"2.5 kg"` (sin ceros sobrantes, coma de miles `1,284`).
- `validarCantidad(valor: string, unidad: Unidad, { permitirCero }: { permitirCero: boolean }): { ok: true; valor: number } | { ok: false; error: string }` — errores: "Ingresa una cantidad.", "La cantidad debe ser mayor que 0.", "Esta unidad solo admite números enteros.", "Máximo 2 decimales."
- `esquemaProducto` (zod): `nombre` 1–120, `unidad` enum, `codigo` `^[A-Za-z0-9\-]{4,64}$`, `cantidadInicial` ≥ 0, `puntoPedido` ≥ 0, mensajes en español.

- [ ] **Step 1: Tests** (valores exactos):

```ts
expect(estadoInventario(0, 5)).toBe("sin");
expect(estadoInventario(10, 10)).toBe("bajo");
expect(estadoInventario(11, 10)).toBe("disponible");
expect(formatearCantidad(1284, "unidad")).toBe("1,284 unid.");
expect(formatearCantidad(2.5, "kilogramo")).toBe("2.5 kg");
expect(validarCantidad("2.5", "caja", { permitirCero: false })).toEqual({ ok: false, error: "Esta unidad solo admite números enteros." });
expect(validarCantidad("2.555", "libra", { permitirCero: false })).toEqual({ ok: false, error: "Máximo 2 decimales." });
expect(validarCantidad("0", "unidad", { permitirCero: true })).toEqual({ ok: true, valor: 0 });
expect(validarCantidad("0", "unidad", { permitirCero: false }).ok).toBe(false);
```
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Commit `feat(productos): estado, unidades y validación`.

### Task 13: API y hooks de productos + lista de existencias + exportar Excel

**Files:**
- Create: `src/features/productos/{api.ts,hooks.ts}`, `src/features/reportes/excel.ts`, `app/(app)/administracion/index.tsx`, `app/(app)/administracion/existencias.tsx`
- Test: `__tests__/reportes/excel.test.ts`

**Interfaces:**
- `listarProductos(filtro: { texto?: string; estado?: Estado }): Promise<Producto[]>` — activos, `or(nombre.ilike.%t%,codigo.ilike.%t%)`, orden por nombre. `buscarPorCodigo(codigo: string): Promise<Producto | null>`. `obtenerProducto(id: string): Promise<Producto>`.
- Hooks TanStack: `useProductos(filtro)`, `useProducto(id)`; claves `["productos", filtro]`, `["producto", id]`.
- `filasExistencias(productos: Producto[], generado: Date): Array<{ Código: string; Nombre: string; Unidad: string; "Cantidad disponible": number; "Fecha de generación": string }>` (fecha `dd/mm/aaaa hh:mm`).
- `exportarExcel(nombreArchivo: string, hojas: Record<string, object[]>): Promise<void>` — SheetJS (`xlsx` desde `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) `write(..., { type: "base64" })`, guardar con `expo-file-system` en caché y abrir `Sharing.shareAsync` con mimeType `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- Pantalla Administración: admin ve 4 opciones (Existencias, Productos a pedir, Reportes, Dar de baja); operativo solo Existencias (`puede`).
- Pantalla Existencias: buscador, botón cámara → `router.push("/escaner?destino=existencias")`, filtros de estado, lista (nombre, código, unidad, cantidad, estado), botón "Exportar a Excel".

- [ ] **Step 1: Test** `filasExistencias([{codigo:"750",nombre:"Arroz",unidad:"libra",existencias:10,...}], new Date(2026,9,10,9,5))` → `[{Código:"750",Nombre:"Arroz",Unidad:"lb","Cantidad disponible":10,"Fecha de generación":"10/10/2026 09:05"}]`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Manual: lista con seed, búsqueda "arr" encuentra Arroz, exportar abre el menú de compartir y el archivo se abre en Excel/Sheets. Commit `feat(productos): existencias y exportación`.

### Task 14: Escáner de códigos

**Files:**
- Create: `app/escaner.tsx`, `src/features/productos/escaner.ts`
- Test: `__tests__/productos/escaner.test.ts`

**Interfaces:**
- Pantalla modal con `CameraView` de `expo-camera`, `barcodeScannerSettings.barcodeTypes = ["ean13","ean8","upc_a","upc_e","code128","code39","qr"]`, solicitud de permiso con texto explicativo, linterna (`enableTorch`), botón "Escribir el código manualmente", botón "Leer desde imagen" (`expo-image-picker` + `scanFromURLAsync`).
- `normalizarCodigo(raw: string): string` (trim, sin espacios internos).
- Parámetro `destino`: `"existencias" | "entrada" | "salida" | "baja" | "nuevo"`. Al leer: `destino === "nuevo"` → vuelve con `router.back()` y `setParams({ codigo })`; los demás buscan con `buscarPorCodigo` y navegan a la ficha/formulario con `productoId`, o muestran "Producto no encontrado" (+ para operativo: "Solo el administrador puede registrar productos nuevos.").
- Debounce: ignorar lecturas repetidas durante 1500 ms (`crearFiltroLecturas(ms: number): (codigo: string, ahora: number) => boolean`).

- [ ] **Step 1: Tests** `normalizarCodigo(" 750 123 ") === "750123"`; filtro: misma lectura a los 500 ms → `false`, a los 1600 ms → `true`, código distinto → `true`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Manual en teléfono con un producto real: escanear EAN-13 y QR; código desconocido muestra el mensaje correcto según el rol. Commit `feat(productos): escáner de códigos`.

### Task 15: Ficha, nuevo producto, edición y baja

**Files:**
- Create: `app/(app)/administracion/producto/[id].tsx`, `app/(app)/administracion/producto/[id]/editar.tsx`, `app/(app)/nuevo.tsx`, `app/(app)/administracion/baja.tsx`; mutaciones en `src/features/productos/api.ts`
- Test: `__tests__/productos/nuevo.test.tsx`

**Interfaces:**
- `registrarProducto(input: z.infer<typeof esquemaProducto>): Promise<Producto>` → `rpc("registrar_producto", …)`; `actualizarProducto(id, { nombre, unidad, puntoPedido })`; `darBajaProducto(id, motivo)`. Tras éxito invalidan `["productos"]`, `["producto", id]`, `["inicio"]`.
- Ficha: nombre, código, existencias + unidad, punto de pedido, estado, últimos 5 movimientos (`historial_movimientos` por producto), botones Entrada/Salida; "Editar" solo si `puede(rol,"editar_producto")`.
- Nuevo producto: formulario (react-hook-form + `esquemaProducto`) → paso de revisión con "Editar información" (conserva datos) y "Confirmar registro" → mensaje "Producto registrado correctamente" y opciones "Ver en Existencias" / "Registrar otro". `CODIGO_DUPLICADO` se muestra bajo el campo código.
- Baja: búsqueda/escaneo, ficha, motivo (opciones "Descontinuado", "Registro duplicado", "Otro" + detalle), confirmación modal; con existencias > 0 muestra "Primero regulariza las existencias (registra una salida con motivo Retiro autorizado)." y botón que lleva a Salida con ese motivo preseleccionado.

- [ ] **Step 1: Test** (API mockeada): enviar formulario válido muestra revisión con los 5 datos; "Editar información" vuelve con los valores; error `CODIGO_DUPLICADO` se muestra como "Este código ya está registrado." bajo el campo.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Manual: crear "Harina de trigo", aparece en Existencias con movimiento inicial; intentar baja con existencias → mensaje; regularizar y dar de baja → desaparece de la lista. Commit `feat(productos): ficha, alta, edición y baja`.

---

# Sprint 4 — Movimientos e inicio

### Task 16: Cálculo y formularios de entrada/salida

**Files:**
- Create: `src/features/movimientos/{calculo.ts,api.ts,hooks.ts}`, `src/components/Cantidad.tsx`, `app/(app)/movimientos/{index.tsx,entrada.tsx,salida.tsx}`
- Test: `__tests__/movimientos/calculo.test.ts`, `__tests__/movimientos/salida.test.tsx`

**Interfaces:**
- `proyectar(existencias: number, cantidad: number, tipo: "entrada" | "salida"): number` (redondeo a 2 decimales).
- `validarSalida(existencias: number, cantidad: number): string | null` → `"La cantidad supera las existencias disponibles."` o `null`.
- `generaAlerta(existencias: number, cantidad: number, puntoPedido: number): boolean` — `existencias > punto && existencias - cantidad <= punto` (aviso previo en la UI; la alerta real la crea la BD).
- `registrarMovimiento({ productoId, tipo, cantidad, motivo? }): Promise<Movimiento>` → `rpc("registrar_movimiento")`; invalida `["productos"]`, `["producto", id]`, `["inicio"]`, `["historial"]`.
- `<Cantidad valor unidad onChange />` con botones −/+ (paso 1; mínimo 1 en enteras, 0.01 en decimales) y teclado numérico.
- Pantallas: Menú (Registrar entrada, Registrar salida, Historial); Entrada/Salida con búsqueda o escaneo (`/escaner?destino=entrada|salida`), datos del producto, existencias actuales → proyectadas en vivo, motivo (solo salida: Venta / Consumo interno / Retiro autorizado), botón deshabilitado si inválido. Al éxito: pantalla de confirmación (producto, cantidad, anteriores, finales) con "Registrar otro movimiento" / "Volver al inicio"; si `generaAlerta`, aviso "El producto alcanzó su punto de pedido. Se notificó al administrador."

- [ ] **Step 1: Tests**

```ts
expect(proyectar(45, 10, "entrada")).toBe(55);
expect(proyectar(24, 3, "salida")).toBe(21);
expect(proyectar(10.1, 0.2, "salida")).toBe(9.9);
expect(validarSalida(5, 6)).toBe("La cantidad supera las existencias disponibles.");
expect(validarSalida(5, 5)).toBeNull();
expect(generaAlerta(12, 2, 10)).toBe(true);
expect(generaAlerta(9, 1, 10)).toBe(false);
```
Test de pantalla Salida (API mockeada, producto 5 unid.): poner 6 muestra el error y deshabilita "Registrar salida"; sin motivo el botón está deshabilitado.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Manual con dos teléfonos: salida simultánea de las últimas unidades → una falla con "La cantidad supera las existencias disponibles.". Commit `feat(movimientos): entradas y salidas`.

### Task 17: Historial de movimientos

**Files:**
- Create: `app/(app)/movimientos/historial.tsx`; `listarHistorial` en `src/features/movimientos/api.ts`

**Interfaces:**
- `listarHistorial({ tipo?: "entrada" | "salida"; texto?: string; productoId?: string; pagina: number }): Promise<FilaHistorial[]>` sobre `historial_movimientos`, 30 por página (`range`), orden `created_at desc`; `tipo` filtra (los `inicial` aparecen en "Todos" y en "Entradas").
- `useHistorial` con `useInfiniteQuery`.
- UI: buscador, segmentado Todos/Entradas/Salidas, lista (fecha, producto, tipo, cantidad con signo), detalle expandible (usuario, fecha y hora, motivo, existencias antes → después). Sin acciones de editar/borrar.

- [ ] **Step 1: Test** de `etiquetaMovimiento(tipo, cantidad, unidad)` en `calculo.ts`: `("salida", 2, "unidad") → "−2 unid."`, `("entrada", 25, "libra") → "+25 lb"`, `("inicial", 50, "libra") → "+50 lb"`.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Manual: filtros y scroll infinito con >30 movimientos (seed + script). Commit `feat(movimientos): historial`.

### Task 18: Pantalla de inicio por rol

**Files:**
- Create: `src/features/inicio/{api.ts,hooks.ts}`, `app/(app)/index.tsx`
- Test: `__tests__/inicio/resumen.test.ts`

**Interfaces:**
- `obtenerInicio(rol: Rol): Promise<{ productosActivos: number; resumen: Array<{ unidad: Unidad; total: number }>; aPedir?: { total: number; primeros: Producto[] }; recientes: FilaHistorial[] }>` — `count` de productos, `rpc("resumen_existencias")`, `productos_a_pedir` (solo admin, primeros 3), `historial_movimientos` (5 más recientes).
- `textoResumen(resumen): string[]` → `["1,284 unid.", "386 lb", "92 L"]` en el orden de `UNIDADES`.
- UI: "Hola, {nombre}" + rol; admin: campana con contador de alertas no leídas, tarjeta "Productos en punto de pedido" y "Productos próximos a agotarse" con "Ver todos" → `/administracion/pedir`; ambos: accesos rápidos Entrada/Salida/Escanear y movimientos recientes. Pull-to-refresh.

- [ ] **Step 1: Test** `textoResumen([{unidad:"litro",total:92},{unidad:"unidad",total:1284},{unidad:"libra",total:386}])` → `["1,284 unid.","386 lb","92 L"]`.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Manual con ambos usuarios del seed. Commit `feat(inicio): panel por rol`.

---

# Sprint 5 — Alertas y notificaciones push

### Task 19: Registro de dispositivos

**Files:**
- Create: `supabase/migrations/20261010000006_push.sql`, `supabase/tests/06_push.test.sql`, `src/features/alertas/push.ts`

**Interfaces:**
- Tabla `dispositivos(token text pk, usuario_id uuid not null → perfiles on delete cascade, actualizado_at timestamptz default now())`, sin acceso directo de `authenticated`.
- `registrar_dispositivo(p_token text) returns void` (upsert con `usuario_id = auth.uid()`, cualquier usuario activo); `eliminar_dispositivo(p_token text) returns void` (solo el propio).
- `registrarPush(): Promise<"autorizado" | "denegado" | "no_disponible">` — pide permiso (`expo-notifications`), crea canal Android `alertas` (importancia alta), obtiene `getExpoPushTokenAsync({ projectId })` y llama la RPC. Solo se invoca si `rol === "admin"`; en `cerrarSesion` se llama `eliminar_dispositivo`.

- [ ] **Step 1: Tests pgTAP** (`plan(3)`): registrar el mismo token dos veces deja 1 fila; un usuario no puede eliminar el token de otro (fila sigue); `select` directo sobre `dispositivos` como `authenticated` → `42501`.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Commit `feat(alertas): registro de dispositivos`.

### Task 20: Edge Function `notificar-alerta`

**Files:**
- Create: `supabase/functions/notificar-alerta/{index.ts,logica.ts,logica.test.ts}`; Database Webhook (migración `20261010000007_webhook_alertas.sql` con `supabase_functions.http_request` on insert `alertas`)

**Interfaces:**
- `construirMensajes(alerta: { producto: string; existencias: number; puntoPedido: number; unidad: Unidad }, tokens: string[]): Array<{ to: string; title: string; body: string; sound: "default"; channelId: "alertas"; data: { ruta: "/administracion/pedir" } }>` — título `"Reabastecer: {producto}"`, cuerpo `"Quedan {cantidad} y su punto de pedido es {punto}."` con `formatearCantidad` (copiar la función a `_shared/unidades.ts`).
- `index.ts`: valida un secreto compartido en header `x-webhook-secret` (`WEBHOOK_SECRET`), lee producto y tokens de admins activos con service role, `POST https://exp.host/--/api/v2/push/send` en lotes de 100, elimina tokens con error `DeviceNotRegistered`.

- [ ] **Step 1: Test Deno**: `construirMensajes({producto:"Detergente 1 kg",existencias:3,puntoPedido:10,unidad:"unidad"}, ["t1","t2"])` → 2 mensajes, `body === "Quedan 3 unid. y su punto de pedido es 10 unid."`, `data.ruta === "/administracion/pedir"`; con `[]` → `[]`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** `supabase secrets set WEBHOOK_SECRET=...`, deploy, salida que cruza el punto en el teléfono del operativo → la notificación llega al del admin con la app cerrada. Commit `feat(alertas): push de reabastecimiento`.

### Task 21: Notificaciones y productos a pedir en la app

**Files:**
- Create: `app/notificaciones.tsx`, `app/(app)/administracion/pedir.tsx`, `src/features/alertas/{api.ts,hooks.ts}`

**Interfaces:**
- `listarAlertas(): Promise<Alerta[]>` (con nombre de producto, orden desc), `marcarLeidas()` → RPC `marcar_alertas_leidas`, `useAlertasNoLeidas(): number`.
- Listener `Notifications.addNotificationResponseReceivedListener` en `app/_layout.tsx` → `router.push(data.ruta)`; también `getLastNotificationResponseAsync` al abrir en frío.
- Productos a pedir: aviso "Estos productos alcanzaron su punto de pedido.", tabla Producto / Existencias / Punto de pedido, tocar → ficha; nota "Esta versión no genera órdenes de compra."

- [ ] **Step 1: Test** (pantalla a pedir con API mockeada) muestra 3 filas con `formatearCantidad` y el texto de la nota.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Manual: tocar la notificación con la app cerrada abre Productos a pedir. Commit `feat(alertas): pantallas de notificaciones y a pedir`.

---

# Sprint 6 — Reportes

### Task 22: Pantalla de reportes y exportación

**Files:**
- Create: `src/features/reportes/api.ts`, `app/(app)/administracion/reportes.tsx`
- Modify: `src/features/reportes/excel.ts` (agregar `filasMovimientos`)
- Test: `__tests__/reportes/movimientos.test.ts`

**Interfaces:**
- `type TipoReporte = "existencias" | "a_pedir" | "entradas" | "salidas" | "historial"`.
- `obtenerReporte(tipo: TipoReporte, filtros: { desde?: Date; hasta?: Date; productoId?: string }): Promise<object[]>` — existencias → `listarProductos({})`; a_pedir → `productos_a_pedir`; entradas/salidas/historial → `rpc("reporte_movimientos", …)`.
- `filasMovimientos(filas): Array<{ Fecha: string; Producto: string; Código: string; Tipo: string; Cantidad: string; Motivo: string; Usuario: string; "Existencias antes": string; "Existencias después": string }>` — Tipo `Entrada|Salida|Inicial`, Motivo `Venta|Consumo interno|Retiro autorizado|—`.
- UI: selector de reporte, filtros de período (Hoy, 7 días, 30 días, Personalizado con date picker) y producto, tabla con scroll horizontal, total de registros, botón "Exportar a Excel" (`inventrix-{tipo}-{aaaammdd}.xlsx`).

- [ ] **Step 1: Test** `filasMovimientos([{tipo:"salida",motivo:"consumo_interno",cantidad:4,unidad:"caja",...}])[0]` tiene `Tipo:"Salida"`, `Motivo:"Consumo interno"`, `Cantidad:"4 cajas"`.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Manual: cada reporte con filtros; operativo no puede abrir `/administracion/reportes`. Commit `feat(reportes): reportes y exportación`.

---

# Sprint 7 — Soporte técnico (chatbot + WhatsApp)

### Task 23: Manuales y base de conocimiento

**Files:**
- Create: `docs/manuales/manual-administrador.md`, `docs/manuales/manual-operativo.md`, `supabase/migrations/20261010000008_manuales.sql`, `supabase/tests/07_manuales.test.sql`, `scripts/chunks.ts`, `scripts/ingestar-manuales.ts`, `__tests__/scripts/chunks.test.ts`

**Interfaces:**
- Manuales: redactados a partir del `MANUAL DE FUNCIONES.docx`, en pasos, con un `##` por procedimiento (iniciar sesión, registrar producto, entrada, salida, escanear, exportar, productos a pedir, reportes, baja, notificaciones, qué hacer si el código no se reconoce, contactar soporte). El operativo no describe funciones de admin, pero incluye "¿Quién registra productos nuevos? El Administrador."
- `create extension vector`; tabla `manual_fragmentos(id bigint identity pk, perfil text not null check (perfil in ('admin','operativo')), seccion text not null, contenido text not null, embedding extensions.vector(384) not null)`, índice HNSW `vector_cosine_ops`; sin acceso de `authenticated`.
- `buscar_manual(p_embedding extensions.vector(384), p_perfil text, p_cantidad int default 5) returns table(seccion text, contenido text, similitud float)` — `security definer`, ejecutable solo por `service_role`.
- `dividirEnFragmentos(markdown: string): Array<{ seccion: string; contenido: string }>` — un fragmento por `##`; si supera 1,500 caracteres se parte por párrafos; `seccion` = texto del encabezado.
- `ingestar-manuales.ts`: genera embeddings con `@huggingface/transformers` `pipeline("feature-extraction", "Supabase/gte-small")` (`pooling: "mean", normalize: true`), borra e inserta fragmentos por perfil con service role. Uso: `node --env-file=.env scripts/ingestar-manuales.ts`.

- [ ] **Step 1: Tests** Jest `dividirEnFragmentos("# M\n## Registrar entrada\nPaso 1\n## Salida\nPaso 2")` → `[{seccion:"Registrar entrada",contenido:"Paso 1"},{seccion:"Salida",contenido:"Paso 2"}]`; pgTAP: `authenticated` no puede ejecutar `buscar_manual` (`42501`).
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Correr la ingesta local y remota; `select perfil, count(*) from manual_fragmentos group by 1` muestra ambos perfiles. Commit `feat(soporte): manuales y base vectorial`.

### Task 24: Edge Function `soporte-chat`

**Files:**
- Create: `supabase/functions/soporte-chat/{index.ts,logica.ts,logica.test.ts}`

**Interfaces:**
- Request `POST { mensajes: Array<{ rol: "usuario" | "asistente"; texto: string }> }` (máx. 20 mensajes, cada uno ≤ 2,000 caracteres). Response `200 { respuesta: string; resuelto: boolean }`.
- `logica.ts`:
  - `instrucciones(perfil: "admin" | "operativo"): string` — system prompt fijo por perfil: asistente de Inventrix; responder solo con base en los fragmentos del manual entregados; pasos numerados y breves; nunca afirmar que un problema quedó resuelto ni ejecutar/prometer cambios de inventario; si el perfil es operativo y preguntan por funciones de administrador (registrar productos, dar de baja, reportes, puntos de pedido), explicar que corresponden al Administrador; si los fragmentos no alcanzan, decirlo y marcar `resuelto: false`; nunca pedir contraseñas.
  - `contexto(fragmentos: Array<{ seccion: string; contenido: string }>): string` — bloques `<fragmento seccion="...">...</fragmento>`.
  - `validarEntrada(body: unknown): Array<{ rol; texto }>` — lanza `Error("DATOS_INVALIDOS")`.
  - `aMensajesClaude(mensajes, contexto): Anthropic.MessageParam[]` — el contexto va en el **último** mensaje de usuario, antes de la pregunta (el system prompt queda estable para caché).
- `index.ts`:
  - `obtenerPerfil(req)` (de `_shared/auth.ts`).
  - Embedding de la última pregunta con `new Supabase.ai.Session("gte-small")` → `run(texto, { mean_pool: true, normalize: true })`.
  - `rpc("buscar_manual", { p_embedding, p_perfil: perfil.rol, p_cantidad: 5 })` con service role.
  - Llamada a Claude:

```ts
import Anthropic from "npm:@anthropic-ai/sdk";
const client = new Anthropic(); // ANTHROPIC_API_KEY desde secretos
const modelo = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-5-5";
const r = await client.beta.messages.create({
  model: modelo,
  max_tokens: 2000,
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",               // quitar si ANTHROPIC_MODEL es claude-haiku-5-5 (no tiene fallback de servidor)
  output_config: {
    effort: "low",
    format: { type: "json_schema", schema: {
      type: "object", additionalProperties: false, required: ["respuesta", "resuelto"],
      properties: { respuesta: { type: "string" }, resuelto: { type: "boolean" } } } },
  },
  system: [{ type: "text", text: instrucciones(perfil.rol), cache_control: { type: "ephemeral" } }],
  messages: aMensajesClaude(mensajes, contexto(fragmentos)),
});
```
  - Si `Deno.env.get("ANTHROPIC_API_KEY")` está vacía o ausente, **no** llamar a Claude ni calcular embeddings: responder `200` con `respuestaSinConfigurar()` = `{ respuesta: "El asistente virtual aún no está configurado. Puedes contactar a soporte por WhatsApp.", resuelto: false }` (función en `logica.ts`, con test).
  - Si `r.stop_reason === "refusal"` → `{ respuesta: "No puedo ayudarte con esa consulta. Puedes contactar a soporte por WhatsApp.", resuelto: false }`. Errores de API (`Anthropic.RateLimitError`, `Anthropic.APIError`) → 503 con el mismo texto de derivación.

- [ ] **Step 1: Tests Deno**: `instrucciones("operativo")` contiene "corresponden al Administrador"; `validarEntrada({mensajes:[]})` lanza; un texto de 2,001 caracteres lanza; `aMensajesClaude([{rol:"usuario",texto:"¿Cómo exporto?"}], "<fragmento ...>")` devuelve 1 mensaje `user` cuyo contenido empieza con el contexto y termina con "¿Cómo exporto?"; historial con asistente mapea a `role: "assistant"`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Deploy; con `curl` y token de `carlos.m`: "¿Cómo registro un producto nuevo?" → respuesta indica que es función del Administrador; "¿Cómo registro una salida?" → pasos; "¿Cuál es la capital de Francia?" → `resuelto:false`. Commit `feat(soporte): chatbot RAG`.

### Task 25: Pantalla de soporte y WhatsApp

**Files:**
- Create: `src/features/soporte/{api.ts,whatsapp.ts}`, `app/soporte.tsx`; botón flotante en `app/(app)/_layout.tsx`
- Test: `__tests__/soporte/whatsapp.test.ts`

**Interfaces:**
- `enlaceWhatsApp(numero: string, consulta?: string): string` → `https://wa.me/{numero}?text={encodeURIComponent("Hola, necesito asistencia técnica con el sistema de control de inventarios. Mi consulta es: " + (consulta ?? ""))}`; `numero` solo dígitos (lanza si vacío).
- `enviarPregunta(mensajes): Promise<{ respuesta: string; resuelto: boolean }>` → `supabase.functions.invoke("soporte-chat")`.
- UI: saludo "¡Hola! Soy el asistente virtual del sistema de inventarios. ¿En qué puedo ayudarte?", sugerencias por rol, burbujas, campo + enviar, indicador "escribiendo…"; si `resuelto === false` o falla la red → botón "Contactar soporte por WhatsApp" (`Linking.openURL(enlaceWhatsApp(EXPO_PUBLIC_SOPORTE_WHATSAPP, ultimaPregunta))`). Conversación solo en memoria. Botón flotante de soporte visible en todas las pantallas de `(app)`.

- [ ] **Step 1: Test** `enlaceWhatsApp("50588887777","El archivo sale vacío")` → `"https://wa.me/50588887777?text=Hola%2C%20necesito%20asistencia%20t%C3%A9cnica%20con%20el%20sistema%20de%20control%20de%20inventarios.%20Mi%20consulta%20es%3A%20El%20archivo%20sale%20vac%C3%ADo"`; `enlaceWhatsApp("", "x")` lanza.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Manual en teléfono: conversación y apertura de WhatsApp con el texto. Commit `feat(soporte): pantalla de chat y WhatsApp`.

---

# Sprint 8 — Cierre técnico (listo para diseño)

### Task 26: Configuración, QA y build de prueba

**Files:**
- Modify: `app/(app)/configuracion.tsx`
- Create: `docs/qa/checklist-funcional.md`

**Interfaces:**
- Configuración: Mi cuenta (nombre, usuario, rol; cambiar contraseña con `auth.updateUser({ password })`, mínimo 8), Notificaciones (solo admin: estado del permiso + botón reintentar `registrarPush`), Apariencia (Claro / Oscuro / Sistema, guardado en `expo-secure-store` clave `apariencia`; se aplica en la fase de diseño), Soporte técnico (abre `/soporte`), Cerrar sesión.
- `checklist-funcional.md`: una línea por RF-01…RF-14 de la spec con el paso manual y el resultado esperado, para ambos roles.

- [ ] **Step 1:** Implementar Configuración. Test: cambiar contraseña con 7 caracteres muestra "La contraseña debe tener al menos 8 caracteres." sin llamar a la API.
- [ ] **Step 2:** `npm run lint && npm run typecheck && npm test && npm run test:db` → todo verde; CI verde en GitHub.
- [ ] **Step 3:** `eas build --profile preview --platform android`; instalar el APK en 2 teléfonos (admin y operativo) contra el proyecto remoto y recorrer el checklist completo; registrar fallas como issues.
- [ ] **Step 4:** Commit `chore: QA funcional y build preview` + tag `v0.1.0-funcional`.

> **Siguiente plan (fase de diseño):** tema y tokens (`#0B1C48`, `#92CF93`, `#E2EDDD`, degradados), NativeWind + componentes reutilizables, y re-maquetado de cada pantalla siguiendo el prototipo — sobre las mismas rutas y hooks de este plan.
