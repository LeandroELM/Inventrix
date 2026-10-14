# Inventrix — Parte 3D: Cuenta y soporte

Fecha: 2026-10-13 · Rama: `feat/ui-cuenta-soporte` (sale de `main` tras el merge de la 3C) · Antecedentes: `2026-10-11-inventrix-ui-base-design.md` (parte 1), `2026-10-11-inventrix-backend-parte2-design.md` (parte 2), `2026-10-11-inventrix-3a-inicio-consulta-design.md` (3A), `2026-10-12-inventrix-3b-registro-design.md` (3B), `2026-10-13-inventrix-3c-administracion-design.md` (3C)

## Contexto

Última de las cuatro sub-partes del rediseño de pantallas: 3A Inicio y consulta, 3B Registro y 3C Administración (hechas), **3D Cuenta y soporte** (esta).

Alcance:

- Login y Configuración. Hoy funcionan con componentes sin estilo; esta parte las rearma con las piezas de las partes anteriores.
- Trix. El panel de chat (`app/soporte.tsx`) ya se rediseñó en la parte 1 y no cambia. Lo que cambia es el botón flotante: se quita la franja que hoy queda sobre la barra de pestañas (§1).
- Los manuales (`docs/manuales/`), que son la fuente de las respuestas de Trix, se reescriben para describir las pantallas rediseñadas.

Referencia visual: el lenguaje ya implementado en 3A–3C. Colores, tipografía (Inter), íconos (Lucide) y tokens salen de la parte 1.

La lógica actual se conserva:

- **Login:** `iniciarSesion`, el recorte de espacios del usuario, `mensajeDeError` y la redirección.
- **Contraseña:** `validarContrasenaNueva` y `supabase.auth.updateUser`.
- **Notificaciones:** `registrarPush`, la consulta del permiso y sus textos.
- **Modo oscuro:** `alternarEsquema`.
- **Sesión:** `cerrarSesion`.

## Decisiones tomadas con el usuario

| Tema | Decisión |
|---|---|
| Franja sobre la barra | Se quita. Trix y la barra flotan sobre el contenido. El espacio final pasa del contenedor de la pestaña al final de cada lista con scroll. |
| Configuración | Tarjeta de perfil arriba y lista agrupada (Cuenta, Preferencias, Ayuda, Cerrar sesión) con `FilaLista`. Cambiar contraseña y Cerrar sesión abren una hoja inferior. |
| Login | Marca centrada y formulario limpio: logo, campos con ícono, ojo dentro del campo, aviso de error y la nota "pídele al administrador" en el pie. |
| Manuales | Se reescribe el texto de los dos manuales para que coincida con las pantallas actuales. No se muestran dentro de la app. |
| Panel de Trix | Sin cambios. Solo cambia el botón flotante. |

## 1. Trix flotante, sin franja

**Causa.** En `app/(app)/_layout.tsx`, `sceneStyle.paddingBottom: espacioInferior(bottom)` reserva abajo de cada pestaña la altura de la barra, su margen, el inset y `ESPACIO_TRIX`. Ese espacio se pinta con `colores.fondo` y forma la franja de la captura. El contenido termina antes y no pasa por debajo de la barra ni de Trix.

**Cambio:**

- Se quita `paddingBottom` de `sceneStyle`; el fondo de la escena se conserva.
- Nuevo hook `useEspacioInferior(): number` en `src/components/BarraInferior.tsx`:
  - Dentro de las pestañas devuelve `espacioInferior(insets.bottom)`.
  - Fuera de ellas devuelve `0`: Login, `/soporte`, `/notificaciones`, `/escaner` y las pantallas de prueba sin proveedor.
  - Para distinguir los dos casos, el layout de pestañas envuelve `Tabs` con un `EspacioInferiorContext` (valor `true`). El hook lee ese contexto y los insets con `useContext`, como ya hace `Pantalla`, para no lanzar sin `SafeAreaProvider`.
- Dónde se aplica el espacio:
  - **`Pantalla` con `scroll`:** suma `useEspacioInferior()` al `paddingBottom` de su `contentContainerStyle`.
  - **`Pantalla` sin `scroll`:** lo suma a su `paddingBottom`. Así los botones fijos abajo no quedan bajo la barra.
  - **`FlatList` y `ScrollView` propios:** cada pantalla de pestaña que no usa `Pantalla scroll` suma el valor al `paddingBottom` de su `contentContainerStyle`. Hoy son Inicio, Buscar, Historial, Existencias, A pedir, ficha de producto, Reportes, menú de Administración, Entrada, Salida, Editar producto y Configuración. El plan confirma la lista con `grep` sobre las pantallas de `app/(app)/`.
- Resultado: el contenido se desplaza por debajo de la barra y de Trix. Al llegar al final, el último elemento queda completo encima de ellos.
- `BotonTrix` conserva posición, tamaño, sombra `elevada` y la regla de ocultarse con el teclado. La sombra lo separa del contenido que pasa por debajo.
- `ESPACIO_TRIX` y `espacioInferior` se conservan; solo cambia quién los usa.

## 2. Piezas compartidas

Todas usan `useTema()` (sin colores fijos), `Texto`, `Icono` (Lucide) y `Presionable`, con objetivos táctiles de al menos 48 dp y etiquetas de accesibilidad completas.

**Íconos nuevos en `Icono`:** `usuario` (User), `ojo` (Eye), `ojoTachado` (EyeOff), `salir` (LogOut), `ayuda` (CircleHelp).

**`src/components/`**

- **`Campo`** (parte 1, se extiende) — props opcionales:
  - `iconoInicio?: NombreIcono`: ícono de 20 dp a la izquierda, en `colores.textoSecundario`, decorativo para accesibilidad.
  - `accesorioFin?: ReactNode`: se dibuja dentro del campo, a la derecha.

  El texto deja espacio a ambos lados según lo que haya. Sin estas props el campo se ve como hoy.
- **`FilaLista`** (parte 1, se extiende) — props opcionales:
  - `derecha?: ReactNode`: reemplaza el chevrón, por ejemplo con un interruptor o un botón.
  - `tono?: "normal" | "peligro"`: con `peligro`, título e ícono en `colores.peligro`.

  Sin estas props la fila se ve como hoy.

**`src/features/configuracion/`**

- **`TarjetaPerfil`** — props: `perfil: Perfil`.
  - Lleva `AvatarProducto` con `nombre={perfil.nombre}` y `tamano={56}` (iniciales y color de `colores.avatares`), el nombre en `cuerpoFuerte` y `"@<usuario> · <Administrador|Operativo>"` en tono secundario.
  - Es un solo elemento de accesibilidad: `"<nombre>, usuario <usuario>, <rol>"`.
- **`HojaContrasena`** — props: `onCerrar`, `onGuardada`.
  - `HojaInferior` con el título "Cambiar contraseña" y los `Campo` "Nueva contraseña" y "Confirmar contraseña" (`secureTextEntry`, ícono `candado`, ojo con la misma regla de Login).
  - Botón "Guardar contraseña" con `loading`.
  - Valida con `validarContrasenaNueva`. El error de validación o del servidor (`mensajeDeError`) va en un `AvisoAdvertencia` de peligro dentro de la hoja y se borra al editar cualquiera de los dos campos.
  - Mientras guarda: `bloqueado` en `HojaInferior` y una referencia contra el doble toque.
  - Si guarda bien, llama a `onGuardada()` y la pantalla cierra la hoja.
- **`HojaCerrarSesion`** — props: `onCerrar`, `onConfirmar: () => Promise<void>`.
  - `HojaInferior` con el título "¿Cerrar sesión?" y el texto "Tendrás que volver a escribir tu usuario y contraseña para entrar."
  - Botones "Cerrar sesión" (`variante="peligro"`, `loading`) y "Cancelar" (`variante="secundario"`).
  - Mientras confirma: `bloqueado` y protección contra doble toque.

## 3. Pantallas

**Login** (`app/login.tsx`):

- `Pantalla scroll` con `bordeSuperior`, contenido centrado verticalmente y `keyboardShouldPersistTaps="handled"`.
- **Marca:** `LogoMarca tamano={56}`; "Inventrix" en `variante="titulo"`; "Control de inventario" en tono secundario.
- **Campos:**
  - "Usuario": `iconoInicio="usuario"`, `autoCapitalize="none"`, `autoCorrect={false}`, `returnKeyType="next"`; "Siguiente" pasa el foco a Contraseña.
  - "Contraseña": `iconoInicio="candado"`, `returnKeyType="go"`; "Enviar" llama a `enviar()` si el formulario está completo.
  - El `accesorioFin` de Contraseña es un `Presionable` de 48 × 48 dp con el ícono `ojo` u `ojoTachado` y la etiqueta "Mostrar contraseña" / "Ocultar contraseña". El botón "Mostrar contraseña" actual desaparece.
- **Error:** `AvisoAdvertencia` de peligro con `mensajeDeError(e)` sobre el botón. Se borra cuando el usuario edita cualquier campo.
- **Botón "Iniciar sesión":** ancho completo, `disabled` si falta usuario o contraseña, `loading` mientras entra. Una referencia `enCurso` impide un segundo envío, incluido el que llega desde la tecla del teclado.
- **Pie:** "¿Olvidaste tu contraseña? Pídele al administrador que la restablezca." en `variante="pequeno"`, tono secundario, centrado.

**Configuración** (`app/(app)/configuracion.tsx`, ambos roles):

- `Pantalla scroll bordeSuperior` (el espacio final sale de §1); título "Configuración" en `variante="titulo"`, sin botón de volver.
- `TarjetaPerfil` (si hay `perfil`).
- Si se cambió la contraseña: el texto "Contraseña actualizada." en tono de éxito bajo la tarjeta, con `accessibilityLiveRegion="polite"`.
- Cada sección lleva un encabezado en `variante="pequeno"`, tono secundario y mayúsculas, con `accessibilityRole="header"`, y sus filas dentro de una `Tarjeta`:
  - **CUENTA:** `FilaLista` "Cambiar contraseña" con `izquierda` ícono `candado`. Abre `HojaContrasena`.
  - **PREFERENCIAS:**
    - `FilaLista` "Modo oscuro" con `izquierda` ícono `luna` y `derecha` un `Switch` con la etiqueta "Modo oscuro". Tocar la fila también alterna el modo.
    - Solo el admin ve `FilaLista` "Notificaciones" (`izquierda` ícono `campana`) con `detalle` "Permiso: <Permitido|Denegado|Sin definir|No disponible|Consultando…>". Si el permiso no es "Permitido", la fila lleva en `derecha` un `Boton` pequeño `variante="secundario"` "Reintentar" con `accessibilityLabel` "Reintentar registro de notificaciones". Los mensajes de resultado ("Dispositivo registrado.", el de permiso denegado, el de no disponible, el error) van debajo de la tarjeta, como hoy.
  - **AYUDA:** `FilaLista` "Hablar con Trix" con `izquierda` `IconoTrix tamano={20}` y `detalle` "Dudas sobre cómo usar la app". Navega a `/soporte`.
  - `Tarjeta` con `FilaLista` "Cerrar sesión", `tono="peligro"`, `izquierda` ícono `salir` y sin chevrón. Abre `HojaCerrarSesion`, cuyo `onConfirmar` llama a `cerrarSesion()`.
- **Pie:** "Inventrix v<versión>" en `variante="pequeno"`, tono secundario, centrado. La versión sale de `Constants.expoConfig?.version`; si no existe, la línea no se muestra.

**Trix** (`app/soporte.tsx`): sin cambios.

## 4. Manuales

Se reescriben `docs/manuales/manual-operativo.md` y `docs/manuales/manual-administrador.md` para describir la app actual (3A–3D):

- **Estructura:** un `##` por tarea, con nombres cortos y buscables: "Iniciar sesión", "Navegar por la aplicación", "Buscar un producto", "Registrar una entrada", "Ver el historial", etc. Cada sección tiene pasos numerados y, si aplica, los mensajes que muestra la app. Así cada fragmento de `scripts/chunks.ts` responde una sola pregunta.
- **Contenido por rol:** cada manual describe solo lo que ese rol ve y puede hacer, según `tabsPara` y `permisos.ts`. El del operativo dice quién hace lo que él no puede hacer, como hoy ("Los productos nuevos solo los registra el Administrador").
- **Textos literales:** los nombres de pestañas, botones, filtros, encabezados y mensajes se copian tal cual del código, entre comillas. Ejemplos: "Iniciar sesión", el ojo "Mostrar contraseña", la barra (Inicio, Buscar, +, Admin., Config.), "Hablar con Trix", "Exportar a Excel".
- **Temas que cubren:**
  - **Ambos:** iniciar sesión (con la nota de contraseña olvidada), la barra y el botón de Trix, Inicio, Buscar y la ficha, el escáner, Entrada, Salida, Historial (búsqueda, filtros, detalle), A pedir, Notificaciones y Configuración (cambiar contraseña, modo oscuro, cerrar sesión).
  - **Solo admin:** Nuevo producto, Editar producto, Dar de baja, Reportes y "Exportar a Excel", y el permiso de notificaciones.
- **Después del merge:** hay que volver a cargar los manuales en la base de datos de cada instalación con `npx tsx --env-file=.env scripts/ingestar-manuales.ts`, que necesita `SUPABASE_SERVICE_ROLE_KEY`. Es un paso manual del usuario y va en la lista "Pendiente" del PR. `docs/SETUP-SERVICIOS.md` ya indica que el script se puede repetir cada vez que cambien los manuales.

## 5. Datos

- Sin cambios de base de datos, de RPC ni de lógica de sesión.
- `EspacioInferiorContext` y `useEspacioInferior` viven en `src/components/BarraInferior.tsx` junto a `espacioInferior`.

## 6. Pruebas

**Jest por pieza:**

- `useEspacioInferior`: `0` sin contexto, `espacioInferior(bottom)` dentro del contexto.
- `Pantalla`: suma el espacio con y sin `scroll` dentro del contexto; sin contexto queda igual que hoy.
- `Campo`: `iconoInicio` y `accesorioFin` se dibujan; sin ellos, igual que hoy.
- `FilaLista`: `derecha` reemplaza el chevrón; `tono="peligro"`.
- `TarjetaPerfil`: textos y etiqueta de accesibilidad para los dos roles.
- `HojaContrasena`: error de validación, error del servidor, el error se borra al editar, guardado llama a `onGuardada` y no admite doble toque.
- `HojaCerrarSesion`: confirmar llama una vez y "Cancelar" cierra.

**Jest por pantalla:**

- **Login:** el ojo cambia `secureTextEntry` y la etiqueta; botón deshabilitado si está incompleto; el error aparece y se borra al editar; doble toque y tecla "Enviar" llaman a `iniciarSesion` una sola vez; usuario recortado.
- **Configuración:** la fila Notificaciones solo para el admin; "Reintentar" solo si el permiso no es "Permitido"; "Contraseña actualizada." tras guardar; "Cerrar sesión" pide confirmación antes de llamar a `cerrarSesion`; "Hablar con Trix" navega a `/soporte`; el modo oscuro alterna desde la fila y desde el interruptor.
- **Regla del espacio final:** una prueba renderiza cada pantalla de pestaña dentro de `EspacioInferiorContext` con un inset conocido y verifica que el contenedor con scroll (o la vista raíz si no hay scroll) incluye `espacioInferior(inset)` en su `paddingBottom`. Si alguien agrega una pantalla y olvida el espacio, falla.
- **Layout de pestañas:** `sceneStyle` ya no lleva `paddingBottom`.
- **Manuales:** una prueba lee los dos `.md` y verifica que cada texto entre comillas de una lista fija (botones y pestañas citados) existe en `app/` o `src/`. Si un botón cambia de nombre, el manual no queda desactualizado en silencio.

**Verificación manual** en Expo Go con `ana.lopez` (admin) y `carlos.m` (operativo), en modo claro y oscuro:

- Inicio, Historial y Buscar desplazándose por debajo de Trix y de la barra, sin franja, con el último elemento alcanzable.
- Entrada y Salida con su botón final visible.
- Login con teclado: "Siguiente" y "Enviar".
- Cambiar contraseña y volver a entrar con la nueva.
- Cerrar sesión con confirmación.
- Trix respondiendo con el texto nuevo después de volver a ingestar los manuales.

## Fuera de alcance

- El panel de chat de Trix (`app/soporte.tsx`) y su backend.
- Recuperación de contraseña por correo.
- Mostrar los manuales dentro de la app.
- Inicio, Buscar, ficha, A pedir y Notificaciones (3A); Entrada, Salida, Nuevo producto y Escáner (3B); Historial, Administración, Reportes, Dar de baja y Editar producto (3C). Estas pantallas solo cambian para usar el espacio final de §1.
