# Inventrix 3D (Cuenta y soporte) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quitar la franja sobre la barra de pestañas para que Trix y la barra floten sobre el contenido; rediseñar Login y Configuración; reescribir los manuales que usa Trix.

**Architecture:** Primero el espacio inferior: el hook `useEspacioInferior` reemplaza el `paddingBottom` de la escena de pestañas, y cada contenedor con scroll lo agrega al final. Una prueba estática vigila que ninguna pantalla de pestaña lo olvide. Luego se extienden `Icono`, `Campo` y `FilaLista`; sobre ellos se rearman Login y Configuración, con sus hojas nuevas. Al final se reescriben los manuales, con una prueba que verifica que los textos citados existen en el código. Sin cambios de base de datos.

**Tech Stack:** Expo SDK 57, expo-router, expo-constants, TypeScript, react-native-safe-area-context, lucide-react-native, Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-10-13-inventrix-3d-cuenta-soporte-design.md`

## Global Constraints

- **Colores:** solo desde `useTema().colores` (tokens en `src/tema/tokens.ts`, claro y oscuro). Nunca hex en componentes ni en pantallas.
- **Espaciado:** con `ESPACIO` y `RADIO` de `src/tema/tokens.ts` (`ESPACIO = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24 }`). No se usan números sueltos para márgenes ni rellenos nuevos.
- **Texto y campos:** el texto solo con `Texto`; los campos con `EntradaTexto` o `Campo` (ESLint prohíbe `Text` y `TextInput` de react-native).
- **Íconos y toques:**
  - Íconos solo con `Icono` (Lucide). Si falta uno, se agrega a `ICONOS` en `src/components/Icono.tsx`.
  - Lo tocable va con `Presionable` o `Boton`, con objetivos táctiles de al menos 48 dp.
  - Todo botón de solo ícono lleva una `accessibilityLabel` completa.
- **Idioma:** textos en español y sin emojis. Las copias que fija la spec se usan literalmente.
- **Archivos:** UTF-8 sin BOM y fin de línea LF.
- **Commits:** mensajes en español con prefijo convencional y la línea final `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Verificación de cada tarea:** `npm run typecheck`, `npm run lint` y `npx jest <archivos de la tarea>`, todos limpios. La Tarea 8 corre `npm test` completo.
- **Montaje de las pruebas:**
  - Componentes y pantallas: `TemaProvider` + `SafeAreaProvider` (con `initialMetrics` como en `__tests__/components/AnilloExistencias.test.tsx`) y el mock de `@/features/configuracion/apariencia`.
  - Pantallas, además: los mocks de `__tests__/configuracion/configuracion.test.tsx` (supabase, expo-router, expo-notifications, push, AuthProvider) o los de `__tests__/auth/login.test.tsx`.

## Ajustes a la spec que fija este plan

- **Regla del espacio final (spec §6).** No se renderiza cada pantalla de pestaña: cada una necesita sus propios mocks de datos, y la prueba saldría frágil. En su lugar hay dos controles:
  - Una prueba estática (Tarea 2) recorre los archivos de las pantallas de pestaña y de los componentes que dibujan su contenido, y exige `useEspacioInferior` o `<Pantalla`.
  - Las pruebas de pantalla existentes de Inicio, Buscar, Historial y Entrada verifican el `paddingBottom` con el contexto activo.

  La regla de la spec se cumple igual: si se agrega una pantalla nueva sin el espacio, la prueba falla.
- **Espacio en `PantallaResultado`.** La spec no lo menciona, pero `PantallaResultado` se dibuja dentro de las pestañas (Entrada, Salida, Nuevo, Baja). Sin la franja, sus botones quedarían bajo la barra, así que también suma `useEspacioInferior()` (Tarea 1).
- **Fallo al cerrar sesión.** Si `cerrarSesion()` rechaza, `HojaCerrarSesion` muestra `AvisoAdvertencia` de peligro con `mensajeDeError(e)`, se queda abierta y vuelve a habilitar sus botones (Tarea 5).

## Review Focus

1. **Doble envío en Login.** El usuario toca "Iniciar sesión" y también pulsa "Enviar" en el teclado. Debe haber una sola llamada a `iniciarSesion` (prueba en la Tarea 4).
2. **Contraseña con espacios al inicio o al final.** Se envía tal cual; solo el usuario se recorta (prueba en la Tarea 4).
3. **Error del servidor al cambiar la contraseña.** La hoja se queda abierta con lo escrito y el aviso, y la contraseña no se borra (prueba en la Tarea 5).
4. **`cerrarSesion` falla por red.** Aparece el aviso, la hoja sigue abierta y "Cerrar sesión" vuelve a funcionar (prueba en la Tarea 5).
5. **Botones de `PantallaResultado` dentro de las pestañas.** Quedan por encima de la barra, porque su contenedor inferior suma el espacio (prueba en la Tarea 1).

---

### Task 1: Espacio inferior compartido

**Files:**
- Modify: `src/components/BarraInferior.tsx`, `app/(app)/_layout.tsx`, `src/components/Pantalla.tsx`, `src/components/PantallaResultado.tsx`
- Test: `__tests__/navegacion/barra.test.tsx`, `__tests__/components/componentes.test.tsx`, `__tests__/components/PantallaResultado.test.tsx`

**Interfaces:**
- Produces, en `src/components/BarraInferior.tsx`:
  - `EspacioInferiorContext = createContext(false)`.
  - `useEspacioInferior(): number`. Devuelve `espacioInferior(insets?.bottom ?? 0)` si el contexto es `true` y `0` si es `false`. Lee los insets con `useContext(SafeAreaInsetsContext)`, sin `useSafeAreaInsets`, para no lanzar sin proveedor.
- Modify:
  - `app/(app)/_layout.tsx`: envuelve `<Tabs>` en `<EspacioInferiorContext.Provider value={true}>`. `sceneStyle` queda solo con `{ backgroundColor: colores.fondo }`; se borran el comentario de reserva y el uso de `espacioInferior`.
  - `Pantalla`:
    - Con `scroll`, el `contentContainerStyle` lleva `paddingBottom: ESPACIO.l + espacio`.
    - Sin `scroll`, la vista lleva `paddingBottom: ESPACIO.l + espacio`.

    Con espacio 0 queda igual que hoy (el relleno actual es 16).
  - `PantallaResultado`: el contenedor de botones, que hoy lleva `paddingBottom: ESPACIO.l`, pasa a `ESPACIO.l + useEspacioInferior()`.

- [ ] **Step 1: Write the failing tests:**
  - En `barra.test.tsx`:
    - `it("useEspacioInferior es 0 fuera de las pestañas")`: un componente de prueba muestra el valor en un `Texto`; sin proveedor da `"0"`.
    - `it("useEspacioInferior dentro de las pestañas suma barra, inset y Trix")`: con `EspacioInferiorContext.Provider value={true}` y `initialMetrics` de `bottom: 24`, da `String(espacioInferior(24))` (`"162"`).
    - `it("el layout de pestañas no reserva espacio en la escena")`: lee `app/(app)/_layout.tsx` con `fs.readFileSync` y espera que no contenga `paddingBottom` y sí `EspacioInferiorContext.Provider`.
  - En `componentes.test.tsx`:
    - `it("Pantalla con scroll suma el espacio inferior en las pestañas")`: con el proveedor y `bottom: 24`, el `contentContainerStyle` del `ScrollView` (`UNSAFE_getByType(ScrollView)`) tiene `paddingBottom === 16 + 162`.
    - `it("Pantalla fuera de las pestañas conserva su relleno")`: sin proveedor, `paddingBottom === 16`.
  - En `PantallaResultado.test.tsx`: `it("los botones quedan sobre la barra en las pestañas")`. Con el proveedor y `bottom: 24`, el padre del botón principal tiene `paddingBottom === 16 + 162` (localizarlo por `testID="acciones-resultado"`, que se agrega a ese contenedor).
- [ ] **Step 2: Run** `npx jest __tests__/navegacion/barra.test.tsx __tests__/components/componentes.test.tsx __tests__/components/PantallaResultado.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** las piezas de arriba.
- [ ] **Step 4: Run** lo mismo. Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): espacio inferior por pantalla en lugar de la franja de las pestañas`

### Task 2: Espacio final en cada pantalla de pestaña

**Files:**
- Modify (cada contenedor con scroll suma `useEspacioInferior()` a su `paddingBottom`):
  - `app/(app)/index.tsx`, `app/(app)/buscar.tsx`, `app/(app)/movimientos/index.tsx`.
  - `app/(app)/administracion/index.tsx`, `pedir.tsx`, `producto/[id].tsx`, `producto/[id]/editar.tsx`, `reportes.tsx`, `baja.tsx`.
  - `app/(app)/nuevo.tsx` y `src/features/movimientos/FormularioMovimiento.tsx`.
  - `app/(app)/configuracion.tsx` no se toca aquí: se rehace en la Tarea 6 con `Pantalla scroll`.
- Create: `__tests__/navegacion/espacioFinal.test.ts`
- Test: `__tests__/inicio/pantalla.test.tsx`, `__tests__/productos/buscar.test.tsx`, `__tests__/movimientos/historialPantalla.test.tsx`, `__tests__/movimientos/entrada.test.tsx`

**Interfaces:**
- Consumes: `useEspacioInferior`, `EspacioInferiorContext` (Tarea 1).
- Regla:
  - Los contenedores con `contentContainerStyle={{ padding: ESPACIO.l, … }}` agregan `paddingBottom: ESPACIO.l + espacio`, y los de `padding: ESPACIO.xl` usan `ESPACIO.xl + espacio`.
  - Una `View` raíz sin scroll que lleva botones al pie (`administracion/index.tsx`) usa su relleno inferior actual + `espacio`.
  - Las pantallas con varios `ScrollView` (estados de carga, error y formulario en `nuevo.tsx`, `baja.tsx` y `FormularioMovimiento.tsx`) lo aplican en todos.

- [ ] **Step 1: Write the failing tests:**
  - `espacioFinal.test.ts`, `it("toda pantalla de pestaña reserva el espacio final")`:
    - Lista fija: `app/(app)/index.tsx`, `buscar.tsx`, `nuevo.tsx`, `configuracion.tsx`, `movimientos/index.tsx`, `administracion/index.tsx`, `pedir.tsx`, `producto/[id].tsx`, `producto/[id]/editar.tsx`, `reportes.tsx`, `baja.tsx` y `src/features/movimientos/FormularioMovimiento.tsx`.
    - Cada archivo contiene `useEspacioInferior(` o `<Pantalla`.
  - Mismo archivo, `it("la lista cubre todas las pantallas de pestaña")`:
    - Recorre `app/(app)` con `fs.readdirSync` recursivo, ignorando `_layout.tsx` y los archivos cuyo contenido incluye `<Redirect`.
    - Cada `.tsx` restante está en la lista o delega en un componente de la lista: `movimientos/entrada.tsx` y `salida.tsx` delegan en `FormularioMovimiento`, y la prueba lo acepta si el archivo importa `FormularioMovimiento`.
  - En las cuatro pruebas de pantalla, `it("deja espacio final para la barra y Trix")`:
    - Montar dentro de `EspacioInferiorContext.Provider value={true}` con `initialMetrics` `bottom: 24`.
    - El `contentContainerStyle` aplanado (`StyleSheet.flatten`) del `ScrollView` o `FlatList` principal tiene `paddingBottom === 16 + 162`.
    - En Entrada el contenedor es el `ScrollView` del formulario.
- [ ] **Step 2: Run** `npx jest __tests__/navegacion/espacioFinal.test.ts __tests__/inicio/pantalla.test.tsx __tests__/productos/buscar.test.tsx __tests__/movimientos/historialPantalla.test.tsx __tests__/movimientos/entrada.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** la regla en cada archivo. `configuracion.tsx` pasa la prueba estática por `<Pantalla`.
- [ ] **Step 4: Run** lo mismo. Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): el contenido pasa bajo la barra y Trix sin taparse al final`

### Task 3: Íconos, `Campo` con ícono y accesorio, `FilaLista` con derecha y tono

**Files:**
- Modify: `src/components/Icono.tsx`, `src/components/Campo.tsx`, `src/components/FilaLista.tsx`
- Test: `__tests__/components/componentes.test.tsx`, `__tests__/components/filas.test.tsx`

**Interfaces:**
- Produces:
  - **Íconos:** `ICONOS` suma `usuario: User`, `ojo: Eye`, `ojoTachado: EyeOff`, `salir: LogOut`, `ayuda: CircleHelp`.
  - **`Campo`:** nuevas props opcionales `iconoInicio?: NombreIcono` y `accesorioFin?: ReactNode`.
    - Con alguna de las dos, el borde, el fondo y el radio pasan a un `View` contenedor en fila (`minHeight: 48`). La `EntradaTexto` queda dentro con `flex: 1`, sin borde propio.
    - El ícono es de 20 dp, color `colores.textoSecundario`, `paddingLeft: ESPACIO.m`, y va oculto para accesibilidad (`accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`).
    - Sin ellas, el campo se dibuja exactamente como hoy.
    - El `style` del usuario sigue aplicándose a la `EntradaTexto`.
    - `Campo` reenvía `ref` a la `EntradaTexto` (`forwardRef<TextInput, Props>`), para que Login pase el foco.
  - **`FilaLista`:** nuevas props `derecha?: ReactNode` y `tono?: "normal" | "peligro"` (por defecto `"normal"`).
    - `derecha` se dibuja en lugar del chevrón.
    - Con `tono="peligro"`, el título va en `tono="peligro"` y no hay chevrón aunque haya `onPress`.
- **`EntradaTexto`:** hoy no reenvía `ref`; en esta tarea se le agrega `forwardRef<TextInput, Props>`.

- [ ] **Step 1: Write the failing tests:**
  - En `componentes.test.tsx`:
    - `it("Campo con iconoInicio y accesorioFin")`: `accesorioFin={<Boton titulo="X" … />}` → `getByRole("button", { name: "X" })`. Además, `getByLabelText("Usuario")` sigue siendo el campo.
    - `it("Campo sin extras conserva su estilo")`: el estilo aplanado de la entrada tiene `borderWidth === 1.5` y `minHeight === 48`.
    - `it("Campo reenvía la referencia")`: con `ref = createRef<TextInput>()`, `ref.current` no es nulo tras el render.
  - En `filas.test.tsx`:
    - `it("FilaLista con derecha no dibuja el chevrón")`: `derecha={<Texto>Sí</Texto>}` con `onPress`; `getByText("Sí")`, y `queryByTestId("chevron-fila")` es nulo. Para eso el `Icono` del chevrón recibe `testID="chevron-fila"`.
    - `it("FilaLista en tono peligro")`: el título tiene `color === colores.peligro` del tema claro y no hay chevrón.
- [ ] **Step 2: Run** `npx jest __tests__/components/componentes.test.tsx __tests__/components/filas.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS. Además, `npx jest __tests__/configuracion __tests__/productos/nuevo.test.tsx __tests__/productos/editar.test.tsx` sigue en verde.
- [ ] **Step 5: Commit** `feat(ui): campo con icono y accesorio, fila con contenido a la derecha y tono de peligro`

### Task 4: Login

**Files:**
- Modify: `app/login.tsx`
- Test: `__tests__/auth/login.test.tsx`

**Interfaces:**
- Consumes: `Campo` (`iconoInicio`, `accesorioFin`, `ref`), `AvisoAdvertencia`, `LogoMarca`, `Pantalla`, `Boton`, `useAuth().iniciarSesion(usuario, password)`, `mensajeDeError`.
- Layout:
  - `Pantalla scroll bordeSuperior`.
  - Bloque de marca centrado: `LogoMarca tamano={56}`, "Inventrix" en `variante="titulo"` y "Control de inventario" en tono secundario.
  - Campos "Usuario" (`iconoInicio="usuario"`, `returnKeyType="next"`, `onSubmitEditing` enfoca la contraseña) y "Contraseña" (`iconoInicio="candado"`, `returnKeyType="go"`, `onSubmitEditing={enviar}`).
  - El ojo es un `Presionable` de 48 × 48 dp con `accessibilityRole="button"`, la etiqueta "Mostrar contraseña" / "Ocultar contraseña" y el ícono `ojo` / `ojoTachado`.
  - Error: `AvisoAdvertencia` de peligro (mismo uso que en Baja) con el mensaje.
  - Botón "Iniciar sesión".
  - Pie: "¿Olvidaste tu contraseña? Pídele al administrador que la restablezca." en `variante="pequeno"`, tono secundario, centrado.
- Lógica:
  - `enviar()` sale si el formulario está incompleto o si la ref `enCurso.current` está en `true`.
  - Pone `enCurso` a `true` y lo libera en `finally`.
  - Llama a `iniciarSesion(usuario.trim(), password)`; la contraseña no se recorta.
  - El error se borra en el `onChangeText` de los dos campos.
  - Para centrar el contenido, `Pantalla` no se toca: el bloque lleva `flexGrow: 1` y `justifyContent: "center"` dentro de un `View`.

- [ ] **Step 1: Write the failing tests** (se conservan y adaptan los cuatro actuales):
  - `it("envía las credenciales")`: `"  ana.lopez "` y `" clave 1 "` → `iniciarSesion("ana.lopez", " clave 1 ")`.
  - `it("deshabilita el envío con campos vacíos")`: igual que hoy.
  - `it("muestra el error y lo borra al editar")`: el rechazo muestra el texto de `mensajeDeError`; tras `changeText` en "Usuario", `queryByText` es nulo.
  - `it("el ojo alterna secureTextEntry y su etiqueta")`: `press(getByRole("button", { name: "Mostrar contraseña" }))` → `secureTextEntry === false` y `getByRole("button", { name: "Ocultar contraseña" })`.
  - `it("la tecla Enviar inicia sesión")`: `fireEvent(getByLabelText("Contraseña"), "submitEditing")` → una llamada.
  - `it("doble envío llama una sola vez")`: `iniciarSesion` devuelve una promesa pendiente; `press` en "Iniciar sesión" y `submitEditing` → una llamada.
  - `it("muestra la marca y la ayuda de contraseña")`: `getByText("Inventrix")`, `getByText("Control de inventario")`, `getByText("¿Olvidaste tu contraseña? Pídele al administrador que la restablezca.")`.
- [ ] **Step 2: Run** `npx jest __tests__/auth/login.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(auth): login con marca, ojo en el campo y aviso de error`

### Task 5: `TarjetaPerfil`, `HojaContrasena`, `HojaCerrarSesion`

**Files:**
- Create: `src/features/configuracion/TarjetaPerfil.tsx`, `src/features/configuracion/HojaContrasena.tsx`, `src/features/configuracion/HojaCerrarSesion.tsx`
- Test: `__tests__/configuracion/piezas.test.tsx`

**Interfaces:**
- Consumes: `Perfil` (`@/features/auth/AuthProvider`), `AvatarProducto`, `Tarjeta`, `HojaInferior` (`children`, `onCerrar`, `bloqueado`; no tiene prop de título: el título va como primer hijo, `Texto variante="subtitulo" accessibilityRole="header"`, igual que en `HojaExportar`), `Campo`, `AvisoAdvertencia`, `Boton`, `validarContrasenaNueva`, `supabase.auth.updateUser`, `mensajeDeError`.
- Produces:
  - **`TarjetaPerfil({ perfil }: { perfil: Perfil })`:** `Tarjeta` en fila con `AvatarProducto nombre={perfil.nombre} tamano={56}`, el nombre en `cuerpoFuerte` y `` `@${perfil.usuario} · ${ROL}` `` en tono secundario, donde `ROL` es `{ admin: "Administrador", operativo: "Operativo" }`. Va `accessible` con la etiqueta `` `${nombre}, usuario ${usuario}, ${ROL}` ``.
  - **`HojaContrasena({ onCerrar, onGuardada }: { onCerrar: () => void; onGuardada: () => void })`:**
    - Título "Cambiar contraseña".
    - Campos "Nueva contraseña" y "Confirmar contraseña", con `secureTextEntry` según un ojo compartido, `iconoInicio="candado"` y `autoCapitalize="none"`. El `accesorioFin` del primer campo es el ojo, con las mismas etiquetas que en Login.
    - Botón "Guardar contraseña" con `loading`.
    - Al guardar: valida con `validarContrasenaNueva` y, si pasa, llama a `supabase.auth.updateUser({ password })`. Un error en la respuesta o una excepción muestran el aviso de peligro y conservan lo escrito; un guardado correcto llama a `onGuardada()`.
    - `bloqueado={guardando}` y ref `enCurso` contra el doble toque.
    - El aviso se borra al editar.
  - **`HojaCerrarSesion({ onCerrar, onConfirmar }: { onCerrar: () => void; onConfirmar: () => Promise<void> })`:**
    - Título "¿Cerrar sesión?" y el texto "Tendrás que volver a escribir tu usuario y contraseña para entrar."
    - `Boton` `variante="peligro"` "Cerrar sesión" con `loading` y `Boton` `variante="secundario"` "Cancelar" (llama a `onCerrar`).
    - `bloqueado` mientras confirma y ref `enCurso`. Si el rechazo llega, muestra el aviso de peligro con `mensajeDeError(e)` y libera.

- [ ] **Step 1: Write the failing tests** en `piezas.test.tsx` (mock de supabase como en `configuracion.test.tsx`):
  - `it("TarjetaPerfil del admin")`: `getByLabelText("Ana López, usuario ana.lopez, Administrador")` y `getByText("@ana.lopez · Administrador")`.
  - `it("TarjetaPerfil del operativo")`: `"@carlos.m · Operativo"`.
  - `it("contraseña corta muestra el error sin llamar a la API")`: `"1234567"` en ambos → el mensaje de `validarContrasenaNueva("1234567","1234567")`; `updateUser` sin llamar.
  - `it("error del servidor conserva lo escrito")`: `updateUser` resuelve `{ error: { message: "x" } }` → aviso visible; el valor de "Nueva contraseña" sigue igual; `onGuardada` sin llamar.
  - `it("el aviso se borra al editar")`.
  - `it("guardar correcto llama a onGuardada una vez")`: dos `press` seguidos con la promesa pendiente → `updateUser` una vez; tras resolver, `onGuardada` una vez.
  - `it("cerrar sesión confirma una vez")`: dos `press` en "Cerrar sesión" con la promesa pendiente → `onConfirmar` una vez.
  - `it("fallo al cerrar sesión muestra el aviso y permite reintentar")`: `onConfirmar` rechaza con `new Error("Sin conexión")` → aviso con `mensajeDeError`; un segundo `press` llama otra vez.
  - `it("Cancelar cierra")`: `onCerrar` llamado.
- [ ] **Step 2: Run** `npx jest __tests__/configuracion/piezas.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(configuracion): tarjeta de perfil y hojas de contraseña y cierre de sesión`

### Task 6: Pantalla de Configuración

**Files:**
- Modify: `app/(app)/configuracion.tsx`
- Test: `__tests__/configuracion/configuracion.test.tsx`

**Interfaces:**
- Consumes: Tareas 3 y 5, `Pantalla`, `Tarjeta`, `IconoTrix`, `useTema().alternarEsquema` y `esquema`, `cargarNotificaciones`, `registrarPush`, `useAuth()` (`perfil`, `cerrarSesion`), `Constants` de `expo-constants`.
- Layout:
  - `Pantalla scroll bordeSuperior` con el título "Configuración" (`variante="titulo"`, `accessibilityRole="header"`).
  - `TarjetaPerfil`.
  - "Contraseña actualizada." (tono de éxito, `accessibilityLiveRegion="polite"`) mientras `exito` sea `true`. Se pone en `false` al abrir la hoja de nuevo.
  - Encabezados de sección "CUENTA", "PREFERENCIAS" y "AYUDA" (`variante="pequeno"`, tono secundario, `accessibilityRole="header"`), cada uno seguido de una `Tarjeta` con sus filas, según spec §3.
  - Luego la `Tarjeta` de "Cerrar sesión" y el pie de versión.
  - La lógica de permisos y registro se conserva de las funciones actuales `SeccionNotificaciones` y `consultar`; se mueve a un componente `FilaNotificaciones` dentro del mismo archivo.
- Filas:
  - "Modo oscuro": `onPress={alternarEsquema}` y `derecha={<Switch accessibilityLabel="Modo oscuro" … />}`.
  - "Notificaciones" (solo admin): `detalle` `` `Permiso: ${permiso}` ``. Si el permiso no es `"Permitido"`, `derecha` es un `Boton` `variante="secundario"` "Reintentar" con `accessibilityLabel="Reintentar registro de notificaciones"`. (`Boton` ya acepta `accessibilityLabel` desde 3C.)
  - "Hablar con Trix": `detalle` "Dudas sobre cómo usar la app"; navega con `router.push("/soporte")`.
  - "Cerrar sesión": `tono="peligro"`, `izquierda` con el ícono `salir` en `colores.peligro`; abre `HojaCerrarSesion` con `onConfirmar={cerrarSesion}`.
- Versión: `const version = Constants.expoConfig?.version`. Si existe, muestra `` `Inventrix v${version}` ``.

- [ ] **Step 1: Write the failing tests** (se reescribe el archivo; se conservan los mocks y se agrega `jest.mock("expo-constants", () => ({ __esModule: true, default: { expoConfig: { version: "1.0.0" } } }))`):
  - `it("muestra el perfil y la versión")`: `getByText("@carlos.m · Operativo")`, `getByText("Inventrix v1.0.0")`.
  - `it("Cambiar contraseña abre la hoja y al guardar muestra el aviso")`: `press` en la fila → campos visibles; contraseña válida → `getByText("Contraseña actualizada.")`; la hoja se cierra (`queryByLabelText("Confirmar contraseña")` nulo).
  - `it("Notificaciones solo para el admin")`: el operativo no ve `"Notificaciones"` y el admin sí, con `getByText("Permiso: Permitido")`.
  - `it("Reintentar solo si el permiso no es Permitido")`: `getPermissionsAsync` resuelve `"denied"` → `getByRole("button", { name: "Reintentar registro de notificaciones" })`. Con `"granted"` no aparece.
  - `it("Cerrar sesión pide confirmación")`: `press` en la fila → `getByText("¿Cerrar sesión?")` y `cerrarSesion` sin llamar; `press` en el botón de la hoja → una llamada.
  - `it("Hablar con Trix navega a /soporte")`.
  - `it("el modo oscuro alterna desde la fila y desde el interruptor")`: dos alternancias → `guardarApariencia` llamado con `"oscuro"` y luego con `"claro"`.
- [ ] **Step 2: Run** `npx jest __tests__/configuracion/configuracion.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** lo mismo y `npx jest __tests__/navegacion/espacioFinal.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(configuracion): lista agrupada con perfil, hojas y versión`

### Task 7: Manuales

**Files:**
- Modify: `docs/manuales/manual-operativo.md`, `docs/manuales/manual-administrador.md`
- Create: `__tests__/scripts/manuales.test.ts`

**Interfaces:**
- Consumes: `dividirEnFragmentos` (`scripts/chunks.ts`), los textos reales de `app/` y `src/`.
- Reglas (spec §4):
  - Un `##` por tarea. La primera línea `#` y el párrafo de introducción se conservan.
  - Pasos numerados.
  - Textos de la app literales entre comillas dobles.
  - Cada manual cubre solo lo de su rol (`tabsPara`, `permisos.ts`).
  - Secciones mínimas del operativo: "Iniciar sesión", "Navegar por la aplicación", "Pedir ayuda a Trix", "Buscar un producto", "Ver la ficha de un producto", "Escanear un código", "Registrar una entrada", "Registrar una salida", "Ver el historial de movimientos", "Productos por pedir", "Notificaciones", "Cambiar tu contraseña", "Modo oscuro", "Cerrar sesión" y "¿Quién registra productos nuevos? El Administrador."
  - El del administrador suma "Registrar un producto nuevo", "Editar un producto", "Dar de baja un producto", "Ver reportes", "Exportar reportes a Excel" y "Permiso de notificaciones".
  - Los textos de botones y pantallas salen de leer el código actual. Ejemplos: la barra "Inicio", "Buscar", "Admin.", "Config."; el "+" con "Entrada", "Salida", "Nuevo producto"; en Historial, "Buscar por producto o código" y "Ver producto"; en Reportes, "Exportar a Excel". El implementador los confirma con `grep` antes de citarlos.

- [ ] **Step 1: Write the failing tests** en `manuales.test.ts`:
  - `it("cada fragmento tiene encabezado")`: `dividirEnFragmentos` sobre cada manual da fragmentos con `titulo` no vacío. Debe haber al menos 15 en el operativo y 21 en el administrador.
  - `it("los textos citados existen en la app")`:
    - Extrae del manual cada cadena entre comillas dobles `"…"` de hasta 60 caracteres.
    - Concatena el contenido de todos los `.ts` y `.tsx` de `app/` y `src/` (recorrido con `fs`).
    - Exige que cada cadena aparezca en ese texto. Para un texto armado con variables (por ejemplo, el título de una hoja), el manual cita solo la parte fija.
    - Lista de excepción vacía. Si alguna cadena no aparece, el mensaje de fallo la nombra.
  - `it("el manual operativo no describe funciones del administrador")`: el operativo no contiene "Dar de baja un producto", "Exportar a Excel" ni "Editar producto" como encabezado `##`.
- [ ] **Step 2: Run** `npx jest __tests__/scripts/manuales.test.ts`. Expected: FAIL (secciones y textos actuales desactualizados).
- [ ] **Step 3: Rewrite** los dos manuales.
- [ ] **Step 4: Run.** Expected: PASS. Además, `npx jest __tests__/scripts/chunks.test.ts` sigue en verde.
- [ ] **Step 5: Commit** `docs(manuales): manuales al día con las pantallas rediseñadas`

### Task 8: Verificación final

- [ ] **Step 1:** `npm run typecheck && npm run lint && npm test`. Expected: sin errores; todas las suites en verde.
- [ ] **Step 2:** `grep -rnE "#[0-9A-Fa-f]{3,6}\b" app/login.tsx "app/(app)/configuracion.tsx" app/\(app\)/_layout.tsx src/components/{Campo,FilaLista,Pantalla,PantallaResultado,BarraInferior}.tsx src/features/configuracion/*.tsx`. Expected: sin resultados.
- [ ] **Step 3:** Verificación manual en Expo Go (`npx expo start`), con `ana.lopez` (admin) y `carlos.m` (operativo), en modo claro y oscuro:
  - Inicio, Historial y Buscar se desplazan por debajo de Trix y de la barra, sin franja, y el último elemento es alcanzable.
  - Entrada y Salida, y su pantalla de resultado, con los botones visibles.
  - Login con el teclado: "Siguiente" y "Enviar".
  - Cambiar la contraseña y volver a entrar con la nueva.
  - Cerrar sesión con confirmación.

  Lo observado se anota en el PR.
- [ ] **Step 4:** Anotar en el PR, como pendiente del usuario: `npx tsx --env-file=.env scripts/ingestar-manuales.ts` en cada instalación tras el merge.
- [ ] **Step 5: Commit** de las correcciones, si las hubo: `fix(3d): ...`
