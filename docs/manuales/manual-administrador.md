# Manual del Administrador de Inventrix

Este manual explica, paso a paso, las funciones disponibles para el perfil Administrador (Tipo A). El Administrador puede registrar productos, editar sus datos, registrar entradas y salidas, ver reportes, dar de baja productos y recibir alertas de reabastecimiento.

## Iniciar sesión
1. Abre la aplicación Inventrix.
2. Escribe tu Usuario (no tu correo) y tu Contraseña.
3. Si quieres comprobar lo que escribiste, toca "Mostrar contraseña".
4. Toca "Iniciar sesión".

Si los datos no son correctos, la app muestra "No fue posible iniciar sesión. Verifica tus datos." Por seguridad no indica cuál de los dos datos falló. La sesión se mantiene en el teléfono; para salir, ve a Configuración y toca "Cerrar sesión".

## Navegar por la aplicación
La barra inferior tiene cinco secciones: Inicio, Administración, Nuevo, Movimientos y Configuración. En Inicio ves el resumen: productos activos, productos en punto de pedido, existencias por unidad, productos próximos a agotarse y movimientos recientes. Las existencias de unidades distintas (libras, cajas, etc.) nunca se suman entre sí.

## Registrar un producto nuevo
Solo el Administrador puede registrar productos nuevos.
1. Toca "Nuevo" en la barra inferior.
2. Completa Nombre, Unidad de medida, Código, Cantidad inicial y Punto de pedido. Puedes llenar el Código escaneándolo con la cámara.
3. Toca "Revisar".
4. Revisa la información. Si hay un error, toca "Editar información".
5. Toca "Confirmar registro".

Verás "Producto registrado correctamente". Si el código ya existe, la app muestra "Este código ya está registrado." y debes usar otro. Puedes tocar "Registrar otro" para continuar. La cantidad inicial queda guardada como un movimiento inicial en el historial.

## Editar los datos de un producto
1. Ve a Administración y toca "Existencias".
2. Busca el producto por nombre o código y ábrelo para ver su ficha.
3. Toca "Editar", cambia los datos maestros (por ejemplo el nombre o el punto de pedido) y guarda.

Las existencias no se editan directamente: solo cambian con entradas y salidas, para que el historial siempre sea fiel.

## Ver existencias
1. Ve a Administración y toca "Existencias".
2. Usa el campo "Buscar por nombre o código" o los filtros Todos, Disponible, Bajo y Sin existencias.
3. Cada producto muestra su estado: Disponible, Bajo inventario o Sin existencias.

## Registrar una entrada
Una entrada suma existencias, por ejemplo cuando llega mercancía del proveedor.
1. Ve a Movimientos y elige entrada.
2. Busca el producto por nombre o código, o escanéalo.
3. Escribe la cantidad (debe ser mayor que cero). La app muestra las existencias resultantes.
4. Toca "Registrar entrada".

Verás "Movimiento registrado". Puedes tocar "Registrar otro movimiento" para seguir.

## Registrar una salida
Una salida resta existencias.
1. Ve a Movimientos y elige salida.
2. Busca o escanea el producto.
3. Escribe la cantidad y elige el "Motivo de la salida": Venta, Consumo interno o Retiro autorizado.
4. Toca "Registrar salida".

Si la cantidad es mayor que lo que hay, la app muestra "La cantidad supera las existencias disponibles." y no permite registrar. Si olvidas el motivo, aparece "Debes indicar el motivo de la salida." Cuando la salida deja el producto en su punto de pedido o por debajo, la app avisa "El producto alcanzó su punto de pedido. Se notificó al administrador."

## Escanear un código
1. En cualquier búsqueda de producto toca la opción de escanear.
2. Acepta el permiso de cámara con "Permitir cámara" la primera vez.
3. Apunta al código de barras o QR. Si hay poca luz toca "Encender linterna".
4. La app abre el producto o la pantalla de la acción que elegiste.

Alternativas: "Escribir el código manualmente" y luego "Buscar", o "Leer desde imagen" para tomar el código de una foto de tu galería.

## Qué hacer si el código no se reconoce
Si ves "Producto no encontrado.":
1. Revisa que el código esté completo y sin daños; vuelve a enfocar o enciende la linterna.
2. Prueba "Escribir el código manualmente" o "Leer desde imagen". Si dice "No se encontró ningún código en la imagen.", usa una foto más nítida.
3. Busca el producto por nombre en la lista de Existencias.
4. Si el producto realmente no existe, regístralo desde Nuevo (la pantalla de escaneo te lleva ahí con el código ya cargado).

## Exportar a Excel
1. Ve a Administración y entra a Existencias (o a Reportes).
2. Aplica los filtros que necesites.
3. Toca "Exportar a Excel".
4. Elige dónde compartir o guardar el archivo (correo, WhatsApp, Drive, etc.).

El botón se desactiva si no hay registros para exportar.

## Productos a pedir
Esta pantalla lista los productos que alcanzaron su punto de pedido y necesitan reabastecerse.
1. Ve a Administración y toca "Productos a pedir". También puedes llegar desde "Ver todos" en Inicio o tocando una alerta.
2. Revisa la lista y toca un producto para ver su ficha.

Si no hay ninguno, la app indica "No hay productos en punto de pedido." Esta versión no genera órdenes de compra; úsala como lista de apoyo para tus pedidos.

## Reportes
1. Ve a Administración y toca "Reportes".
2. Elige el tipo: Existencias, A pedir, Entradas, Salidas o Historial.
3. En los reportes de movimientos elige el periodo: Hoy, 7 días, 30 días o Personalizado (con fechas Desde y Hasta).
4. Si quieres, toca "Filtrar por producto" para ver un solo producto y "Quitar filtro" para volver a todos.
5. Toca "Exportar a Excel" para guardar el reporte.

## Historial de movimientos
En Movimientos abre el historial. Filtra por Todos, Entradas o Salidas y busca por producto o código. Al abrir un movimiento ves el usuario que lo hizo, la fecha, el motivo y las existencias antes y después. El historial no se puede editar ni borrar.

## Dar de baja un producto
La baja saca un producto de uso sin perder su historial.
1. Ve a Administración y toca "Dar de baja producto".
2. Busca o escanea el producto.
3. Elige el "Motivo de la baja": Descontinuado, Registro duplicado u Otro (en este caso escribe el "Detalle del motivo").
4. Toca "Dar de baja" y confirma con "Confirmar baja". Puedes cancelar con "Cancelar".

Solo se puede dar de baja un producto con existencias en cero. Si aún tiene, la app muestra "Primero regulariza las existencias (registra una salida con motivo Retiro autorizado)." Toca "Regularizar", registra la salida por la cantidad restante y vuelve a intentar la baja. Después de la baja el producto deja de aparecer en Existencias.

## Notificaciones
Cuando una salida lleva un producto a su punto de pedido, recibes una notificación en el teléfono.
1. Toca la notificación para abrir Productos a pedir.
2. Para ver todas las alertas, toca el ícono de alertas en Inicio.
3. Toca "Marcar todas como leídas" cuando las hayas revisado.

Para recibirlas, acepta el permiso de notificaciones de Android. Si no llegan, revisa que no esté desactivado en los ajustes del teléfono.

## Contactar soporte
Si tienes una duda o un problema, ve a Configuración, entra a Soporte y escribe tu pregunta en el chat de ayuda. El asistente responde con base en este manual; solo orienta y nunca modifica el inventario. Si necesitas hablar con una persona, usa el botón "Escribir por WhatsApp" para abrir una conversación con el equipo de soporte con un mensaje ya preparado.
