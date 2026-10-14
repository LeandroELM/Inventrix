# Inventrix 3C (Administración) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar Historial, Administración, Reportes (con el dashboard de la parte 2 y exportación por hoja), Dar de baja y Editar producto con las piezas de la 3A y la 3B.

**Architecture:** Primero las piezas compartidas (variante `dato` de `TarjetaIndicador`, `GraficoBarras`, `HojaDetalleMovimiento`, `HojaExportar`, `SufijoUnidad`) y la función pura `conEncabezadosDia`, cada una con su prueba; luego cada pantalla se rearma con ellas conservando su lógica. Sin cambios de base de datos.

**Tech Stack:** Expo SDK 57, expo-router, TypeScript, TanStack Query, react-native-svg, @react-native-community/datetimepicker, lucide-react-native, Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-10-13-inventrix-3c-administracion-design.md`

## Global Constraints

- Colores solo desde `useTema().colores` (tokens en `src/tema/tokens.ts`, claro y oscuro); nunca hex en componentes o pantallas.
- Texto solo con `Texto`; campos con `EntradaTexto`/`Campo` (ESLint prohíbe `Text`/`TextInput` de react-native).
- Íconos solo con `Icono` (Lucide; si falta uno, se agrega a `ICONOS` en `src/components/Icono.tsx`); lo tocable con `Presionable` o `Boton`; objetivos táctiles ≥ 48 dp; `accessibilityLabel` completa en todo botón de solo ícono.
- El encabezado de pantalla es `Encabezado` con `variante="pantalla"` (props `titulo`, `subtitulo?`, `onAtras?`, `accion?`).
- Textos en español, sin emojis; las copias que fija la spec se usan literalmente.
- Mensajes de commit en español con prefijo convencional y la línea final `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Verificación de cada tarea: `npm run typecheck`, `npm run lint`, `npx jest <archivos de la tarea>` limpios; la Tarea 9 corre `npm test` completo.
- Pruebas de componentes y pantallas con `TemaProvider` + `SafeAreaProvider` (`initialMetrics` como en `__tests__/components/AnilloExistencias.test.tsx`) y el mock de `@/features/configuracion/apariencia`; las de pantallas, además, `QueryClientProvider` con `retry: false` y los mocks de `react-native-reanimated` como en `__tests__/productos/buscar.test.tsx`.

## Review Focus

1. Historial con carga continua: si la página 2 empieza con el mismo día en que terminó la página 1, no debe aparecer un segundo encabezado de ese día → prueba en la Tarea 3 (`conEncabezadosDia` sobre la lista completa) y uso en la Tarea 4 (se aplica a `pages.flat()`, nunca por página).
2. Movimiento a las 23:30 hora local: se agrupa en su día local, no en el día UTC → prueba en la Tarea 3.
3. Exportación personalizada con "Desde" posterior a "Hasta": aviso `"La fecha inicial no puede ser posterior a la final."` y botón deshabilitado, sin llamar al servidor → prueba en la Tarea 5.
4. Doble toque en "Confirmar baja" o en la fila "Existencias" de exportación: una sola llamada → pruebas en las Tareas 6 y 7.
5. Nombre largo (60 caracteres) en "Más vendido": máximo dos líneas sin romper la cuadrícula → prueba en la Tarea 1 (`numberOfLines={2}`).

---

### Task 1: Variante `dato` de `TarjetaIndicador`

**Files:**
- Modify: `src/components/TarjetaIndicador.tsx`
- Test: `__tests__/components/tarjetas.test.tsx`

**Interfaces:**
- Produces: nueva rama de `Props`: `{ variante: "dato"; titulo: string; valor: string; detalle?: string; onPress?: () => void }`. Etiqueta en `variante="etiqueta"` `tono="secundario"`, valor en `variante="titulo"` con `numberOfLines={2}`, detalle en `variante="pequeno"` `tono="secundario"`. Con `onPress`: envuelto en `Presionable`, `accessibilityRole="button"`, `accessibilityLabel` `` `${titulo}: ${valor}${detalle ? `, ${detalle}` : ""}` ``. Fondo `colores.superficie` como la variante `lista`.

- [ ] **Step 1: Write the failing tests** en el `describe("TarjetaIndicador")`:
  - `it("dato muestra titulo, valor y detalle")` → `getByText("Más vendido")`, `getByText("Frijol rojo")`, `getByText("120 lb")`.
  - `it("dato sin onPress no es boton")` → `queryByRole("button")` nulo.
  - `it("dato con onPress es boton con etiqueta completa")` → `getByRole("button", { name: "En punto de pedido: 3, productos" })`; `press` llama al mock.
  - `it("dato limita el valor a dos lineas")` → valor de 60 caracteres; `getByText(valor).props.numberOfLines === 2`.
- [ ] **Step 2: Run** `npx jest __tests__/components/tarjetas.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** la variante.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): variante dato de la tarjeta indicador`

### Task 2: `GraficoBarras`

**Files:**
- Create: `src/components/GraficoBarras.tsx`
- Test: `__tests__/components/GraficoBarras.test.tsx`

**Interfaces:**
- Consumes: `PuntoSerie`, `PeriodoDashboard` de `src/features/reportes/dashboard.ts`.
- Produces: `escalaGrafico(serie: PuntoSerie[]): number`; `etiquetaEje(fecha: string, indice: number, periodo: PeriodoDashboard): string` (`"7d"`: inicial del día de la semana local con `["D","L","M","X","J","V","S"]` a partir de `new Date(y, m - 1, d)`; `"30d"`/`"mes"`: el número de día si `indice % 5 === 0`, si no `""`); `GraficoBarras({ serie: PuntoSerie[]; periodo: PeriodoDashboard })`.

- [ ] **Step 1: Write the failing tests:**
  - `it("escalaGrafico toma el mayor valor")` → `[{fecha:"2026-10-01",entradas:3,salidas:7},{fecha:"2026-10-02",entradas:5,salidas:1}]` → `7`.
  - `it("escalaGrafico con todo en cero es 1")`.
  - `it("etiquetaEje en 7 días usa la inicial del día")` → `etiquetaEje("2026-10-13", 0, "7d") === "M"` (martes).
  - `it("etiquetaEje en 30 días cada 5")` → índice 0 de `"2026-10-01"` → `"1"`; índice 3 → `""`; índice 5 de `"2026-10-06"` → `"6"`.
  - `it("resume entradas y salidas para el lector")` → `getByLabelText("Entradas y salidas por día: 8 entradas y 8 salidas en el periodo")` con la serie de arriba.
  - `it("sin movimientos muestra el mensaje")` → serie en cero → `getByText("Sin movimientos en el periodo.")`.
  - `it("muestra la leyenda")` → `getByText("Entradas")`, `getByText("Salidas")`.
- [ ] **Step 2: Run** `npx jest __tests__/components/GraficoBarras.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement.** Ancho con `onLayout`; alto del área de barras 140; por día un grupo con dos `Rect` (entradas `colores.exito`, salidas `colores.primario`, radio 2) de alto `valor / escala × 140`; etiquetas con `Texto` `variante="pequeno"` debajo. El `Svg` lleva `importantForAccessibility="no-hide-descendants"` y `accessibilityElementsHidden`; el contenedor lleva la etiqueta resumen y `accessible`.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): grafico de barras de entradas y salidas`

### Task 3: `conEncabezadosDia`, `FilaMovimiento` tocable y `HojaDetalleMovimiento`

**Files:**
- Modify: `src/lib/fechaRelativa.ts`, `src/components/FilaMovimiento.tsx`
- Create: `src/features/movimientos/HojaDetalleMovimiento.tsx`
- Test: `__tests__/lib/fechaRelativa.test.ts`, `__tests__/components/filas.test.tsx`, `__tests__/movimientos/HojaDetalleMovimiento.test.tsx`

**Interfaces:**
- Consumes: `FilaHistorial` (`src/features/movimientos/api.ts`), `HojaInferior`, `etiquetaMovimiento`, `ETIQUETAS_MOTIVO_SALIDA`, `formatearCantidad`.
- Produces:
  - `type ElementoDia<T> = { tipo: "dia"; clave: string; texto: string } | { tipo: "fila"; fila: T }` y `conEncabezadosDia<T extends { created_at: string }>(filas: T[], ahora: Date): ElementoDia<T>[]` en `src/lib/fechaRelativa.ts`. `clave` = `YYYY-MM-DD` local; `texto` = `"HOY"`, `"AYER"` o `dd/MM` (reutiliza `dosDigitos`).
  - `FilaMovimiento` acepta `onPress?: () => void`; con él, envuelve en `Presionable` con `accessibilityRole="button"` y la misma etiqueta que hoy.
  - `HojaDetalleMovimiento({ fila: FilaHistorial; onCerrar: () => void; onVerProducto: (productoId: string) => void })`.

- [ ] **Step 1: Write the failing tests:**
  - `fechaRelativa.test.ts` (con `ahora = new Date(2026, 9, 13, 12, 0)`):
    - `it("conEncabezadosDia agrupa hoy, ayer y anteriores")` → filas de hoy 10:00, hoy 08:00, ayer 18:00, 10/10 → textos de encabezado `["HOY","AYER","10/10"]` y 7 elementos en total.
    - `it("23:30 local cae en su día")` → fila `new Date(2026, 9, 12, 23, 30).toISOString()` queda bajo `"AYER"`.
    - `it("un día repartido en dos páginas lleva un solo encabezado")` → concatenar dos arreglos cuyo borde es el mismo día → un único elemento `tipo: "dia"` para ese día.
  - `filas.test.tsx`: `it("FilaMovimiento con onPress es boton")` → `press` llama al mock; sin `onPress`, `queryByRole("button")` nulo.
  - `HojaDetalleMovimiento.test.tsx` (salida, `cantidad: 5`, `unidad: "libra"`, `motivo: "venta"`, `existencias_antes: 60`, `existencias_despues: 55`, `usuario: "Carlos M."`, `created_at` de 13/10/2026 09:15 local):
    - `it("muestra el detalle")` → `"Salida · Frijol rojo"`, `"−5 lb"`, `"Venta"`, `"Carlos M."`, `"13/10/2026 09:15"`, `"60 lb → 55 lb"`.
    - `it("entrada sin motivo")` → con `tipo: "entrada", motivo: null` no aparece `"Venta"`.
    - `it("Ver producto llama con el id")` → `press(getByRole("button", { name: "Ver producto" }))` → `onVerProducto("p1")`.
- [ ] **Step 2: Run** `npx jest __tests__/lib/fechaRelativa.test.ts __tests__/components/filas.test.tsx __tests__/movimientos/HojaDetalleMovimiento.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement.** Hoja: encabezado `` `${NOMBRE_TIPO} · ${producto}` `` (mismos nombres que `FilaMovimiento`: inicial → "Entrada"); cantidad en `textoExito` para entrada e inicial y `texto` para salida y baja; filas etiqueta/valor "Usuario", "Fecha y hora", "Existencias"; `Boton` `variante="secundario"` "Ver producto".
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(movimientos): detalle de movimiento en hoja y encabezados por dia`

### Task 4: Pantalla de Historial

**Files:**
- Modify: `app/(app)/movimientos/index.tsx`, `app/(app)/movimientos/_layout.tsx` (`index` con `headerShown: false`)
- Test: `__tests__/movimientos/historialProducto.test.tsx` (se actualiza), `__tests__/movimientos/historialPantalla.test.tsx` (nuevo), `__tests__/movimientos/layout.test.tsx` (sigue pasando o se ajusta al encabezado propio)

**Interfaces:**
- Consumes: Task 3; `useHistorial`, `useProducto`, `ChipsFiltro`, `Skeleton`, `EstadoError` (como en Buscar de la 3A).

- [ ] **Step 1: Write the failing tests** (`historialPantalla.test.tsx`, mock de `listarHistorial`):
  - `it("muestra el encabezado y los encabezados de dia")` → `getByRole("header", { name: "Historial de movimientos" })`, `getByText("HOY")`, `getByText("AYER")`.
  - `it("vacio sin filtros")` → `"Sin movimientos."`; `it("vacio con busqueda")` → escribir "zz" en "Buscar por producto o código" (avanzar 300 ms con timers falsos) → `"No hay movimientos que coincidan."`.
  - `it("Salidas filtra por salida")` → `press(getByRole("button", { name: "Salidas" }))` → `listarHistorial` llamado con `tipo: "salida"`.
  - `it("tocar una fila abre el detalle y Ver producto navega")` → `press` sobre la fila → `getByText("60 lb → 55 lb")`; "Ver producto" → `push("/administracion/producto/p1")`.
  - `it("error con Reintentar")` → rechazo → `"No se pudo cargar el historial."` y `press("Reintentar")` vuelve a llamar.
  - `historialProducto.test.tsx`: los tres casos actuales se mantienen con la píldora `"Mostrando: <nombre>"` y "Quitar filtro".
- [ ] **Step 2: Run** `npx jest __tests__/movimientos` — Expected: FAIL.
- [ ] **Step 3: Implement** según la spec §2 "Historial". `FlatList` sobre `conEncabezadosDia(pages.flat(), ahora)` con `keyExtractor` `dia-<clave>` / `String(fila.id)`; los encabezados de día con `Texto` `variante="etiqueta"` `tono="secundario"` y `accessibilityRole="header"`. Estado `detalle: FilaHistorial | null`. `onAtras` solo si `router.canGoBack()`. Debounce de 300 ms del texto antes de pasarlo a `useHistorial`.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(movimientos): rediseño del historial`

### Task 5: `HojaExportar`

**Files:**
- Create: `src/features/reportes/HojaExportar.tsx`
- Test: `__tests__/reportes/HojaExportar.test.tsx`

**Interfaces:**
- Consumes: `rangoPeriodo`, `Periodo` (`rango.ts`); `obtenerReporte`, `filasDeReporte` (`api.ts`); `exportarExcel`, `nombreArchivoReporte` (`excel.ts`); `BuscadorProducto` (sin `escanearDestino`); `ChipsFiltro`, `AvisoAdvertencia`, `HojaInferior`, `Boton`.
- Produces: `HojaExportar({ tipo: "entradas" | "salidas" | "historial"; onCerrar: () => void })`. Títulos: `"Exportar entradas"`, `"Exportar salidas"`, `"Exportar historial"`.

- [ ] **Step 1: Write the failing tests** (mocks de `@/features/reportes/api`, `@/features/reportes/excel` conservando `nombreArchivoReporte` real, `@react-native-community/datetimepicker`, `BuscadorProducto` como botón falso que llama `onElegir("p1", "Frijol rojo")`; `jest.useFakeTimers().setSystemTime(new Date(2026, 9, 13, 12))`):
  - `it("7 días por defecto y exporta con ese rango")` → chip "7 días" con `selected: true`; `press("Exportar a Excel")` → `obtenerReporte("salidas", { desde: new Date(2026, 9, 7), hasta: new Date(2026, 9, 14), productoId: undefined })` y `exportarExcel` llamado con `{ Reporte: filas }`; luego `onCerrar`.
  - `it("Personalizado muestra Desde y Hasta")` → botones con nombre que empieza por "Desde:" y "Hasta:".
  - `it("producto elegido se envía y Quitar lo elimina")` → "Cambiar" → elegir → `"Producto: Frijol rojo"`; exportar con `productoId: "p1"`; "Quitar" → `"Producto: Todos"`.
  - `it("sin filas avisa y no exporta")` → `filasDeReporte` devuelve `[]` → `"No hay movimientos en el periodo elegido."`, `exportarExcel` no llamado, `onCerrar` no llamado.
  - `it("error conserva filtros")` → `obtenerReporte` rechaza → alerta con `mensajeDeError`; sigue `"Producto: Frijol rojo"`.
  - `it("desde posterior a hasta deshabilita")` → con Personalizado, fijar Desde 14/10 y Hasta 10/10 mediante el mock del picker → `"La fecha inicial no puede ser posterior a la final."` y el botón con `disabled: true`.
- [ ] **Step 2: Run** `npx jest __tests__/reportes/HojaExportar.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** según la spec §1 "HojaExportar". Estado `eligiendo: boolean` alterna entre los filtros y el `BuscadorProducto` dentro de la hoja. El error de rango se calcula comparando `desde` y `hasta` locales por día. Durante la exportación el botón tiene `loading` y no acepta un segundo toque.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(reportes): hoja de exportacion con periodo y producto`

### Task 6: Reportes y menú de Administración

**Files:**
- Modify: `app/(app)/administracion/reportes.tsx` (se reescribe), `app/(app)/administracion/index.tsx`, `app/(app)/administracion/_layout.tsx` (`index` y `reportes` con `headerShown: false`), `src/features/inicio/api.ts`, `app/(app)/index.tsx`
- Test: `__tests__/reportes/pantalla.test.tsx` (nuevo), `__tests__/navegacion/rutas.test.tsx` (se ajusta), `__tests__/inicio/resumen.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 2, 5; `useDashboard`, `useInicio`, `listarTodosProductos`/`obtenerReporte`, `FilaLista`.
- Produces: `filasResumen(resumen: ResumenUnidad[]): { valor: string; etiqueta: string }[]` en `src/features/inicio/api.ts` (lo que hoy está en línea en `app/(app)/index.tsx`, en el orden de `textoResumen`); el Inicio pasa a usarla.

- [ ] **Step 1: Write the failing tests:**
  - `resumen.test.ts`: `it("filasResumen separa valor y unidad")` → `[{ unidad: "libra", total: 120 }]` → `[{ valor: "120", etiqueta: "lb" }]`.
  - `pantalla.test.tsx` (mocks de `obtenerDashboard`, `obtenerInicio`, `obtenerReporte`, `exportarExcel`; `useAuth` admin; `expo-router` con `push`):
    - `it("muestra indicadores del periodo")` → `"Más vendido"`, `"Frijol rojo"`, `"120 lb"`, `"Movimientos"`, `"42"`, `"en el periodo"`.
    - `it("sin ventas")` → `masVendido: null` → `"Sin ventas en el periodo"`.
    - `it("En punto de pedido navega a A pedir")` → `push("/administracion/pedir")`.
    - `it("cambiar a 30 días consulta otro rango")` → `obtenerDashboard` llamado con un `desde` 29 días antes de hoy.
    - `it("inventario actual")` → `"Inventario actual"`, `"12 productos registrados"`.
    - `it("error del dashboard deja exportar")` → rechazo → alerta con el mensaje y "Reintentar"; `getByRole("button", { name: /Existencias/ })` sigue presente.
    - `it("Existencias exporta directo una sola vez")` → dos `press` seguidos → `exportarExcel` llamado una vez; durante la exportación aparece `"Exportando…"`.
    - `it("Entradas abre la hoja")` → `getByText("Exportar entradas")`.
  - `rutas.test.tsx`: el menú muestra `"Reportes"` con `"Indicadores, gráfico y exportación a Excel"` y `"Dar de baja producto"` con `"Retira un producto del catálogo"`, y nada más.
- [ ] **Step 2: Run** `npx jest __tests__/reportes __tests__/navegacion/rutas.test.tsx __tests__/inicio` — Expected: FAIL.
- [ ] **Step 3: Implement** según la spec §2 "Administración" y "Reportes". Opciones de periodo `{ valor: "7d", texto: "7 días" }`, `{ valor: "30d", texto: "30 días" }`, `{ valor: "mes", texto: "Este mes" }`. Indicadores en dos filas de dos con `style={{ flex: 1 }}`. Exportación directa: `exportarExcel(nombreArchivoReporte(tipo, ahora), { Reporte: filasDeReporte(tipo, await obtenerReporte(tipo), ahora) })` con estado `exportando: TipoReporte | null`; mientras no sea `null`, las filas directas ignoran toques.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(reportes): dashboard, exportacion y menu de administracion`

### Task 7: Dar de baja

**Files:**
- Modify: `app/(app)/administracion/baja.tsx`, `app/(app)/administracion/_layout.tsx` (`baja` con `headerShown: false`)
- Test: `__tests__/productos/baja.test.tsx` (se actualiza)

**Interfaces:**
- Consumes: `ChipsFiltro`, `AvisoAdvertencia`, `HojaInferior`, `PantallaResultado`, `AvatarProducto`, `BuscadorProducto`, `useDarBajaProducto`, `MOTIVOS_BAJA`, `ETIQUETAS_MOTIVO_BAJA`.

- [ ] **Step 1: Write the failing tests** (`findByText("Aceite")` reemplaza la espera por `"Código: F1"`):
  - los cuatro motivos como chips; ninguno seleccionado al inicio; botón "Dar de baja" deshabilitado.
  - "Otro" muestra "Detalle" y mantiene deshabilitado si está vacío.
  - aviso con existencias: `` `Este producto aún tiene ${formatearCantidad(12, "unidad")} en existencia; al darlo de baja quedarán en cero y el historial lo registrará.` ``.
  - confirmación: "Dar de baja" → `getByText('¿Dar de baja "Aceite"? Dejará de aparecer en Existencias y no podrá usarse en movimientos nuevos.')`; "Confirmar baja" → `mockDarBaja("p1", "descontinuado", undefined)`.
  - doble toque en "Confirmar baja" → una sola llamada.
  - resultado: `"Producto dado de baja"`, `"Motivo: Descontinuado"`, `"Existencias retiradas"`; "Volver a Administración" → `replace("/administracion")`.
  - con Otro y detalle → detalle del resultado `"Motivo: Otro · Ya no llega"`.
  - error: rechazo → la hoja se cierra, alerta con el mensaje y el chip elegido sigue `selected`.
  - producto inactivo → `"El producto ya está dado de baja."` sin botón "Dar de baja".
- [ ] **Step 2: Run** `npx jest __tests__/productos/baja.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** según la spec §2 "Dar de baja". Guardar en el estado del resultado las existencias previas y la fecha antes de llamar a la mutación (el producto queda invalidado al terminar). La hoja de confirmación no se cierra por gesto mientras `baja.isPending`.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(productos): rediseño de dar de baja`

### Task 8: `SufijoUnidad` y Editar producto

**Files:**
- Create: `src/components/SufijoUnidad.tsx`
- Modify: `app/(app)/nuevo.tsx` (constante `sufijo`, ~línea 250), `app/(app)/administracion/producto/[id]/editar.tsx`, `app/(app)/administracion/_layout.tsx` (`producto/[id]/editar` con `headerShown: false`)
- Test: `__tests__/productos/editar.test.tsx` (se amplía), `__tests__/productos/nuevo.test.tsx` (sigue pasando)

**Interfaces:**
- Produces: `SufijoUnidad({ unidad: Unidad })` → `Texto` `tono="secundario"` con `UNIDADES[unidad].abreviatura`, posición absoluta derecha `ESPACIO.m`, `top: 34`, `pointerEvents: "none"` (lo de hoy en `nuevo.tsx`); el `Campo` que lo acompaña lleva `paddingRight: 56`.

- [ ] **Step 1: Write the failing tests** (`editar.test.tsx`):
  - el caso actual de unidad entera sigue pasando, ahora como alerta de `AvisoAdvertencia`.
  - `it("muestra el codigo en solo lectura")` → `"El código no se puede cambiar."` y no hay campo con etiqueta "Código".
  - `it("error de nombre en el campo")` → nombre vacío + "Guardar cambios" → mensaje de `validarFormularioProducto` visible y `actualizar` no llamado.
  - `it("guardar vuelve atras")` → `back()` llamado tras resolver.
  - `it("Cerrar vuelve atras")` → `press(getByRole("button", { name: "Cerrar" }))` → `back()`.
  - `it("sufijo de la unidad")` → con unidad libra, `getByText("lb")`.
- [ ] **Step 2: Run** `npx jest __tests__/productos/editar.test.tsx __tests__/productos/nuevo.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** `SufijoUnidad`, reemplazar el `sufijo` de `nuevo.tsx` y rearmar Editar según la spec §2 "Editar producto". La validación y `MENSAJE_UNIDAD_ENTERA` no cambian; `Campo` recibe `error` en lugar del `Texto` suelto.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(productos): rediseño de editar producto`

### Task 9: Verificación final

- [ ] **Step 1:** `npm run typecheck && npm run lint && npm test` — Expected: sin errores; todas las suites en verde.
- [ ] **Step 2:** `grep -rnE "#[0-9A-Fa-f]{3,6}\b" app/\(app\)/movimientos/index.tsx app/\(app\)/administracion/{index,reportes,baja}.tsx "app/(app)/administracion/producto/[id]/editar.tsx" src/components/{GraficoBarras,SufijoUnidad,TarjetaIndicador}.tsx src/features/movimientos/HojaDetalleMovimiento.tsx src/features/reportes/HojaExportar.tsx` — Expected: sin resultados.
- [ ] **Step 3:** Verificación manual en Expo Go (`npx expo start`) con `ana.lopez` (admin) y `carlos.m` (operativo), modo claro y oscuro: historial con más de 30 movimientos (encabezados de día al cargar más, detalle, filtro por producto desde la ficha), dashboard en los tres periodos, las cinco exportaciones abiertas en el teléfono, baja con y sin existencias, edición con cambio de unidad. Anotar lo observado en el PR.
- [ ] **Step 4: Commit** de correcciones si las hubo: `fix(3c): ...`
