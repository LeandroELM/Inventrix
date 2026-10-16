# Gestión de usuarios — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un administrador liste, cree, cambie de rol, restablezca la contraseña y desactive o reactive usuarios desde la app.

**Architecture:** La Edge Function `admin-usuarios` hace lo que necesita la API de administración de Auth (crear y restablecer, con contraseña temporal generada en el servidor). Dos RPC `security definer` cambian `perfiles.rol` y `perfiles.activo`. La app agrega `src/features/usuarios/` y tres rutas apiladas bajo `app/(app)/administracion/usuarios/`.

**Tech Stack:** Expo Router, React Query, Supabase (Postgres + pgTAP, Edge Functions en Deno), Jest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-15-inventrix-usuarios-design.md`

## Global Constraints

- Rama `feat/usuarios`. Mensajes de commit en español con prefijo convencional y la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Regla de usuario idéntica en servidor y app: `^[a-z0-9._-]{3,30}$`. Nombre no vacío tras `trim()`, máximo 120.
- Contraseña temporal: 10 caracteres del alfabeto `ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789`, con `crypto.getRandomValues` y rechazo de sesgo.
- Códigos de error: `NO_AUTENTICADO`, `NO_AUTORIZADO`, `DATOS_INVALIDOS`, `USUARIO_EXISTENTE`, `ACCION_SOBRE_SI_MISMO`, `USUARIO_NO_ENCONTRADO`, `ERROR_INTERNO`. En SQL: `raise exception '<CODIGO>' using errcode = 'P0001'`.
- RPC: `security definer`, `set search_path = ''`, `revoke execute ... from public, anon`, `grant execute ... to authenticated`.
- Pantallas: `RequiereRol rol="admin"`, `Encabezado variante="pantalla"`, `useEspacioInferior()` en algún `paddingBottom`, solo tokens del tema. Sin dependencias nuevas; compartir con `Share` de `react-native`.
- Textos visibles exactamente como en el spec §2 y §3.3.
- Verificación completa al final de cada tarea que toque su capa: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:db`, `npm run test:functions` (Supabase local corriendo para `test:db`).

## Review Focus

1. **Usuario escrito con mayúsculas o espacios** ("Ana.Lopez ", del autocompletado del teclado): se normaliza a `ana.lopez` y se acepta, en vez de marcarlo inválido. → Task 3 (`normalizarUsuario`) y Task 6 (prueba de envío).
2. **Nombre solo con espacios:** el botón "Crear usuario" sigue deshabilitado y lo que se envía va recortado. → Task 6.
3. **Doble toque en el botón de confirmación de una hoja** (Cambiar rol, Restablecer, Desactivar): una sola llamada, y la hoja no se cierra mientras la operación está en curso. → Task 5.
4. **Falla de red al restablecer:** la hoja sigue abierta con el error y el botón vuelve a estar disponible; reintentar genera una contraseña nueva. → Task 5.
5. **La lista refleja los cambios al volver** de crear o desactivar, sin arrastrar para recargar: las mutaciones invalidan `["usuarios"]`. → Task 3.

---

### Task 1: Edge Function `admin-usuarios` con acciones `crear` y `restablecer`

**Files:**
- Modify: `supabase/functions/admin-usuarios/logica.ts`
- Modify: `supabase/functions/admin-usuarios/index.ts`
- Test: `supabase/functions/admin-usuarios/logica.test.ts`

**Interfaces:**
- Produces (contrato HTTP que consume Task 3):
  - `POST { accion: "crear", usuario, nombre, rol }` → `201 { id: string, password: string }`
  - `POST { accion: "restablecer", id }` → `200 { password: string }`
  - Errores `{ error: CODIGO }` con los HTTP del spec §1.1.
- Produces (en `logica.ts`):
  - `type Solicitud = { accion: "crear"; usuario: string; nombre: string; rol: Rol } | { accion: "restablecer"; id: string }`
  - `validarSolicitud(input: unknown): Solicitud` (lanza `Error("DATOS_INVALIDOS")`)
  - `generarContrasena(): string`
  - `export const ALFABETO_CONTRASENA`, `export const LARGO_CONTRASENA = 10`
  - Se conservan `emailDeUsuario` y `PATRON_USUARIO`. `validarAltaUsuario` se elimina con sus pruebas (nadie más la usa: confirmar con `grep -rn validarAltaUsuario`).

- [ ] **Step 1: Write the failing tests** (reemplazan los de `validarAltaUsuario`)

```ts
Deno.test("validarSolicitud acepta crear y restablecer válidos", () => {
  assertEquals(validarSolicitud({ accion: "crear", usuario: "ana.lopez", nombre: "Ana", rol: "operativo" }),
    { accion: "crear", usuario: "ana.lopez", nombre: "Ana", rol: "operativo" });
  const id = "6f1c2a7e-0b1d-4c3e-9f00-1234567890ab";
  assertEquals(validarSolicitud({ accion: "restablecer", id }), { accion: "restablecer", id });
});

Deno.test("validarSolicitud recorta el nombre", () => {
  const s = validarSolicitud({ accion: "crear", usuario: "ana", nombre: "  Ana  ", rol: "admin" });
  assertEquals(s.accion === "crear" ? s.nombre : null, "Ana");
});

Deno.test("validarSolicitud rechaza entradas inválidas", () => {
  const base = { accion: "crear", usuario: "ana.lopez", nombre: "Ana", rol: "admin" };
  for (const malo of [
    null, {}, { ...base, accion: "borrar" }, { ...base, usuario: "Ana Lopez" }, { ...base, usuario: "ab" },
    { ...base, rol: "root" }, { ...base, nombre: "   " }, { ...base, nombre: "x".repeat(121) },
    { accion: "restablecer", id: "no-es-uuid" }, { accion: "restablecer" },
  ]) assertThrows(() => validarSolicitud(malo), Error, "DATOS_INVALIDOS");
});

Deno.test("generarContrasena: 10 caracteres del alfabeto y distinta en cada llamada", () => {
  const a = generarContrasena();
  assertEquals(a.length, LARGO_CONTRASENA);
  for (const c of a) assertEquals(ALFABETO_CONTRASENA.includes(c), true);
  assertEquals(new Set(Array.from({ length: 50 }, generarContrasena)).size, 50);
});
```

Conservar el test de `emailDeUsuario`.

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:functions`
Expected: FAIL (`validarSolicitud` / `generarContrasena` no existen).

- [ ] **Step 3: Implement in `logica.ts`**

`validarSolicitud`: UUID con `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`; nombre devuelto recortado. `generarContrasena`: rechazo de sesgo así:

```ts
export function generarContrasena(): string {
  const limite = 256 - (256 % ALFABETO_CONTRASENA.length);
  let salida = "";
  while (salida.length < LARGO_CONTRASENA) {
    for (const b of crypto.getRandomValues(new Uint8Array(32))) {
      if (b < limite && salida.length < LARGO_CONTRASENA) salida += ALFABETO_CONTRASENA[b % ALFABETO_CONTRASENA.length];
    }
  }
  return salida;
}
```

- [ ] **Step 4: Rewrite `index.ts` as a router**

Mismo armazón (OPTIONS, 405, `obtenerPerfil`, `NO_AUTORIZADO`, `catch` que devuelve una `Response` lanzada). Tras `validarSolicitud` (400 si lanza), crear el cliente service_role y:
- `crear`: `createUser` con `password: generarContrasena()`; mantener la detección de `USUARIO_EXISTENTE` actual; responder `201 { id, password }`.
- `restablecer`: `id === perfil.id` → `409 ACCION_SOBRE_SI_MISMO`; buscar `perfiles` por `id` con el cliente service_role (`maybeSingle`), sin fila → `404 USUARIO_NO_ENCONTRADO`; `auth.admin.updateUserById(id, { password })`, error → 500; responder `200 { password }`.

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test:functions`
Expected: PASS y `deno check` sin errores.

- [ ] **Step 6: Smoke manual contra Supabase local**

Con `npx supabase functions serve admin-usuarios` y el token de `ana.lopez` (iniciar sesión con `curl` a `/auth/v1/token?grant_type=password`): `crear` devuelve 201 con `password` de 10 caracteres; repetir el mismo usuario → 409 `USUARIO_EXISTENTE`; `restablecer` sobre el id propio → 409; sobre `carlos.m` → 200 y luego `carlos.m` inicia sesión con la contraseña nueva.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/admin-usuarios
git commit -m "feat(usuarios): admin-usuarios crea y restablece con contraseña temporal"
```

---

### Task 2: RPC `cambiar_rol_usuario` y `cambiar_estado_usuario`

**Files:**
- Create: `supabase/migrations/20261015000000_usuarios.sql`
- Create: `supabase/tests/11_usuarios.test.sql`
- Modify: `src/lib/database.types.ts` (regenerado)

**Interfaces:**
- Produces:
  - `public.cambiar_rol_usuario(p_id uuid, p_rol public.rol_usuario) returns void`
  - `public.cambiar_estado_usuario(p_id uuid, p_activo boolean) returns void`
  - En `database.types.ts`: `Functions.cambiar_rol_usuario.Args = { p_id: string; p_rol: "admin" | "operativo" }`, `Functions.cambiar_estado_usuario.Args = { p_id: string; p_activo: boolean }`.

- [ ] **Step 1: Write the failing pgTAP test**

Mismo encabezado que `06_push.test.sql` (`pg_temp.crear_usuario`, `pg_temp.como`). Crear `adm` (admin), `adm2` (admin), `ope` (operativo), un producto activo y un dispositivo de `ope`. `select plan(11);` con:

| # | Llamada | Esperado |
|---|---|---|
| 1 | como `ope`: `cambiar_rol_usuario(:'adm2','operativo')` | `throws_ok(..., 'P0001', 'NO_AUTORIZADO')` |
| 2 | como `ope`: `cambiar_estado_usuario(:'adm2', false)` | `NO_AUTORIZADO` |
| 3 | como `adm`: `cambiar_rol_usuario(:'adm','operativo')` | `ACCION_SOBRE_SI_MISMO` |
| 4 | como `adm`: `cambiar_estado_usuario(:'adm', false)` | `ACCION_SOBRE_SI_MISMO` |
| 5 | como `adm`: `cambiar_rol_usuario(gen_random_uuid(),'admin')` | `USUARIO_NO_ENCONTRADO` |
| 6 | como `adm`: `cambiar_rol_usuario(:'ope','admin')`; `reset role` | `perfiles.rol` de `ope` = `'admin'` |
| 7 | como `adm`: `cambiar_estado_usuario(:'ope', false)`; `reset role` | `perfiles.activo` de `ope` = false |
| 8 | (tras 7) | `count(*)` de `dispositivos` de `ope` = 0 |
| 9 | como `ope` (inactivo): `select count(*) from productos` | 0 |
| 10 | como `adm`: `cambiar_estado_usuario(:'ope', true)`; `reset role` | `activo` = true |
| 11 | `has_function_privilege('anon', 'public.cambiar_estado_usuario(uuid, boolean)', 'execute')` | false |

- [ ] **Step 2: Run to verify it fails**

Run: `npx supabase db reset && npm run test:db`
Expected: FAIL en `11_usuarios.test.sql` (funciones inexistentes).

- [ ] **Step 3: Write the migration**

Comprobaciones en el orden del spec §1.2 (autorización, sí mismo, existencia con `if not exists (select 1 from public.perfiles where id = p_id)`), luego el `update`; en `cambiar_estado_usuario`, si `not p_activo`, `delete from public.dispositivos where usuario_id = p_id`. Comentario de cabecera explicando por qué "no sobre sí mismo" garantiza un admin activo.

- [ ] **Step 4: Run to verify it passes**

Run: `npx supabase db reset && npm run test:db`
Expected: todas las suites PASS.

- [ ] **Step 5: Regenerate types**

Run: `npx supabase gen types typescript --local > src/lib/database.types.ts && npm run typecheck`
Expected: el diff de `database.types.ts` solo agrega las dos funciones; typecheck sin errores. (Si el archivo queda en UTF-16 por la redirección de PowerShell, generarlo desde Git Bash.)

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261015000000_usuarios.sql supabase/tests/11_usuarios.test.sql src/lib/database.types.ts
git commit -m "feat(db): RPC para cambiar rol y estado de un usuario"
```

---

### Task 3: Capa de datos de la app

**Files:**
- Create: `src/features/usuarios/validacion.ts`, `src/features/usuarios/api.ts`, `src/features/usuarios/hooks.ts`
- Modify: `src/lib/errores.ts`, `src/features/auth/permisos.ts`
- Test: `__tests__/usuarios/validacion.test.ts`, `__tests__/usuarios/api.test.ts`, `__tests__/usuarios/hooks.test.tsx`, `__tests__/auth/permisos.test.ts`

**Interfaces:**
- Consumes: contrato HTTP de Task 1; RPC de Task 2.
- Produces:
  - `validacion.ts`: `PATRON_USUARIO: RegExp`, `normalizarUsuario(texto: string): string`, `usuarioValido(texto: string): boolean` (normaliza y prueba), `ETIQUETA_ROL: Record<Rol, "Administrador" | "Operativo">`, `mensajeAcceso(d: { usuario: string; password: string }): string`.
  - `api.ts`: `type Usuario = { id: string; usuario: string; nombre: string; rol: Rol; activo: boolean }`; `listarUsuarios(): Promise<Usuario[]>`; `obtenerUsuario(id: string): Promise<Usuario | null>`; `crearUsuario(d: { usuario: string; nombre: string; rol: Rol }): Promise<{ id: string; password: string }>`; `restablecerContrasena(id: string): Promise<{ password: string }>`; `cambiarRol(id: string, rol: Rol): Promise<void>`; `cambiarEstado(id: string, activo: boolean): Promise<void>`.
  - `hooks.ts`: `useUsuarios()`, `useUsuario(id: string)`, `useCrearUsuario()`, `useRestablecerContrasena()`, `useCambiarRol()` (`mutate({ id, rol })`), `useCambiarEstado()` (`mutate({ id, activo })`).
  - `permisos.ts`: `Accion` incluye `"gestionar_usuarios"` (no se agrega al conjunto del operativo).

- [ ] **Step 1: Write the failing tests**

`validacion.test.ts`:
```ts
expect(normalizarUsuario("  Ana.Lopez ")).toBe("ana.lopez");
expect(usuarioValido("Ana.Lopez ")).toBe(true);
expect(usuarioValido("ab")).toBe(false);
expect(usuarioValido("ana lopez")).toBe(false);
expect(usuarioValido("a".repeat(31))).toBe(false);
expect(mensajeAcceso({ usuario: "ana", password: "Xk7mPq2Rtz" })).toBe(
  "Tu acceso a Inventrix\nUsuario: ana\nContraseña temporal: Xk7mPq2Rtz\nCámbiala en Configuración > Contraseña al entrar.",
);
```

`api.test.ts` (mock de `@/lib/supabase` con `functions.invoke`, `rpc` y `from`):
- `crearUsuario` envía `{ body: { accion: "crear", usuario, nombre, rol } }` y devuelve `data`.
- Si `invoke` devuelve `{ error: { context: new Response(JSON.stringify({ error: "USUARIO_EXISTENTE" }), { status: 409 }) } }`, `crearUsuario` rechaza con `Error("USUARIO_EXISTENTE")`.
- Si `error.context` no es una `Response`, rechaza con el error original.
- `restablecerContrasena("u1")` envía `{ body: { accion: "restablecer", id: "u1" } }`.
- `cambiarRol("u1","admin")` llama `rpc("cambiar_rol_usuario", { p_id: "u1", p_rol: "admin" })`; con `{ error: { message: "ACCION_SOBRE_SI_MISMO" } }` rechaza con `Error("ACCION_SOBRE_SI_MISMO")`.
- `cambiarEstado("u1", false)` llama `rpc("cambiar_estado_usuario", { p_id: "u1", p_activo: false })`.
- `listarUsuarios` selecciona `"id,usuario,nombre,rol,activo"` y ordena por `nombre`.

`hooks.test.tsx` (Review Focus 5): con un `QueryClient` real y `api` mockeado, tras `useCrearUsuario().mutateAsync(...)`, `useCambiarRol`, `useCambiarEstado` y `useRestablecerContrasena`, `invalidateQueries` fue llamado con `{ queryKey: ["usuarios"] }` (espiar `queryClient.invalidateQueries`). `useRestablecerContrasena` no necesita invalidar: verificar solo que llama a `restablecerContrasena`.

`errores` (en `__tests__/usuarios/validacion.test.ts` o el test existente de errores si lo hay): `mensajeDeError(new Error("USUARIO_EXISTENTE"))` → "Ya existe un usuario con ese nombre."; ídem `USUARIO_NO_ENCONTRADO` y `ACCION_SOBRE_SI_MISMO` con los textos del spec §3.2.

`permisos.test.ts`: `puede("admin","gestionar_usuarios")` true; `puede("operativo","gestionar_usuarios")` false.

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest __tests__/usuarios __tests__/auth/permisos.test.ts`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implement**

- `api.ts`: la extracción del código de error es una función privada `codigoDelCuerpo(error): Promise<string | null>` con la misma forma que `respuestaDelCuerpo` de `src/features/soporte/api.ts` (lee `error.context` si es `Response`, `json()`, campo `error` string).
- `hooks.ts`: mismo patrón que `src/features/productos/hooks.ts`; las mutaciones de crear, rol y estado invalidan `["usuarios"]` en `onSuccess`.

- [ ] **Step 4: Run to verify they pass**

Run: `npx jest __tests__/usuarios __tests__/auth && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/usuarios src/lib/errores.ts src/features/auth/permisos.ts __tests__/usuarios __tests__/auth/permisos.test.ts
git commit -m "feat(usuarios): api, hooks y validación de usuarios"
```

---

### Task 4: Lista de usuarios y entrada en Administración

**Files:**
- Create: `app/(app)/administracion/usuarios/index.tsx`
- Modify: `app/(app)/(tabs)/administracion.tsx` (opción nueva)
- Modify: `__tests__/navegacion/rutas.test.tsx`, `__tests__/navegacion/espacioFinal.test.ts` (agregar `app/(app)/administracion/usuarios/index.tsx` a `LISTA`; la ficha y el alta se agregan en las tareas 5 y 6)
- Test: `__tests__/usuarios/lista.test.tsx`

**Interfaces:**
- Consumes: `useUsuarios`, `Usuario`, `ETIQUETA_ROL` (Task 3); `useAuth().perfil.id`.
- Produces: rutas `/administracion/usuarios` y navegación a `/administracion/usuarios/nuevo` y `/administracion/usuarios/${id}`.

- [ ] **Step 1: Write the failing tests**

`lista.test.tsx` (mock de `useUsuarios`, `useAuth` con `perfil.id = "u1"`, `expo-router` con `push`). Datos: `u1` Ana (admin, activo), `u2` Carlos (operativo, activo), `u3` Luis (operativo, inactivo).
- Muestra "Activos (2)" e "Inactivos (1)"; "Ana (tú)"; "@carlos.m · Operativo"; etiqueta "Inactivo" en Luis.
- Sin inactivos no aparece la sección "Inactivos".
- Tocar Carlos → `push("/administracion/usuarios/u2")`; tocar "Nuevo usuario" → `push("/administracion/usuarios/nuevo")`.
- `isPending` → etiquetas "Cargando"; `isError` → "No se pudo cargar la lista de usuarios." y "Reintentar" llama `refetch`.
- Con `EspacioInferiorContext` en true e inset 24, `paddingBottom` del `contentContainerStyle` = `16 + 162` (mismo cálculo que `__tests__/inicio/pantalla.test.tsx`).

`rutas.test.tsx`: el menú muestra "Usuarios" y "Altas, roles, contraseñas y acceso".

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest __tests__/usuarios/lista.test.tsx __tests__/navegacion`
Expected: FAIL.

- [ ] **Step 3: Implement**

Pantalla según spec §2.1. Encabezado con `accion={{ icono: "mas", etiqueta: "Nuevo usuario", onPress }}`. Agregar la opción del menú en `OPCIONES` (icono `usuario`, acción `gestionar_usuarios`) después de "Historial de movimientos".

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest __tests__/usuarios __tests__/navegacion`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/administracion/usuarios/index.tsx" "app/(app)/(tabs)/administracion.tsx" __tests__/usuarios/lista.test.tsx __tests__/navegacion
git commit -m "feat(usuarios): lista de usuarios desde Administración"
```

---

### Task 5: Ficha de usuario

**Files:**
- Create: `app/(app)/administracion/usuarios/[id].tsx`
- Modify: `__tests__/navegacion/espacioFinal.test.ts` (agregar la ruta)
- Test: `__tests__/usuarios/ficha.test.tsx`

**Interfaces:**
- Consumes: `useUsuario`, `useCambiarRol`, `useCambiarEstado`, `useRestablecerContrasena`, `mensajeAcceso`, `ETIQUETA_ROL` (Task 3); `mensajeDeError`.

- [ ] **Step 1: Write the failing tests**

Mocks: hooks de Task 3 (con `mutateAsync` jest.fn), `useAuth` (`perfil.id = "u1"`), `useLocalSearchParams` (`{ id: "u2" }`), `Share.share` espiado (`jest.spyOn(Share, "share")`).
- Cabecera: "Carlos Mejía", "@carlos.m", "Activo"; elemento accesible "Carlos Mejía, usuario carlos.m, Operativo, activo".
- Elegir "Administrador" abre "¿Hacer administrador a Carlos Mejía?"; "Cancelar" no llama a `cambiarRol`; "Cambiar rol" llama `mutateAsync({ id: "u2", rol: "admin" })`.
- Restablecer: "Restablecer contraseña" → hoja "¿Restablecer la contraseña?" → "Restablecer" → muestra "Contraseña temporal" y `Xk7mPq2Rtz`; "Compartir" llama `Share.share({ message: mensajeAcceso({ usuario: "carlos.m", password: "Xk7mPq2Rtz" }) })`; "Listo" cierra y la contraseña ya no está en pantalla.
- Desactivar: "Desactivar usuario" → "¿Desactivar a Carlos Mejía?" → "Desactivar" llama `mutateAsync({ id: "u2", activo: false })`. Con el usuario inactivo aparece "Reactivar usuario" y llama `{ id: "u2", activo: true }`.
- Cuenta propia (`id = "u1"`): muestra "Tu cuenta se administra en Configuración." y no hay "Restablecer contraseña", "Desactivar usuario" ni selector de rol.
- Usuario `null` → "No se encontró el usuario."
- **Review Focus 3:** con `mutateAsync` pendiente (promesa sin resolver), dos toques seguidos en "Desactivar" (como en `__tests__/productos/nuevo.test.tsx`, "doble toque en Confirmar") → una sola llamada; y la hoja está bloqueada (el botón "Cancelar" no la cierra mientras está en curso).
- **Review Focus 4:** `restablecer` rechaza con `Error("Network request failed")` → la hoja sigue abierta con "Sin conexión. Revisa tu internet e intenta de nuevo." y "Restablecer" vuelve a estar habilitado; un segundo intento que resuelve muestra la contraseña.

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest __tests__/usuarios/ficha.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Según spec §2.2. Un solo estado `hoja: null | { tipo: "rol"; rol: Rol } | { tipo: "restablecer" } | { tipo: "contrasena"; password: string } | { tipo: "estado"; activo: boolean }`, una referencia `enCurso` para el doble toque y `bloqueado={enCurso}` en `HojaInferior`. Contraseña con `fontFamily: "monospace"` y `letterSpacing: 2`. Los textos de las hojas, exactos del spec.

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest __tests__/usuarios __tests__/navegacion/espacioFinal.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/administracion/usuarios/[id].tsx" __tests__/usuarios/ficha.test.tsx __tests__/navegacion/espacioFinal.test.ts
git commit -m "feat(usuarios): ficha con rol, contraseña temporal y acceso"
```

---

### Task 6: Nuevo usuario

**Files:**
- Create: `app/(app)/administracion/usuarios/nuevo.tsx`
- Modify: `__tests__/navegacion/espacioFinal.test.ts` (agregar la ruta)
- Test: `__tests__/usuarios/nuevo.test.tsx`

**Interfaces:**
- Consumes: `useCrearUsuario`, `normalizarUsuario`, `usuarioValido`, `mensajeAcceso`, `ETIQUETA_ROL` (Task 3).

- [ ] **Step 1: Write the failing tests**

- "Crear usuario" deshabilitado al inicio; con nombre "   " y usuario válido sigue deshabilitado (**Review Focus 2**).
- Usuario "ab" muestra "Usa de 3 a 30 minúsculas, números, punto o guion." y oculta la pista; vacío muestra la pista "Minúsculas, números, punto o guion (3 a 30)".
- **Review Focus 1:** nombre "  Ana López ", usuario "Ana.Lopez " → "Crear usuario" llama `mutateAsync({ usuario: "ana.lopez", nombre: "Ana López", rol: "operativo" })`.
- Elegir "Administrador" envía `rol: "admin"`.
- Rechazo con `Error("USUARIO_EXISTENTE")` → "Ya existe un usuario con ese nombre." junto al campo Usuario; al editar el usuario desaparece. Rechazo con otro error → `AvisoAdvertencia` con `mensajeDeError`.
- Doble toque → una sola llamada.
- Éxito (`{ id: "u9", password: "Xk7mPq2Rtz" }`) → "¡Usuario creado!", "Ana López ya puede entrar a Inventrix con esta contraseña temporal.", "@ana.lopez", "Operativo", "Xk7mPq2Rtz"; "Compartir acceso" llama `Share.share({ message: mensajeAcceso({ usuario: "ana.lopez", password: "Xk7mPq2Rtz" }) })`; "Volver a Usuarios" llama `router.back()`.
- El botón "Cerrar" del encabezado llama `router.back()`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest __tests__/usuarios/nuevo.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Según spec §2.3. Estado local con `useState` (el formulario son tres campos; no hace falta `react-hook-form`). `PantallaResultado` con `producto={{ nombre, detalle: "@" + usuario }}` y `datos={[{ etiqueta: "Rol", valor: ETIQUETA_ROL[rol] }, { etiqueta: "Contraseña temporal", valor: password }]}`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest __tests__/usuarios __tests__/navegacion/espacioFinal.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/administracion/usuarios/nuevo.tsx" __tests__/usuarios/nuevo.test.tsx __tests__/navegacion/espacioFinal.test.ts
git commit -m "feat(usuarios): alta de usuario con acceso para compartir"
```

---

### Task 7: Documentación y verificación final

**Files:**
- Modify: `docs/manuales/manual-administrador.md`, `docs/SETUP-SERVICIOS.md` (§5), `docs/qa/checklist-funcional.md`

- [ ] **Step 1: Manual del administrador**

Sección "## Gestionar usuarios" después de "Ver el historial de movimientos": entrar (Admin. → "Usuarios"), crear ("Nuevo usuario", "Crear usuario", "Compartir acceso"), cambiar rol, "Restablecer contraseña" ("Compartir"), "Desactivar usuario" y "Reactivar usuario", y que la cuenta propia se administra en Configuración. Todo texto entre comillas debe existir en la app: `__tests__/scripts/manuales.test.ts` lo comprueba.

- [ ] **Step 2: Setup y checklist**

`SETUP-SERVICIOS.md` §5: reemplazar "El script se agrega en una tarea posterior" por el uso real (`npx tsx --env-file=.env scripts/crear-admin.ts <usuario> <nombre> <password>`) y la línea "Las demás cuentas se crean desde Administración > Usuarios." `checklist-funcional.md`: casillas para crear y compartir, cambiar rol (el cambio se nota al volver a entrar), restablecer (la contraseña vieja deja de funcionar), desactivar (pierde acceso y deja de recibir push) y reactivar.

- [ ] **Step 3: Verificación completa**

Run: `npm run lint && npm run typecheck && npm test && npm run test:db && npm run test:functions`
Expected: todo en verde.

- [ ] **Step 4: Prueba en el teléfono**

Con Metro y Supabase local (`npx supabase functions serve` para la Edge Function): como `ana.lopez`, crear un operativo, iniciar sesión con él en otro teléfono o tras cerrar sesión, restablecer su contraseña, cambiarlo a administrador y desactivarlo. Volver desde cada pantalla regresa a la anterior.

- [ ] **Step 5: Commit**

```bash
git add docs/manuales/manual-administrador.md docs/SETUP-SERVICIOS.md docs/qa/checklist-funcional.md
git commit -m "docs(usuarios): manual, setup y checklist de gestión de usuarios"
```

La PR lleva en "Pendiente": desplegar `admin-usuarios` y aplicar la migración en el remoto, y volver a ingestar los manuales (`npx tsx --env-file=.env scripts/ingestar-manuales.ts`).
