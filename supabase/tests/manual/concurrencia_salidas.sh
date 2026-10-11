#!/usr/bin/env bash
# Prueba manual (no CI): dos sesiones compiten por las últimas 5 unidades de un producto.
# La sesión A toma el bloqueo de fila y espera 3 s antes de confirmar; la sesión B pide
# la misma salida mientras tanto. Con el bloqueo, B espera a A y luego falla con
# EXISTENCIAS_INSUFICIENTES; las existencias terminan en 0, nunca negativas.
# Uso: bash supabase/tests/manual/concurrencia_salidas.sh  (requiere `npx supabase start`)
set -euo pipefail

DB="${DB_CONTAINER:-supabase_db_Inventrix}"
psql_db() { docker exec -i "$DB" psql -U postgres -d postgres -X -q -v ON_ERROR_STOP=1 "$@"; }

USUARIO_ID=$(psql_db -tA <<'SQL'
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'concurrencia@usuarios.inventrix.app',
        '{"usuario":"concurrencia","nombre":"concurrencia","rol":"operativo"}')
returning id;
SQL
)
PRODUCTO_ID=$(psql_db -tA -c \
  "insert into public.productos (nombre, codigo, unidad, existencias, punto_pedido)
   values ('Concurrencia', 'CONC-1', 'unidad', 5, 0) returning id;")

limpiar() {
  psql_db -c "delete from public.alertas where producto_id = '$PRODUCTO_ID';
              delete from public.movimientos where producto_id = '$PRODUCTO_ID';
              delete from public.productos where id = '$PRODUCTO_ID';
              delete from auth.users where id = '$USUARIO_ID';" >/dev/null
}
LOG_A=$(mktemp); LOG_B=$(mktemp)
trap 'limpiar; rm -f "$LOG_A" "$LOG_B"' EXIT

sesion() { # $1 = segundos de espera antes de confirmar
  psql_db <<SQL
begin;
select set_config('request.jwt.claims', '{"sub":"$USUARIO_ID","role":"authenticated"}', true);
set local role authenticated;
select clock_timestamp()::time as inicio, existencias_antes, existencias_despues
  from public.registrar_movimiento('$PRODUCTO_ID', 'salida', 5, 'venta');
select pg_sleep($1);
commit;
SQL
}

sesion 3 > "$LOG_A" 2>&1 &
PID_A=$!
sleep 1
set +e
sesion 0 > "$LOG_B" 2>&1
ESTADO_B=$?
wait $PID_A
ESTADO_A=$?
set -e

echo "== Sesion A (exit $ESTADO_A) =="; cat "$LOG_A"
echo "== Sesion B (exit $ESTADO_B) =="; cat "$LOG_B"
FINAL=$(psql_db -tA -c "select existencias from public.productos where id = '$PRODUCTO_ID';")
SALIDAS=$(psql_db -tA -c "select count(*) from public.movimientos where producto_id = '$PRODUCTO_ID';")
echo "Existencias finales: $FINAL | movimientos registrados: $SALIDAS"

if [ "$ESTADO_A" -eq 0 ] && [ "$ESTADO_B" -ne 0 ] && grep -q EXISTENCIAS_INSUFICIENTES "$LOG_B" \
   && [ "$FINAL" = "0.00" ] && [ "$SALIDAS" = "1" ]; then
  echo "OK: la segunda salida esperó el bloqueo y fue rechazada"
else
  echo "FALLO: comportamiento concurrente inesperado"; exit 1
fi
