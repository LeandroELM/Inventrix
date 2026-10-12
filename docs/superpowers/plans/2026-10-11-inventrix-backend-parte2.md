# Inventrix Parte 2 (backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Motivos de salida venta/caducidad/daño/otros, baja con motivo de lista aunque haya existencias, y una consulta única para el dashboard de Reportes, con la capa de datos de la app adaptada.

**Architecture:** Tres migraciones SQL nuevas (valor de enum `baja`; motivos + baja; dashboard) probadas con pgTAP. Después se regeneran los tipos y se adapta la capa de datos de la app (mapas de etiquetas compartidos, API de baja, hook del dashboard) con pruebas Jest. Las pantallas nuevas son de la parte 3.

**Tech Stack:** Supabase local (Postgres 17, pgTAP vía `npm run test:db`), Expo SDK 57, TypeScript, TanStack Query, Jest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-11-inventrix-backend-parte2-design.md`

## Global Constraints

- Funciones SQL nuevas o recreadas: `security definer`, `set search_path = ''`, nombres calificados con `public.`, errores con `raise exception '<CODIGO>' using errcode = 'P0001'`.
- Toda función expuesta: `revoke execute ... from public, anon;` y `grant execute ... to authenticated;`. Vistas: `revoke all ... from public, anon; grant select ... to authenticated;`.
- Valores del enum `motivo_salida`: `'venta', 'caducidad', 'dano', 'otros'` (sin ñ). Etiquetas: Venta, Caducidad, Daño, Otros.
- Valores del enum `motivo_baja`: `'descontinuado', 'ya_no_se_vende', 'error_registro', 'otro'`. Etiquetas: Descontinuado, Ya no se vende, Error de registro, Otro.
- Zona horaria del dashboard: `'America/Managua'`, en una sola constante dentro de la función.
- No editar migraciones existentes (`20261010*`): todo cambio va en migraciones nuevas.
- No ejecutar `supabase db reset` hasta que la Tarea 1 haya hecho la verificación manual de la conversión.
- Comentarios y textos en español, sin emojis; seguir el estilo del archivo que se toca.
- Mensajes de commit en español con prefijo convencional y la línea final `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Comandos de verificación: `npm run test:db`, `npm run typecheck`, `npm run lint`, `npm test`.

## Review Focus

1. Recrear `registrar_movimiento`, `reporte_movimientos` e `historial_movimientos` puede dejar a `anon` con acceso o a `authenticated` sin él → la Tarea 1 prueba los privilegios de los objetos recreados.
2. Baja de un producto con existencias decimales (2.5 libras) → el movimiento `baja` registra 2.50 y el producto queda en 0.00 → prueba en la Tarea 1.
3. Movimientos justo en los bordes del periodo en hora local (23:30 del último día entra; 00:30 del día siguiente no) → prueba en la Tarea 2.
4. Una fila del historial con `tipo = 'baja'` y `motivo = null` no debe romper la etiqueta del historial ni el Excel → pruebas en la Tarea 3.
5. Periodo "este mes" el día 1 (desde = hasta) y "7 días" que cruza el cambio de año → pruebas en la Tarea 5.

---

### Task 1: Migraciones de motivos de salida y baja con existencias

**Files:**
- Create: `supabase/migrations/20261011000000_tipo_baja.sql`
- Create: `supabase/migrations/20261011000001_motivos_y_baja.sql`
- Modify: `supabase/tests/03_productos.test.sql`, `supabase/tests/04_movimientos.test.sql`, `supabase/tests/05_consultas.test.sql`

**Interfaces:**
- Produces: enum `public.motivo_salida` = `('venta','caducidad','dano','otros')`; enum `public.motivo_baja`; valor `'baja'` en `public.tipo_movimiento`; columnas `productos.motivo_baja public.motivo_baja`, `productos.detalle_baja text`; función `public.dar_baja_producto(p_id uuid, p_motivo public.motivo_baja, p_detalle text default null) returns public.productos`. `registrar_movimiento`, `reporte_movimientos` e `historial_movimientos` conservan su firma y columnas (el tipo `motivo_salida` cambia de valores, no de nombre).

- [ ] **Step 1: Escribir `20261011000000_tipo_baja.sql`**

Solo `alter type public.tipo_movimiento add value if not exists 'baja';` con un comentario: va aparte porque un valor nuevo de enum no puede usarse en la misma transacción en que se agrega.

- [ ] **Step 2: Escribir `20261011000001_motivos_y_baja.sql`**, en este orden:
  1. `drop view public.historial_movimientos;` `drop function public.reporte_movimientos(public.tipo_movimiento, timestamptz, timestamptz, uuid);` `drop function public.registrar_movimiento(uuid, public.tipo_movimiento, numeric, public.motivo_salida);` `drop function public.dar_baja_producto(uuid, text);`
  2. `create type public.motivo_salida_v2 as enum ('venta', 'caducidad', 'dano', 'otros');` y convertir la columna:
     ```sql
     alter table public.movimientos alter column motivo type public.motivo_salida_v2
       using (case motivo::text when 'venta' then 'venta' when 'consumo_interno' then 'otros'
                                when 'retiro_autorizado' then 'otros' end)::public.motivo_salida_v2;
     drop type public.motivo_salida;
     alter type public.motivo_salida_v2 rename to motivo_salida;
     ```
  3. `create type public.motivo_baja as enum (...)`; `alter table public.productos add column detalle_baja text;` y convertir `motivo_baja` de `text`: los no nulos pasan a `'otro'` y su texto original a `detalle_baja` (primero copiar `detalle_baja = motivo_baja where motivo_baja is not null`, luego `alter column motivo_baja type public.motivo_baja using (case when motivo_baja is null then null else 'otro' end)::public.motivo_baja`).
  4. Recrear `registrar_movimiento`, `reporte_movimientos` e `historial_movimientos` copiando el cuerpo exacto de `20261010000004_rpc_movimientos.sql` y `20261010000005_consultas.sql` (incluidos comentarios, `revoke`/`grant`). Único cambio de lógica: ninguno (`registrar_movimiento` ya rechaza todo tipo distinto de `entrada`/`salida` con `DATOS_INVALIDOS`, lo que cubre `'baja'`).
  5. Crear `dar_baja_producto(p_id uuid, p_motivo public.motivo_baja, p_detalle text default null)` según la sección 2 de la spec. Validaciones en este orden: `NO_AUTORIZADO`; `p_motivo is null` → `MOTIVO_REQUERIDO`; detalle recortado de más de 200 caracteres → `DATOS_INVALIDOS`; `p_motivo = 'otro'` con detalle vacío → `DETALLE_REQUERIDO`; luego `PRODUCTO_NO_ENCONTRADO`, `PRODUCTO_INACTIVO`. Guarda `detalle_baja` recortado o `null` si queda vacío. Si `existencias > 0` inserta el movimiento `baja` (motivo nulo) y pone `existencias = 0`. `revoke`/`grant` con la firma `(uuid, public.motivo_baja, text)`.

- [ ] **Step 3: Verificación manual de la conversión (antes de cualquier reset)**

Run:
```bash
docker exec supabase_db_Inventrix psql -U postgres -tAc "select motivo, count(*) from movimientos group by 1"
npx supabase migration up
docker exec supabase_db_Inventrix psql -U postgres -tAc "select motivo, count(*) from movimientos group by 1"
```
Expected: antes aparece `retiro_autorizado|1`; después ya no hay `retiro_autorizado` ni `consumo_interno` y `otros` sumó esas filas. Anotar ambas salidas en el reporte de la tarea.

- [ ] **Step 4: Actualizar las pruebas pgTAP** (ajustar cada `plan(N)`)

En `03_productos.test.sql` reemplazar las pruebas de baja por:
```sql
select throws_ok($$select public.dar_baja_producto((select id from public.productos where codigo = '750'), null)$$,
                 'P0001', 'MOTIVO_REQUERIDO', 'motivo nulo');
select throws_ok($$select public.dar_baja_producto((select id from public.productos where codigo = '750'), 'otro', '  ')$$,
                 'P0001', 'DETALLE_REQUERIDO', 'otro sin detalle');
select throws_ok($$select public.dar_baja_producto((select id from public.productos where codigo = '750'), 'otro', repeat('x', 201))$$,
                 'P0001', 'DATOS_INVALIDOS', 'detalle demasiado largo');
-- producto 'D1' registrado con 2.5 libras
select lives_ok($$select public.dar_baja_producto((select id from public.productos where codigo = 'D1'), 'descontinuado')$$, 'baja con existencias');
select is((select existencias from public.productos where codigo = 'D1'), 0.00::numeric, 'existencias en cero');
select is((select count(*)::int from public.movimientos m join public.productos p on p.id = m.producto_id
           where p.codigo = 'D1' and m.tipo = 'baja' and m.cantidad = 2.50 and m.motivo is null
             and m.existencias_antes = 2.50 and m.existencias_despues = 0), 1, 'movimiento baja por lo restante');
select is((select count(*)::int from public.alertas a join public.productos p on p.id = a.producto_id where p.codigo = 'D1'),
          0, 'la baja no genera alerta');
select is((select (motivo_baja, detalle_baja)::text from public.productos where codigo = 'O1'),
          '(otro,"Se vendió el local")', 'otro guarda el detalle recortado');  -- llamada con '  Se vendió el local  '
```
Conservar: baja sin existencias (`'V1'`, ahora con `'descontinuado'`) sin movimiento `baja`; `PRODUCTO_INACTIVO` al repetir; operativo → `NO_AUTORIZADO`; privilegios con la firma nueva `public.dar_baja_producto(uuid,public.motivo_baja,text)`.

En `04_movimientos.test.sql`: salidas con `'caducidad'`, `'dano'` y `'otros'` funcionan y la de caducidad deja `activo = true`; `registrar_movimiento(..., 'baja', 1)` → `DATOS_INVALIDOS`; reemplazar cualquier uso de `consumo_interno`/`retiro_autorizado`. Agregar la prueba de privilegios de los objetos recreados:
```sql
select ok(not has_function_privilege('anon', 'public.registrar_movimiento(uuid,public.tipo_movimiento,numeric,public.motivo_salida)', 'EXECUTE')
          and has_function_privilege('authenticated', 'public.registrar_movimiento(uuid,public.tipo_movimiento,numeric,public.motivo_salida)', 'EXECUTE'),
          'registrar_movimiento recreada conserva permisos');
```
En `05_consultas.test.sql`: la misma comprobación para `reporte_movimientos` y `has_table_privilege` sobre `historial_movimientos` (`anon` sin `SELECT`, `authenticated` con `SELECT`); y que un movimiento `baja` aparece en `historial_movimientos` con `motivo is null`. Actualizar las llamadas a `dar_baja_producto` a la firma nueva.

- [ ] **Step 5: Correr las pruebas**

Run: `npm run test:db`
Expected: todas las suites `ok`, sin `not ok`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261011000000_tipo_baja.sql supabase/migrations/20261011000001_motivos_y_baja.sql supabase/tests/03_productos.test.sql supabase/tests/04_movimientos.test.sql supabase/tests/05_consultas.test.sql
git commit -m "feat(db): motivos de salida nuevos y baja con motivo aunque haya existencias"
```

---

### Task 2: Función del dashboard y datos de prueba

**Files:**
- Create: `supabase/migrations/20261011000002_dashboard.sql`
- Create: `supabase/tests/10_dashboard.test.sql`
- Modify: `supabase/seed.sql`

**Interfaces:**
- Consumes: enums y `tipo 'baja'` de la Tarea 1; vista `public.productos_a_pedir`.
- Produces: `public.dashboard_reportes(p_desde date, p_hasta date) returns jsonb` con las claves `mas_vendido`, `menos_vendido` (objeto `{producto_id, nombre, unidad, cantidad}` o `null`), `en_punto_pedido` (int), `total_movimientos` (int), `serie` (arreglo de `{fecha: 'YYYY-MM-DD', entradas: int, salidas: int}` ascendente).

- [ ] **Step 1: Escribir `10_dashboard.test.sql`** (mismo preámbulo que `03_productos`: `pg_temp.crear_usuario`, `pg_temp.como`). Los movimientos se crean con `registrar_movimiento` y luego se fecha cada uno con `update public.movimientos set created_at = '<timestamp con zona>' where id = ...` (como `postgres`, antes de `pg_temp.como`). Pruebas:
```sql
-- sin ventas
select is(public.dashboard_reportes('2026-01-01', '2026-01-07') -> 'mas_vendido', 'null'::jsonb, 'sin ventas: mas_vendido null');
select is(public.dashboard_reportes('2026-01-01', '2026-01-07') -> 'menos_vendido', 'null'::jsonb, 'sin ventas: menos_vendido null');
select is(jsonb_array_length(public.dashboard_reportes('2026-01-01', '2026-01-07') -> 'serie'), 7, 'serie con 7 dias');
select is(public.dashboard_reportes('2026-01-01', '2026-01-07') -> 'serie' -> 0,
          '{"fecha":"2026-01-01","entradas":0,"salidas":0}'::jsonb, 'dias vacios en cero');
-- ventas en 2026-02-10..2026-02-12: 'Arroz' 10 y 'Azucar' 10 (empate), 'Sal' 3, una salida 'caducidad' de Sal 50
select is(public.dashboard_reportes('2026-02-10', '2026-02-12') #>> '{mas_vendido,nombre}', 'Arroz', 'empate: gana por nombre');
select is(public.dashboard_reportes('2026-02-10', '2026-02-12') #>> '{menos_vendido,nombre}', 'Sal', 'menos vendido solo con ventas');
select is((public.dashboard_reportes('2026-02-10', '2026-02-12') #>> '{menos_vendido,cantidad}')::numeric, 3::numeric, 'caducidad no cuenta como venta');
-- un solo producto vendido en 2026-03-01
select is(public.dashboard_reportes('2026-03-01', '2026-03-01') #>> '{mas_vendido,nombre}',
          public.dashboard_reportes('2026-03-01', '2026-03-01') #>> '{menos_vendido,nombre}', 'un solo vendido: ambos iguales');
-- bordes en hora local: salida a '2026-04-05 23:30-06' y otra a '2026-04-06 00:30-06'
select is((public.dashboard_reportes('2026-04-01', '2026-04-05') #>> '{serie,4,salidas}')::int, 1, '23:30 local entra en su dia');
select is((public.dashboard_reportes('2026-04-01', '2026-04-05') ->> 'total_movimientos')::int, 1, '00:30 del dia siguiente queda fuera');
-- baja cuenta en salidas y total; inicial no cuenta
select is((public.dashboard_reportes('2026-05-02', '2026-05-02') #>> '{serie,0,salidas}')::int, 1, 'baja cuenta como salida en la serie');
select is((public.dashboard_reportes('2026-05-01', '2026-05-01') ->> 'total_movimientos')::int, 0, 'inicial no cuenta');
-- ventas de un producto dado de baja despues siguen contando
select is(public.dashboard_reportes('2026-05-02', '2026-05-02') #>> '{mas_vendido,nombre}', 'Harina', 'cuenta ventas de producto inactivo');
select is((public.dashboard_reportes('2026-01-01', '2026-01-01') ->> 'en_punto_pedido')::int,
          (select count(*)::int from public.productos_a_pedir), 'en_punto_pedido = productos_a_pedir');
select throws_ok($$select public.dashboard_reportes('2026-01-07', '2026-01-01')$$, 'P0001', 'RANGO_INVALIDO', 'hasta antes de desde');
select throws_ok($$select public.dashboard_reportes('2025-01-01', '2026-01-02')$$, 'P0001', 'RANGO_INVALIDO', 'mas de 366 dias');
select throws_ok($$select public.dashboard_reportes(null, '2026-01-02')$$, 'P0001', 'RANGO_INVALIDO', 'fecha nula');
-- como operativo
select throws_ok($$select public.dashboard_reportes('2026-01-01', '2026-01-07')$$, 'P0001', 'NO_AUTORIZADO', 'operativo no autorizado');
select ok(not has_function_privilege('anon', 'public.dashboard_reportes(date,date)', 'EXECUTE')
          and has_function_privilege('authenticated', 'public.dashboard_reportes(date,date)', 'EXECUTE'), 'permisos');
```
(El movimiento `inicial` del 2026-05-01 se fecha igual que los demás; `'Harina'` se vende el 2026-05-02 y después se da de baja ese mismo día con existencias.)

- [ ] **Step 2: Correr y ver que falla**

Run: `npm run test:db`
Expected: `10_dashboard` falla con `function public.dashboard_reportes(unknown, unknown) does not exist`.

- [ ] **Step 3: Implementar `public.dashboard_reportes(p_desde date, p_hasta date) returns jsonb`** en `20261011000002_dashboard.sql`

`language plpgsql stable security definer set search_path = ''`. Constante `v_zona constant text := 'America/Managua';`. Validar `NO_AUTORIZADO` (usuario activo y admin), luego `RANGO_INVALIDO` (nulos, `p_hasta < p_desde`, `p_hasta - p_desde > 365`). Límites: `v_inicio := p_desde::timestamp at time zone v_zona`, `v_fin := (p_hasta + 1)::timestamp at time zone v_zona`, filtro `created_at >= v_inicio and created_at < v_fin`. Día local de un movimiento: `(m.created_at at time zone v_zona)::date`. Serie con `generate_series(p_desde, p_hasta, interval '1 day')` y `left join` de los conteos; `coalesce(..., 0)`. Ventas agrupadas con `sum(cantidad)` y orden `cantidad desc, nombre, id` (más) / `cantidad asc, nombre, id` (menos). `revoke`/`grant` según Global Constraints.

- [ ] **Step 4: Correr y ver que pasa**

Run: `npm run test:db`
Expected: todas las suites `ok`.

- [ ] **Step 5: Datos de prueba en `seed.sql`**

Después de crear los productos y dentro del mismo bloque `do`, actuando como el admin: registrar con `public.registrar_movimiento` al menos 3 ventas de productos distintos, 1 salida `'caducidad'`, 1 `'dano'` y 2 entradas; luego repartir sus `created_at` en los últimos 6 días con `update public.movimientos set created_at = now() - interval '<n> days' where id = <id>`.

Run: `npx supabase db reset && docker exec supabase_db_Inventrix psql -U postgres -tAc "select tipo, motivo, count(*) from movimientos group by 1,2 order by 1,2"`
Expected: el reset termina sin error y aparecen filas `salida|venta`, `salida|caducidad`, `salida|dano` y `entrada|`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261011000002_dashboard.sql supabase/tests/10_dashboard.test.sql supabase/seed.sql
git commit -m "feat(db): dashboard_reportes con mas/menos vendido, punto de pedido y serie diaria"
```

---

### Task 3: Tipos generados, motivos de salida y tipo baja en la app

**Files:**
- Modify: `src/lib/database.types.ts` (regenerado)
- Create: `src/features/movimientos/motivos.ts`
- Modify: `src/features/movimientos/FormularioMovimiento.tsx:17-24`, `app/(app)/movimientos/index.tsx` (mapa de motivos), `src/features/reportes/excel.ts:36-45`, `src/features/movimientos/calculo.ts:17` (`etiquetaMovimiento`), `src/features/movimientos/api.ts:43-56` (filtro), `src/lib/errores.ts`
- Test: `__tests__/movimientos/motivos.test.ts` (nuevo), `__tests__/movimientos/salida.test.tsx`, `__tests__/reportes/movimientos.test.ts`, `__tests__/reportes/excel.test.ts`, `__tests__/lib/errores.test.ts`

**Interfaces:**
- Consumes: esquema de las Tareas 1 y 2.
- Produces:
  - `export const MOTIVOS_SALIDA: readonly MotivoSalida[] = ["venta", "caducidad", "dano", "otros"]` y `export const ETIQUETAS_MOTIVO_SALIDA: Record<MotivoSalida, string>` en `src/features/movimientos/motivos.ts`.
  - `export type TipoMovimiento = Database["public"]["Enums"]["tipo_movimiento"]` en `src/features/movimientos/api.ts`.
  - `etiquetaMovimiento(tipo: TipoMovimiento, cantidad: number, unidad: Unidad): string`.

- [ ] **Step 1: Regenerar tipos**

Run: `npx supabase gen types typescript --local > src/lib/database.types.ts && npm run typecheck`
Expected: el archivo contiene `motivo_salida: "venta" | "caducidad" | "dano" | "otros"`, `motivo_baja`, `"baja"` en `tipo_movimiento` y `dashboard_reportes`; el typecheck falla en los archivos que aún usan `consumo_interno` (es lo que arreglan los pasos siguientes).

- [ ] **Step 2: Escribir las pruebas que fallan**

`__tests__/movimientos/motivos.test.ts`:
```ts
expect(MOTIVOS_SALIDA).toEqual(["venta", "caducidad", "dano", "otros"]);
expect(MOTIVOS_SALIDA.map((m) => ETIQUETAS_MOTIVO_SALIDA[m])).toEqual(["Venta", "Caducidad", "Daño", "Otros"]);
expect(etiquetaMovimiento("baja", 3, "unidad")).toMatch(/^Baja/);
```
`__tests__/movimientos/salida.test.tsx`: el formulario de salida muestra las opciones "Venta", "Caducidad", "Daño" y "Otros"; seleccionar "Daño" llama a la mutación con `motivo: "dano"` (reemplaza el caso de `consumo_interno`).
`__tests__/reportes/excel.test.ts`: una fila `{ tipo: "baja", motivo: null, ... }` produce `Tipo = "Baja"` y `Motivo = ""`; una con `motivo: "dano"` produce `Motivo = "Daño"`.
`__tests__/reportes/movimientos.test.ts`: cambiar el fixture `consumo_interno` por `caducidad`.
Historial: en la prueba de `listarHistorial` (o una nueva en `__tests__/movimientos/`), con `tipo: "salida"` la consulta usa `.in("tipo", ["salida", "baja"])`.
`__tests__/lib/errores.test.ts`: la lista de códigos incluye `DETALLE_REQUERIDO` y `RANGO_INVALIDO` y ya no `TIENE_EXISTENCIAS`.

- [ ] **Step 3: Correr y ver que fallan**

Run: `npm test -- __tests__/movimientos __tests__/reportes __tests__/lib/errores.test.ts`
Expected: FAIL por `motivos.ts` inexistente y por las etiquetas/filtro viejos.

- [ ] **Step 4: Implementar**

- `motivos.ts` con las constantes de Interfaces; `FormularioMovimiento`, el historial (`app/(app)/movimientos/index.tsx`) y `excel.ts` importan `ETIQUETAS_MOTIVO_SALIDA` en lugar de su mapa propio. En `excel.ts` el tipo de la fila usa `MotivoSalida | null` y `TipoMovimiento`, y el mapa de tipos agrega `baja: "Baja"`.
- `etiquetaMovimiento` acepta `TipoMovimiento`; para `"baja"` usa el prefijo "Baja" y el mismo formato de cantidad que la salida.
- `listarHistorial`: `tipo === "salida"` → `.in("tipo", ["salida", "baja"])`. El reporte de Excel "salidas" de `reportes/api.ts` no cambia (solo `salida`); las bajas salen en "historial".
- `errores.ts`: quitar `TIENE_EXISTENCIAS`; agregar `DETALLE_REQUERIDO: "Escribe el motivo de la baja."` y `RANGO_INVALIDO: "El periodo seleccionado no es válido."`.
- Donde el historial colorea por tipo, `"baja"` usa el mismo tono que `"salida"`.

- [ ] **Step 5: Verificar**

Run: `npm run typecheck && npm run lint && npm test`
Expected: 0 errores de tipos, lint limpio, todas las suites pasan. (La pantalla de baja puede fallar el typecheck por la firma nueva de `darBajaProducto`: si es así, este paso se cumple al terminar la Tarea 4; anotar en el reporte qué archivos quedaron con error.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/database.types.ts src/features/movimientos src/features/reportes/excel.ts "app/(app)/movimientos/index.tsx" src/lib/errores.ts __tests__/movimientos __tests__/reportes __tests__/lib/errores.test.ts
git commit -m "feat(app): motivos de salida nuevos, tipo baja en historial y Excel, errores nuevos"
```

---

### Task 4: Baja con motivo de lista en la app

**Files:**
- Create: `src/features/productos/motivosBaja.ts`
- Modify: `src/features/productos/api.ts:92-96`, `src/features/productos/hooks.ts:51-57`, `app/(app)/administracion/baja.tsx`
- Test: `__tests__/productos/baja.test.tsx` (nuevo)

**Interfaces:**
- Consumes: `database.types.ts` regenerado (Tarea 3); códigos `DETALLE_REQUERIDO` en `errores.ts`.
- Produces:
  - `export type MotivoBaja = Database["public"]["Enums"]["motivo_baja"]`, `export const MOTIVOS_BAJA: readonly MotivoBaja[] = ["descontinuado", "ya_no_se_vende", "error_registro", "otro"]`, `export const ETIQUETAS_MOTIVO_BAJA: Record<MotivoBaja, string>` en `motivosBaja.ts`.
  - `darBajaProducto(id: string, motivo: MotivoBaja, detalle?: string): Promise<Producto>` (envía `p_detalle` solo si viene).
  - `useDarBajaProducto()` con `mutationFn: (v: { id: string; motivo: MotivoBaja; detalle?: string })`.

- [ ] **Step 1: Escribir `__tests__/productos/baja.test.tsx`** (mockear los hooks como en `__tests__/productos/editar.test.tsx`)

Casos:
- Con un producto seleccionado, se muestran las opciones "Descontinuado", "Ya no se vende", "Error de registro" y "Otro".
- El campo "Detalle" no aparece hasta elegir "Otro"; con "Otro" y detalle vacío, el botón de confirmar está deshabilitado.
- Con existencias 12 (unidad), se muestra el texto `Este producto aún tiene 12 unidades; quedarán en cero.` antes de confirmar (usar `formatearCantidad` para la cantidad con unidad) y el botón no está bloqueado.
- Confirmar con "Descontinuado" llama a la mutación con `{ id, motivo: "descontinuado" }`; con "Otro" y "Cerró el proveedor" llama con `{ id, motivo: "otro", detalle: "Cerró el proveedor" }`.

- [ ] **Step 2: Correr y ver que falla**

Run: `npm test -- __tests__/productos/baja.test.tsx`
Expected: FAIL (la pantalla actual usa texto libre y bloquea con existencias).

- [ ] **Step 3: Implementar** `motivosBaja.ts`, la API y el hook de Interfaces, y adaptar `baja.tsx`: reemplazar el campo de texto libre por un selector de los cuatro motivos (mismo patrón visual que el selector de motivos de `FormularioMovimiento`), campo "Detalle" (máx. 200 caracteres) solo con "Otro", quitar el bloqueo por existencias y mostrar la advertencia del Step 1. No rediseñar el resto de la pantalla.

- [ ] **Step 4: Verificar**

Run: `npm run typecheck && npm run lint && npm test`
Expected: 0 errores, lint limpio, todas las suites pasan.

- [ ] **Step 5: Commit**

```bash
git add src/features/productos "app/(app)/administracion/baja.tsx" __tests__/productos/baja.test.tsx
git commit -m "feat(app): baja con motivo de lista y advertencia de existencias"
```

---

### Task 5: Capa de datos del dashboard

**Files:**
- Create: `src/features/reportes/dashboard.ts`, `src/features/reportes/hooks.ts`
- Modify: `src/features/reportes/api.ts`
- Test: `__tests__/reportes/dashboard.test.ts`, `__tests__/reportes/useDashboard.test.tsx`

**Interfaces:**
- Consumes: RPC `dashboard_reportes` (Tarea 2) en los tipos regenerados (Tarea 3).
- Produces:
  - En `dashboard.ts`: `export type PeriodoDashboard = "7d" | "30d" | "mes"`; `export function rangoDePeriodo(periodo: PeriodoDashboard, hoy: Date): { desde: string; hasta: string }` (fechas `YYYY-MM-DD` en hora local del dispositivo, `hasta` = hoy, inclusivo); tipos `ProductoVendido = { productoId: string; nombre: string; unidad: Unidad; cantidad: number }`, `PuntoSerie = { fecha: string; entradas: number; salidas: number }`, `Dashboard = { masVendido: ProductoVendido | null; menosVendido: ProductoVendido | null; enPuntoPedido: number; totalMovimientos: number; serie: PuntoSerie[] }`; `export function aDashboard(json: unknown): Dashboard` (convierte claves snake_case y numéricos con `Number`).
  - En `api.ts`: `obtenerDashboard(desde: string, hasta: string): Promise<Dashboard>`.
  - En `hooks.ts`: `useDashboard(periodo: PeriodoDashboard)` con `queryKey: ["dashboard", periodo, desde, hasta]`.

- [ ] **Step 1: Escribir las pruebas que fallan**

`dashboard.test.ts`:
```ts
expect(rangoDePeriodo("7d", new Date(2026, 9, 11))).toEqual({ desde: "2026-10-05", hasta: "2026-10-11" });
expect(rangoDePeriodo("30d", new Date(2026, 9, 11))).toEqual({ desde: "2026-09-12", hasta: "2026-10-11" });
expect(rangoDePeriodo("mes", new Date(2026, 9, 11))).toEqual({ desde: "2026-10-01", hasta: "2026-10-11" });
expect(rangoDePeriodo("mes", new Date(2026, 9, 1))).toEqual({ desde: "2026-10-01", hasta: "2026-10-01" });
expect(rangoDePeriodo("7d", new Date(2027, 0, 3))).toEqual({ desde: "2026-12-28", hasta: "2027-01-03" });
expect(aDashboard({ mas_vendido: { producto_id: "p1", nombre: "Arroz", unidad: "libra", cantidad: "42.50" }, menos_vendido: null,
  en_punto_pedido: 3, total_movimientos: 57, serie: [{ fecha: "2026-10-05", entradas: 4, salidas: 9 }] }))
  .toEqual({ masVendido: { productoId: "p1", nombre: "Arroz", unidad: "libra", cantidad: 42.5 }, menosVendido: null,
    enPuntoPedido: 3, totalMovimientos: 57, serie: [{ fecha: "2026-10-05", entradas: 4, salidas: 9 }] });
```
`useDashboard.test.tsx`: con `supabase.rpc` mockeado y `jest.useFakeTimers({ now: new Date(2026, 9, 11) })`, `useDashboard("7d")` llama a `rpc("dashboard_reportes", { p_desde: "2026-10-05", p_hasta: "2026-10-11" })` y devuelve el `Dashboard` convertido; si el RPC devuelve error, el hook queda en `isError`.

- [ ] **Step 2: Correr y ver que fallan**

Run: `npm test -- __tests__/reportes/dashboard.test.ts __tests__/reportes/useDashboard.test.tsx`
Expected: FAIL por módulos inexistentes.

- [ ] **Step 3: Implementar** lo de Interfaces. `rangoDePeriodo` formatea con los componentes locales de `Date` (no `toISOString`, que usa UTC).

- [ ] **Step 4: Verificar**

Run: `npm run typecheck && npm run lint && npm test`
Expected: 0 errores, lint limpio, todas las suites pasan.

- [ ] **Step 5: Commit**

```bash
git add src/features/reportes __tests__/reportes/dashboard.test.ts __tests__/reportes/useDashboard.test.tsx
git commit -m "feat(app): useDashboard y rangos de periodo del dashboard de reportes"
```
