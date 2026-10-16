# Configuración de servicios de Inventrix

Estado: la parte local (Supabase local, `eas.json`, `.env`) ya está lista. Los pasos siguientes requieren tus cuentas y se hacen en este orden. Todos los comandos usan `npx` (las CLIs son devDependencies).

## 0. Desarrollo local (ya configurado)

```
npx supabase start     # requiere Docker Desktop
npx supabase status    # URL y claves locales
```

- `.env` (raíz, no versionado): `EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:54321` (el emulador Android ve el PC como `10.0.2.2`). En un teléfono físico usa la IP LAN del PC, p. ej. `http://192.168.1.50:54321`.
- `supabase/functions/.env` (no versionado): copia de `.env.example` con la service_role local.
- Verifica: `npx supabase status` muestra API URL `http://127.0.0.1:54321`.

## 1. Iniciar sesión
```
npx supabase login
npx eas-cli login
```
Verifica: `npx eas-cli whoami` muestra tu usuario; `npx supabase projects list` funciona.

## 2. Proyecto Supabase remoto `inventrix-dev`
1. Créalo en https://supabase.com/dashboard (región más cercana a los usuarios) y guarda la contraseña de la BD.
2. Enlázalo y publica:
```
npx supabase link --project-ref <ref>
npx supabase config push
npx supabase db push
npx supabase functions deploy
```
   `db push` NO aplica los ajustes de auth de `config.toml`; `config push` los envia al proyecto remoto (registro publico desactivado, sin confirmacion de email, `site_url` y redirect `inventrix://`). Alternativa manual en el dashboard (Authentication): desactivar "Allow new users to sign up", desactivar "Confirm email", Site URL = `inventrix://` y agregar `inventrix://` en Redirect URLs.
   Verifica: en el dashboard (Authentication > Sign In / Providers y URL Configuration) el registro de nuevos usuarios aparece desactivado, Site URL es `inventrix://` y la lista de redirect incluye `inventrix://`.
3. Secretos de las funciones:
```
npx supabase secrets set ANTHROPIC_API_KEY=<clave> ANTHROPIC_MODEL=claude-opus-5-5 WEBHOOK_SECRET=<cadena-aleatoria>
```
Despliega el chatbot (mantiene la verificacion JWT activa, la app lo llama con el token del usuario):
```
npx supabase functions deploy soporte-chat
```
(`ANTHROPIC_API_KEY` se crea en console.anthropic.com; hasta entonces el chatbot responde "no configurado" y ofrece WhatsApp.)
4. Pon la URL y la anon key remotas en `.env` (Settings > API) para builds contra remoto.

Verifica: `npx supabase projects list` muestra `inventrix-dev`; `npx supabase secrets list` lista los tres secretos; `npx supabase functions list` muestra las funciones desplegadas.

## 3. Proyecto EAS
```
npx eas-cli init
```
Guarda `extra.eas.projectId` en `app.json`. Verifica: `npx eas-cli project:info` muestra el `projectId`.

## 4. Firebase y notificaciones push (FCM v1)
1. Crea un proyecto Firebase y una app Android con paquete `app.inventrix`.
2. Descarga `google-services.json` a la raíz (está en `.gitignore`).
3. En `app.json` agrega `android.googleServicesFile: "./google-services.json"`.
4. Crea una clave de cuenta de servicio (Firebase > Configuración > Cuentas de servicio) y súbela:
```
npx eas-cli credentials
```
(Android > Push Notifications: Manage your FCM V1 service account key).

Verifica: `eas credentials` muestra la clave FCM v1 asociada.

## 4b. Webhook de alertas (push de reabastecimiento)
El trigger `alertas_notificar` llama a la Edge Function `notificar-alerta` usando dos secretos de Supabase Vault (no se guardan en git). Si faltan, no hace nada.

1. Elige un valor aleatorio largo para `WEBHOOK_SECRET` y despliega la función con el mismo valor:
```
npx supabase secrets set WEBHOOK_SECRET=<valor>
npx supabase functions deploy notificar-alerta
```
`supabase/config.toml` ya declara `[functions.notificar-alerta] verify_jwt = false` (el trigger solo envía `x-webhook-secret`, sin JWT), así que un `supabase functions deploy` normal conserva el ajuste. Por si acaso, también puedes añadir `--no-verify-jwt`.
2. En el SQL Editor del proyecto remoto crea los dos secretos de Vault (mismo valor):
```sql
select vault.create_secret('https://<ref>.supabase.co/functions/v1/notificar-alerta', 'notificar_alerta_url');
select vault.create_secret('<valor>', 'webhook_secret');
```
Verifica: `select name from vault.decrypted_secrets;` lista ambos nombres; una salida que cruza el punto de pedido genera una notificación en el teléfono del admin.

## 5. Primer administrador
```
npx tsx --env-file=.env scripts/crear-admin.ts <usuario> <nombre> <password>
```
Requiere `SUPABASE_URL` (o `EXPO_PUBLIC_SUPABASE_URL`) y `SUPABASE_SERVICE_ROLE_KEY` del entorno destino. Verifica: puedes iniciar sesión en la app con ese usuario.

Las demás cuentas se crean desde la app, en Administración > Usuarios (Edge Function `admin-usuarios`, que debe estar desplegada).

## 6. Ingesta de manuales remota
Carga los manuales (`docs/manuales/*.md`) como fragmentos con embeddings en la tabla `manual_fragmentos` del proyecto remoto. Requiere haber aplicado la migración `20261010000008_manuales.sql` (`npx supabase db push`) y poner en `.env` `SUPABASE_URL` (o `EXPO_PUBLIC_SUPABASE_URL`) y `SUPABASE_SERVICE_ROLE_KEY` del proyecto remoto (nunca se sube a git).
```
npx tsx --env-file=.env scripts/ingestar-manuales.ts
```
La primera vez descarga el modelo `Supabase/gte-small` (~35 MB). El script borra e inserta los fragmentos por perfil, así que se puede repetir cada vez que cambien los manuales. (`@huggingface/transformers` es solo devDependency; no entra en la APK.)

Verifica en el SQL Editor: `select perfil, count(*) from manual_fragmentos group by 1;` muestra `admin` y `operativo`.

## 7. Builds
```
npx eas-cli build --profile development --platform android
npx eas-cli build --profile preview --platform android
```
Verifica: `npx eas-cli build:list` muestra el APK terminado; instálalo en el teléfono desde el enlace.

## Pendiente de verificar (necesita usuario/dispositivo)
- `supabase projects list` / `eas project:info` con el proyecto real.
- Recepción de push en dispositivo físico, builds EAS y pruebas manuales (ver `docs/qa/checklist-funcional.md`).
