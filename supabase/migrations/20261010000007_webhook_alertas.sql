-- Aviso push al insertar una alerta. La URL y el secreto viven en Supabase Vault
-- (no en git); si faltan, el trigger no hace nada y el insert nunca falla.

create extension if not exists pg_net with schema extensions;

create function public.notificar_alerta_nueva() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secreto text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'notificar_alerta_url';
  select decrypted_secret into v_secreto
  from vault.decrypted_secrets where name = 'webhook_secret';

  if v_url is null or v_secreto is null then
    return new;
  end if;

  begin
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('record', row_to_json(new)),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', v_secreto
      )
    );
  exception when others then
    -- Un fallo de notificación nunca debe revertir la salida de inventario.
    null;
  end;
  return new;
end $$;

revoke execute on function public.notificar_alerta_nueva() from public, anon, authenticated;

create trigger alertas_notificar
  after insert on public.alertas
  for each row execute function public.notificar_alerta_nueva();
