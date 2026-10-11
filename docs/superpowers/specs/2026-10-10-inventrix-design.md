# Inventrix — Especificación técnica

Fuente funcional: `MANUAL DE FUNCIONES.docx` (descripción procedimental, perfiles Tipo A y Tipo B).
Prototipo visual: https://claude.ai/artifact/Y9hegvxitZ3nAEsyNSvJY5 (25 pantallas; se implementa en una fase de diseño posterior).

## Alcance de esta fase

Código, base de datos, servicios y lógica funcional completos con UI **funcional sin estilizar**. El diseño visual (paleta `#0B1C48` / `#92CF93` / `#E2EDDD`, estilo del prototipo) se aplica en una fase posterior sobre los mismos componentes.

## Plataforma y stack

- App **solo Android** (por ahora) con **Expo** (Expo Router, TypeScript estricto). Sin versión web.
- **Supabase**: Postgres + Auth + Edge Functions + pgvector. Sin Vercel.
- **EAS Build** para APK de desarrollo y de distribución interna.
- Chatbot: Edge Function → Claude API (`@anthropic-ai/sdk`), modelo configurable por variable `ANTHROPIC_MODEL`.
- Embeddings: modelo integrado de Supabase Edge Runtime `gte-small` (384 dimensiones), sin proveedor extra.

## Decisiones

1. **Un proyecto Supabase por cliente (PYME).** No hay multiempresa en el esquema (el manual describe una instalación por cliente).
2. **Login por "Usuario", no email.** Supabase Auth exige email: el usuario `ana.lopez` se guarda como `ana.lopez@usuarios.inventrix.app`. La app solo muestra/pide el nombre de usuario.
3. **Sin registro público.** Sign-up deshabilitado; cuentas creadas por el equipo (script inicial) o por un Administrador mediante Edge Function `admin-usuarios`.
4. **Toda escritura pasa por funciones SQL (RPC) `security definer`.** El rol `authenticated` solo tiene `SELECT` (con RLS); `INSERT/UPDATE/DELETE` revocados. Así las reglas (no negativos, historial inmutable, permisos por rol) viven en la BD y no se pueden saltar desde el cliente.
5. **Historial inmutable.** `movimientos` solo crece; nadie puede editar ni borrar.
6. **Baja lógica.** `productos.activo = false`; el historial se conserva. Solo si `existencias = 0`.
7. **Alertas**: se crean dentro de `registrar_movimiento` cuando una salida hace pasar existencias de `> punto_pedido` a `<= punto_pedido`. Un Database Webhook dispara la Edge Function `notificar-alerta`, que envía push (Expo Push API) a los dispositivos de los Administradores.
8. **"Regularizar existencias" antes de baja** = registrar una salida con motivo `retiro_autorizado` hasta dejar 0.
9. Sesión persistida en el dispositivo con `expo-secure-store`; el token se renueva automáticamente.

## Requerimientos funcionales (resumen, ver manual)

| ID | Requerimiento | A | B |
|---|---|---|---|
| RF-01 | Login usuario/contraseña, error genérico, sesión persistente, cerrar sesión | ✔ | ✔ |
| RF-02 | Inicio: productos activos, en punto de pedido (solo A), existencias por unidad (sin sumar unidades distintas), próximos a agotarse (solo A), movimientos recientes | ✔ | parcial |
| RF-03 | Navegación por rol (A: 5 tabs con "+"; B: 4 tabs) | ✔ | ✔ |
| RF-04 | Existencias: lista, búsqueda nombre/código, escaneo barras/QR, estado Disponible/Bajo/Sin, exportar Excel | ✔ | ✔ |
| RF-04b | Ficha de producto; editar datos maestros | ✔ edita | solo ver |
| RF-05 | Nuevo producto (nombre, unidad, código único, cantidad inicial, punto de pedido) + revisión + movimiento inicial | ✔ | ✘ |
| RF-06 | Registrar entrada (cantidad > 0, existencias proyectadas) | ✔ | ✔ |
| RF-07 | Registrar salida (motivo venta/consumo_interno/retiro_autorizado, no exceder existencias) | ✔ | ✔ |
| RF-08 | Alerta de reabastecimiento + push a Administradores; tocarla abre Productos a pedir | ✔ | ✘ |
| RF-09 | Productos a pedir (sin órdenes de compra) | ✔ | ✘ |
| RF-10 | Historial con filtros Todos/Entradas/Salidas y detalle (usuario, fecha, motivo, antes/después) | ✔ | ✔ |
| RF-11 | Reportes: existencias, a pedir, entradas, salidas, historial; filtros fecha/producto; Excel | ✔ | ✘ |
| RF-12 | Dar de baja con motivo y confirmación; bloqueada si hay existencias | ✔ | ✘ |
| RF-13 | Configuración: cuenta, notificaciones (solo A), apariencia, soporte, cerrar sesión | ✔ | ✔ |
| RF-14 | Chatbot RAG sobre manuales, respeta rol, no modifica inventario; derivación a WhatsApp con mensaje predeterminado | ✔ | ✔ |

Unidades: `unidad`, `libra`, `kilogramo`, `litro`, `caja`, `paquete` (abreviaturas: unid., lb, kg, L, cajas, paq.).

## Fuera de alcance

Órdenes de compra, registro público, versión web/escritorio, multiempresa, edición o borrado de movimientos.
