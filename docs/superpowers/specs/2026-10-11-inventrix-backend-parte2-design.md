# Inventrix — Parte 2: cambios de backend (motivos, baja y dashboard)

Fecha: 2026-10-11 · Rama: `feat/backend-parte2` (sale de `feat/ui-base`) · Antecede: `2026-10-11-inventrix-ui-base-design.md` (parte 1)

## Objetivo

Dejar la base de datos y la capa de datos de la app listas para el rediseño de pantallas (parte 3):

1. Motivos de salida **venta, caducidad, daño y otros**.
2. **Baja de producto con motivo de lista**, permitida aunque tenga existencias (quedan en cero y el historial lo explica).
3. **Consulta única del dashboard de Reportes**: más y menos vendido, productos en punto de pedido, total de movimientos y serie diaria de entradas/salidas.

Fuera de alcance: las pantallas nuevas (parte 3). En esta parte la app solo se adapta lo mínimo para seguir compilando y funcionando con los tipos nuevos (selector de motivos, etiquetas, baja con lista, hook del dashboard).

## Decisiones tomadas con el usuario

| Tema | Decisión |
|---|---|
| Motivo de baja | Lista fija + "Otro" con texto: Descontinuado, Ya no se vende, Error de registro, Otro (escribir). |
| Periodo del dashboard | Selector: últimos 7 días (por defecto), últimos 30 días, este mes. Gráfico con una barra por día. |
| Unidades mezcladas | El gráfico cuenta **número de movimientos**; más/menos vendido usa la **cantidad vendida** del producto y se muestra con su unidad. |
| Menos vendido | Solo entre productos con al menos una venta en el periodo. |
| Organización | Una sola función `dashboard_reportes(desde, hasta)` que devuelve JSON. |

## 1. Motivos de salida

**Migración** `supabase/migrations/20261011000001_motivos_y_baja.sql` (una sola migración para las secciones 1 y 2):

- Crear `public.motivo_salida_v2 as enum ('venta', 'caducidad', 'dano', 'otros')`.
  - El valor interno es `dano` (sin ñ) para evitar problemas de codificación en enums y URLs; la app lo muestra como "Daño".
- Convertir `movimientos.motivo` con `alter column ... type public.motivo_salida_v2 using (case motivo::text when 'venta' then 'venta' when 'consumo_interno' then 'otros' when 'retiro_autorizado' then 'otros' end)::public.motivo_salida_v2`.
- Antes de convertir, eliminar los objetos que dependen del tipo viejo (`historial_movimientos`, `registrar_movimiento`, `reporte_movimientos`); después, borrar el tipo viejo, renombrar `motivo_salida_v2` a `motivo_salida` y recrear esos objetos con la misma firma, cuerpo, permisos (`revoke ... from public, anon` / `grant ... to authenticated`) y comentarios que tenían.
- La salida por caducidad o daño es una salida normal: descuenta existencias, puede disparar alerta de punto de pedido y el producto sigue activo.

## 2. Baja con motivo y con existencias

- Nuevo tipo `public.motivo_baja as enum ('descontinuado', 'ya_no_se_vende', 'error_registro', 'otro')`.
- `alter type public.tipo_movimiento add value 'baja'` (en su propia migración previa, `20261011000000_tipo_baja.sql`, porque un valor de enum nuevo no puede usarse en la misma transacción en que se agrega).
- `productos`: `motivo_baja` pasa de `text` a `public.motivo_baja`; se agrega `detalle_baja text`. Los productos ya dados de baja (texto libre) migran a `otro` con su texto original en `detalle_baja`.
- Reemplazar `dar_baja_producto(uuid, text)` por `dar_baja_producto(p_id uuid, p_motivo public.motivo_baja, p_detalle text default null)` (se elimina la firma vieja):
  1. Solo admin activo (`NO_AUTORIZADO`).
  2. `p_motivo` nulo → `MOTIVO_REQUERIDO`. `p_motivo = 'otro'` con `trim(p_detalle)` vacío → `DETALLE_REQUERIDO`. Detalle de más de 200 caracteres → `DATOS_INVALIDOS`. Con otro motivo, el detalle se guarda si viene (opcional).
  3. Bloquea la fila (`for update`); `PRODUCTO_NO_ENCONTRADO` / `PRODUCTO_INACTIVO` como hoy.
  4. **Ya no existe `TIENE_EXISTENCIAS`.** Si `existencias > 0`, inserta un movimiento `tipo = 'baja'`, `cantidad = existencias`, `motivo = null`, `existencias_antes = existencias`, `existencias_despues = 0`, usuario actual; y deja `existencias = 0`.
  5. Marca `activo = false`, `motivo_baja`, `detalle_baja`, `dado_baja_por`, `dado_baja_at`.
  6. No genera alerta de punto de pedido.
- `registrar_movimiento` sigue aceptando solo `entrada` y `salida` (`'baja'` → `DATOS_INVALIDOS`).
- `reporte_movimientos` y `historial_movimientos` incluyen los movimientos de baja sin cambios de forma (su `tipo` es `'baja'`).

## 3. Dashboard

Migración `supabase/migrations/20261011000002_dashboard.sql`.

`public.dashboard_reportes(p_desde date, p_hasta date) returns jsonb`, `stable`, `security definer`, `set search_path = ''`, solo admin activo (`NO_AUTORIZADO`).

- Fechas **inclusivas** y en hora local `America/Managua`: el periodo cubre desde `p_desde 00:00` hasta `p_hasta 23:59:59.999` locales. Validación: nulos, `p_hasta < p_desde` o más de 366 días → `RANGO_INVALIDO`.
- Respuesta:

```json
{
  "mas_vendido":   { "producto_id": "uuid", "nombre": "Arroz", "unidad": "libra", "cantidad": 42 } | null,
  "menos_vendido": { ... mismo formato ... } | null,
  "en_punto_pedido": 3,
  "total_movimientos": 57,
  "serie": [ { "fecha": "2026-10-05", "entradas": 4, "salidas": 9 }, ... ]
}
```

- **Vendido** = suma de `cantidad` de movimientos `tipo = 'salida'` y `motivo = 'venta'` en el periodo, agrupada por producto (incluye productos hoy inactivos, porque la venta ocurrió). Más vendido: mayor suma; menos vendido: menor suma entre los que tienen ventas. Empates: por `nombre` ascendente y luego `id`. Sin ventas: ambos `null`. Con un solo producto vendido, ambos apuntan a él.
- **en_punto_pedido**: `count(*)` de la vista `productos_a_pedir` (estado actual; no depende del periodo).
- **total_movimientos**: movimientos del periodo de tipo `entrada`, `salida` y `baja` (excluye `inicial`, igual que el reporte actual).
- **serie**: un elemento por cada día del periodo (vía `generate_series`), incluidos los días sin movimientos en 0. `entradas` cuenta movimientos `entrada`; `salidas` cuenta `salida` y `baja`. Ordenada por fecha ascendente.
- Índice existente `movimientos_created_idx` cubre el filtro por fecha; no se agregan índices.

**Zona horaria:** se asume `America/Managua` (UTC−6, sin horario de verano). Es una suposición a confirmar con la clienta; está en una sola constante dentro de la función para cambiarla fácil.

## 4. Capa de datos en la app

- Regenerar `src/lib/database.types.ts` (`npx supabase gen types typescript --local`).
- `src/features/movimientos/`: el selector de motivos de salida ofrece Venta, Caducidad, Daño, Otros. Un único mapa de etiquetas `ETIQUETAS_MOTIVO_SALIDA` en `src/features/movimientos/motivos.ts`, usado por `FormularioMovimiento`, el historial (`app/(app)/movimientos/index.tsx`) y el Excel (`src/features/reportes/excel.ts`), que hoy duplican el mapa.
- Tipo `baja`: el historial lo muestra con la etiqueta "Baja" (tono de salida). El filtro "Salidas" del historial incluye `salida` y `baja`; "Entradas" sigue incluyendo `entrada` e `inicial`. El Excel lo exporta como "Baja". `etiquetaMovimiento` acepta `'baja'`.
- Baja: `darBajaProducto(id, motivo, detalle?)` en `src/features/productos/api.ts`; mapa `ETIQUETAS_MOTIVO_BAJA` en `src/features/productos/motivosBaja.ts`. La pantalla actual `administracion/baja.tsx` se adapta mínimamente: selector de los cuatro motivos, campo de detalle visible solo con "Otro", y deja de bloquear por existencias (muestra la advertencia "Este producto aún tiene N existencias; quedarán en cero" antes de confirmar). Su rediseño visual es de la parte 3.
- Dashboard: `obtenerDashboard(desde, hasta)` en `src/features/reportes/api.ts` y hook `useDashboard(periodo: "7d" | "30d" | "mes")` en `src/features/reportes/hooks.ts`. `rangoDePeriodo(periodo, hoy)` (pura, probada) calcula las fechas en hora local del dispositivo: 7d = hoy y los 6 días anteriores; 30d = hoy y los 29 anteriores; mes = día 1 del mes actual hasta hoy.
- `src/lib/errores.ts`: se quita `TIENE_EXISTENCIAS`; se agregan `DETALLE_REQUERIDO` ("Escribe el motivo de la baja.") y `RANGO_INVALIDO` ("El periodo seleccionado no es válido.").

Los manuales de Trix (`docs/manuales/`) se reescriben en la parte 3, cuando cambien las pantallas; aquí no se tocan.

## 5. Pruebas

- **pgTAP** (`supabase/tests/`):
  - `04_movimientos`: salidas con los cuatro motivos; caducidad deja el producto activo; `registrar_movimiento` rechaza `'baja'`.
  - La conversión de datos viejos no se prueba con pgTAP: las migraciones corren antes del seed, así que nunca hay filas con los motivos viejos. Se verifica una vez a mano: aplicar las migraciones nuevas con `npx supabase migration up` sobre la base local actual (que sí tiene movimientos `consumo_interno`/`retiro_autorizado`) y comprobar con una consulta que quedaron como `otros`, antes de cualquier `db reset`.
  - `03_productos`: baja sin existencias; baja con existencias crea un movimiento `baja` y deja 0; `otro` sin detalle → `DETALLE_REQUERIDO`; no genera alerta; operativo → `NO_AUTORIZADO`.
  - `10_dashboard`: periodo sin ventas (nulls); empate por nombre; un solo producto vendido; días vacíos en 0; venta a las 23:30 hora local cae en su día; `RANGO_INVALIDO`; operativo → `NO_AUTORIZADO`; las ventas de un producto ya dado de baja cuentan.
- **Jest**: `rangoDePeriodo` (incluye cambio de mes y año), `useDashboard`, etiquetas de motivos, selector de salida con los cuatro motivos, pantalla de baja (detalle solo con "Otro", advertencia con existencias), errores nuevos.
- `seed.sql`: los datos de prueba usan los motivos nuevos e incluyen al menos una venta, una caducidad y un daño en los últimos 7 días.

## Riesgos

- Recrear funciones y vistas al cambiar el enum puede perder permisos: el plan verifica con pgTAP (`02_seguridad`) que `anon` no tiene acceso y `authenticated` sí.
- Si ya existiera una base remota con datos reales, la migración convierte `consumo_interno` y `retiro_autorizado` a `otros` de forma irreversible. Hoy solo hay datos locales de prueba.
