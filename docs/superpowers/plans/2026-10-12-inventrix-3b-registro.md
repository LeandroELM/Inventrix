# Inventrix 3B (Registro) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar Entrada, Salida, Nuevo producto y Escáner según el prototipo, con tarjeta de confirmación en el escáner y una pantalla de éxito compartida.

**Architecture:** Primero las piezas compartidas en `src/components/` (cada una con su prueba) y los dos ayudantes de datos (`codigoRegistrado`, `leerCodigoDeImagen`); luego cada pantalla se rearma con ellas conservando su lógica actual. Sin cambios de base de datos.

**Tech Stack:** Expo SDK 57, expo-router, TypeScript, TanStack Query, react-hook-form, expo-camera, expo-image-picker, expo-linear-gradient, lucide-react-native, Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-10-12-inventrix-3b-registro-design.md`

## Global Constraints

- Colores solo desde `useTema().colores` (tokens en `src/tema/tokens.ts`, claro y oscuro); nunca hex en componentes o pantallas. El degradado de marca es `colores.encabezado` con `LinearGradient` (como `TarjetaPrincipal`).
- Texto solo con `Texto`; campos con `EntradaTexto`/`Campo` (ESLint prohíbe `Text`/`TextInput` de react-native).
- Íconos solo con `Icono` (Lucide; si falta uno, se agrega a `ICONOS` en `src/components/Icono.tsx`); lo tocable con `Presionable` o `Boton`; objetivos táctiles ≥ 48 dp; `accessibilityLabel` completa en todo botón de solo ícono.
- El encabezado de pantalla es `Encabezado` con `variante="pantalla"` (props `titulo`, `subtitulo?`, `onAtras?`, `accion?`).
- Textos en español, sin emojis; las copias que fija la spec se usan literalmente.
- Mensajes de commit en español con prefijo convencional y la línea final `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Verificación de cada tarea: `npm run typecheck`, `npm run lint`, `npx jest <archivos de la tarea>` limpios; la Tarea 10 corre `npm test` completo.
- Pruebas de pantalla con `TemaProvider` + `SafeAreaProvider` y los mocks de `@/features/configuracion/apariencia` y `react-native-reanimated` como en `__tests__/productos/buscar.test.tsx`.

## Review Focus

1. Unidades decimales en la salida (kilogramo, "2,5"): el error de exceso debe mostrar las existencias con `formatearCantidad` ("2.5 kg"), igual que el resto de la app, no el número crudo → prueba en la Tarea 6.
2. Doble toque en "Registrar salida" o "Confirmar registro": un solo registro → pruebas en las Tareas 6 y 8.
3. Tras "Escanear de nuevo", volver a leer el mismo código enseguida debe mostrar la hoja otra vez (el filtro de 1500 ms no debe tragárselo) → prueba en la Tarea 9.
4. Código con espacios alrededor en Nuevo producto ("  750123  ") debe detectarse como duplicado igual → prueba en la Tarea 7.
5. Nombre de producto largo (60 caracteres) en la tarjeta de movimiento y en el resultado: máximo dos líneas sin empujar la franja de existencias → prueba en las Tareas 3 y 4 (`numberOfLines={2}`).

---

### Task 1: `AvisoAdvertencia` y su uso en A pedir

**Files:**
- Create: `src/components/AvisoAdvertencia.tsx`
- Modify: `app/(app)/administracion/pedir.tsx` (el recuadro en línea con `advertenciaSuave`, ~línea 55-70)
- Test: `__tests__/components/AvisoAdvertencia.test.tsx`, `__tests__/alertas/pedir.test.tsx` (sigue pasando)

**Interfaces:**
- Produces: `AvisoAdvertencia({ texto: string; icono?: NombreIcono; tono?: "advertencia" | "peligro"; alerta?: boolean })`. Icono por defecto `"alerta"`. Fondo `advertenciaSuave`/`peligroSuave`, texto e ícono `textoAdvertencia`/`textoPeligro`. Con `alerta`, el contenedor lleva `accessibilityRole="alert"`; el ícono es decorativo.

- [ ] **Step 1: Write the failing test** — `it("muestra el texto")`; `it("usa rol de alerta solo si alerta es true")` (`getByRole("alert")` presente con `alerta`, `queryByRole("alert")` nulo sin ella); `it("tono peligro usa textoPeligro")` (el `Texto` tiene `color` igual a `TEMAS.claro.textoPeligro`).
- [ ] **Step 2: Run** `npx jest __tests__/components/AvisoAdvertencia.test.tsx` — Expected: FAIL (módulo no existe).
- [ ] **Step 3: Implement** `AvisoAdvertencia` y reemplazar el recuadro de `pedir.tsx` por `<AvisoAdvertencia texto=... />` con la misma copia que tiene hoy.
- [ ] **Step 4: Run** `npx jest __tests__/components/AvisoAdvertencia.test.tsx __tests__/alertas/pedir.test.tsx` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): aviso de advertencia compartido`

### Task 2: `ControlCantidad` con error y `ChipsFiltro` sin selección

**Files:**
- Modify: `src/components/ControlCantidad.tsx`, `src/components/Cantidad.tsx`, `src/components/ChipsFiltro.tsx`
- Test: `__tests__/components/ControlCantidad.test.tsx`, `__tests__/components/ChipsFiltro.test.tsx`

**Interfaces:**
- Produces: `ControlCantidad` gana `error?: string`; `Cantidad` gana `error?: string` y lo pasa. `ChipsFiltro<T>` acepta `valor: T | null` (ningún chip `selected` si es `null`).

- [ ] **Step 1: Write the failing tests** — ControlCantidad: `it("muestra el error como alerta")` (`error="La cantidad supera las existencias disponibles (5 unid.)."` → `getByRole("alert")` contiene ese texto); `it("sin error no hay alerta")`. ChipsFiltro: `it("con valor null ningún chip está seleccionado")` (todos los botones con `accessibilityState.selected === false`) y al pulsar uno llama `onCambio` con su valor.
- [ ] **Step 2: Run** `npx jest __tests__/components/ControlCantidad.test.tsx __tests__/components/ChipsFiltro.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement.** ControlCantidad según el prototipo: caja central con borde 2 `colores.primario`; con `error`, borde `colores.peligro` y fondo `colores.peligroSuave`, y debajo fila con ícono `info` + texto `textoPeligro` y `accessibilityRole="alert"`. La abreviatura de la unidad va dentro de la caja, junto al número. Botón "+" con fondo `colores.primario` e ícono `sobrePrimario`; "−" como hoy. Las etiquetas "Disminuir"/"Aumentar" no cambian.
- [ ] **Step 4: Run** los mismos archivos más `npx jest __tests__/components` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): error en el control de cantidad y chips sin seleccion`

### Task 3: `TarjetaProductoMovimiento`

**Files:**
- Create: `src/components/TarjetaProductoMovimiento.tsx`
- Test: `__tests__/components/TarjetaProductoMovimiento.test.tsx`

**Interfaces:**
- Consumes: `AvatarProducto`, `formatearCantidad`, `UNIDADES` (`src/features/productos/unidades.ts`).
- Produces: `TarjetaProductoMovimiento({ producto: { nombre: string; codigo: string; unidad: Unidad; existencias: number; punto_pedido: number }; tipo: "entrada" | "salida"; proyectadas: number | null })`.

- [ ] **Step 1: Write the failing test** — con `{ nombre: "Frijol rojo", codigo: "750123", unidad: "libra", existencias: 60, punto_pedido: 15 }`:
  - `it("entrada muestra Proyectadas y no el punto de pedido")`: `getByText("Proyectadas")`, `getByText("750123 · Libra")` (nombre de unidad desde `UNIDADES`), `queryByText(/P. pedido/)` nulo.
  - `it("salida muestra Quedarían y el punto de pedido")`: `getByText("Quedarían")`, `getByText(/P. pedido 15 lb/)`.
  - `it("sin proyección muestra —")`: `proyectadas={null}` → `getByText("—")`; etiqueta de la franja `"Existencias actuales 60 lb; quedarían sin dato"` en salida.
  - `it("nombre largo en dos líneas como máximo")`: el `Texto` del nombre tiene `numberOfLines` 2.
- [ ] **Step 2: Run** `npx jest __tests__/components/TarjetaProductoMovimiento.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement.** `LinearGradient` con `colores.encabezado`, radio `RADIO.encabezado`, texto `sobrePrimario`; franja con fondo `VELO_CLARO` (exportado de `TarjetaPrincipal`); valor proyectado en `colores.marcaAcento` (entrada) o `colores.advertencia` (salida). `accessibilityLabel` de la franja: `` `Existencias actuales ${actual}; ${tipo === "entrada" ? "proyectadas" : "quedarían"} ${proyectadas === null ? "sin dato" : formateada}` ``.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): tarjeta de producto para movimientos`

### Task 4: `PantallaResultado`

**Files:**
- Create: `src/components/PantallaResultado.tsx`
- Test: `__tests__/components/PantallaResultado.test.tsx`

**Interfaces:**
- Consumes: `AvisoAdvertencia` (Task 1), `AvatarProducto`, `Boton`.
- Produces: `PantallaResultado({ titulo: string; frase: string; producto: { nombre: string; detalle: string }; datos: [Dato, Dato]; aviso?: string; principal: Accion; secundario: Accion })` con `type Dato = { etiqueta: string; valor: string }` y `type Accion = { titulo: string; onPress: () => void }`.

- [ ] **Step 1: Write the failing test** — `it("anuncia el título como alerta")` (`getByRole("alert")` con "¡Salida registrada!"); `it("muestra los dos datos y el detalle")`; `it("el aviso es opcional")` (con `aviso` aparece su texto, sin él no); `it("los botones llaman a su acción")` (`getByRole("button", { name: "Registrar otra salida" })` y `"Volver al inicio"`); `it("nombre largo en dos líneas como máximo")`.
- [ ] **Step 2: Run** `npx jest __tests__/components/PantallaResultado.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement.** Raíz `flex: 1` con `LinearGradient` `colores.encabezado`; arriba (con `insets.top`) círculo `marcaAcento` con ícono `check` en `sobreAcento`, título `variante="titulo"` `tono="sobrePrimario"` con `accessibilityRole="alert"`, frase. Hoja inferior con fondo `colores.fondo`, radio superior grande, `paddingBottom` = `insets.bottom + ESPACIO.l`: avatar + nombre + detalle, cuadrícula de dos `Tarjeta` con etiqueta y valor, `AvisoAdvertencia` (icono `campana`) si hay `aviso`, `Boton` primario y `Boton` `variante="secundario"`. Contenido en `ScrollView` para pantallas bajas.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): pantalla de resultado compartida`

### Task 5: `BuscadorProducto` rearmado

**Files:**
- Modify: `src/features/productos/BuscadorProducto.tsx`
- Test: `__tests__/productos/BuscadorProducto.test.tsx`

**Interfaces:**
- Consumes: `FilaProducto({ nombre, detalle, cantidad, estado, onPress })`, `detalleProducto`, `estadoInventario`, `formatearCantidad`, `Skeleton`.
- Produces: misma firma de hoy: `BuscadorProducto({ onElegir: (id: string, nombre: string) => void; escanearDestino?: string })`.

- [ ] **Step 1: Write the failing test** (mock de `useProductos` como en `buscar.test.tsx`) — `it("lista los productos como FilaProducto")` (`getByText("Harina")` y `getByText(detalleProducto("C-a", "kilogramo"))`, el mismo `detalle` que usa Buscar); `it("al tocar un producto llama a onElegir")` con `("a", "Harina")`; `it("sin resultados muestra el mensaje")` → `"No hay productos que coincidan."`; `it("el botón de escanear abre el escáner con su destino")` → `push("/escaner?destino=salida")`, botón con etiqueta "Escanear código"; `it("sin escanearDestino no hay botón de escanear")`.
- [ ] **Step 2: Run** `npx jest __tests__/productos/BuscadorProducto.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement.** Fila superior: campo con ícono `buscar` (mismo estilo y etiqueta "Buscar producto por nombre o código" que Buscar en la 3A) + botón cuadrado 52 dp con fondo `colores.primario` e ícono `escanear`. Debounce de 300 ms como hoy; hasta 20 resultados; `Skeleton` mientras `isLoading`.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(movimientos): buscador de producto con filas y escaner`

### Task 6: Entrada y Salida (`FormularioMovimiento`)

**Files:**
- Modify: `src/features/movimientos/FormularioMovimiento.tsx`, `src/lib/fechaRelativa.ts`
- Test: `__tests__/movimientos/salida.test.tsx` (se actualiza), `__tests__/movimientos/entrada.test.tsx` (nuevo), `__tests__/lib/fechaRelativa.test.ts`

**Interfaces:**
- Consumes: Tasks 1–5; `generaAlerta`, `proyectar`, `validarSalida` (`calculo.ts`, sin cambios); `Movimiento.created_at` del resultado de `registrarMovimiento`.
- Produces: `horaLocal(iso: string): string` en `src/lib/fechaRelativa.ts` → `"HH:mm"` local (reutiliza `dosDigitos`).

- [ ] **Step 1: Write the failing tests.**
  - `fechaRelativa.test.ts`: `it("horaLocal da HH:mm")` con `new Date(2026, 9, 12, 9, 5).toISOString()` → `"09:05"`.
  - `salida.test.tsx` (envolver con `TemaProvider` + `SafeAreaProvider`; mock de `registrarMovimiento` resuelve `{ existencias_antes, existencias_despues, cantidad, created_at }`):
    - exceso: cantidad "6" con existencias 5 unidad → `getByRole("alert")` con `"La cantidad supera las existencias disponibles (5 unid.)."` y botón deshabilitado.
    - decimal: producto `unidad: "kilogramo", existencias: 2.5`, cantidad "3" → texto `"La cantidad supera las existencias disponibles (2.5 kg)."`.
    - sin motivo deshabilitado / con motivo habilitado (como hoy); motivo por parámetro (como hoy).
    - aviso previo: existencias 5, pp 2, cantidad 3 → `"Con esta salida el producto llegará a su punto de pedido y se enviará una alerta al administrador."`.
    - resultado con alerta: `findByText("¡Salida registrada!")`, `"−3 unid."`, `"2 unid."`, detalle `/^Motivo: Daño · \d{2}:\d{2}$/`, aviso `"El producto alcanzó su punto de pedido. Se generó una alerta de reabastecimiento."`, botón "Registrar otra salida".
    - resultado sin alerta (cantidad 1): sin ese aviso.
    - doble toque: dos `press` seguidos sobre "Registrar salida" con la promesa pendiente → `mockRegistrar` llamado una vez.
    - error de registro: rechazo `EXISTENCIAS_INSUFICIENTES` → alerta con el mensaje de `mensajeDeError` y el campo "Cantidad" conserva "5".
    - producto dado de baja (`activo: false`) → `"El producto está dado de baja."`, sin campo "Cantidad" ni botón "Registrar salida".
  - `entrada.test.tsx`: sin `productoId` muestra el buscador ("Buscar producto por nombre o código") y la píldora "+ Ingreso"; con producto: ayuda `"Solo se permiten cantidades positivas."`, `"Proyectadas"` cambia al escribir "10" (60 → "70 lb"), registra y muestra `"¡Entrada registrada!"`, `"+10 lb"`, detalle `"Código 750123"`, botones "Registrar otra entrada" y "Volver al inicio" (`replace("/")`); "Registrar otra entrada" vuelve al buscador.
- [ ] **Step 2: Run** `npx jest __tests__/movimientos __tests__/lib/fechaRelativa.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.** Estructura de la spec §2 "Entrada y Salida". Notas:
  - El error de exceso se arma en el formulario: `` `La cantidad supera las existencias disponibles (${formatearCantidad(p.existencias, p.unidad)}).` `` cuando `validarSalida` devuelve no nulo; `validarSalida` no cambia (su texto lo usa también el error del servidor).
  - `proyectadas` = `proyectar(...)` si la cantidad es válida y sin exceso; si no, `null`.
  - El estado `Resultado` guarda además `motivo` y `creado: string` (`m.created_at`).
  - Contenido en `ScrollView` con `keyboardShouldPersistTaps="handled"`; encabezado con `accion={{ icono: "escanear", etiqueta: "Escanear otro producto", onPress: () => router.push(`/escaner?destino=${tipo}`) }}` cuando hay producto.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(movimientos): rediseño de entrada y salida`

### Task 7: `codigoRegistrado` y `leerCodigoDeImagen`

**Files:**
- Modify: `src/features/productos/api.ts`
- Create: `src/features/productos/leerImagen.ts`
- Test: `__tests__/productos/codigoRegistrado.test.ts`, `__tests__/productos/leerImagen.test.ts`

**Interfaces:**
- Produces:
  - `codigoRegistrado(codigo: string): Promise<{ nombre: string; activo: boolean } | null>` — `from("productos").select("nombre, activo").eq("codigo", codigo.trim()).maybeSingle()`, sin filtro por `activo`; lanza el error de Supabase.
  - `TIPOS_CODIGO` (los siete tipos de hoy, movidos desde `app/escaner.tsx`) y `leerCodigoDeImagen(): Promise<{ estado: "cancelado" } | { estado: "sin-codigo" } | { estado: "ok"; codigo: string }>` — `ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 })`, luego `scanFromURLAsync(uri, [...TIPOS_CODIGO])`; `codigo` pasa por `normalizarCodigo`; los errores se propagan.

- [ ] **Step 1: Write the failing tests** (mock de `@/lib/supabase` con cadena `from().select().eq().maybeSingle()`; mocks de `expo-image-picker` y `expo-camera`):
  - `it("recorta el código antes de consultar")`: `codigoRegistrado("  750123  ")` → `eq` llamado con `("codigo", "750123")`; no se llama `eq("activo", …)`.
  - `it("devuelve nombre y activo")` y `it("null si no existe")`; `it("propaga el error")`.
  - `leerImagen`: cancelado → `{ estado: "cancelado" }`; sin lecturas → `{ estado: "sin-codigo" }`; lectura `" 750 123 "` → `{ estado: "ok", codigo: "750123" }`.
- [ ] **Step 2: Run** `npx jest __tests__/productos/codigoRegistrado.test.ts __tests__/productos/leerImagen.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** ambas funciones.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(productos): consulta de codigo registrado y lectura desde imagen`

### Task 8: Nuevo producto

**Files:**
- Modify: `app/(app)/nuevo.tsx`
- Test: `__tests__/productos/nuevo.test.tsx`

**Interfaces:**
- Consumes: `codigoRegistrado`, `leerCodigoDeImagen` (Task 7), `PantallaResultado` (Task 4), `AvisoAdvertencia` (Task 1), `Encabezado`, `SelectorUnidad`, `Campo`, `validarFormularioProducto`, `useRegistrarProducto`.

- [ ] **Step 1: Write the failing tests** (mocks de `@/features/productos/api` con `codigoRegistrado` y `registrarProducto`, de `@/features/productos/leerImagen`, de `RequiereRol` o `useAuth` con rol admin, de `expo-router` con `useLocalSearchParams`):
  - `it("paso 1 muestra el subtítulo y la nota")`: `"Paso 1 de 2 · Datos del producto"`, `"Cuando las existencias lleguen al punto de pedido, recibirás una alerta de reabastecimiento."`.
  - `it("avanza al paso 2 con los datos")`: rellenar Nombre "Harina de trigo", Código "750999", Cantidad inicial "50", Punto de pedido "15" (unidad por defecto) → "Revisar" → `"Paso 2 de 2 · Confirmación"`, `"Código 750999"`, `"Al confirmar se guardará el producto y su movimiento inicial de inventario (+50 unid.)."`.
  - `it("cantidad inicial 0 cambia la nota")` → `"Al confirmar se guardará el producto sin existencias iniciales."`.
  - `it("código duplicado activo no avanza")`: `codigoRegistrado` → `{ nombre: "Arroz blanco", activo: true }` → `"Este código ya está registrado (Arroz blanco)."` y sigue el paso 1.
  - `it("código de un producto dado de baja no avanza")` → `"Este código pertenece a Jabón, dado de baja."`.
  - `it("si la consulta del código falla, avanza igual")`.
  - `it("CODIGO_DUPLICADO del servidor vuelve al paso 1")`: `registrarProducto` rechaza `new Error("CODIGO_DUPLICADO")` → `"Este código ya está registrado."` en el paso 1.
  - `it("otro error del servidor se muestra en el paso 2")`.
  - `it("doble toque en Confirmar registra una vez")`.
  - `it("resultado")`: `"¡Producto registrado!"`, `"Harina de trigo ya está disponible en Existencias y puede usarse en entradas y salidas."`, "Ver en Existencias" → `replace("/buscar")`; "Registrar otro producto" vuelve al paso 1 vacío.
  - `it("leer desde imagen rellena el código")`: botón "Leer código desde una imagen" con `leerCodigoDeImagen` → `{ estado: "ok", codigo: "123" }` → campo Código vale "123"; con `"sin-codigo"` → `"No se encontró ningún código en la imagen."`.
  - `it("código por parámetro rellena el campo")` (`codigo: "777"`).
- [ ] **Step 2: Run** `npx jest __tests__/productos/nuevo.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** según la spec §2 "Nuevo producto". `revisar` pasa a `async`: tras validar, `try { const r = await codigoRegistrado(datos.codigo); if (r) { setError("codigo", …); return; } } catch { /* el servidor decide */ }`. Barra de pasos: dos `View` de alto 5 con `RADIO.completo`, tramo activo `marcaAcento`, el otro `linea`; contenedor con `accessibilityLabel="Paso N de 2"`. Cierre (X) con `onAtras` → `router.back()` y etiqueta "Cerrar". Paso 2 con tarjeta de `LinearGradient` `colores.encabezado` y tres datos. Resultado con `PantallaResultado` (`datos`: "Cantidad inicial" y "Punto de pedido" formateados).
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(productos): rediseño de nuevo producto`

### Task 9: Escáner

**Files:**
- Modify: `app/escaner.tsx`, `src/features/productos/escaner.ts`
- Test: `__tests__/productos/escanerPantalla.test.tsx`, `__tests__/productos/escaner.test.ts`

**Interfaces:**
- Consumes: `buscarPorCodigo`, `leerCodigoDeImagen` y `TIPOS_CODIGO` (Task 7), `AvisoAdvertencia`, `AvatarProducto`, `Boton`, `puede(rol, "registrar_producto")`.
- Produces: `crearFiltroLecturas` devuelve una función con método `reiniciar(): void` (tipo `FiltroLecturas = ((codigo: string, ahora: number) => boolean) & { reiniciar: () => void }`) que olvida el último código.

- [ ] **Step 1: Write the failing tests.**
  - `escaner.test.ts`: `it("reiniciar permite el mismo código enseguida")`.
  - `escanerPantalla.test.tsx` (mock de `expo-camera`: `CameraView` como componente que guarda su prop `onBarcodeScanned` en una variable del test; `useCameraPermissions` → `[{ granted: true }, jest.fn()]`; mock de `buscarPorCodigo`, de `useAuth`, de `expo-router` con `replace`, `dismissTo`, `back` y `useLocalSearchParams`):
    - `it("encontrado muestra la hoja y Usar este producto navega")`: destino `salida`, leer `"750"` → `findByText("CÓDIGO RECONOCIDO")`, nombre, `"750 · 5 unid. disponibles"`; "Usar este producto" → `replace({ pathname: "/movimientos/salida", params: { productoId: "p1" } })`.
    - `it("con la hoja abierta no se procesan lecturas")`: tras la hoja, la prop `onBarcodeScanned` es `undefined`.
    - `it("Escanear de nuevo con el mismo código vuelve a mostrar la hoja")`: cerrar con "Escanear de nuevo", leer `"750"` otra vez de inmediato → `buscarPorCodigo` llamado dos veces y la hoja visible.
    - `it("no encontrado admin ofrece Registrar producto")` → `"Producto no encontrado"`, `"750"`, `"El código escaneado no corresponde a ningún producto registrado."`, "Registrar producto" → `replace({ pathname: "/nuevo", params: { codigo: "750" } })`.
    - `it("no encontrado operativo muestra el aviso")` → `"Solo el administrador puede registrar productos nuevos. Pídele que lo agregue al catálogo."` y sin "Registrar producto".
    - `it("destino nuevo vuelve directo sin hoja")` → `dismissTo({ pathname: "/nuevo", params: { codigo: "750" } })`, sin "CÓDIGO RECONOCIDO".
    - `it("error de búsqueda muestra el mensaje y Escanear de nuevo")`.
    - `it("sin permiso ofrece permitir, escribir y leer desde imagen")` (`granted: false`).
- [ ] **Step 2: Run** `npx jest __tests__/productos/escaner.test.ts __tests__/productos/escanerPantalla.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** según la spec §2 "Escáner". Estado `hoja: null | { tipo: "encontrado"; producto: Producto } | { tipo: "no-encontrado"; codigo: string } | { tipo: "error"; mensaje: string }`. `onBarcodeScanned={buscando || hoja ? undefined : alLeer}`. "Escanear de nuevo": `setHoja(null)` y `filtro.current.reiniciar()`. La hoja es un panel absoluto inferior con fondo `colores.fondo` y radio superior grande (no `HojaInferior`, que se cierra por gesto y oscurece la cámara). Marco central: cuatro esquinas con borde `colores.marcaAcento`, `importantForAccessibility="no-hide-descendants"`. Botones superiores sobre la cámara con fondo `colores.velo`. Eliminar los estilos con hex (`#000`, `#fff`); el fondo de la cámara usa `colores.primario`. Modo manual y sin permiso con `Encabezado` (`titulo="Escanear código"`, `onAtras` → `router.back()`), `Tarjeta`, `Campo` y `Boton`, mismos textos de hoy.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(escaner): tarjeta de codigo reconocido y producto no encontrado`

### Task 10: Verificación final

- [ ] **Step 1:** `npm run typecheck && npm run lint && npm test` — Expected: sin errores; todas las suites en verde.
- [ ] **Step 2:** `grep -rnE "#[0-9A-Fa-f]{3,6}\b" app/escaner.tsx app/\(app\)/nuevo.tsx src/features/movimientos/FormularioMovimiento.tsx src/components/{AvisoAdvertencia,TarjetaProductoMovimiento,PantallaResultado}.tsx` — Expected: sin resultados.
- [ ] **Step 3:** Verificación manual en Expo Go (`npx expo start`) con `ana.lopez` (admin) y `carlos.m` (operativo), modo claro y oscuro: entrada y salida completas (con y sin alerta), nuevo producto con código duplicado, escáner con cámara real (encontrado, no encontrado por rol, linterna, leer desde imagen). Anotar lo observado en el PR.
- [ ] **Step 4: Commit** de correcciones si las hubo: `fix(3b): ...`
