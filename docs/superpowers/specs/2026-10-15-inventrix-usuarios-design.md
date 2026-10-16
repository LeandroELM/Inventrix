# Inventrix — Gestión de usuarios

Fecha: 2026-10-15 · Rama: `feat/usuarios` (sale de `main` tras el merge de la PR #10) · Antecedentes: `2026-10-10-inventrix-design.md` (decisión 3: cuentas creadas por un Administrador mediante `admin-usuarios`), `2026-10-13-inventrix-3d-cuenta-soporte-design.md` (Configuración y cambio de contraseña propia)

## Contexto

El diseño original prevé que un Administrador cree cuentas con la Edge Function `admin-usuarios`, pero la app no tiene ninguna pantalla para hacerlo: hoy la única vía es el script `scripts/crear-admin.ts`, pensado para el primer administrador de cada instalación.

Lo que ya existe:

- **Alta:** `admin-usuarios` crea la cuenta en Auth con el correo sintético `<usuario>@usuarios.inventrix.app`; el trigger de `auth.users` crea la fila de `perfiles`. Hoy recibe la contraseña desde el cliente.
- **Lectura:** la política `perfiles_select` deja que un administrador lea todos los perfiles.
- **Estado:** `perfiles.activo` ya gobierna el acceso. `usuario_activo()` devuelve falso para un perfil inactivo, así que no lee productos ni movimientos, y `AuthProvider` cierra la sesión de un perfil inactivo al cargarlo. Nada cambia hoy esa columna.

Esta parte agrega la gestión completa desde la app: listar, crear, cambiar rol, restablecer contraseña y desactivar o reactivar.

## Decisiones tomadas con el usuario

| Tema | Decisión |
|---|---|
| Alcance | Ver lista y crear, desactivar/reactivar, restablecer contraseña y cambiar rol. |
| Contraseña | La genera el servidor como temporal. El admin la comparte y la persona la cambia en Configuración. No se obliga a cambiarla al entrar. |
| Backend | Edge Function para lo que necesita la API de administración de Auth (crear, restablecer). RPC en SQL para lo que solo toca `perfiles` (rol, estado). |
| Compartir | `Share` de React Native: el menú de Android ya trae WhatsApp y "Copiar". Sin dependencias nuevas. |

## 1. Backend

### 1.1 Edge Function `admin-usuarios`

Solo para administradores activos (`obtenerPerfil` + `rol === "admin"`, como hoy). `POST` con un campo `accion`:

| `accion` | Cuerpo | Éxito |
|---|---|---|
| `crear` | `{ accion, usuario, nombre, rol }` | `201 { id, password }` |
| `restablecer` | `{ accion, id }` | `200 { password }` |

- **`crear`:** valida con la regla actual (`usuario` `^[a-z0-9._-]{3,30}$`, `nombre` no vacío y ≤ 120, `rol` admin u operativo), genera la contraseña y llama a `auth.admin.createUser` con `email_confirm: true` y los metadatos `usuario`, `nombre`, `rol`. El cliente ya no envía contraseña.
- **`restablecer`:** valida que `id` sea un UUID. Si es el id del llamador responde `ACCION_SOBRE_SI_MISMO`. Si no existe un perfil con ese id responde `USUARIO_NO_ENCONTRADO`. Si existe, genera la contraseña y llama a `auth.admin.updateUserById(id, { password })`. Funciona también con usuarios inactivos.
- **Contraseña temporal:** `generarContrasena()` en `logica.ts`. 10 caracteres elegidos con `crypto.getRandomValues` del alfabeto `ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789` (sin `0 O o 1 I l i L`), con rechazo de valores para que la distribución sea uniforme. Se devuelve una sola vez y no se guarda en ningún otro sitio.
- **Errores** (`{ error: CODIGO }`):

| Código | HTTP | Cuándo |
|---|---|---|
| `NO_AUTENTICADO` | 401 | Sin sesión válida (sin cambios). |
| `NO_AUTORIZADO` | 403 | El llamador no es admin activo (sin cambios). |
| `DATOS_INVALIDOS` | 400 | Cuerpo o `accion` inválidos. |
| `USUARIO_EXISTENTE` | 409 | `crear` con un usuario ya registrado (sin cambios). |
| `ACCION_SOBRE_SI_MISMO` | 409 | `restablecer` sobre la propia cuenta. |
| `USUARIO_NO_ENCONTRADO` | 404 | `restablecer` con un id sin perfil. |
| `ERROR_INTERNO` | 500 | Cualquier otro fallo. |

- `logica.ts` exporta `validarSolicitud(input)`, que devuelve la unión `{ accion: "crear", usuario, nombre, rol } | { accion: "restablecer", id }`, y `generarContrasena()`. `validarAltaUsuario` y `emailDeUsuario` se conservan. `index.ts` queda como enrutador delgado.
- **Contrato:** cambia (el cliente ya no manda `password`), pero la app aún no usa la función, así que no rompe nada. `scripts/crear-admin.ts` no cambia: usa la service_role directamente.

### 1.2 Migración `20261015000000_usuarios.sql`

Dos funciones `security definer`, `set search_path = ''`, `language plpgsql`, con `revoke execute ... from public, anon` y `grant execute ... to authenticated`, como las RPC existentes:

```sql
public.cambiar_rol_usuario(p_id uuid, p_rol public.rol_usuario) returns void
public.cambiar_estado_usuario(p_id uuid, p_activo boolean) returns void
```

Comprobaciones, en este orden, con `raise exception '<CODIGO>' using errcode = 'P0001'`:

1. `not public.usuario_activo() or not public.es_admin()` → `NO_AUTORIZADO`.
2. `p_id = auth.uid()` → `ACCION_SOBRE_SI_MISMO`.
3. Sin fila en `perfiles` para `p_id` → `USUARIO_NO_ENCONTRADO`.

Luego `update public.perfiles set rol = p_rol` (o `set activo = p_activo`). Al desactivar (`p_activo = false`), además `delete from public.dispositivos where usuario_id = p_id`, para que deje de recibir notificaciones push.

**Por qué alcanza con "no sobre sí mismo":** quien ejecuta siempre es un admin activo y no puede degradarse ni desactivarse; por lo tanto, después de cualquier acción queda al menos un admin activo. No hace falta contar administradores.

`perfiles.rol` es la fuente de verdad del rol (`es_admin()` lo lee de ahí). Los metadatos de Auth solo se usan al crear el perfil y no se sincronizan.

### 1.3 Lista

`listarUsuarios()` lee `perfiles` (`id, usuario, nombre, rol, activo`) ordenado por `nombre`. No hace falta RPC: la política actual ya lo permite al admin y el operativo solo ve su propia fila (que igual nunca llega a esta pantalla).

### 1.4 Límite conocido

Si la persona tiene la app abierta en el momento de desactivarla, sigue viendo lo ya cargado. Toda consulta nueva le devuelve vacío por RLS, y `AuthProvider` cierra su sesión la próxima vez que carga el perfil. No se invalida la sesión en el momento: obligaría a pasar la desactivación por la Edge Function.

## 2. Pantallas

Las tres son rutas apiladas sobre las pestañas (Stack de `app/(app)`), así que Volver regresa a la pantalla de origen. Todas van envueltas en `RequiereRol rol="admin"`, usan `Encabezado variante="pantalla"`, reservan el espacio final con `useEspacioInferior()` y usan solo tokens del tema.

**Entrada:** en `app/(app)/(tabs)/administracion.tsx`, opción **"Usuarios"**, detalle "Altas, roles, contraseñas y acceso", icono `usuario`, ruta `/administracion/usuarios`, acción `gestionar_usuarios`. `Accion` suma `"gestionar_usuarios"` (solo admin: no se agrega al conjunto del operativo).

### 2.1 Lista — `app/(app)/administracion/usuarios/index.tsx`

- Encabezado "Usuarios" con volver y acción de icono `mas`, etiqueta "Nuevo usuario", que hace `push("/administracion/usuarios/nuevo")`.
- Dos secciones con `Tarjeta` y `FilaLista`: "Activos (n)" y, si hay, "Inactivos (n)". Cada fila:
  - Izquierda: `AvatarProducto` con `nombre` (iniciales y color del tema).
  - Título: nombre; si es la cuenta propia, se agrega " (tú)".
  - Detalle: `@usuario · Administrador` u `@usuario · Operativo`.
  - Inactivos: `<Etiqueta tipo="inactivo" texto="Inactivo" />` a la derecha y la fila con opacidad reducida.
  - Toque: `push("/administracion/usuarios/<id>")`.
- `ScrollView` con `RefreshControl`, `Skeleton.Fila` ×3 en la primera carga y `EstadoError` "No se pudo cargar la lista de usuarios." con Reintentar.

### 2.2 Ficha — `app/(app)/administracion/usuarios/[id].tsx`

- Encabezado "Usuario" con volver.
- Tarjeta de cabecera: `AvatarProducto` de 56, nombre en `cuerpoFuerte`, `@usuario` en secundario y `<Etiqueta tipo="disponible" texto="Activo" />` o `<Etiqueta tipo="inactivo" texto="Inactivo" />`. Un solo elemento de accesibilidad: "<nombre>, usuario <usuario>, <rol>, <activo|inactivo>".
- **Cuenta propia:** no hay acciones. Se muestra el texto "Tu cuenta se administra en Configuración."
- **Rol:** `Segmentado` Operativo / Administrador con el rol actual. Elegir el otro abre una `HojaInferior`:
  - A administrador: "¿Hacer administrador a <nombre>?" — "Podrá registrar y editar productos, dar de baja, ver reportes y alertas, y administrar usuarios."
  - A operativo: "¿Cambiar a <nombre> a operativo?" — "Solo podrá consultar existencias y registrar entradas y salidas."
  - Botones "Cambiar rol" (con carga) y "Cancelar". El segmentado no cambia hasta que la RPC responde. La hoja no se cierra mientras está en curso.
- **"Restablecer contraseña"** (`FilaLista` con icono `candado`): hoja "¿Restablecer la contraseña?" — "Se generará una contraseña temporal y la actual dejará de funcionar." — botón "Restablecer". Al terminar, la misma hoja pasa a mostrar "Contraseña temporal", la contraseña en `titulo` con fuente monoespaciada y separación entre letras, la línea "Compártela con <nombre>. Podrá cambiarla en Configuración.", y los botones **"Compartir"** (abre `Share` con el mensaje de §3.3) y **"Listo"**. La contraseña no se vuelve a mostrar después de cerrar.
- **"Desactivar usuario"** (tono peligro, icono `salir`) si está activo: hoja "¿Desactivar a <nombre>?" — "No podrá entrar ni ver el inventario. Su historial se conserva." — botón de peligro "Desactivar".
- **"Reactivar usuario"** (icono `check`) si está inactivo: hoja "¿Reactivar a <nombre>?" — "Podrá volver a entrar con su contraseña actual." — botón "Reactivar".
- Errores de cualquier acción: `AvisoAdvertencia` de peligro dentro de la hoja con `mensajeDeError(e)`; la hoja sigue abierta.
- Carga: `Skeleton.Tarjeta`. Error: `EstadoError` con Reintentar. Usuario inexistente: "No se encontró el usuario." con volver.

### 2.3 Nuevo usuario — `app/(app)/administracion/usuarios/nuevo.tsx`

- Encabezado "Nuevo usuario" con acción de icono `cerrar` (`router.back()`).
- Campos (`Campo`):
  - **Nombre** — "Nombre y apellido", `autoCapitalize="words"`.
  - **Usuario** — `autoCapitalize="none"`, `autoCorrect={false}`. Debajo, mientras no haya error, un `Texto variante="pequeno" tono="secundario"` con la pista "Minúsculas, números, punto o guion (3 a 30)" (`Campo` no tiene prop de pista). Error en vivo (prop `error` de `Campo`) cuando el texto no está vacío y no cumple `usuarioValido`: "Usa de 3 a 30 minúsculas, números, punto o guion."
  - **Rol** — `Segmentado` Operativo / Administrador, Operativo por defecto.
- Botón "Crear usuario": deshabilitado si falta el nombre o el usuario no es válido; `loading` en curso; una referencia `enCurso` impide un segundo envío.
- `USUARIO_EXISTENTE` aparece como error del campo Usuario ("Ya existe un usuario con ese nombre."). Los demás errores, en `AvisoAdvertencia` sobre el botón. Ambos se borran al editar.
- Éxito: `PantallaResultado` "¡Usuario creado!", frase "<nombre> ya puede entrar a Inventrix con esta contraseña temporal.", datos Usuario, Rol y Contraseña temporal. Principal **"Compartir acceso"** (`Share`, §3.3; la pantalla se mantiene). Secundario **"Volver a Usuarios"** (`router.back()`).

## 3. Datos en la app

### 3.1 `src/features/usuarios/`

- `api.ts`
  - `type Usuario = { id; usuario; nombre; rol: Rol; activo: boolean }`.
  - `listarUsuarios()`, `obtenerUsuario(id)` (`maybeSingle`, `null` si no existe).
  - `crearUsuario({ usuario, nombre, rol })` → `{ id, password }` y `restablecerContrasena(id)` → `{ password }`: `supabase.functions.invoke("admin-usuarios", { body })`. Ante un error leen `{ error }` del cuerpo de la respuesta (`error.context`, como `src/features/soporte/api.ts`) y lanzan `new Error(codigo)`; sin cuerpo, relanzan el error original.
  - `cambiarRol(id, rol)` y `cambiarEstado(id, activo)`: `supabase.rpc(...)`; ante error lanzan `new Error(error.message)`.
- `hooks.ts`: `useUsuarios()` (`["usuarios"]`), `useUsuario(id)` (`["usuarios", id]`) y mutaciones `useCrearUsuario`, `useRestablecerContrasena`, `useCambiarRol`, `useCambiarEstado`. Las que cambian datos invalidan `["usuarios"]` al terminar.
- `validacion.ts`: `PATRON_USUARIO` (misma expresión que el servidor), `usuarioValido(texto)`, `ETIQUETA_ROL` (`Administrador`/`Operativo`) y `mensajeAcceso({ usuario, password })`.

### 3.2 Tipos y errores

- `src/lib/database.types.ts`: se regenera con `supabase gen types` tras la migración.
- `src/lib/errores.ts` suma:
  - `USUARIO_EXISTENTE`: "Ya existe un usuario con ese nombre."
  - `USUARIO_NO_ENCONTRADO`: "No se encontró el usuario."
  - `ACCION_SOBRE_SI_MISMO`: "No puedes cambiar tu propia cuenta desde aquí."

### 3.3 Mensaje para compartir

```
Tu acceso a Inventrix
Usuario: <usuario>
Contraseña temporal: <password>
Cámbiala en Configuración > Contraseña al entrar.
```

## 4. Pruebas

- **Deno** (`supabase/functions/admin-usuarios/logica.test.ts`): `validarSolicitud` acepta `crear` y `restablecer` válidos y rechaza acción desconocida, usuario inválido, rol inválido, nombre vacío e id que no es UUID; `generarContrasena` devuelve 10 caracteres del alfabeto y dos llamadas dan resultados distintos.
- **pgTAP** (`supabase/tests/11_usuarios.test.sql`): el operativo recibe `NO_AUTORIZADO` en ambas RPC; el admin sobre sí mismo recibe `ACCION_SOBRE_SI_MISMO`; id inexistente → `USUARIO_NO_ENCONTRADO`; cambiar rol actualiza `perfiles.rol`; desactivar pone `activo = false` y borra sus `dispositivos`; un usuario desactivado ya no lee `productos`; reactivar vuelve a `activo = true`; `anon` no puede ejecutar las funciones.
- **Jest:**
  - Lista: secciones y conteos, "(tú)", etiqueta Inactivo, navegación a ficha y a Nuevo, esqueleto, error con reintentar, espacio final.
  - Ficha: cambio de rol con confirmación y llamada a la RPC; cancelar no llama; restablecer muestra la contraseña y Compartir llama a `Share.share` con el mensaje; desactivar y reactivar; la cuenta propia no muestra acciones; error dentro de la hoja.
  - Nuevo: validación en vivo, botón deshabilitado, `USUARIO_EXISTENTE` bajo el campo, doble toque crea una vez, resultado con los datos y Compartir acceso.
  - `validacion.ts` y `api.ts` (extracción del código de error del cuerpo).
  - Menú de Administración con la opción Usuarios; `permisos` con `gestionar_usuarios` solo para admin.
  - `espacioFinal.test.ts` cubre las pantallas nuevas automáticamente (agregar a la lista).

## 5. Documentación

- `docs/manuales/manual-administrador.md`: sección "Gestionar usuarios" (crear y compartir el acceso, cambiar rol, restablecer contraseña, desactivar y reactivar). Después del merge hay que volver a ingestar los manuales (`npx tsx --env-file=.env scripts/ingestar-manuales.ts`) para que Trix la conozca: va en la lista "Pendiente" de la PR.
- `docs/SETUP-SERVICIOS.md` §5: tras el primer administrador, las demás cuentas se crean desde Administración > Usuarios.
- `docs/qa/checklist-funcional.md`: casillas para crear, compartir, cambiar rol, restablecer, desactivar (la persona pierde acceso y deja de recibir push) y reactivar.

## Fuera de alcance

- Borrar usuarios (se desactivan para conservar el historial).
- Editar nombre o nombre de usuario.
- Invalidar la sesión en el momento de desactivar.
- Obligar a cambiar la contraseña temporal en el primer inicio de sesión.
