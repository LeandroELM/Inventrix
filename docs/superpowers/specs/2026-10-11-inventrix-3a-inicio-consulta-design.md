# Inventrix — Parte 3A: Inicio y consulta

Fecha: 2026-10-11 · Rama: `feat/ui-pantallas` (sale de `feat/backend-parte2`) · Antecedentes: `2026-10-11-inventrix-ui-base-design.md` (parte 1), `2026-10-11-inventrix-backend-parte2-design.md` (parte 2)

## Contexto

La parte 3 (rediseño de pantallas) se dividió en cuatro sub-partes, cada una con su spec, plan y PR: **3A Inicio y consulta** (esta), 3B Registro, 3C Administración, 3D Cuenta y soporte.

Referencia visual: prototipo https://claude.ai/artifact/Y9hegvxitZ3nAEsyNSvJY5, tableros `A-Inicio`, `B-Inicio`, `A-Existencias`, `A-Ficha`, `A-Pedir`, `A-Notificaciones`. El prototipo es guía de composición, jerarquía y tono; los colores, la tipografía (Inter, no Manrope), los íconos (Lucide), la barra inferior y el botón de Trix salen de la parte 1 y sus tokens. Las pestañas son las aprobadas en la parte 1 (A: Inicio · Buscar · ＋ · Administración · Config; B: Inicio · Buscar · Movimientos · Config), no las del prototipo.

## Decisiones tomadas con el usuario

| Tema | Decisión |
|---|---|
| Indicadores en el inicio del administrador | Sí: productos registrados, punto de pedido y existencias por unidad en el inicio (y también en Reportes, parte 3C). |
| Inicio del operativo | Igual al prototipo: tarjeta principal con productos registrados y accesos, resumen de existencias por unidad, últimos 5 movimientos de todos los usuarios. Sin campana, sin punto de pedido. |
| Anillo de la ficha | Se llena respecto del doble del punto de pedido; la marca del punto de pedido queda a la mitad. Sin datos nuevos. |
| Enfoque | Piezas compartidas primero, luego cada pantalla se rearma con ellas. |

## 1. Piezas compartidas (`src/components/`)

Todas usan `useTema()` (sin colores fijos), `Texto` para el texto, `Icono` (Lucide) para íconos y `Presionable` para lo tocable, con objetivos táctiles de al menos 48 dp y etiquetas de accesibilidad completas.

- **`TarjetaPrincipal`** — props: `titulo: string`, `valor: number`, `sufijo?: string`, `chips?: { texto: string; tono: "exito" | "neutro" }[]`, `accesos: { titulo: string; icono: NombreIcono; onPress: () => void; destacado?: boolean }[]`. Fondo del degradado de marca; `valor` con `NumeroAnimado`.
- **`TarjetaIndicador`** — dos variantes: `alerta` (fondo de advertencia, ícono, número grande y texto; tocable con `onPress`) y `lista` (título y filas `valor · unidad` separadas por una línea). Props: `variante`, `titulo`, `valor?`, `filas?: { valor: string; etiqueta: string }[]`, `onPress?`.
- **`FilaProducto`** — props: `nombre`, `detalle` (código · unidad), `cantidad` (texto ya formateado), `estado: EstadoProducto`, `onPress`. Avatar con `AvatarProducto` coloreado por estado; etiqueta de estado (Disponible / Bajo inventario / Sin existencias). `EstadoProducto` y su cálculo ya existen en `src/features/productos/estado.ts`.
- **`FilaMovimiento`** — props: `producto`, `tipo: TipoMovimiento`, `motivo: MotivoSalida | null`, `fecha: string` (ISO), `cantidad: number`, `unidad: Unidad`, `usuario?: string`. Línea secundaria `"<Tipo>[ · <Motivo>] · <fecha relativa>[ · <usuario>]"`; cantidad con `etiquetaMovimiento`. Entradas e iniciales en tono de éxito; salidas y bajas en tono primario. Fecha relativa: "Hoy HH:mm", "Ayer HH:mm" o "dd/MM".
- **`AnilloExistencias`** — props: `existencias: number`, `puntoPedido: number`, `unidad: Unidad`. Dibujo con `react-native-svg`. Fracción llena = `min(existencias / (2 × puntoPedido), 1)`; si `puntoPedido = 0`: lleno si `existencias > 0`, vacío si no. Marca en la fracción 0.5 (se omite si `puntoPedido = 0`). Centro: "Existencias", cantidad formateada y etiqueta de estado. `accessibilityLabel`: `"Existencias <cant>; punto de pedido <pp>; <estado>"`. La fracción se calcula en una función pura exportada `fraccionAnillo(existencias, puntoPedido): number`.
- **`ChipsFiltro<T extends string>`** — props: `opciones: { valor: T; texto: string }[]`, `valor: T`, `onCambio: (v: T) => void`, `etiqueta: string` (para el grupo). `accessibilityState={{ selected }}` en cada chip.
- **`EncabezadoPantalla`** — props: `titulo`, `subtitulo?`, `accion?: { icono: NombreIcono; etiqueta: string; onPress: () => void } | { texto: string; onPress: () => void }`, `alVolver?` (por defecto `router.back()`). Respeta el inset superior. Título con `accessibilityRole="header"`.

Si una pieza de la parte 1 ya cubre algo (`Encabezado`, `FilaLista`, `Tarjeta`, `Etiqueta`, `Segmentado`), la pieza nueva la compone o la extiende en vez de duplicarla; el plan decide cuál en cada caso.

## 2. Pantallas

**Inicio administrador** (`app/(app)/index.tsx`, rol admin):
saludo "Hola, <nombre>" con avatar de iniciales e insignia "ADMINISTRADOR"; campana a `/notificaciones` con punto si hay alertas sin leer; `TarjetaPrincipal` ("Productos registrados", N "activos", chips "+X entradas hoy" y "−Y salidas hoy", accesos Entrada / Salida / Escanear-destacado); fila de dos `TarjetaIndicador` ("N Productos en punto de pedido" → `/administracion/pedir`; "Existencias generales" con una fila por unidad); "Productos próximos a agotarse" (hasta 3, `FilaProducto`, "Ver todos" → A pedir; la sección no se muestra si no hay); "Movimientos recientes" (5, `FilaMovimiento`, "Historial" → `/movimientos`). Pull-to-refresh y `Skeleton` en la primera carga.

**Inicio operativo** (mismo archivo, rol operativo): insignia "USUARIO OPERATIVO", sin campana; `TarjetaPrincipal` sin chips; "Resumen de existencias" en tres columnas (una por unidad presente; si hay más de tres, se envuelve); "Últimos movimientos" (5, de todos los usuarios).

**Buscar / Existencias** (`app/(app)/buscar.tsx`): `EncabezadoPantalla` "Existencias" con subtítulo "N productos activos"; campo de búsqueda por nombre o código y botón de escanear (`/escaner?destino=existencias`); botón "Exportar a Excel" (lógica actual, permiso `exportar_existencias`); `ChipsFiltro` Todos / Disponible / Bajo / Sin stock; lista de `FilaProducto` → ficha. Estados: cargando (`Skeleton`), sin productos ("Aún no hay productos registrados."), sin resultados ("No hay productos que coincidan."), error con "Reintentar".

**Ficha del producto** (`app/(app)/administracion/producto/[id].tsx`): `EncabezadoPantalla` con nombre y "Código: …"; acción lápiz → editar, solo si `puede(rol, "editar_producto")`; `AnilloExistencias` con las píldoras "Punto de pedido" y "Unidad"; botones Entrada y Salida (rutas actuales con `productoId`); "Movimientos del producto" (últimos 5 con usuario, "Ver todo" → historial filtrado por el producto); para el operativo, aviso con candado "La edición de datos maestros es exclusiva del Administrador.". Producto inactivo: etiqueta "Dado de baja", fila "Motivo: <ETIQUETAS_MOTIVO_BAJA>" y, si hay, "Detalle: <detalle_baja>"; sin botones Entrada/Salida ni lápiz.

**A pedir** (`app/(app)/administracion/pedir.tsx`): `EncabezadoPantalla` "Productos a pedir"; tarjeta de advertencia "N productos" + "Alcanzaron o están por debajo de su punto de pedido."; lista con nombre, existencias, punto de pedido y barra de progreso (`existencias / puntoPedido`, máximo 100 %) → ficha; nota informativa "Esta versión no genera órdenes de compra. La decisión de pedir corresponde al responsable de la empresa."; estado vacío "Ningún producto está en su punto de pedido.".

**Notificaciones** (`app/notificaciones.tsx`): `EncabezadoPantalla` con acción de texto "Marcar leídas" (deshabilitada si no hay no leídas); alertas agrupadas en "HOY", "AYER" y "ANTERIORES"; cada alerta: "Reabastecer: <producto>", "Quedan <existencias> y su punto de pedido es <pp>.", hora, punto de "No leída"; toque → A pedir. Se conserva la lógica actual de carga y de marcar leídas.

## 3. Datos

- `obtenerInicio(rol)` agrega, solo para admin, `hoy?: { entradas: number; salidas: number }` a partir de `obtenerDashboard(hoy, hoy)` (fecha local en formato `YYYY-MM-DD`, la misma que produce `rangoDePeriodo`): `entradas` y `salidas` del único punto de la serie. Si esa llamada falla, `hoy` queda `undefined` y el resto del inicio se muestra igual (no se propaga el error).
- Ficha: `motivo_baja` y `detalle_baja` ya vienen en `obtenerProducto`.
- Invalidación: los hooks que registran movimientos, productos o bajas invalidan también `["dashboard"]`.
- Sin cambios de base de datos.

## 4. Pruebas

- Jest por pieza: `fraccionAnillo` (normal, sobre el doble, `puntoPedido = 0` con y sin existencias), `FilaProducto` (etiqueta por estado), `FilaMovimiento` (signo, motivo opcional, "Hoy"/"Ayer"/fecha), `ChipsFiltro` (selección y `onCambio`), `TarjetaPrincipal` (chips opcionales, accesos con su etiqueta).
- Jest por pantalla: inicio admin vs operativo (qué secciones aparecen; chips de hoy ausentes si el dashboard falla); Buscar (filtro por estado, sin resultados, error); ficha (lápiz solo admin, aviso para operativo, producto dado de baja con motivo y detalle y sin botones); A pedir (vacío y barra); Notificaciones (agrupación por día, "Marcar leídas" deshabilitado sin no leídas).
- Verificación manual en Expo Go con `ana.lopez` y `carlos.m`, en modo claro y oscuro.

## Fuera de alcance

Entrada, Salida, Nuevo producto, Escáner (3B); Administración, Reportes, Historial, Baja (3C); Login, Configuración, Trix y manuales (3D).
