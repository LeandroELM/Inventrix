# Checklist de QA funcional (v0.1.0-funcional)

Usuarios de prueba (seed): **Administrador** `ana.lopez` (Tipo A) y **Operativo** `carlos.m` (Tipo B).
Recorrer cada fila con ambos roles, en un APK `preview` contra el proyecto remoto. Registrar fallas como issues.
Referencia de requisitos: `docs/superpowers/specs/2026-10-10-inventrix-design.md`.

## Requisitos funcionales

- [ ] **RF-01 Login y sesión.**
  - Admin: ingresar `ana.lopez` con su contraseña, cerrar y reabrir la app, luego Configuración > Cerrar sesión. Esperado: entra; la sesión persiste al reabrir; al cerrar vuelve al login. Con contraseña errónea muestra "No fue posible iniciar sesión. Verifica tus datos." (mismo mensaje con usuario inexistente).
  - Operativo: igual con `carlos.m`. Esperado: mismo comportamiento.
- [ ] **RF-02 Inicio.**
  - Admin: abrir Inicio. Esperado: productos activos, productos en punto de pedido, existencias por unidad (sin sumar unidades distintas), próximos a agotarse y movimientos recientes.
  - Operativo: abrir Inicio. Esperado: solo productos activos, existencias por unidad y movimientos recientes; no aparecen "en punto de pedido" ni "próximos a agotarse".
- [ ] **RF-03 Navegación por rol.**
  - Admin: observar la barra inferior. Esperado: 5 tabs, incluido "+" (Nuevo).
  - Operativo: observar la barra inferior. Esperado: 4 tabs, sin "+".
- [ ] **RF-04 Existencias.**
  - Admin: Administración > Existencias; buscar "arr" por nombre y por código; escanear un código; filtrar por estado; exportar Excel. Esperado: lista filtrada, estado Disponible/Bajo/Sin existencias correcto, el Excel se comparte y abre.
  - Operativo: mismas acciones. Esperado: mismo resultado.
- [ ] **RF-04b Ficha de producto.**
  - Admin: abrir un producto y editar nombre/punto de pedido. Esperado: se guarda y se refleja en la lista.
  - Operativo: abrir un producto. Esperado: solo lectura; no hay opción de editar.
- [ ] **RF-05 Nuevo producto.**
  - Admin: tab "+", completar nombre, unidad, código único, cantidad inicial y punto de pedido, revisar y confirmar. Esperado: se crea con movimiento inicial; un código repetido muestra "Ya existe un producto con ese código."
  - Operativo: buscar la opción. Esperado: no disponible (sin tab "+", y la ruta directa lo bloquea).
- [ ] **RF-06 Registrar entrada.**
  - Admin: Movimientos > Entrada, elegir producto, cantidad 5. Esperado: muestra existencias proyectadas y al confirmar suben 5; cantidad 0 o negativa se rechaza.
  - Operativo: igual. Esperado: mismo resultado.
- [ ] **RF-07 Registrar salida.**
  - Admin: Movimientos > Salida, producto, motivo (venta / consumo interno / retiro autorizado), cantidad válida; luego una mayor a las existencias. Esperado: la válida descuenta; la excesiva muestra "La cantidad supera las existencias disponibles."; sin motivo no permite continuar.
  - Operativo: igual. Esperado: mismo resultado.
- [ ] **RF-08 Alerta y push.**
  - Admin: con otro usuario, registrar una salida que deje un producto en o bajo su punto de pedido; observar el teléfono del admin. Esperado: llega push y tocarla abre "Productos a pedir"; aparece en la campana de Inicio y en Notificaciones.
  - Operativo: registrar esa salida. Esperado: no recibe push, no ve campana ni lista de alertas.
- [ ] **RF-09 Productos a pedir.**
  - Admin: Administración > Productos a pedir. Esperado: lista de productos en o bajo el punto de pedido; indica que no se generan órdenes de compra.
  - Operativo: buscar la pantalla. Esperado: no disponible (acceso bloqueado).
- [ ] **RF-10 Historial.**
  - Admin: Movimientos > Historial, filtrar Todos / Entradas / Salidas, abrir un detalle. Esperado: filtros correctos; detalle con usuario, fecha, motivo, existencias antes y después.
  - Operativo: igual. Esperado: mismo resultado.
- [ ] **RF-11 Reportes.**
  - Admin: Administración > Reportes; generar existencias, a pedir, entradas, salidas e historial con filtro de fechas y producto; exportar Excel. Esperado: datos coherentes con los filtros y archivo Excel abrible.
  - Operativo: buscar Reportes. Esperado: no disponible.
- [ ] **RF-12 Dar de baja.**
  - Admin: dar de baja un producto con existencias; luego regularizar a 0 (salida "retiro autorizado") y repetir con motivo y confirmación. Esperado: con existencias se bloquea con "No se puede dar de baja un producto que aún tiene existencias."; con 0 se da de baja y el historial se conserva.
  - Operativo: buscar la opción. Esperado: no disponible.
- [ ] **RF-13 Configuración.**
  - Admin: Configuración. Esperado: Mi cuenta (nombre, usuario, rol), cambio de contraseña (7 caracteres muestra "La contraseña debe tener al menos 8 caracteres."; confirmación distinta se rechaza; válida cambia y permite reingresar), Notificaciones (estado del permiso y "Reintentar registro"), Apariencia (Claro/Oscuro/Sistema persiste al reabrir), Soporte técnico, Cerrar sesión.
  - Operativo: igual. Esperado: mismas secciones excepto Notificaciones, que no aparece.
- [ ] **RF-14 Chatbot y WhatsApp.**
  - Admin: botón "?" > preguntar "¿Cómo genero un reporte?"; pedir al bot que modifique inventario; tocar "Contactar por WhatsApp". Esperado: responde según los manuales (incluye temas de admin), declina modificar inventario, abre WhatsApp con el mensaje predeterminado.
  - Operativo: preguntar "¿Cómo genero un reporte?". Esperado: responde solo con funciones de su rol (no explica funciones de admin); WhatsApp igual que admin.

## Verificaciones pendientes en dispositivo / remoto

Pasos "Step 5" omitidos en las tareas 13 a 25 por requerir teléfono, cuenta remota o clave.

- [ ] Task 13: lista del seed, búsqueda "arr", hoja de compartir y apertura del Excel en Excel/Sheets.
- [ ] Task 14: escáner con código de barras EAN-13 y con QR; permiso de cámara; resultado abre/busca el producto.
- [ ] Task 15: alta de producto completa y baja con motivo en teléfono real (incluye pasar el código escaneado a Nuevo producto).
- [ ] Task 16: salida concurrente desde dos teléfonos sobre el mismo producto; la segunda que exceda las existencias es rechazada y las existencias finales son consistentes.
- [ ] Task 17: filtros del historial y scroll infinito con más de 30 movimientos.
- [ ] Task 18: Inicio con usuarios del seed (admin y operativo) en teléfono.
- [ ] Task 19: registro real del token push (requiere projectId de EAS y credenciales FCM); cerrar sesión elimina el dispositivo del servidor; aplicar la migración al remoto (`db push`).
- [ ] Task 20: desplegar `notificar-alerta` con `--no-verify-jwt`, configurar secretos y secretos de Vault, y comprobar la ruta HTTP de pg_net con secretos presentes.
- [ ] Task 21: tocar la notificación con la app cerrada abre "Productos a pedir"; con la app en segundo plano y en primer plano; con sesión cerrada inicia sesión y luego navega.
- [ ] Task 22: reportes y exportaciones Excel en teléfono, y botón Escanear en los buscadores de movimiento y baja.
- [ ] Task 23: ejecutar la ingesta de manuales en el proyecto remoto (`docs/SETUP-SERVICIOS.md`, sección 6) y verificar fragmentos por rol.
- [ ] Task 24: desplegar la función del chatbot, configurar `ANTHROPIC_API_KEY` y `ANTHROPIC_MODEL`, y verificar con curl: respuesta 200 para admin y operativo, 401 sin sesión, y que el operativo no recibe contenido de admin.
- [ ] Task 25: ubicación del botón flotante "?" en el teléfono (sin tapar contenido ni la barra); abrir WhatsApp con el mensaje predeterminado y comportamiento sin número configurado (`EXPO_PUBLIC_SOPORTE_WHATSAPP`).
- [ ] Task 26: generar el APK (`eas build --profile preview --platform android`), instalarlo en 2 teléfonos (admin y operativo) contra el proyecto remoto, recorrer este checklist completo, y verificar CI verde en GitHub.
- [ ] Task 26: crear el tag `v0.1.0-funcional` tras pasar el checklist.
