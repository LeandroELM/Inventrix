# Inventrix — Base visual y navegación: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar a toda la app el tema claro/oscuro de Inventrix, los componentes base, las animaciones clave, la barra inferior por rol y el panel de Trix, sin cambiar la distribución interna de las pantallas.

**Architecture:** `src/tema/` (tokens, tipografía, `TemaProvider`) es la única fuente de colores; `src/components/` expone componentes que leen `useTema()`; `src/animacion/` agrupa las animaciones de Reanimated 4 con soporte de movimiento reducido. La navegación sigue en expo-router: `Tabs` con barra propia y los stacks con `Encabezado` propio.

**Tech Stack:** Expo SDK 57, expo-router, React Native 0.86, Reanimated 4.5, gesture-handler, `react-native-svg`, `lucide-react-native`, `@expo-google-fonts/inter`, `expo-linear-gradient`, Jest (`jest-expo`) + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-11-inventrix-ui-base-design.md`

## Global Constraints

- Rama `feat/ui-base`. Solo Android; todo debe funcionar en Expo Go SDK 57.
- TypeScript `strict`; prohibido `any` explícito.
- Textos de UI en español.
- Ningún color literal fuera de `src/tema/tokens.ts`: todo sale de `useTema().colores`.
- No importar `Text` ni `TextInput` de `react-native` fuera de `src/components/` (regla ESLint de la Task 3).
- Dependencias nuevas solo: `react-native-svg`, `lucide-react-native`, `@expo-google-fonts/inter`, `expo-linear-gradient`, instaladas con `npx expo install`.
- No cambiar la lógica de datos (API, hooks, RPC). No cambiar `/administracion/pedir`: es `data.ruta` de las notificaciones push.
- Los componentes existentes (`Boton`, `Campo`, `Cantidad`, `SelectorUnidad`, `Pantalla`) mantienen sus props y sus `accessibilityRole`/`accessibilityLabel` actuales; solo se agregan props opcionales.
- Toda animación con movimiento o escala respeta `useReducedMotion()` de Reanimated.
- Al final de cada task: `npm run lint && npm run typecheck && npm test` en verde.

## Review Focus

1. **Modo oscuro en pantallas viejas**: ningún texto ni campo queda negro sobre `#0A1424`. Lo fija la regla ESLint y la migración de la Task 3, más el test de `Texto`.
2. **La barra inferior tapa el final de listas o el botón principal**: el último elemento de Existencias y el botón "Registrar salida" deben poder verse sobre la barra y Trix. Test en Task 9 (`sceneStyle.paddingBottom`).
3. **Enlaces viejos**: abrir `/administracion/existencias` o `/movimientos/historial` (enlaces guardados, historial de navegación) lleva a la pantalla nueva en vez de "ruta no encontrada". Test en Task 9.
4. **Atrás desde Registrar entrada abierto desde Inicio (Tipo A)** vuelve a Inicio, no al historial de la pestaña oculta. `backBehavior="history"` en Task 9 y verificación manual en Task 11.
5. **Falla la carga de la fuente o del almacenamiento seguro**: la app arranca igual con la fuente del sistema y el tema del teléfono. Tests en Task 2.

---

### Task 1: Dependencias, tokens y contraste

**Files:**
- Modify: `package.json`, `jest.config.js`
- Create: `src/tema/tokens.ts`, `src/tema/contraste.ts`
- Test: `__tests__/tema/contraste.test.ts`

**Interfaces:**
- Produces:
  - `type Esquema = "claro" | "oscuro"`
  - `type Colores` con las claves de la tabla de la spec (`fondo`, `superficie`, `texto`, `textoSecundario`, `primario`, `sobrePrimario`, `interactivo`, `exito`, `exitoSuave`, `textoExito`, `peligro`, `peligroSuave`, `textoPeligro`, `linea`, `borde`, `inactivo`) más `encabezado: readonly [string, string]` y `avatares: readonly string[]` (6 tonos suaves por esquema para `AvatarProducto`, cada uno con contraste ≥ 4.5 contra `texto`).
  - `PALETAS: Record<Esquema, Colores>` con los valores exactos de la spec.
  - `ESPACIO = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24 } as const`
  - `RADIO = { icono: 10, campo: 12, tarjeta: 16, barra: 22, encabezado: 28, completo: 999 } as const`
  - `sombra(nivel: "suave" | "elevada", esquema: Esquema): ViewStyle`: `suave` → `elevation: 2`, `elevada` → `elevation: 8`; `shadowColor` `#102B50` en claro y `#000000` en oscuro.
  - `contraste(frente: string, fondo: string, base?: string): number`: acepta `#RRGGBB` y `rgba(r,g,b,a)`; un `rgba` se compone sobre `base` (por defecto `#FFFFFF`) antes de calcular la luminancia relativa WCAG.

- [ ] **Step 1:** `npx expo install react-native-svg lucide-react-native @expo-google-fonts/inter expo-linear-gradient`. En `jest.config.js` agregar `transformIgnorePatterns` que extienda el de `jest-expo` para transformar también `lucide-react-native`.
- [ ] **Step 2: Test que falla** `__tests__/tema/contraste.test.ts`:

```ts
import { contraste } from "@/tema/contraste";
import { PALETAS, type Esquema } from "@/tema/tokens";

test("contraste conocido", () => {
  expect(contraste("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
  expect(contraste("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
});

describe.each<Esquema>(["claro", "oscuro"])("paleta %s", (esquema) => {
  const c = PALETAS[esquema];
  test.each([
    ["texto", "fondo"], ["texto", "superficie"], ["textoSecundario", "superficie"],
    ["textoSecundario", "fondo"], ["textoExito", "superficie"], ["peligro", "superficie"],
    ["interactivo", "superficie"], ["sobrePrimario", "primario"],
  ] as const)("%s sobre %s ≥ 4.5", (a, b) => {
    expect(contraste(c[a], c[b])).toBeGreaterThanOrEqual(4.5);
  });
  test("textoPeligro sobre peligroSuave ≥ 4.5", () => {
    expect(contraste(c.textoPeligro, c.peligroSuave, c.superficie)).toBeGreaterThanOrEqual(4.5);
  });
  test.each([["borde", "superficie"], ["exito", "superficie"]] as const)("%s sobre %s ≥ 3", (a, b) => {
    expect(contraste(c[a], c[b])).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 3:** `npx jest __tests__/tema` → FAIL (módulos no existen).
- [ ] **Step 4:** Implementar `tokens.ts` y `contraste.ts`.
- [ ] **Step 5:** `npx jest __tests__/tema` → PASS; luego `npm run lint && npm run typecheck && npm test` → verde.
- [ ] **Step 6:** Commit `feat(tema): tokens claro/oscuro y prueba de contraste`.

### Task 2: TemaProvider, tipografía, fuente y switch

**Files:**
- Create: `src/tema/tipografia.ts`, `src/tema/TemaProvider.tsx`, `src/tema/CargadorFuentes.tsx`
- Modify: `app/_layout.tsx`, `app/(app)/configuracion.tsx` (reemplaza `SeccionApariencia`)
- Test: `__tests__/tema/TemaProvider.test.tsx`, `__tests__/tema/CargadorFuentes.test.tsx`, `__tests__/configuracion/configuracion.test.tsx`

**Interfaces:**
- Consumes: `PALETAS`, `Esquema`, `Colores` (Task 1); `leerApariencia(): Promise<Apariencia>`, `guardarApariencia(v)` de `src/features/configuracion/apariencia.ts`.
- Produces:
  - `FUENTES = { regular: "Inter_400Regular", semibold: "Inter_600SemiBold", bold: "Inter_700Bold" }`
  - `TIPOGRAFIA: Record<"titulo" | "subtitulo" | "cuerpo" | "cuerpoFuerte" | "etiqueta" | "pequeno" | "cifra", TextStyle>` con tamaños de la spec (20, 15, 14, 14, 12, 11, 28); cada estilo usa `fontFamily` de `FUENTES` (no `fontWeight`, que Android ignora con fuentes propias); `cifra` lleva `fontVariant: ["tabular-nums"]`.
  - `type VarianteTexto = keyof typeof TIPOGRAFIA`
  - `TemaProvider({ children })` y `useTema(): { colores: Colores; esquema: Esquema; alternarEsquema: () => void }`.
  - `CargadorFuentes({ children })` en `src/tema/CargadorFuentes.tsx`: llama a `useFonts` con Inter 400/600/700, oculta el splash cuando termina (cargada o con error) y no renderiza `children` hasta entonces.

- [ ] **Step 1: Tests que fallan** en `TemaProvider.test.tsx` (mock de `@/features/configuracion/apariencia` y de `useColorScheme`):
  - `"sin preferencia guardada usa el esquema del sistema"`: `leerApariencia` → `"sistema"`, sistema `"dark"` → un consumidor muestra `esquema === "oscuro"`.
  - `"con preferencia guardada la usa"`: `leerApariencia` → `"claro"`, sistema `"dark"` → `"claro"`.
  - `"alternarEsquema cambia y guarda"`: tras presionar, `esquema === "oscuro"` y `guardarApariencia` llamado con `"oscuro"`.
  - `"si guardar falla, el cambio se mantiene"`: `guardarApariencia` rechaza → `esquema` cambia igual y no se lanza error.
- [ ] **Step 2: Test que falla** en `configuracion.test.tsx`: `"el switch de modo oscuro alterna el tema"` — `getByRole("switch", { name: "Modo oscuro" })`, `fireEvent(sw, "valueChange", true)` → se llamó `alternarEsquema` (mock de `@/tema/TemaProvider`). Quitar cualquier aserción sobre la sección vieja "Apariencia".
- [ ] **Step 3:** `npx jest __tests__/tema __tests__/configuracion` → FAIL.
- [ ] **Step 4:** Implementar `tipografia.ts` y `TemaProvider.tsx`. Mientras `leerApariencia` no resuelve, usar el esquema del sistema.
- [ ] **Step 5:** Implementar `CargadorFuentes` (`SplashScreen.preventAutoHideAsync()` a nivel de módulo). En `app/_layout.tsx`: envolver en `GestureHandlerRootView` (flex 1), `TemaProvider` y `CargadorFuentes`; `StatusBar style="light"`; `SystemUI.setBackgroundColorAsync(colores.fondo)` al cambiar el esquema; `Stack screenOptions.contentStyle = { backgroundColor: colores.fondo }`.
- [ ] **Step 6:** Test en `__tests__/tema/CargadorFuentes.test.tsx`: `"si la fuente falla la app se renderiza"` — mock de `useFonts` → `[false, new Error("x")]`, el hijo aparece y se llamó `SplashScreen.hideAsync`; `"mientras carga no renderiza"` — `[false, null]`, el hijo no aparece.
- [ ] **Step 7:** En `configuracion.tsx`, reemplazar `SeccionApariencia` por una fila "Modo oscuro" con `Switch` (`accessibilityLabel="Modo oscuro"`, `value={esquema === "oscuro"}`, `onValueChange={alternarEsquema}`). Borrar `ETIQUETAS_APARIENCIA` y los imports que queden sin uso.
- [ ] **Step 8:** `npm run lint && npm run typecheck && npm test` → verde.
- [ ] **Step 9:** Commit `feat(tema): proveedor de tema, Inter y switch de modo oscuro`.

### Task 3: Texto y EntradaTexto temáticos en toda la app

**Files:**
- Create: `src/components/Texto.tsx`, `src/components/EntradaTexto.tsx`
- Modify: `eslint.config.js` y los 19 archivos de `app/` y `src/features/` que importan `Text` o `TextInput` de `react-native` (lista: `rg -l "\b(Text|TextInput)\b.*from \"react-native\"" app src/features`)
- Test: `__tests__/components/Texto.test.tsx`

**Interfaces:**
- Consumes: `useTema`, `TIPOGRAFIA`, `VarianteTexto` (Task 2).
- Produces:
  - `Texto(props: TextProps & { variante?: VarianteTexto; tono?: "texto" | "secundario" | "exito" | "peligro" | "interactivo" | "sobrePrimario" })` — por defecto `variante="cuerpo"`, `tono="texto"`; `tono` mapea a `colores.texto`, `textoSecundario`, `textoExito`, `peligro`, `interactivo`, `sobrePrimario`. El `style` recibido se aplica al final.
  - `EntradaTexto(props: TextInputProps & { invalido?: boolean })` — `color: colores.texto`, `placeholderTextColor: colores.textoSecundario`, fuente `FUENTES.regular`, sin borde propio (el borde lo pone quien lo usa).

- [ ] **Step 1: Tests que fallan** `Texto.test.tsx` con `TemaProvider` en oscuro (mock de `leerApariencia` → `"oscuro"`):
  - `"usa el color de texto del tema"`: `getByText("Hola")` tiene `color` `#E6EDF7`.
  - `"tono peligro"`: `color` `#F05A66`.
  - `"variante titulo"`: `fontSize` 20 y `fontFamily` `Inter_700Bold`.
- [ ] **Step 2:** `npx jest __tests__/components/Texto.test.tsx` → FAIL.
- [ ] **Step 3:** Implementar `Texto` y `EntradaTexto`.
- [ ] **Step 4:** En `eslint.config.js` agregar, para `app/**` y `src/features/**`, `no-restricted-imports` con `paths: [{ name: "react-native", importNames: ["Text", "TextInput"], message: "Usa Texto o EntradaTexto de @/components." }]`.
- [ ] **Step 5:** `npm run lint` → falla y lista los archivos. Reemplazar `Text` por `Texto` y `TextInput` por `EntradaTexto` en cada uno, conservando props y textos; los `Text` con `accessibilityRole="header"` pasan a `variante="subtitulo"`; los mensajes con `accessibilityRole="alert"` a `tono="peligro"`. `ActivityIndicator` toma `color={colores.interactivo}`.
- [ ] **Step 6:** `npm run lint && npm run typecheck && npm test` → verde (los tests existentes buscan por texto y rol, no cambian).
- [ ] **Step 7:** Commit `feat(ui): Texto y EntradaTexto con tema en todas las pantallas`.

### Task 4: Animaciones base

**Files:**
- Create: `src/animacion/Presionable.tsx`, `src/animacion/Skeleton.tsx`, `src/animacion/NumeroAnimado.tsx`, `src/animacion/entradaEscalonada.ts`
- Test: `__tests__/animacion/animacion.test.tsx`

**Interfaces:**
- Consumes: `useTema` (Task 2), `RADIO` (Task 1).
- Produces:
  - `Presionable(props: PressableProps & { style?: StyleProp<ViewStyle>; sinEscala?: boolean })` — escala 1 → 0.96 en `onPressIn` y vuelve en `onPressOut`, 150 ms, `Easing.out(Easing.quad)`; sin escala si `disabled`, `sinEscala` o movimiento reducido.
  - `Skeleton({ ancho, alto, radio? }: { ancho: DimensionValue; alto: number; radio?: number })` con `accessibilityLabel="Cargando"`, color `colores.linea`, opacidad 0.5↔1 cada 900 ms (`withRepeat`); estática en 0.7 con movimiento reducido. Estáticos `Skeleton.Fila`, `Skeleton.Tarjeta`, `Skeleton.Cifra` con las formas de `FilaLista` (alto 56), `Tarjeta` (alto 96) y cifra (120×32).
  - `NumeroAnimado({ valor, formato, style }: { valor: number; formato?: (n: number) => string; style?: StyleProp<TextStyle> })` — `TextInput` no editable animado con `useAnimatedProps` (prop `text`); `defaultValue` y `accessibilityLabel` = `formato(valor)` final; primera vez de 0 a `valor` en 600 ms `Easing.out(Easing.cubic)`, después del valor anterior al nuevo. Formato por defecto: enteros con separador de miles `,`. Con movimiento reducido no anima. Usa `TextInput` de `react-native` directamente: la regla ESLint de la Task 3 solo aplica a `app/` y `src/features/`.
  - `entradaEscalonada(indice: number)` → `FadeInUp.delay(indice * 60).duration(300).reduceMotion(ReduceMotion.System)` para `indice < 6`, `undefined` en otro caso.

- [ ] **Step 1: Tests que fallan** (con `require("react-native-reanimated/mock")` según la guía de Reanimated):
  - `"Presionable deshabilitado no llama onPress"`.
  - `"Presionable llama onPress"`.
  - `"NumeroAnimado expone el valor final formateado"`: `valor={1284}` → `getByLabelText("1,284")`.
  - `"NumeroAnimado con movimiento reducido muestra el valor final"`: mock de `useReducedMotion` → `true`, `getByDisplayValue("1,284")`.
  - `"Skeleton tiene etiqueta de carga"`: `getAllByLabelText("Cargando")`.
  - `"entradaEscalonada solo para las primeras 6 filas"`: `entradaEscalonada(5)` definido, `entradaEscalonada(6)` `undefined`.
- [ ] **Step 2:** `npx jest __tests__/animacion` → FAIL.
- [ ] **Step 3:** Implementar los cuatro módulos.
- [ ] **Step 4:** `npx jest __tests__/animacion` → PASS; suite completa en verde.
- [ ] **Step 5:** Commit `feat(animacion): presionable, skeleton, número animado y entrada escalonada`.

### Task 5: Confirmación con check animado

**Files:**
- Create: `src/animacion/Confirmacion.tsx`
- Modify: `app/_layout.tsx` (montar `ConfirmacionProvider` dentro de `TemaProvider`)
- Test: `__tests__/animacion/confirmacion.test.tsx`

**Interfaces:**
- Consumes: `useTema`, `Texto`.
- Produces: `ConfirmacionProvider({ children })`, `useConfirmacion(): { mostrar(o: { mensaje: string; alCerrar?: () => void }): void }`, `DURACION_CONFIRMACION_MS = 1400`.

- [ ] **Step 1: Tests que fallan** (timers falsos):
  - `"muestra el mensaje y llama a alCerrar a los 1400 ms"`: tras `mostrar({ mensaje: "Entrada registrada", alCerrar })`, `getByText("Entrada registrada")`; `alCerrar` no llamado a 1399 ms y llamado una vez a 1400 ms; el mensaje desaparece.
  - `"anuncia el mensaje por accesibilidad"`: `AccessibilityInfo.announceForAccessibility` llamado con `"Entrada registrada"`.
  - `"una segunda llamada reemplaza a la primera"`: dos `mostrar` seguidos → solo el segundo `alCerrar` se llama.
- [ ] **Step 2:** `npx jest __tests__/animacion/confirmacion.test.tsx` → FAIL.
- [ ] **Step 3:** Implementar: capa absoluta sobre toda la app con fondo `rgba(10,20,36,0.35)`, tarjeta `superficie` centrada (ancho 220, radio 16), círculo `exitoSuave` con check SVG (`Path` animado con `strokeDashoffset` de la longitud a 0 en 400 ms; completo con movimiento reducido), mensaje `variante="subtitulo"` que aparece con fundido tras el check; `pointerEvents="auto"` mientras está visible.
- [ ] **Step 4:** PASS y suite en verde.
- [ ] **Step 5:** Commit `feat(animacion): confirmación con check animado`.

### Task 6: Íconos y componentes de presentación

**Files:**
- Create: `src/components/Icono.tsx`, `src/components/Marca.tsx` (`IconoTrix`, `LogoMarca`), `src/components/Tarjeta.tsx`, `src/components/Etiqueta.tsx`, `src/components/AvatarProducto.tsx`, `src/components/FilaLista.tsx`, `src/components/Segmentado.tsx`
- Modify: `src/components/Boton.tsx`, `src/components/Campo.tsx`, `src/components/SelectorUnidad.tsx`, `src/components/Pantalla.tsx`
- Test: `__tests__/components/componentes.test.tsx`

**Interfaces:**
- Consumes: `useTema`, `RADIO`, `ESPACIO`, `sombra`, `TIPOGRAFIA`, `Texto`, `EntradaTexto`, `Presionable`.
- Produces:
  - `type NombreIcono = keyof typeof ICONOS` con `ICONOS = { inicio: House, buscar: Search, mas: Plus, menos: Minus, administracion: LayoutGrid, movimientos: ArrowLeftRight, configuracion: SlidersHorizontal, campana: Bell, atras: ChevronLeft, flecha: ChevronRight, lapiz: Pencil, camara: Camera, enviar: ArrowRight, cerrar: X, whatsapp: MessageCircle, check: Check, luna: Moon, alerta: TriangleAlert }` (importaciones con nombre de `lucide-react-native`).
  - `Icono({ nombre, tamano = 20, color }: { nombre: NombreIcono; tamano?: number; color?: string })`, `strokeWidth` 1.75, color por defecto `colores.texto`.
  - `IconoTrix({ tamano = 24 })`, `LogoMarca({ tamano = 20 })`: SVG de las maquetas aprobadas (robot con antena verde; tres barras `#102B50` con flecha `#219653`).
  - `Boton`: props actuales + `variante?: "primario" | "secundario" | "peligro" | "fantasma"` (por defecto `primario`) + `icono?: NombreIcono`. Alto mínimo 48, radio `RADIO.campo`. Colores: primario `primario`/`sobrePrimario`; secundario `superficie` con borde `borde` y texto `interactivo`; peligro `peligro`/`#FFFFFF`; fantasma sin fondo, texto `interactivo`. `ActivityIndicator` con el color del texto de la variante.
  - `Campo`: props actuales + `error?: string` (se muestra debajo con `accessibilityRole="alert"` y `tono="peligro"`). Caja alto 48, radio 12, borde 1.5 `borde`; con foco borde `interactivo`; con `error` borde `peligro`.
  - `SelectorUnidad`: mismas props; cada opción como chip con fondo `interactivo` y texto `sobrePrimario` si está seleccionada, `superficie` con borde `borde` si no.
  - `Pantalla({ children, scroll }: { children: ReactNode; scroll?: boolean })`: fondo `colores.fondo`, padding 16, gap 12; con `scroll` usa `ScrollView` con `keyboardShouldPersistTaps="handled"`. Conserva `justifyContent: "center"` solo sin `scroll` (como hoy).
  - `Tarjeta({ children, onPress, relleno = 16, accessibilityLabel })`.
  - `Etiqueta({ tipo, texto })` con `tipo: "disponible" | "pedir" | "inactivo"`; textos por defecto "Disponible", "Pedir", "Inactivo".
  - `iniciales(nombre: string): string` (primeras letras de las dos primeras palabras, en mayúscula; una palabra → sus dos primeras letras) y `AvatarProducto({ nombre, tamano = 32 })`, fondo elegido de 6 tonos suaves por un hash estable del nombre (`colores.avatares` de la Task 1).
  - `FilaLista({ titulo, detalle, valor, izquierda, onPress })`: con `onPress` es `Presionable` con `accessibilityRole="button"`, `accessibilityLabel={titulo}` y flecha `›` (`Icono flecha`).
  - `Segmentado<T extends string>({ opciones, valor, onCambio }: { opciones: { valor: T; titulo: string }[]; valor: T; onCambio: (v: T) => void })`, cada opción `accessibilityRole="tab"` con `accessibilityState.selected`.

- [ ] **Step 1: Tests que fallan** (envueltos en `TemaProvider`):
  - `"iniciales"`: `iniciales("Arroz blanco") === "AB"`, `iniciales("Detergente") === "DE"`, `iniciales("  aceite  900 ml ") === "A9"`.
  - `"AvatarProducto usa el mismo color para el mismo nombre"`.
  - `"Etiqueta muestra el texto por defecto"`: `tipo="pedir"` → `getByText("Pedir")`.
  - `"FilaLista presionable expone botón con el título"`.
  - `"Segmentado marca la opción activa y avisa el cambio"`: `getByRole("tab", { name: "Entradas" })` con `selected`, presionar "Salidas" → `onCambio("salidas")`.
  - `"Campo con error muestra la alerta"`: `error="Requerido"` → `getByRole("alert")` con "Requerido".
  - `"Boton peligro sigue siendo botón accesible"`: `getByRole("button", { name: "Dar de baja" })`.
- [ ] **Step 2:** `npx jest __tests__/components` → FAIL.
- [ ] **Step 3:** Implementar componentes nuevos y reestilizar los existentes.
- [ ] **Step 4:** `npm run lint && npm run typecheck && npm test` → verde (los tests de pantallas existentes no cambian).
- [ ] **Step 5:** Commit `feat(ui): íconos y componentes base con tema`.

### Task 7: ControlCantidad

**Files:**
- Create: `src/components/ControlCantidad.tsx`
- Modify: `src/components/Cantidad.tsx` (pasa a ser `ControlCantidad` con `etiqueta="Cantidad"`)
- Test: `__tests__/components/ControlCantidad.test.tsx`

**Interfaces:**
- Consumes: `Presionable`, `Icono`, `EntradaTexto`, `Texto`, `UNIDADES`, `Unidad`.
- Produces: `ControlCantidad({ valor, onCambio, unidad, maximo, etiqueta }: { valor: string; onCambio: (v: string) => void; unidad: Unidad; maximo?: number; etiqueta: string })`. Botones cuadrados de 48 con `accessibilityLabel` "Disminuir" y "Aumentar" (los mismos que hoy usa `Cantidad`). Mínimo 1 en unidades enteras y 0.01 en decimales (igual que `Cantidad` hoy); paso 1; redondeo a 2 decimales; con `maximo`, "Aumentar" se deshabilita al llegar y no lo supera. Campo central `EntradaTexto` con `accessibilityLabel={etiqueta}`, teclado `number-pad` o `decimal-pad` según `UNIDADES[unidad].entera`, y la abreviatura de la unidad a la derecha.

- [ ] **Step 1: Tests que fallan:**
  - `"aumenta y disminuye de 1 en 1"`: `valor="3"` → "Aumentar" llama `onCambio("4")`, "Disminuir" `onCambio("2")`.
  - `"no baja del mínimo"`: `valor="1"`, unidad `"caja"` → "Disminuir" deshabilitado.
  - `"no supera el máximo"`: `valor="5"`, `maximo={5}` → "Aumentar" deshabilitado.
  - `"decimales redondeados"`: `valor="2.555"`, unidad `"libra"`, "Aumentar" → `onCambio("3.56")`.
  - `"se puede escribir"`: `changeText` en `getByLabelText("Cantidad a salir")` con `"7"` → `onCambio("7")`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar y adaptar `Cantidad`.
- [ ] **Step 4:** `npm test` → verde, incluido `__tests__/movimientos/salida.test.tsx`.
- [ ] **Step 5:** Commit `feat(ui): control de cantidad con − y +`.

### Task 8: Encabezado

**Files:**
- Create: `src/components/Encabezado.tsx`
- Modify: `app/(app)/administracion/_layout.tsx`, `app/(app)/movimientos/_layout.tsx`
- Test: `__tests__/components/Encabezado.test.tsx`

**Interfaces:**
- Consumes: `LinearGradient` de `expo-linear-gradient`, `colores.encabezado`, `LogoMarca`, `Icono`, `Texto`, `Presionable`, `useSafeAreaInsets`.
- Produces: `Encabezado(props)` con
  - `variante: "inicio"`: `saludo: string`, `rol: string`, `alertas?: number`, `onAlertas?: () => void`. Campana con `accessibilityLabel` `"Notificaciones"` o `"Notificaciones, N sin leer"` y punto `peligro` si `alertas > 0`.
  - `variante: "pantalla"`: `titulo: string`, `onAtras?: () => void` (flecha con `accessibilityLabel="Volver"`), `accion?: { icono: NombreIcono; etiqueta: string; onPress: () => void }`.
  - Degradado de `encabezado[0]` a `encabezado[1]`, radio inferior `RADIO.encabezado`, padding superior = inset + 12, texto `sobrePrimario`. `variante: "inicio"` deja 40 de espacio inferior para que el contenido se monte encima.

- [ ] **Step 1: Tests que fallan:**
  - `"inicio muestra saludo, rol y alertas"`: `saludo="Hola, Ana 👋"`, `rol="Administrador"`, `alertas={3}` → textos visibles y `getByRole("button", { name: "Notificaciones, 3 sin leer" })`.
  - `"pantalla con atrás llama onAtras"`.
  - `"pantalla sin onAtras no muestra Volver"`.
  - `"acción a la derecha"`: `accion={{ icono: "lapiz", etiqueta: "Editar producto", onPress }}` → botón "Editar producto" llama `onPress`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar.
- [ ] **Step 4:** En los dos `_layout.tsx` de stack: `screenOptions={{ header: ({ options, navigation, back }) => <Encabezado variante="pantalla" titulo={options.title ?? ""} onAtras={back ? navigation.goBack : undefined} />, animation: "slide_from_right" }}` y `Stack.Screen` con títulos: administración → `index` "Administración", `reportes` "Reportes", `baja` "Dar de baja producto", `pedir` "Productos a pedir", `producto/[id]` "Producto", `producto/[id]/editar` "Editar producto"; movimientos → `index` "Historial de movimientos", `entrada` "Registrar entrada", `salida` "Registrar salida".
- [ ] **Step 5:** `npm run lint && npm run typecheck && npm test` → verde.
- [ ] **Step 6:** Commit `feat(ui): encabezado con degradado y títulos de pantalla`.

### Task 9: Pestañas por rol, rutas y barra inferior

**Files:**
- Create: `src/lib/useTecladoVisible.ts`, `src/components/BarraInferior.tsx`, `app/(app)/buscar.tsx` (con `git mv` desde `app/(app)/administracion/existencias.tsx`)
- Modify: `src/features/auth/navegacion.ts`, `app/(app)/_layout.tsx`, `app/(app)/administracion/index.tsx`, `app/(app)/administracion/baja.tsx`, `app/(app)/nuevo.tsx`, `app/(app)/movimientos/index.tsx` (pasa a ser el historial; `git mv` de `historial.tsx`), `app/_layout.tsx` (animaciones de `escaner` y `notificaciones`)
- Create (redirecciones): `app/(app)/administracion/existencias.tsx` → `<Redirect href="/buscar" />`; `app/(app)/movimientos/historial.tsx` → `<Redirect href="/movimientos" />`
- Test: `__tests__/navegacion/tabs.test.ts`, `__tests__/navegacion/barra.test.tsx`, `__tests__/navegacion/rutas.test.tsx`

**Interfaces:**
- Consumes: `useTema`, `Icono`, `Texto`, `Presionable`, `sombra`, `RADIO`.
- Produces:
  - `type NombreTab = "index" | "buscar" | "nuevo" | "administracion" | "movimientos" | "configuracion"`; `tabsPara(rol)` con las listas de la spec.
  - `useTecladoVisible(): boolean` (`Keyboard` `keyboardDidShow`/`keyboardDidHide`).
  - `ALTO_BARRA = 62`, `MARGEN_BARRA = 12`, `ESPACIO_TRIX = 64` exportados desde `BarraInferior.tsx`.
  - `BarraInferior(props: BottomTabBarProps & { visibles: NombreTab[] })`: dibuja solo `visibles` en ese orden, usando `TITULOS`/`ICONOS_TAB` (`index` "Inicio"/`inicio`, `buscar` "Buscar"/`buscar`, `administracion` "Admin."/`administracion`, `movimientos` "Movimientos"/`movimientos`, `configuracion` "Config."/`configuracion`); `nuevo` es el círculo "+" con `accessibilityLabel="Nuevo producto"`. Devuelve `null` con teclado visible.

- [ ] **Step 1: Tests que fallan:**
  - `tabs.test.ts`: `tabsPara("admin")` → `["index", "buscar", "nuevo", "administracion", "configuracion"]`; `tabsPara("operativo")` → `["index", "buscar", "movimientos", "configuracion"]`.
  - `barra.test.tsx` (con `state`/`navigation` falsos): admin → 4 `tab` + botón "Nuevo producto"; operativo → 4 `tab` y sin "Nuevo producto"; la pestaña activa tiene `selected`; presionar "Buscar" llama `navigation.navigate("buscar")`; con teclado visible (mock de `useTecladoVisible` → `true`) no se dibuja nada.
  - `rutas.test.tsx`: `render` de `app/(app)/administracion/existencias` y de `app/(app)/movimientos/historial` con `Redirect` mockeado → redirigen a `/buscar` y `/movimientos`; el menú de `app/(app)/administracion/index` para admin muestra solo "Reportes" y "Dar de baja producto".
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar `navegacion.ts`, `useTecladoVisible`, `BarraInferior`, mover archivos y redirecciones; en `administracion/index.tsx` dejar solo Reportes y Dar de baja (como `Tarjeta` con `Icono` y flecha); en `baja.tsx` y `nuevo.tsx` cambiar `"/administracion/existencias"` por `"/buscar"`.
- [ ] **Step 4:** `app/(app)/_layout.tsx`: `Tabs` con `tabBar={(p) => <BarraInferior {...p} visibles={visibles} />}`, `backBehavior="history"`, `screenOptions={{ headerShown: false, animation: "fade", sceneStyle: { backgroundColor: colores.fondo, paddingBottom: ALTO_BARRA + MARGEN_BARRA + bottom + ESPACIO_TRIX } }}` y un `Tabs.Screen` por cada `NombreTab` con `href: null` si no está en `visibles`. Quitar el botón "?" (lo reemplaza Trix en la Task 10). Agregar a `barra.test.tsx` el caso `"reserva espacio para barra y Trix"`: el `paddingBottom` calculado es `62 + 12 + inset + 64`.
- [ ] **Step 5:** `app/_layout.tsx`: `escaner` y `notificaciones` con `animation: "slide_from_bottom"`; el resto del `Stack` con `animation: "slide_from_right"`.
- [ ] **Step 6:** `npm run lint && npm run typecheck && npm test` → verde.
- [ ] **Step 7:** Commit `feat(nav): pestañas por rol, barra inferior flotante y rutas nuevas`.

### Task 10: Trix

**Files:**
- Create: `src/components/HojaInferior.tsx`, `src/features/soporte/BotonTrix.tsx`
- Modify: `app/soporte.tsx`, `app/_layout.tsx` (presentación de `soporte`), `app/(app)/_layout.tsx` (monta `BotonTrix`)
- Test: `__tests__/soporte/soporte.test.tsx`, `__tests__/soporte/botonTrix.test.tsx`

**Interfaces:**
- Consumes: `IconoTrix`, `Icono`, `Texto`, `EntradaTexto`, `Boton`, `useTecladoVisible`, `ALTO_BARRA`, `MARGEN_BARRA`; `enviarPregunta`, `MAX_CARACTERES`, `enlaceWhatsApp` (sin cambios).
- Produces:
  - `HojaInferior({ children, onCerrar }: { children: ReactNode; onCerrar: () => void })`: fondo `rgba(10,20,36,0.45)` presionable con `accessibilityLabel="Cerrar"`; hoja `superficie` de 70 % del alto, radio superior 24, asa de 36×4; entra desde abajo en 250 ms; `Gesture.Pan` vertical: soltar con desplazamiento > 30 % del alto → anima la salida y llama `onCerrar`, si no vuelve a 0. Con movimiento reducido entra y sale con fundido.
  - `BotonTrix()`: círculo `superficie` de 48 con `IconoTrix` y sombra `elevada`, `accessibilityLabel="Abrir asistente Trix"`, `right: 16`, `bottom: ALTO_BARRA + MARGEN_BARRA + inset + 12`; `router.push("/soporte")`; oculto con teclado visible.
  - `PREGUNTAS_RAPIDAS = ["¿Cómo registrar una entrada?", "¿Cómo registrar una salida?", "¿Qué es el punto de pedido?", "¿Cómo consultar existencias?"]` en `src/features/soporte/preguntas.ts` (las rutas de `app/` solo exportan su componente).

- [ ] **Step 1: Actualizar `soporte.test.tsx` (tests que fallan):**
  - `"saluda por nombre como Trix"`: perfil `nombre: "Ana"` → `getByText("¡Hola, Ana! Soy Trix. ¿En qué te ayudo?")`.
  - `"muestra las cuatro preguntas rápidas para ambos roles"`: con `mockRol` `"admin"` y `"operativo"` aparecen los 4 textos de `PREGUNTAS_RAPIDAS`.
  - `"una pregunta rápida se envía al chatbot"`: presionar "¿Qué es el punto de pedido?" → `mockEnviar` llamado con `[{ rol: "usuario", texto: "¿Qué es el punto de pedido?" }]`.
  - `"el botón de WhatsApp siempre está disponible"`: `getByRole("button", { name: "Contactar soporte por WhatsApp" })` sin enviar nada; al presionarlo abre `Linking.openURL` con el enlace de `enlaceWhatsApp`.
  - `"tocar fuera cierra el panel"`: presionar "Cerrar" → `router.back` llamado (mock de `expo-router`).
  - Se conservan los tests actuales de envío, respuesta y error de WhatsApp, ajustando solo el saludo y las sugerencias.
- [ ] **Step 2: Test que falla** `botonTrix.test.tsx`: presionar "Abrir asistente Trix" → `router.push("/soporte")`; con teclado visible no se dibuja.
- [ ] **Step 3:** `npx jest __tests__/soporte` → FAIL.
- [ ] **Step 4:** Implementar `HojaInferior`, `BotonTrix`, `preguntas.ts` y reescribir el render de `app/soporte.tsx` dentro de `HojaInferior` (la lógica de `enviar` y `abrirWhatsApp` se conserva; el saludo usa `perfil.nombre`; burbujas: usuario `primario`/`sobrePrimario` a la derecha, asistente `superficie` con borde `linea` a la izquierda; el campo y el botón "Enviar" (ícono `enviar`, `accessibilityLabel="Enviar"`) abajo; botón "Contactar soporte por WhatsApp" siempre visible bajo el campo, con borde `exito`, fondo `exitoSuave` y texto `textoExito`). Si no hay número configurado, el botón no se muestra y aparece el texto actual "El contacto por WhatsApp no está disponible por ahora.".
- [ ] **Step 5:** `app/_layout.tsx`: `soporte` con `presentation: "transparentModal"`, `animation: "none"`, `contentStyle: { backgroundColor: "transparent" }`. `app/(app)/_layout.tsx`: montar `<BotonTrix />` después de `Tabs`.
- [ ] **Step 6:** `npm run lint && npm run typecheck && npm test` → verde.
- [ ] **Step 7:** Commit `feat(soporte): Trix como botón flotante y panel inferior`.

### Task 11: Verificación final

**Files:** ninguno nuevo, salvo correcciones que salgan de la revisión.

- [ ] **Step 1:** `npm run lint && npm run typecheck && npm test` → verde.
- [ ] **Step 2:** Revisión con la skill `better-ui` sobre `src/components/`, `src/animacion/` y `src/features/soporte/BotonTrix.tsx` (radios concéntricos, escala 0.96, grosor de íconos, sin `transition: all` equivalentes) y con `design:accessibility-review` (contraste en ambos temas, áreas táctiles ≥ 48, roles y etiquetas). Corregir los hallazgos `HIGH` y `MEDIUM`; listar los `LOW` en el mensaje de cierre.
- [ ] **Step 3:** En Expo Go (`npx expo start --lan`) con `ana.lopez` y `carlos.m`, verificar y anotar el resultado de cada punto:
  - Admin ve Inicio · Buscar · ＋ · Admin. · Config.; operativo ve Inicio · Buscar · Movimientos · Config.
  - El switch de Configuración cambia el tema al instante y se conserva al cerrar y abrir la app; ninguna pantalla muestra texto negro sobre fondo oscuro.
  - Inicio → Entrada (admin) → atrás vuelve a Inicio.
  - El último producto de Buscar y el botón "Registrar salida" quedan visibles sobre la barra y Trix.
  - Trix abre el panel, se cierra deslizando y tocando fuera; con el teclado abierto el campo queda visible; una pregunta rápida obtiene respuesta.
  - Con "Quitar animaciones" activado en Android, no hay escalas ni desplazamientos.
- [ ] **Step 4:** Commit de correcciones si las hubo: `fix(ui): ajustes de la revisión de la base visual`.
