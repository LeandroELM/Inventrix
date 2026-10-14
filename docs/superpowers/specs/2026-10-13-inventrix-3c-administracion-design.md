# Inventrix — Parte 3C: Administración

Fecha: 2026-10-13 · Rama: `feat/ui-administracion` (sale de `main` tras el merge de la 3B) · Antecedentes: `2026-10-11-inventrix-ui-base-design.md` (parte 1), `2026-10-11-inventrix-backend-parte2-design.md` (parte 2), `2026-10-11-inventrix-3a-inicio-consulta-design.md` (3A), `2026-10-12-inventrix-3b-registro-design.md` (3B)

## Contexto

Tercera de las cuatro sub-partes del rediseño de pantallas: 3A Inicio y consulta (hecha), 3B Registro (hecha), **3C Administración** (esta), 3D Cuenta y soporte.

Pantallas: Historial de movimientos, menú de Administración, Reportes, Dar de baja y Editar producto. Hoy funcionan con componentes sin estilo; esta parte las rearma con las piezas de la parte 1, la 3A y la 3B, y por primera vez muestra el dashboard de Reportes que dejó listo la parte 2 (`dashboard_reportes`, `useDashboard`).

Referencia visual: el prototipo https://claude.ai/artifact/Y9hegvxitZ3nAEsyNSvJY5 no pudo consultarse para esta parte (carga dinámica). La composición sigue el lenguaje ya implementado en la 3A y la 3B; colores, tipografía (Inter), íconos (Lucide) y tokens salen de la parte 1.

La lógica actual se conserva: filtros y carga continua del historial (Entradas incluye `inicial`; Salidas incluye `baja`), consultas y archivos de los cinco reportes, baja con motivo de lista y con existencias (quedan en cero), validación de Editar producto y su mensaje de unidad entera.

## Decisiones tomadas con el usuario

| Tema | Decisión |
|---|---|
| Reportes | Dashboard arriba (periodo, indicadores, gráfico, inventario actual) y sección "Exportar a Excel" con los cinco reportes. La tabla en pantalla desaparece. |
| Filtros de exportación | Existencias y A pedir se exportan directo. Entradas, Salidas e Historial abren una hoja inferior con periodo (Hoy, 7 días, 30 días, Personalizado) y producto. |
| Detalle del historial | Lista con `FilaMovimiento`; al tocar, hoja inferior con el detalle y "Ver producto". |
| Indicadores de inventario | Productos registrados, en punto de pedido y existencias por unidad también en Reportes (acordado en la 3A). |
| Enfoque | Piezas compartidas primero, luego cada pantalla se rearma con ellas. |

## 1. Piezas compartidas

Todas usan `useTema()` (sin colores fijos), `Texto`, `Icono` (Lucide) y `Presionable`, con objetivos táctiles de al menos 48 dp y etiquetas de accesibilidad completas.

**`src/components/`**

- **`GraficoBarras`** — props: `serie: PuntoSerie[]`, `periodo: PeriodoDashboard`. Dibujo con `react-native-svg`: por día, dos barras (entradas en `colores.exito`, salidas en `colores.primario`); leyenda "Entradas" / "Salidas"; etiquetas del eje: en `7d`, inicial del día de la semana (L, M, X, J, V, S, D); en `30d` y `mes`, el número de día cada 5 días contando desde el primero de la serie. La altura máxima sale de la función pura exportada `escalaGrafico(serie): number` (mayor valor de entradas o salidas; 1 si todo es 0, para no dividir entre cero). El dibujo es decorativo para accesibilidad; el contenedor lleva `accessibilityLabel` `"Entradas y salidas por día: <E> entradas y <S> salidas en el periodo"` (sumas de la serie). Si las sumas son 0, en lugar del dibujo se muestra "Sin movimientos en el periodo.".
- **`TarjetaIndicador`** (3A, se extiende) — nueva variante `{ variante: "dato"; titulo: string; valor: string; detalle?: string; onPress?: () => void }`: etiqueta en `tono="secundario"`, valor en `variante="titulo"` (hasta dos líneas) y detalle debajo. Con `onPress` es tocable (`accessibilityRole="button"`, etiqueta `"<titulo>: <valor>[, <detalle>]"`).
- **`FilaLista`** (parte 1) — se reutiliza sin cambios para el menú de Administración y la lista de exportación.
- **`SufijoUnidad`** — el sufijo de unidad que hoy está en línea en `app/(app)/nuevo.tsx` (abreviatura posicionada dentro del `Campo`) se extrae a una pieza con prop `unidad: Unidad`; Nuevo producto y Editar producto la usan.

**`src/features/`**

- **`movimientos/HojaDetalleMovimiento`** — props: `fila: FilaHistorial`, `onCerrar`, `onVerProducto: (productoId: string) => void`. `HojaInferior` con encabezado `"<Tipo> · <producto>"`; cantidad con `etiquetaMovimiento` (tono de éxito para entrada e inicial, primario para salida y baja) y, si hay, el motivo (`ETIQUETAS_MOTIVO_SALIDA`); filas "Usuario", "Fecha y hora" (`dd/MM/yyyy HH:mm`), "Existencias" (`"<antes> → <después>"` con `formatearCantidad`); botón secundario "Ver producto".
- **`reportes/HojaExportar`** — props: `tipo: "entradas" | "salidas" | "historial"`, `onCerrar`. `HojaInferior` con título "Exportar <entradas|salidas|historial>"; `ChipsFiltro` de periodo (`hoy`, `7d` por defecto, `30d`, `personalizado`) y, con Personalizado, botones "Desde: <fecha>" y "Hasta: <fecha>" que abren `DateTimePicker` (lógica actual de `reportes.tsx`); fila "Producto: Todos" o "Producto: <nombre>" con "Cambiar" (muestra `BuscadorProducto` dentro de la hoja, sin escáner) y, si hay producto, "Quitar". Botón "Exportar a Excel" con `loading`: arma el rango con `rangoPeriodo`, llama a `obtenerReporte` → `filasDeReporte` → `exportarExcel(nombreArchivoReporte(tipo, ahora), { Reporte: filas })` y cierra la hoja al terminar. Sin filas: `AvisoAdvertencia` "No hay movimientos en el periodo elegido." y no exporta. Con Personalizado y "Desde" posterior a "Hasta": `AvisoAdvertencia` "La fecha inicial no puede ser posterior a la final." y el botón deshabilitado. Error: `AvisoAdvertencia` de peligro con `mensajeDeError(e)`; los filtros se conservan.

## 2. Pantallas

Todas las pantallas de esta parte dibujan su propio `EncabezadoPantalla`: en `app/(app)/administracion/_layout.tsx` y `app/(app)/movimientos/_layout.tsx` pasan a `headerShown: false` (`index`, `reportes`, `baja`, `producto/[id]/editar` y el `index` de movimientos). Estados de carga con `Skeleton`; errores de carga con mensaje y "Reintentar". Las rutas no cambian.

**Historial** (`app/(app)/movimientos/index.tsx`, ambos roles):

- `EncabezadoPantalla` "Historial de movimientos"; botón de volver solo si `router.canGoBack()` (para el operativo es una pestaña).
- Campo con lupa, etiqueta "Buscar por producto o código" (debounce de 300 ms, como el buscador de la 3B); `ChipsFiltro` Todos / Entradas / Salidas (etiqueta del grupo "Tipo de movimiento").
- Con `productoId`: píldora "Mostrando: <nombre>" con "Quitar filtro" (`router.setParams({ productoId: undefined })`, como hoy).
- Lista con encabezados de día: "HOY", "AYER" o `dd/MM`, insertados donde cambia el día (función pura `conEncabezadosDia`, §3). Cada movimiento es una `FilaMovimiento` con `usuario`; al tocarla abre `HojaDetalleMovimiento`; "Ver producto" cierra la hoja y navega a `/administracion/producto/<id>`. Carga continua como hoy, con `Skeleton` al pie mientras trae la página siguiente.
- Vacío: "Sin movimientos." sin búsqueda ni filtros; "No hay movimientos que coincidan." con búsqueda, tipo o producto. Error: "No se pudo cargar el historial." con "Reintentar".

**Administración** (`app/(app)/administracion/index.tsx`):

- `EncabezadoPantalla` "Administración", subtítulo "Herramientas del administrador", sin botón de volver (es pestaña).
- Dos `FilaLista` con ícono (`administracion` y `alerta`, como hoy), filtradas por `puede(rol, accion)` como hoy: "Reportes" / "Indicadores, gráfico y exportación a Excel" → `/administracion/reportes`; "Dar de baja producto" / "Retira un producto del catálogo" → `/administracion/baja`.

**Reportes** (`app/(app)/administracion/reportes.tsx`, sigue con `RequiereRol rol="admin"`):

- `EncabezadoPantalla` "Reportes"; contenido en `ScrollView` con pull-to-refresh (refresca dashboard e inicio).
- `ChipsFiltro` de periodo: 7 días (por defecto) / 30 días / Este mes, etiqueta del grupo "Periodo", conectado a `useDashboard`.
- Cuadrícula 2×2 de `TarjetaIndicador` `dato`:
  - "Más vendido": nombre del producto y detalle con la cantidad formateada; con `masVendido = null`, valor "—" y detalle "Sin ventas en el periodo".
  - "Menos vendido": igual con `menosVendido`.
  - "En punto de pedido": `enPuntoPedido`, detalle "productos"; toque → `/administracion/pedir`.
  - "Movimientos": `totalMovimientos`, detalle "en el periodo".
- Tarjeta "Entradas y salidas" con `GraficoBarras`.
- Si el dashboard falla: en lugar de indicadores y gráfico, `AvisoAdvertencia` de peligro con `mensajeDeError` y "Reintentar"; el resto de la pantalla sigue disponible.
- "Inventario actual": `TarjetaIndicador` `lista` con una primera fila "<N> productos registrados" (`productosActivos`) y las mismas filas por unidad que la tarjeta "Existencias generales" del Inicio, a partir de `useInicio("admin")` (misma consulta y caché). Si falla, la tarjeta no se muestra.
- Sección "Exportar a Excel" con cinco `FilaLista` (ícono `subida`, el mismo de "Exportar a Excel" en Buscar): "Existencias" / "Productos activos con su estado"; "A pedir" / "Productos en su punto de pedido"; "Entradas" / "Por periodo y producto"; "Salidas" / "Por periodo y producto"; "Historial" / "Todos los movimientos por periodo y producto". Existencias y A pedir exportan directo (mientras exporta, la fila muestra el valor "Exportando…" y no acepta toques; sin filas, `AvisoAdvertencia` "No hay registros para exportar."; error, `AvisoAdvertencia` de peligro debajo de la lista). Las otras tres abren `HojaExportar`.

**Dar de baja** (`app/(app)/administracion/baja.tsx`, sigue con `RequiereRol rol="admin"`):

- Sin producto: `EncabezadoPantalla` "Dar de baja producto"; `BuscadorProducto` con `escanearDestino="baja"`. Selección por parámetro `productoId` o por búsqueda, como hoy.
- Con producto:
  - `Tarjeta` con `AvatarProducto`, nombre, `"<código> · <unidad>"` y "Existencias: <cant>"; debajo, enlace de texto "Elegir otro producto" (reinicia motivo, detalle y error).
  - Producto ya dado de baja: `AvisoAdvertencia` de peligro "El producto ya está dado de baja." y nada más.
  - Con existencias > 0: `AvisoAdvertencia` "Este producto aún tiene <cant> en existencia; al darlo de baja quedarán en cero y el historial lo registrará.".
  - "Motivo de la baja": `ChipsFiltro` de `MOTIVOS_BAJA` con `ETIQUETAS_MOTIVO_BAJA`, `valor = null` al inicio. Con "Otro", `Campo` "Detalle" (máx. 200; obligatorio).
  - Error de la baja: `AvisoAdvertencia` de peligro con `mensajeDeError(e)` sobre el botón; motivo y detalle se conservan.
  - `Boton` `variante="peligro"` "Dar de baja", deshabilitado sin motivo válido.
- Confirmación: `HojaInferior` (reemplaza al `Modal`) con el texto `¿Dar de baja "<nombre>"? Dejará de aparecer en Existencias y no podrá usarse en movimientos nuevos.`, `Boton` `variante="peligro"` "Confirmar baja" con `loading` y `Boton` `variante="secundario"` "Cancelar". Al fallar, la hoja se cierra y se muestra el error.
- Resultado: `PantallaResultado` con título "Producto dado de baja", frase "<nombre> ya no aparecerá en Existencias. Su historial se conserva.", detalle "Motivo: <etiqueta>[ · <detalle>]", datos "Existencias retiradas" (las existencias previas formateadas; "0" si no tenía) y "Fecha" (`dd/MM/yyyy`), botones "Ver en Existencias" (`router.replace("/buscar")`) y "Volver a Administración" (`router.replace("/administracion")`).

**Editar producto** (`app/(app)/administracion/producto/[id]/editar.tsx`, sigue con `RequiereRol rol="admin"`):

- `EncabezadoPantalla` "Editar producto", subtítulo con el nombre actual del producto, acción de cierre (X, etiqueta "Cerrar") → `router.back()`.
- `Tarjeta` con: "Código" en solo lectura con la nota "El código no se puede cambiar."; `Campo` Nombre; `SelectorUnidad`; `Campo` Punto de pedido con `SufijoUnidad` de la unidad elegida. Errores de validación en el `error` de cada `Campo`.
- Error de unidad entera (mensaje actual) y errores del servidor: `AvisoAdvertencia` de peligro sobre los botones.
- `Boton` "Guardar cambios" con `loading`; `Boton` `variante="secundario"` "Cancelar". Al guardar, `router.back()` (vuelve a la ficha, como hoy).
- Carga con `Skeleton`; error de carga con mensaje y "Reintentar".

## 3. Datos

- Sin cambios de base de datos, de RPC ni de invalidación (la baja y la edición ya invalidan `["dashboard"]` desde la 3A).
- Nueva función pura en `src/lib/fechaRelativa.ts`: `conEncabezadosDia<T extends { created_at: string }>(filas: T[], ahora: Date): ({ tipo: "dia"; clave: string; texto: string } | { tipo: "fila"; fila: T })[]` — inserta un encabezado antes de la primera fila de cada día local: "HOY", "AYER" o `dd/MM`.
- `HojaExportar` y la exportación directa reutilizan `rangoPeriodo`, `obtenerReporte`, `filasDeReporte`, `nombreArchivoReporte` y `exportarExcel` sin cambios.
- `escalaGrafico` vive junto a `GraficoBarras` y se exporta para probarla.

## 4. Pruebas

- Jest por pieza: `escalaGrafico` (normal, todo en cero → 1); `GraficoBarras` (etiqueta de accesibilidad con las sumas; "Sin movimientos en el periodo." con serie en cero); `TarjetaIndicador` `dato` (con y sin detalle; tocable solo con `onPress`); `conEncabezadosDia` (hoy, ayer, días anteriores, varias filas del mismo día con un solo encabezado); `HojaDetalleMovimiento` (existencias antes → después, motivo solo en salida, "Ver producto" llama con el id); `HojaExportar` (periodo por defecto 7 días, Personalizado muestra Desde/Hasta, exporta con el rango y producto elegidos, sin filas muestra el aviso y no exporta, error conserva filtros).
- Jest por pantalla: Historial (encabezados de día, vacío con y sin filtros, toque abre el detalle, quitar filtro de producto); Administración (opciones según permisos); Reportes (indicadores con datos y con `masVendido = null`, "En punto de pedido" navega a A pedir, error del dashboard con exportación aún disponible, Existencias exporta directo, Entradas abre la hoja); Dar de baja (aviso con existencias, "Otro" exige detalle, confirmación en hoja, error conserva el motivo, resultado, producto ya dado de baja sin botón); Editar producto (errores en el campo, error de unidad entera, guardar vuelve atrás, código en solo lectura).
- Verificación manual en Expo Go con `ana.lopez` (admin) y `carlos.m` (operativo), en modo claro y oscuro: historial con más de 30 movimientos, dashboard en los tres periodos, las cinco exportaciones abiertas en el teléfono, baja con y sin existencias, edición con cambio de unidad.

## Fuera de alcance

Login, Configuración, Trix y manuales (3D). Inicio, Buscar, ficha, A pedir y Notificaciones (3A) y Entrada, Salida, Nuevo producto y Escáner (3B) solo cambian en lo que exige esta parte (`SufijoUnidad` en Nuevo producto).
