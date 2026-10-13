# Inventrix — Parte 3B: Registro

Fecha: 2026-10-12 · Rama: `feat/ui-registro` (sale de `main` tras el merge de la 3A) · Antecedentes: `2026-10-11-inventrix-ui-base-design.md` (parte 1), `2026-10-11-inventrix-backend-parte2-design.md` (parte 2), `2026-10-11-inventrix-3a-inicio-consulta-design.md` (3A)

## Contexto

Segunda de las cuatro sub-partes del rediseño de pantallas: 3A Inicio y consulta (hecha), **3B Registro** (esta), 3C Administración, 3D Cuenta y soporte.

Referencia visual: prototipo https://claude.ai/artifact/Y9hegvxitZ3nAEsyNSvJY5, tableros `A-Entrada`, `A-Salida`, `A-SalidaOK`, `A-Nuevo`, `A-Revision`, `A-Escaner`, `B-Entrada` (producto no encontrado) y `B-Confirmacion`. Como en la 3A, el prototipo guía composición, jerarquía y tono; colores, tipografía (Inter), íconos (Lucide) y tokens salen de la parte 1. Los motivos de salida son los de la parte 2 (`MOTIVOS_SALIDA`), no los tres del prototipo.

La lógica actual se conserva: validación de cantidad por unidad, proyección de existencias, aviso y alerta de punto de pedido, revisión en dos pasos del producto nuevo y control de `CODIGO_DUPLICADO` en el servidor.

## Decisiones tomadas con el usuario

| Tema | Decisión |
|---|---|
| Lectura en el escáner | Tarjeta "Código reconocido" con "Usar este producto"; ya no salta directo al destino. |
| Código no encontrado | Admin: "Registrar producto" (abre Nuevo con el código) y "Escanear de nuevo". Operativo: aviso de que solo el administrador registra productos y "Escanear de nuevo". |
| Pantalla de éxito | Una sola pieza, `PantallaResultado`, estilo oscuro (fondo de marca y hoja clara), para entrada, salida y producto nuevo. |
| Enfoque | Piezas compartidas primero, luego cada pantalla se rearma con ellas. |

## 1. Piezas compartidas (`src/components/`)

Todas usan `useTema()` (sin colores fijos), `Texto`, `Icono` (Lucide) y `Presionable`, con objetivos táctiles de al menos 48 dp y etiquetas de accesibilidad completas.

- **`TarjetaProductoMovimiento`** — props: `producto: { nombre: string; codigo: string; unidad: Unidad; existencias: number; punto_pedido: number }`, `tipo: "entrada" | "salida"`, `proyectadas: number | null`. Tarjeta con el degradado de marca: `AvatarProducto`, nombre, línea `"<código> · <unidad>"` y, solo en salida, `" · P. pedido <pp>"`. Debajo, franja "Existencias actuales" → "Proyectadas" (entrada) o "Quedarían" (salida), con `formatearCantidad`; si `proyectadas` es `null` se muestra "—". `accessibilityLabel` de la franja: `"Existencias actuales <cant>; <proyectadas|quedarían> <cant o sin dato>"`.
- **`PantallaResultado`** — props: `titulo: string`, `frase: string`, `producto: { nombre: string; detalle: string }`, `datos: [{ etiqueta: string; valor: string }, { etiqueta: string; valor: string }]`, `aviso?: string`, `principal: { titulo: string; onPress: () => void }`, `secundario: { titulo: string; onPress: () => void }`. Parte superior con el degradado de marca, check en círculo de acento, título (`accessibilityRole="alert"`) y frase; hoja clara inferior con avatar y nombre del producto, `detalle` (p. ej. "Motivo: Venta · 09:15" o "Código 7501…"), cuadrícula de dos datos, `AvisoAdvertencia` si hay `aviso`, botón principal y botón secundario con borde. Respeta los insets.
- **`AvisoAdvertencia`** — props: `texto: string`, `icono?: NombreIcono` (por defecto triángulo), `tono?: "advertencia" | "peligro"` (por defecto advertencia), `alerta?: boolean` (si es `true`, `accessibilityRole="alert"`). Recuadro con fondo suave del tono, ícono y texto. Se extrae del recuadro que hoy está en línea en `app/(app)/administracion/pedir.tsx`, que pasa a usarlo.
- **`ControlCantidad`** (parte 1, se ajusta) — nueva prop `error?: string`, mostrada debajo con ícono y `accessibilityRole="alert"`; estilo según el prototipo: botones −/+ cuadrados, caja central con borde de foco, borde y fondo de peligro cuando hay `error`, abreviatura de la unidad junto al número. `Cantidad` sigue envolviéndolo.
- **`ChipsFiltro`** (3A) — se reutiliza tal cual para los motivos de salida (ya envuelve en varias líneas). Para permitir "sin motivo elegido", acepta `valor: T | null`.
- **`BuscadorProducto`** (`src/features/productos/`, se rearma) — campo con lupa "Buscar producto por nombre o código" y, si hay `escanearDestino`, botón cuadrado de escanear al lado; resultados como lista de `FilaProducto` (hasta 20) que llaman a `onElegir(id, nombre)`; `Skeleton` mientras carga; "No hay productos que coincidan." si la búsqueda no da resultados.

## 2. Pantallas

**Entrada y Salida** (`src/features/movimientos/FormularioMovimiento.tsx`; las rutas `movimientos/entrada` y `movimientos/salida` no cambian):

1. Sin producto: `EncabezadoPantalla` "Registrar entrada" (con píldora "+ Ingreso") o "Registrar salida"; `BuscadorProducto` con `escanearDestino` = `entrada` | `salida`.
2. Con producto:
   - `EncabezadoPantalla` con acción de ícono "Escanear otro producto" → `/escaner?destino=<tipo>`.
   - `TarjetaProductoMovimiento`; debajo, enlace de texto "Elegir otro producto" (reinicia).
   - Producto inactivo: `AvisoAdvertencia` de peligro "El producto está dado de baja." y nada más (sin cantidad, motivo ni botón).
   - Tarjeta "Cantidad a ingresar" / "Cantidad a salir" con `ControlCantidad` (en salida, `maximo` = existencias). Error de salida: "La cantidad supera las existencias disponibles (<existencias formateadas>)."; error de formato: el de `validarCantidad`. En entrada, ayuda "Solo se permiten cantidades positivas.".
   - Solo salida: "Motivo de salida" con `ChipsFiltro` de `MOTIVOS_SALIDA` (sin elegido al inicio, salvo el parámetro `motivo`); si la cantidad es válida y `generaAlerta(...)`, `AvisoAdvertencia` "Con esta salida el producto llegará a su punto de pedido y se enviará una alerta al administrador.".
   - Error de registro: `AvisoAdvertencia` de peligro con `mensajeDeError(e)` sobre el botón; se conserva lo escrito.
   - Botón "Registrar entrada" / "Registrar salida", deshabilitado si no es válido; `loading` mientras registra.
3. Resultado: `PantallaResultado` con título "¡Entrada registrada!" / "¡Salida registrada!", frase "El inventario se actualizó correctamente.", detalle "Código <código>" (entrada) o "Motivo: <motivo> · HH:mm" (salida), datos "Cantidad ingresada" `+<cant>` o "Cantidad retirada" `−<cant>` y "Existencias finales"; en salida con alerta, aviso "El producto alcanzó su punto de pedido. Se generó una alerta de reabastecimiento."; botones "Registrar otra entrada/salida" (reinicia) y "Volver al inicio" (`router.replace("/")`).

**Nuevo producto** (`app/(app)/nuevo.tsx`, sigue con `RequiereRol rol="admin"`):

- Paso 1: `EncabezadoPantalla` "Nuevo producto", acción de cierre (X) y subtítulo "Paso 1 de 2 · Datos del producto"; barra de progreso de dos tramos (`accessibilityLabel` "Paso 1 de 2"). Tarjeta con: Nombre; Unidad (`SelectorUnidad`); Código con botones de ícono "Escanear con la cámara" (`/escaner?destino=nuevo`) y "Leer código desde una imagen" (misma lectura que usa hoy el escáner, extraída a una función compartida); Cantidad inicial y Punto de pedido en dos columnas con la abreviatura de la unidad como sufijo; nota "Cuando las existencias lleguen al punto de pedido, recibirás una alerta de reabastecimiento.". Botón "Revisar".
- Al tocar Revisar, tras validar, se llama a `codigoRegistrado(codigo)`: si existe y está activo, error en el campo "Este código ya está registrado (<nombre>)."; si existe y está dado de baja, "Este código pertenece a <nombre>, dado de baja."; y no se avanza. Si la consulta falla, se avanza igual (el servidor decide).
- Paso 2: subtítulo "Paso 2 de 2 · Confirmación"; tarjeta oscura con nombre, "Código <código>" y tres datos (Unidad, Cant. inicial, Punto pedido); nota "Al confirmar se guardará el producto y su movimiento inicial de inventario (+<cant>)." (si la cantidad inicial es 0: "Al confirmar se guardará el producto sin existencias iniciales."); botones "Confirmar registro" y "Editar información". `CODIGO_DUPLICADO` del servidor vuelve al paso 1 con el error en el campo (como hoy); otros errores, `AvisoAdvertencia` de peligro.
- Resultado: `PantallaResultado` "¡Producto registrado!", frase "<nombre> ya está disponible en Existencias y puede usarse en entradas y salidas.", detalle "Código <código>", datos "Cantidad inicial" y "Punto de pedido", botones "Ver en Existencias" (`router.replace("/buscar")`) y "Registrar otro producto" (reinicia).

**Escáner** (`app/escaner.tsx`; destinos y validación de destino sin cambios):

- Cámara a pantalla completa, `StatusBar` claro. Arriba: cerrar ("Cerrar lector"), título "Escanear código", linterna (etiqueta "Encender/Apagar linterna"). Centro: marco con esquinas (decorativo, oculto a accesibilidad). Texto "Coloca el código de barras o QR dentro del marco. Se detecta automáticamente.". Abajo: "Escribir el código manualmente" y "Leer desde imagen".
- Lectura (cámara, manual o imagen):
  - Destino `nuevo`: vuelve directo a `/nuevo` con el código (como hoy), sin hoja.
  - Otros destinos: `buscarPorCodigo`. Mientras se busca y mientras hay una hoja abierta, `onBarcodeScanned` queda en `undefined`.
  - Encontrado: hoja inferior "CÓDIGO RECONOCIDO" con `AvatarProducto`, nombre y "<código> · <existencias formateadas> disponibles"; "Usar este producto" navega al destino como hoy (`existencias` → ficha, `entrada`/`salida` → formulario, `baja` → baja, con `productoId`); "Escanear de nuevo" cierra la hoja y reactiva la lectura.
  - No encontrado: hoja con "Producto no encontrado", el código leído y "El código escaneado no corresponde a ningún producto registrado.". Admin (`puede(rol, "registrar_producto")`): "Registrar producto" → `router.replace({ pathname: "/nuevo", params: { codigo } })` y "Escanear de nuevo". Operativo: `AvisoAdvertencia` "Solo el administrador puede registrar productos nuevos. Pídele que lo agregue al catálogo." y "Escanear de nuevo".
  - Error de búsqueda: hoja con `AvisoAdvertencia` de peligro (`mensajeDeError`) y "Escanear de nuevo".
- Sin permiso de cámara y modo manual: pantallas con el estilo nuevo (`EncabezadoPantalla`, tarjeta, botones de la parte 1), mismos textos y opciones que hoy. "No se encontró ningún código en la imagen." se conserva.

## 3. Datos

- Nueva función en `src/features/productos/api.ts`: `codigoRegistrado(codigo: string): Promise<{ nombre: string; activo: boolean } | null>`, que consulta `productos` por `codigo` (recortado) sin filtrar por `activo`. La política `productos_select` ya permite leer productos inactivos a cualquier usuario activo.
- La lectura desde imagen (`ImagePicker` + `scanFromURLAsync` con los tipos admitidos) se extrae de `app/escaner.tsx` a `src/features/productos/leerImagen.ts` (`leerCodigoDeImagen(): Promise<{ estado: "cancelado" } | { estado: "sin-codigo" } | { estado: "ok"; codigo: string }>`; los errores se propagan) para usarla en el escáner y en Nuevo producto.
- Sin cambios de base de datos ni de invalidación (los hooks ya invalidan `["dashboard"]` desde la 3A).

## 4. Pruebas

- Jest por pieza: `TarjetaProductoMovimiento` ("—" sin proyección; punto de pedido solo en salida), `PantallaResultado` (aviso opcional, etiquetas de los botones, título como alerta), `AvisoAdvertencia` (tonos, rol de alerta), `ControlCantidad` (error visible y con rol de alerta), `ChipsFiltro` con `valor = null`, `BuscadorProducto` (lista de `FilaProducto`, `onElegir`, sin resultados).
- Jest por pantalla: Entrada (flujo hasta el resultado); Salida (exceso de existencias, sin motivo, aviso de punto de pedido, resultado con y sin alerta, error de registro conserva lo escrito); producto dado de baja (sin control ni botón); Nuevo producto (dos pasos, código duplicado activo y dado de baja, falla de `codigoRegistrado` deja avanzar, `CODIGO_DUPLICADO` del servidor vuelve al paso 1, resultado); Escáner con `expo-camera` simulado (encontrado muestra la hoja y "Usar este producto" navega; no encontrado admin vs operativo; destino `nuevo` sin hoja; con hoja abierta no se procesan lecturas); A pedir sigue mostrando su aviso con `AvisoAdvertencia`.
- Verificación manual en Expo Go con `ana.lopez` y `carlos.m`, claro y oscuro, incluida la cámara real.

## Fuera de alcance

Historial (`app/(app)/movimientos/index.tsx`), Editar producto, Baja (solo recibe el estilo nuevo del escáner que la abre), Administración y Reportes (3C); Login, Configuración, Trix y manuales (3D).
