-- Nuevo tipo de movimiento 'baja'. Va en su propia migracion porque un valor
-- nuevo de enum no puede usarse en la misma transaccion en que se agrega.
alter type public.tipo_movimiento add value if not exists 'baja';
