# Inventrix 3A (Inicio y consulta) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar Inicio (admin y operativo), Buscar/Existencias, Ficha del producto, A pedir y Notificaciones según el prototipo, con piezas visuales compartidas.

**Architecture:** Primero tokens, íconos y piezas compartidas en `src/components/` (cada una con su prueba); luego el dato nuevo del inicio; luego cada pantalla se rearma con las piezas. Sin cambios de base de datos.

**Tech Stack:** Expo SDK 57, expo-router, TypeScript, TanStack Query, Reanimated 4, react-native-svg 15, lucide-react-native, Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-10-11-inventrix-3a-inicio-consulta-design.md`

## Global Constraints

- Colores solo desde `useTema().colores` (tokens en `src/tema/tokens.ts`, claro y oscuro); nunca hex en componentes o pantallas.
- Texto solo con `Texto`; campos con `EntradaTexto`/`Campo` (la regla de ESLint prohíbe `Text`/`TextInput` de react-native).
- Íconos solo con `Icono` (Lucide); lo tocable con `Presionable`; objetivos táctiles ≥ 48 dp; `accessibilityLabel` completa en todo botón de solo ícono.
- Animaciones solo con las utilidades de la parte 1 (`NumeroAnimado`, `Skeleton`, `entradaEscalonada`, `Presionable`) y solo en cifras y listas principales; respetan "Quitar animaciones".
- Fuente Inter (ya cargada); el prototipo es guía de composición, no de fuente ni de pestañas.
- Textos en español, sin emojis. Copias fijadas por la spec se usan literalmente.
- Mensajes de commit en español con prefijo convencional y la línea final `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Verificación de cada tarea: `npm run typecheck`, `npm run lint`, `npm test` limpios.

## Review Focus

1. Nombres de producto largos (40+ caracteres) en `FilaProducto`/`FilaMovimiento` deben truncarse en una línea sin empujar la cantidad fuera de la pantalla → prueba en la Tarea 3 (`numberOfLines={1}`).
2. Producto con `punto_pedido = 0` en el anillo y en la barra de A pedir: sin división por cero ni `NaN%` → pruebas en las Tareas 4 y 9.
3. Inicio sin ningún producto ni movimiento (base recién creada): las secciones vacías no deben mostrar listas vacías ni "0 productos próximos a agotarse" → prueba en la Tarea 6.
4. Fallo de `dashboard_reportes` (o rol operativo) no debe romper el inicio → prueba en la Tarea 5.
5. Más de tres unidades con existencias en el resumen del operativo deben envolverse, no desbordar → prueba en la Tarea 6 (con 5 unidades).

---

### Task 1: Tokens de advertencia, íconos nuevos y encabezado ampliado

**Files:**
- Modify: `src/tema/tokens.ts`, `src/components/Icono.tsx`, `src/components/Encabezado.tsx`
- Test: `__tests__/components/Encabezado.test.tsx`, `__tests__/tema/` (prueba de contraste existente, si la hay; si no, `__tests__/tema/advertencia.test.ts`)

**Interfaces:**
- Produces:
  - Tokens `advertencia`, `advertenciaSuave`, `textoAdvertencia` en el tipo de colores y en `claro`/`oscuro`. Claro: `advertencia` `#E9A23B`, `advertenciaSuave` `#FBE2B4`, `textoAdvertencia` `#6B4300`. Oscuro: `advertencia` `#E9A23B`, `advertenciaSuave` `#4A3412`, `textoAdvertencia` `#F6CE84`. `textoAdvertencia` sobre `advertenciaSuave` ≥ 4.5:1 en ambos modos.
  - Íconos en `ICONOS`: `escanear: ScanBarcode`, `entrada: ArrowDownToLine`, `salida: ArrowUpFromLine`, `candado: Lock`, `info: Info`, `subida: TrendingUp`.
  - `Encabezado` variante `"pantalla"` acepta `subtitulo?: string` y `accion` como `{ icono: NombreIcono; etiqueta: string; onPress: () => void } | { texto: string; onPress: () => void; deshabilitado?: boolean }`.
  - Nueva variante `"inicio"`: sin degradado, fondo transparente sobre `colores.fondo`; avatar circular con `iniciales(nombre)` (de `AvatarProducto`), saludo `"Hola, <nombre>"`, insignia con el texto de `rol` en mayúsculas; campana opcional (`alertas?`, `onAlertas?`) con un punto `colores.advertencia` si `alertas > 0`. Props: `{ variante: "inicio"; nombre: string; rol: string; alertas?: number; onAlertas?: () => void }` (reemplaza `saludo` por `nombre`).

- [ ] **Step 1: Pruebas que fallan** en `Encabezado.test.tsx`:
  - variante `"pantalla"` con `subtitulo="120 productos activos"` lo muestra.
  - acción de texto `{ texto: "Marcar leídas", onPress, deshabilitado: true }` se muestra con `accessibilityState.disabled === true` y no llama a `onPress`.
  - variante `"inicio"` con `nombre="Ana López"`, `rol="Administrador"`, `alertas={2}`: muestra "Hola, Ana López", "ADMINISTRADOR", "AL" y el botón con etiqueta "Notificaciones, 2 sin leer"; sin `onAlertas` no hay botón de campana.
  - contraste: `textoAdvertencia` sobre `advertenciaSuave` ≥ 4.5 en `claro` y `oscuro` (usar la utilidad de contraste existente de las pruebas de tema, o una función local `contraste(a, b)` en la prueba).
- [ ] **Step 2:** `npm test -- __tests__/components/Encabezado.test.tsx` → FAIL.
- [ ] **Step 3:** Implementar. Actualizar el único uso actual de la variante `"inicio"` (`app/(app)/index.tsx`) para que compile pasando `nombre`; su rediseño es de la Tarea 6.
- [ ] **Step 4:** `npm run typecheck && npm run lint && npm test` → limpio.
- [ ] **Step 5:** Commit `feat(ui): tokens de advertencia, iconos nuevos y encabezado con subtitulo e inicio claro`.

---

### Task 2: Fecha relativa y ChipsFiltro

**Files:**
- Create: `src/lib/fechaRelativa.ts`, `src/components/ChipsFiltro.tsx`
- Test: `__tests__/lib/fechaRelativa.test.ts`, `__tests__/components/ChipsFiltro.test.tsx`

**Interfaces:**
- Produces:
  - `fechaRelativa(iso: string, ahora: Date): string` → `"Hoy HH:mm"`, `"Ayer HH:mm"` o `"dd/MM"` (hora local, 24 h, con ceros).
  - `grupoDia(iso: string, ahora: Date): "HOY" | "AYER" | "ANTERIORES"`.
  - `ChipsFiltro<T extends string>({ opciones: { valor: T; texto: string }[]; valor: T; onCambio: (v: T) => void; etiqueta: string })`.

- [ ] **Step 1: Pruebas que fallan:**
```ts
const ahora = new Date(2026, 9, 11, 15, 0);
expect(fechaRelativa(new Date(2026, 9, 11, 9, 5).toISOString(), ahora)).toBe("Hoy 09:05");
expect(fechaRelativa(new Date(2026, 9, 10, 23, 59).toISOString(), ahora)).toBe("Ayer 23:59");
expect(fechaRelativa(new Date(2026, 9, 2, 8, 0).toISOString(), ahora)).toBe("02/10");
expect(fechaRelativa(new Date(2026, 0, 1, 0, 0).toISOString(), new Date(2026, 0, 2, 1, 0))).toBe("Ayer 00:00");
expect(grupoDia(new Date(2026, 9, 9, 12).toISOString(), ahora)).toBe("ANTERIORES");
```
  `ChipsFiltro`: renderiza un grupo con `accessibilityLabel` = `etiqueta`; el chip activo tiene `accessibilityState.selected === true`; tocar otro llama `onCambio` con su valor; cada chip mide ≥ 48 dp de alto (estilo `minHeight: 48`).
- [ ] **Step 2:** correr las dos pruebas → FAIL.
- [ ] **Step 3:** Implementar. Chip activo: fondo `colores.primario`, texto `colores.sobrePrimario`; inactivo: `colores.superficie` con borde `colores.borde`.
- [ ] **Step 4:** verificación completa → limpio.
- [ ] **Step 5:** Commit `feat(ui): fecha relativa y chips de filtro`.

---

### Task 3: FilaProducto y FilaMovimiento

**Files:**
- Create: `src/components/FilaProducto.tsx`, `src/components/FilaMovimiento.tsx`
- Test: `__tests__/components/filas.test.tsx`

**Interfaces:**
- Consumes: `fechaRelativa` (Tarea 2); `Estado`, `ETIQUETA_ESTADO` (`src/features/productos/estado.ts`); `iniciales` (`AvatarProducto`); `etiquetaMovimiento` (`src/features/movimientos/calculo.ts`); `ETIQUETAS_MOTIVO_SALIDA` (`src/features/movimientos/motivos.ts`); tokens de la Tarea 1.
- Produces:
  - `FilaProducto({ nombre: string; detalle: string; cantidad: string; estado: Estado; onPress?: () => void })`. Avatar cuadrado redondeado con iniciales; color por estado: disponible `exito`, bajo `advertencia`, sin `primario`. Etiqueta de estado con fondo suave (`exitoSuave` / `advertenciaSuave` / `primario`) y texto (`textoExito` / `textoAdvertencia` / `sobrePrimario`). `accessibilityLabel`: `"<nombre>, <cantidad>, <ETIQUETA_ESTADO[estado]>"`.
  - `FilaMovimiento({ producto: string; tipo: TipoMovimiento; motivo: MotivoSalida | null; fecha: string; cantidad: number; unidad: Unidad; usuario?: string; ahora?: Date })`. Línea secundaria: tipo ("Entrada" para `entrada` e `inicial`, "Salida", "Baja"), luego `· <motivo>` si hay, luego `· <fechaRelativa>`, luego `· <usuario>` si hay. Ícono `mas` en `exitoSuave`/`textoExito` para entrada e inicial; `menos` en `primario`/`sobrePrimario` para salida y baja. Cantidad con `etiquetaMovimiento(tipo, cantidad, unidad)` y color `textoExito` o `texto`.

- [ ] **Step 1: Pruebas que fallan:**
  - `FilaProducto` con estado `"bajo"` muestra "Bajo inventario" y la etiqueta de accesibilidad `"Arroz blanco, 10 lb, Bajo inventario"`; con `onPress` es un botón que lo llama.
  - nombre de 60 caracteres: el `Texto` del nombre tiene `numberOfLines={1}`.
  - `FilaMovimiento` salida con motivo `"venta"`, fecha de hoy a las 09:15, usuario "Carlos M." muestra `"Salida · Venta · Hoy 09:15 · Carlos M."` y la cantidad de `etiquetaMovimiento("salida", 2, "unidad")`.
  - `FilaMovimiento` tipo `"baja"`, motivo `null` muestra `"Baja · Hoy …"` sin `" · null"`.
  - `FilaMovimiento` tipo `"inicial"` muestra "Entrada".
- [ ] **Step 2:** `npm test -- __tests__/components/filas.test.tsx` → FAIL.
- [ ] **Step 3:** Implementar (pasar `ahora` solo en pruebas; por defecto `new Date()`).
- [ ] **Step 4:** verificación completa → limpio.
- [ ] **Step 5:** Commit `feat(ui): filas de producto y de movimiento`.

---

### Task 4: TarjetaPrincipal, TarjetaIndicador y AnilloExistencias

**Files:**
- Create: `src/components/TarjetaPrincipal.tsx`, `src/components/TarjetaIndicador.tsx`, `src/components/AnilloExistencias.tsx`
- Test: `__tests__/components/tarjetas.test.tsx`, `__tests__/components/AnilloExistencias.test.tsx`

**Interfaces:**
- Consumes: `NumeroAnimado`, `Presionable`, `Icono`, `estadoInventario`, `ETIQUETA_ESTADO`, `formatearCantidad`, `UNIDADES` (nombre largo de la unidad para la píldora "Unidad").
- Produces:
  - `TarjetaPrincipal({ titulo: string; valor: number; sufijo?: string; chips?: { texto: string; tono: "exito" | "neutro" }[]; accesos: { titulo: string; icono: NombreIcono; onPress: () => void; destacado?: boolean }[] })`. Fondo `LinearGradient` con `colores.encabezado`; texto `sobrePrimario`; accesos en cuadrícula de 3 columnas, `minHeight: 74`; el destacado con fondo `marcaAcento` y texto `primario`.
  - `TarjetaIndicador(props: { variante: "alerta"; valor: number; texto: string; onPress: () => void } | { variante: "lista"; titulo: string; filas: { valor: string; etiqueta: string }[] })`. "alerta": fondo `advertenciaSuave`, ícono `alerta` sobre `advertencia`, número grande, texto `textoAdvertencia`, `accessibilityLabel` `"<valor> <texto>"`.
  - `fraccionAnillo(existencias: number, puntoPedido: number): number` (exportada desde `AnilloExistencias.tsx`).
  - `AnilloExistencias({ existencias: number; puntoPedido: number; unidad: Unidad })`: SVG 250×250, radio 100, trazo 26; color del arco `primario`; marca en 0.5 con `advertencia` (omitida si `puntoPedido === 0`); centro "Existencias", `formatearCantidad(existencias, unidad)` y la etiqueta de estado; píldoras "Punto de pedido <formatearCantidad(pp)>" y "Unidad <nombre>". Contenedor con `accessible` y `accessibilityLabel` `"Existencias <cant>; punto de pedido <pp>; <estado>"`.

- [ ] **Step 1: Pruebas que fallan:**
```ts
expect(fraccionAnillo(10, 15)).toBeCloseTo(1 / 3);
expect(fraccionAnillo(45, 15)).toBe(1);
expect(fraccionAnillo(15, 15)).toBe(0.5);
expect(fraccionAnillo(0, 0)).toBe(0);
expect(fraccionAnillo(3, 0)).toBe(1);
expect(Number.isFinite(fraccionAnillo(0, 15))).toBe(true);
```
  `AnilloExistencias` con 10 / 15 / `"libra"` tiene la etiqueta `"Existencias " + formatearCantidad(10,"libra") + "; punto de pedido " + formatearCantidad(15,"libra") + "; Bajo inventario"`.
  `TarjetaPrincipal` sin `chips` no renderiza chips; con dos chips los muestra; cada acceso es un botón con su `titulo` como etiqueta y llama su `onPress`.
  `TarjetaIndicador` "alerta" con valor 4 y texto "Productos en punto de pedido" es un botón con etiqueta "4 Productos en punto de pedido"; "lista" muestra cada fila.
- [ ] **Step 2:** correr ambas pruebas → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** verificación completa → limpio.
- [ ] **Step 5:** Commit `feat(ui): tarjeta principal, tarjeta indicador y anillo de existencias`.

---

### Task 5: Dato "entradas y salidas de hoy" e invalidación del dashboard

**Files:**
- Modify: `src/features/inicio/api.ts`, `src/features/movimientos/hooks.ts`, `src/features/productos/hooks.ts`
- Test: `__tests__/inicio/obtenerInicio.test.ts` (nuevo), prueba de hooks existente que verifique invalidaciones (`__tests__/productos/invalidacion.test.tsx`)

**Interfaces:**
- Consumes: `obtenerDashboard(desde: string, hasta: string): Promise<Dashboard>` y `rangoDePeriodo` (`src/features/reportes/`).
- Produces: `Inicio` gana `hoy?: { entradas: number; salidas: number }`. `obtenerInicio(rol, ahora = new Date())`.

- [ ] **Step 1: Pruebas que fallan** (mockear `@/lib/supabase` como en las pruebas existentes de api):
  - admin: `rpc("dashboard_reportes", { p_desde: "2026-10-11", p_hasta: "2026-10-11" })` con `ahora = new Date(2026, 9, 11, 10)`; con serie `[{ fecha: "2026-10-11", entradas: 18, salidas: 9 }]` → `hoy` = `{ entradas: 18, salidas: 9 }`.
  - admin con error en `dashboard_reportes` → `obtenerInicio` resuelve y `hoy` es `undefined`.
  - operativo → no llama a `dashboard_reportes` y `hoy` es `undefined`.
  - registrar un movimiento y dar de baja invalidan también `["dashboard"]`.
- [ ] **Step 2:** correr → FAIL.
- [ ] **Step 3:** Implementar (el error de la llamada al dashboard se captura y descarta solo en `obtenerInicio`).
- [ ] **Step 4:** verificación completa → limpio.
- [ ] **Step 5:** Commit `feat(inicio): entradas y salidas de hoy e invalidacion del dashboard`.

---

### Task 6: Pantalla de Inicio (administrador y operativo)

**Files:**
- Modify: `app/(app)/index.tsx`
- Test: `__tests__/inicio/pantalla.test.tsx` (nuevo)

**Interfaces:**
- Consumes: `Encabezado` variante `"inicio"` (Tarea 1); `TarjetaPrincipal`, `TarjetaIndicador` (Tarea 4); `FilaProducto`, `FilaMovimiento` (Tarea 3); `Inicio.hoy` (Tarea 5); `useInicio`, `useAlertasNoLeidas`, `textoResumen`/`formatearCantidad`, `estadoInventario`.

Composición exacta: spec, sección 2, "Inicio administrador" e "Inicio operativo". Accesos: Entrada → `/movimientos/entrada`, Salida → `/movimientos/salida`, Escanear (destacado) → `/escaner?destino=existencias`. Chips del admin: `"+<entradas> entradas hoy"` (tono éxito) y `"−<salidas> salidas hoy"` (neutro), solo si `hoy` existe. Sufijo del valor: "activos". Rol en la insignia: "Administrador" / "Usuario operativo". Sección "Productos próximos a agotarse" con "Ver todos" → `/administracion/pedir`; "Movimientos recientes" (admin) / "Últimos movimientos" (operativo) con "Historial" → `/movimientos` solo para admin. Primera carga: `Skeleton` en lugar de las tarjetas; error: mensaje con "Reintentar". Listas con `entradaEscalonada`.

- [ ] **Step 1: Pruebas que fallan** (mock de `useInicio`, `useAlertasNoLeidas` y `useAuth`):
  - admin con `hoy = { entradas: 18, salidas: 9 }`, 4 a pedir y 3 primeros: muestra "Hola, Ana", "ADMINISTRADOR", "+18 entradas hoy", "−9 salidas hoy", la tarjeta "4 Productos en punto de pedido", "Productos próximos a agotarse" con 3 filas y "Movimientos recientes".
  - admin sin `hoy`: no hay texto "entradas hoy".
  - admin con `aPedir.total = 0`, sin recientes y sin productos: no aparecen "Productos próximos a agotarse" ni la lista de movimientos; aparece "Aún no hay movimientos."
  - operativo: "USUARIO OPERATIVO", sin botón "Notificaciones", sin "Productos en punto de pedido", "Resumen de existencias" con 5 unidades presentes (todas visibles) y "Últimos movimientos".
  - tocar "Escanear" navega a `/escaner?destino=existencias`.
- [ ] **Step 2:** correr → FAIL.
- [ ] **Step 3:** Implementar. El resumen del operativo usa `flexWrap: "wrap"` con celdas de un tercio de ancho.
- [ ] **Step 4:** verificación completa → limpio.
- [ ] **Step 5:** Commit `feat(inicio): rediseño del inicio de administrador y operativo`.

---

### Task 7: Buscar / Existencias

**Files:**
- Modify: `app/(app)/buscar.tsx`
- Test: `__tests__/productos/buscar.test.tsx` (nuevo)

**Interfaces:**
- Consumes: `Encabezado` (`subtitulo`), `ChipsFiltro`, `FilaProducto`, `Skeleton`, `estadoInventario`, `formatearCantidad`; lógica actual de búsqueda, filtro y exportación del archivo.

Copias: título "Existencias"; subtítulo `"<N> productos activos"`; vacío "Aún no hay productos registrados."; sin resultados "No hay productos que coincidan."; chips `todos`/"Todos", `disponible`/"Disponible", `bajo`/"Bajo", `sin`/"Sin stock". Si hoy el filtro por estado es del servidor, se mantiene; si es local, se mantiene local. Botón escanear de solo ícono con etiqueta "Escanear código de barras".

- [ ] **Step 1: Pruebas que fallan:** lista con tres productos (uno de cada estado): tocar "Bajo" deja solo el bajo; búsqueda sin coincidencias muestra "No hay productos que coincidan."; lista vacía sin búsqueda muestra "Aún no hay productos registrados."; error muestra "Reintentar"; tocar una fila navega a `/administracion/producto/<id>`; "Exportar a Excel" sigue visible para operativo.
- [ ] **Step 2:** correr → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** verificación completa → limpio.
- [ ] **Step 5:** Commit `feat(productos): rediseño de Buscar/Existencias`.

---

### Task 8: Ficha del producto e historial filtrado por producto

**Files:**
- Modify: `app/(app)/administracion/producto/[id].tsx`, `app/(app)/movimientos/index.tsx` (leer el parámetro `productoId` y pasarlo al filtro de `listarHistorial`, con un aviso "Mostrando: <producto>" y opción "Quitar filtro")
- Test: `__tests__/productos/ficha.test.tsx` (nuevo), prueba del historial existente o `__tests__/movimientos/historialProducto.test.tsx`

**Interfaces:**
- Consumes: `Encabezado` (acción de ícono `lapiz`), `AnilloExistencias`, `FilaMovimiento` (con `usuario`), `ETIQUETAS_MOTIVO_BAJA` (`src/features/productos/motivosBaja.ts`), `puede(rol, "editar_producto")`.

Copias: "Código: <codigo>" (o "Sin código"); botones "Entrada" y "Salida" → rutas actuales con `productoId`; "Movimientos del producto" + "Ver todo" → `/movimientos?productoId=<id>`; aviso operativo "La edición de datos maestros es exclusiva del Administrador." con ícono `candado`; inactivo: etiqueta "Dado de baja", `"Motivo: <ETIQUETAS_MOTIVO_BAJA[motivo_baja]>"`, `"Detalle: <detalle_baja>"` solo si hay.

- [ ] **Step 1: Pruebas que fallan:** admin ve el botón "Editar producto" y operativo no (ve el aviso); producto inactivo con `motivo_baja: "otro"`, `detalle_baja: "Cerró el proveedor"` muestra "Dado de baja", "Motivo: Otro", "Detalle: Cerró el proveedor" y no muestra "Entrada"/"Salida"; inactivo con `motivo_baja: "descontinuado"` y sin detalle no muestra "Detalle:"; "Ver todo" navega a `/movimientos?productoId=p1`; el historial con `productoId` llama a `listarHistorial` con ese `productoId` y "Quitar filtro" lo quita.
- [ ] **Step 2:** correr → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** verificación completa → limpio.
- [ ] **Step 5:** Commit `feat(productos): ficha con anillo, motivo de baja e historial por producto`.

---

### Task 9: A pedir y Notificaciones

**Files:**
- Modify: `app/(app)/administracion/pedir.tsx`, `app/notificaciones.tsx`
- Test: `__tests__/alertas/pedir.test.tsx` (nuevo), `__tests__/alertas/notificaciones.test.tsx` (existente: adaptar sin perder sus casos)

**Interfaces:**
- Consumes: `Encabezado` (acción de texto con `deshabilitado`), `grupoDia`, `fechaRelativa` (hora), tokens de advertencia, `formatearCantidad`; lógica actual de `listarAPedir`, `listarAlertas`, `marcarLeidas`.

Copias A pedir: título "Productos a pedir"; tarjeta `"<N> productos"` (o "1 producto") + "Alcanzaron o están por debajo de su punto de pedido."; columnas "Existencias" y "Punto de pedido"; barra `min(existencias / puntoPedido, 1)` (100 % si `puntoPedido = 0`); nota "Esta versión no genera órdenes de compra. La decisión de pedir corresponde al responsable de la empresa."; vacío "Ningún producto está en su punto de pedido.".
Copias Notificaciones: título "Notificaciones"; acción "Marcar leídas"; grupos "HOY", "AYER", "ANTERIORES" (solo los que tienen alertas); tarjeta `"Reabastecer: <producto>"`, `"Quedan <existencias> y su punto de pedido es <pp>."`, hora `HH:mm` (o `dd/MM` en anteriores); punto con etiqueta "No leída"; toque → `/administracion/pedir`.

- [ ] **Step 1: Pruebas que fallan:** A pedir con 2 productos muestra "2 productos" y una barra por fila; con un producto de `punto_pedido: 0` la barra tiene ancho `"100%"`; vacío muestra el texto de vacío. Notificaciones: alertas de hoy y de hace 3 días aparecen bajo "HOY" y "ANTERIORES" (no aparece "AYER"); sin no leídas "Marcar leídas" está deshabilitado; los casos que ya cubría `notificaciones.test.tsx` siguen pasando.
- [ ] **Step 2:** correr → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** verificación completa → limpio.
- [ ] **Step 5:** Commit `feat(alertas): rediseño de A pedir y Notificaciones`.
