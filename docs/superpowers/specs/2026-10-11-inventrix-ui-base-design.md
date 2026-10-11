# Inventrix — Parte 1: Base visual y navegación

Fecha: 2026-10-11 · Rama: `feat/ui-base` (parte de `fix/expo-go`)

## Contexto

La app funcional (v0.1.0-funcional) usa componentes de React Native sin estilo. La clienta envió comentarios sobre un diseño propio y un prompt con su identidad visual. Se acordó combinar su propuesta con el prototipo de Inventrix (https://claude.ai/artifact/Y9hegvxitZ3nAEsyNSvJY5) y dividir el trabajo en tres partes, en este orden:

1. **Base visual y navegación** (este documento).
2. **Cambios funcionales de backend:** motivos de salida (venta, caducidad, daño, otros), baja con motivo y existencias en cero, consultas del dashboard de reportes. Sin imagen de producto: no se sube foto, solo información.
3. **Rediseño de pantallas** con los flujos que pidió la clienta.

Las maquetas aprobadas están en `.superpowers/brainstorm/` (estilo B, modo oscuro, Trix).

## Objetivo

Al terminar esta parte, toda la app usa el tema nuevo (claro y oscuro), la barra inferior por rol y el asistente Trix, sin cambiar todavía la distribución interna de cada pantalla. Las pantallas de la parte 3 se construyen sobre estos componentes sin definir estilos propios.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Dirección visual | Opción B: paleta, fondo claro y tarjetas blancas de la clienta, con el encabezado curvo con logo, las tarjetas montadas sobre el encabezado y la barra flotante con "+" elevado de nuestro prototipo. |
| Tema | Switch simple Claro/Oscuro. Sigue al sistema hasta que el usuario lo cambia; la elección se guarda en el teléfono. |
| Tipografía | Inter (400, 600, 700). |
| Íconos | Lucide (`lucide-react-native`). |
| Pestañas Tipo A | Inicio · Buscar · ＋ · Administración · Config. Administración contiene solo Reportes y Dar de baja. |
| Pestañas Tipo B | Inicio · Buscar · Movimientos · Config. |
| Trix | Icono robot mínimo (cara redondeada, antena con punto verde). Panel inferior, no pantalla completa. |
| Animaciones | Reanimated 4 (ya instalado) con componentes propios; sin Moti ni Lottie. |
| Imagen de producto | No se implementa. Se muestran las iniciales del producto (`AvatarProducto`). |

## 1. Tema y tokens — `src/tema/`

### Colores (`tokens.ts`)

Dos paletas con las mismas claves:

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `fondo` | `#F3F6FA` | `#0A1424` | Fondo general |
| `superficie` | `#FFFFFF` | `#13223A` | Tarjetas, barra inferior, panel |
| `texto` | `#102B50` | `#E6EDF7` | Títulos y texto principal |
| `textoSecundario` | `#64748B` | `#94A3B8` | Descripciones, etiquetas |
| `primario` | `#102B50` | `#1764A0` | Botones principales, "+" |
| `sobrePrimario` | `#FFFFFF` | `#FFFFFF` | Texto sobre `primario` |
| `interactivo` | `#1764A0` | `#6FB1EA` | Enlaces, estado activo, foco |
| `exito` | `#219653` | `#3CC37A` | Entradas, disponible, punto activo |
| `exitoSuave` | `#E8F5EE` | `rgba(60,195,122,0.14)` | Fondo de ícono/etiqueta de éxito |
| `peligro` | `#D92D3A` | `#F05A66` | Salidas, alertas, acciones críticas |
| `peligroSuave` | `#FDECEE` | `rgba(240,90,102,0.15)` | Fondo de ícono/etiqueta de peligro |
| `textoPeligro` | `#B4232F` | `#FF8A93` | Texto dentro de `peligroSuave` |
| `linea` | `#E5EBF2` | `#1F3150` | Divisores |
| `borde` | `#94A3B8` | `#4A5D7A` | Borde de campos (≥ 3:1 contra `superficie`) |
| `inactivo` | `#CBD5E1` | `#334561` | Switch apagado, controles deshabilitados |
| `encabezado` | `#1764A0 → #102B50` | `#14558A → #0E2442` | Degradado radial del encabezado |

### Escalas

- Espaciado: `4, 8, 12, 16, 20, 24`.
- Radios: `icono 10`, `campo 12`, `tarjeta 16`, `barra 22`, `encabezado 28` (solo esquinas inferiores), `completo 999`.
- Sombras: `suave` (tarjetas) y `elevada` (barra, botón flotante, panel), con `elevation` en Android y sombra azulada en claro, negra en oscuro.
- Tipografía (`tipografia.ts`): `titulo` 20/700, `subtitulo` 15/700, `cuerpo` 14/400, `cuerpoFuerte` 14/600, `etiqueta` 12/600, `pequeno` 11/500, `cifra` 28/700 con `fontVariant: ["tabular-nums"]`.

### `TemaProvider` y `useTema()`

- `useTema()` devuelve `{ colores, esquema, alternarEsquema }`. `esquema` es `"claro" | "oscuro"`.
- Valor inicial: la preferencia guardada en `expo-secure-store` (clave `inventrix.tema`) si existe; si no, `useColorScheme()` del sistema.
- `alternarEsquema()` cambia el esquema y lo guarda. Si falla el guardado, el cambio se mantiene en memoria y no se muestra error.
- `expo-status-bar` usa estilo claro sobre encabezados oscuros; `expo-system-ui` fija el color de fondo de la raíz según el esquema.
- La fuente Inter (`@expo-google-fonts/inter`) se carga con `useFonts` antes de ocultar el splash (`expo-splash-screen`). Si falla la carga, se usa la fuente del sistema.
- `app.json` mantiene `userInterfaceStyle: "automatic"`.
- **Switch en Configuración**: en esta parte se agrega a la pantalla actual de Configuración una fila "Modo oscuro" con `Switch` (`accessibilityRole="switch"`) conectado a `alternarEsquema`.

## 2. Componentes base — `src/components/`

### Existentes (mismas props y mismos roles de accesibilidad)

- **`Boton`**: nueva prop opcional `variante: "primario" | "secundario" | "peligro" | "fantasma"` (por defecto `primario`) y `icono` opcional. Alto mínimo 48, radio 12, texto `cuerpoFuerte`. Deshabilitado con opacidad 0.5. Se basa en `Presionable`.
- **`Campo`**: etiqueta arriba, caja de 48 con radio 12, borde `borde`; al enfocar, borde `interactivo` y halo suave; error en `peligro` debajo con `accessibilityRole="alert"` como hoy.
- **`Cantidad`** y **`SelectorUnidad`**: mismo estilo de caja que `Campo`.
- **`Pantalla`**: fondo del tema, respeta `useSafeAreaInsets`, prop `scroll` opcional, y reserva el alto de la barra inferior al pie.

### Nuevos

| Componente | Props principales | Notas |
|---|---|---|
| `Tarjeta` | `children`, `onPress?`, `relleno?` | Superficie, radio 16, sombra `suave`. Con `onPress` usa `Presionable` y `accessibilityRole="button"`. |
| `Encabezado` | `variante: "inicio" \| "pantalla"`, `titulo`, `saludo?`, `rol?`, `alertas?`, `accion?` | Degradado `encabezado` con curva inferior. `inicio`: `LogoMarca`, saludo, rol y campana con punto rojo si `alertas > 0`. `pantalla`: flecha atrás, título y acción opcional a la derecha. |
| `ControlCantidad` | `valor`, `onCambio`, `unidad`, `maximo?`, `etiqueta` | Botones −/+ de 48 con paso 1; el valor también se puede escribir, con 2 decimales en libra, kilogramo y litro. No baja de 0 ni supera `maximo`. Reutiliza `validarCantidad` existente. |
| `AvatarProducto` | `nombre`, `tamano?` | Dos iniciales; color de fondo elegido de forma estable por un hash del nombre entre 6 tonos de la paleta suave. |
| `Etiqueta` | `tipo: "disponible" \| "pedir" \| "inactivo"`, `texto?` | Verde, rojo o gris suave. |
| `FilaLista` | `titulo`, `detalle?`, `valor?`, `izquierda?`, `onPress?` | Con `onPress` muestra la flecha `›`. |
| `Segmentado` | `opciones`, `valor`, `onCambio` | `accessibilityRole="tab"` por opción y `selected` en la activa. |
| `Icono` | `nombre` (de Lucide), `tamano?`, `color?` | Trazo 1.75 por defecto, color `texto` por defecto. Único punto de importación de Lucide. |
| `IconoTrix`, `LogoMarca` | `tamano?` | SVG con `react-native-svg`. |

Ninguna pantalla ni componente define colores literales: todo sale de `useTema()`.

## 3. Animaciones — `src/animacion/`

| Pieza | Comportamiento |
|---|---|
| Transiciones | Stack con `animation: "slide_from_right"`; `escaner` y `notificaciones` con `"slide_from_bottom"`. Pestañas con `animation: "fade"` de 150 ms. |
| `Presionable` | Escala a 0.96 en 150 ms con `Easing.out`; vuelve a 1 al soltar. Sin escala si `disabled`. |
| `Skeleton` | Bloques `linea` con pulso de opacidad 0.5↔1 cada 900 ms. Variantes `Skeleton.Fila`, `Skeleton.Tarjeta`, `Skeleton.Cifra`. `accessibilityLabel="Cargando"`. |
| `NumeroAnimado` | `valor`, `formato?`. Primera aparición: de 0 a `valor` en 600 ms con `Easing.out(Easing.cubic)`. Cambios posteriores: del valor anterior al nuevo. Se dibuja en el hilo de UI (`useAnimatedProps` sobre un `TextInput` no editable). `accessibilityLabel` y el texto que ven los tests son siempre el valor final formateado. |
| `Confirmacion` | `ConfirmacionProvider` y `useConfirmacion().mostrar({ mensaje, tipo: "exito", alCerrar? })`. Tarjeta centrada sobre fondo tenue; el check se dibuja (trazo SVG) en 400 ms, el texto aparece después; se cierra sola a los 1400 ms y llama a `alCerrar`. Anuncia el mensaje con `AccessibilityInfo.announceForAccessibility`. |
| Entrada de listas | `entradaEscalonada(indice)`: solo las primeras 6 filas, 60 ms entre filas, opacidad y 12 px hacia arriba en 300 ms. Solo en la primera carga. |

Reglas:

- Con `useReducedMotion()` en verdadero: sin escala ni desplazamiento (solo fundido), `NumeroAnimado` muestra el valor directo y el check aparece completo.
- Ninguna animación es la única señal de un cambio.
- No se anima escribir, filtrar ni hacer scroll.

## 4. Navegación — `app/`

### Pestañas

`tabsPara(rol)` devuelve:

- `admin`: `["index", "buscar", "nuevo", "administracion", "configuracion"]`
- `operativo`: `["index", "buscar", "movimientos", "configuracion"]`

Las pestañas no visibles para el rol usan `href: null`. Las rutas siguen protegidas con `RequiereRol`.

### Cambios de rutas

| Antes | Después |
|---|---|
| `/administracion/existencias` | `/buscar` (pestaña nueva; mismo contenido). Se actualizan los enlaces de `baja.tsx` y `nuevo.tsx`; la ruta vieja redirige a `/buscar`. |
| `/administracion` (4 opciones) | Solo Reportes y Dar de baja. |
| `/movimientos` (menú de botones) | Se elimina el menú: `/movimientos` muestra el historial. `/movimientos/historial` redirige a `/movimientos`. |
| `/movimientos/entrada`, `/movimientos/salida` | Sin cambio. Tipo A llega desde inicio y ficha. |
| `/administracion/pedir` | **Sin cambio**: es la ruta de las notificaciones push ya enviadas (`data.ruta`). |
| `/soporte` | Pasa a ser el panel de Trix (ver abajo). |

### `BarraInferior`

- `tabBar` personalizado de `Tabs`: superficie, radio 22, sombra `elevada`, margen 12 a los lados y abajo más el inset inferior.
- Activa: ícono y texto `texto` con punto `exito` de 4 px debajo. Inactiva: `textoSecundario`.
- "+" (solo admin): círculo `primario` de 54 elevado 30 px, aro de 4 px del color `fondo`, `accessibilityLabel="Nuevo producto"`.
- Cada pestaña: `accessibilityRole="tab"`, `selected` en la activa, área táctil ≥ 48.
- Se oculta con el teclado abierto (`tabBarHideOnKeyboard`).

### Trix

- `BotonTrix`: `IconoTrix` en círculo `superficie` de 48 con sombra `elevada`, abajo a la derecha sobre la barra. `accessibilityLabel="Abrir asistente Trix"`. Oculto con teclado abierto, en `escaner`, en `login` y mientras el panel está abierto.
- Panel: la ruta `/soporte` se presenta con `presentation: "transparentModal"` y sin animación de stack; la pantalla dibuja un fondo tenue y una hoja inferior propia (alto 70 % de la pantalla, radio 24 arriba, asa) animada con Reanimated y arrastrable con gesture-handler. Se cierra al deslizar hacia abajo más de 30 % de su alto, al tocar el fondo o con el botón atrás de Android.
- Contenido: encabezado `primario` con `IconoTrix`, "Trix" y "Asistente de Inventrix"; saludo con el nombre del usuario; las cuatro preguntas rápidas como chips ("¿Cómo registrar una entrada?", "¿Cómo registrar una salida?", "¿Qué es el punto de pedido?", "¿Cómo consultar existencias?"); el chat actual (`enviarPregunta`, sin cambios de lógica); botón "Contactar soporte por WhatsApp" con el enlace actual. Un chip envía su texto como mensaje del usuario.
- El panel usa `KeyboardAvoidingView` para que el campo de texto quede visible con el teclado.

## Dependencias nuevas

`react-native-svg`, `lucide-react-native`, `@expo-google-fonts/inter`, `expo-linear-gradient`. Se instalan con `npx expo install` para obtener versiones compatibles con SDK 57. Todas funcionan en Expo Go.

## Pruebas

- **Contraste** (`__tests__/tema/contraste.test.ts`): para ambos esquemas, `texto`/`fondo`, `texto`/`superficie`, `textoSecundario`/`superficie`, `sobrePrimario`/`primario`, `textoPeligro`/`peligroSuave` ≥ 4.5:1; `borde`/`superficie` ≥ 3:1.
- **Tema**: `TemaProvider` arranca con el esquema del sistema; `alternarEsquema` cambia y guarda; con preferencia guardada, la usa al arrancar.
- **Navegación**: `tabsPara` con las listas nuevas; la barra muestra 5 pestañas para admin y 4 para operativo; "+" solo para admin.
- **Componentes**: `ControlCantidad` respeta mínimo, máximo y paso por unidad; `Etiqueta` y `FilaLista` exponen texto y rol accesible.
- **Animaciones**: con movimiento reducido `NumeroAnimado` muestra el valor final de inmediato; `Confirmacion` llama a `alCerrar`; `Presionable` deshabilitado no dispara `onPress`. Se usa `react-native-reanimated/mock`.
- **Trix**: tocar un chip envía esa pregunta a `enviarPregunta`; el botón de WhatsApp abre el enlace.
- Los tests existentes deben seguir pasando; solo se actualizan los que dependen de rutas o pestañas que cambian (`tabsPara`, menú de Administración, menú de Movimientos, enlaces a Existencias).
- `npm run lint && npm run typecheck && npm test` en verde y CI verde.
- Revisión final con las skills `better-ui` y `design:accessibility-review` sobre los componentes nuevos.

## Fuera de alcance (partes 2 y 3)

- Contenido nuevo de cada pantalla: inicio por rol, Buscar con estados, ficha con historial y lápiz, entrada/salida con `ControlCantidad` y sin operación visible, nuevo producto sin pantalla de revisión, a pedir, dashboard de reportes con gráfico, baja con motivo y el rediseño completo de Configuración (Mi cuenta, Notificaciones, Tema, Soporte, Cerrar sesión).
- Migraciones y RPC de la parte 2.
- Pendientes de decidir en la parte 3: si el inicio del Tipo A muestra los tres indicadores (el prompt los pide; la nota de la clienta sugiere moverlos a Reportes) y la combinación exacta del inicio del Tipo B (accesos y últimos movimientos).

## Riesgos

- **Reanimated 4 + Expo Go**: Reanimated viene incluido en Expo Go SDK 57; si alguna API falla allí, se valida en un development build.
- **Panel con teclado en Android**: si `KeyboardAvoidingView` no basta dentro del modal transparente, se ajusta con `android:windowSoftInputMode=adjustResize` (ya es el valor por defecto de Expo).
- **Cambio de rutas**: enlaces viejos a `/administracion/existencias` o `/movimientos/historial` se cubren con redirecciones para no romper historial de navegación ni notificaciones.
