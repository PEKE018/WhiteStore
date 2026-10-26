# Tienda White Label

Tienda online de catálogo para mostrar productos, gestionar un carrito y recibir pedidos por WhatsApp. Incluye un panel administrativo local para personalizar el negocio y administrar productos y categorías.

## Características

- Catálogo con categorías, búsqueda y orden por precio o nombre.
- Filtros para mostrar promociones y productos destacados.
- Carrito con cantidades y cálculo del total.
- Formulario de pedido con datos del cliente, modalidad de entrega y método de pago.
- Envío del pedido a WhatsApp mediante un mensaje preparado para que el cliente lo revise y lo envíe manualmente.
- Panel administrativo para editar productos, categorías y configuración visual de la tienda.
- Importación y exportación de los datos del catálogo en formato JSON.
- Diseño adaptable a pantallas móviles y de escritorio.

## Requisitos

Un navegador web moderno. El proyecto no requiere instalar dependencias ni utilizar un proceso de compilación.

## Cómo ejecutar

1. Descarga o clona el proyecto.
2. Abre `index.html` en un navegador. También puedes servir la carpeta con una extensión como Live Server en Visual Studio Code.
3. Para empezar a personalizar la tienda, selecciona **Panel Administrativo** al pie de la página.

Los archivos del sitio deben permanecer juntos:

| Archivo | Descripción |
| --- | --- |
| `index.html` | Estructura de la tienda, formularios y ventanas modales. |
| `styles.css` | Estilos y diseño adaptable. |
| `script.js` | Catálogo de demostración, lógica del carrito, administración y pedidos. |

## Configuración inicial

En **Panel Administrativo → Configuración**, puedes cambiar el nombre y la descripción del negocio, el número de WhatsApp, la moneda, los colores, la tipografía y el estilo de los bordes.

Configura el teléfono con código de país y solo números, sin `+`, espacios ni guiones (por ejemplo, `5491112345678`). Si el número no es válido, no se podrá generar el enlace al pedido.

En las pestañas **Productos** y **Categorías** puedes adaptar el catálogo. Los productos de demostración se cargan automáticamente la primera vez que se abre la tienda.

## Datos y pedidos

La configuración, las categorías, los productos y el carrito se guardan en el `localStorage` del navegador. Esto significa que los cambios son locales al navegador y al dispositivo: no se sincronizan entre usuarios ni se almacenan en un servidor.

Usa **Panel Administrativo → Datos** para exportar una copia JSON o importar una copia existente. **Restaurar Datos de Demostración** elimina los datos locales de la tienda y vuelve a cargar los valores de ejemplo.

Al finalizar una compra, la tienda abre WhatsApp con el detalle del pedido. El cliente debe enviar el mensaje manualmente; la aplicación no recibe confirmación de envío ni procesa pagos.

## Seguridad y alcance

El panel administrativo es únicamente para demostraciones o uso local: no tiene autenticación y los datos guardados en el navegador pueden ser modificados por quien tenga acceso a él. Esta versión no incluye backend, gestión centralizada de pedidos ni procesamiento de pagos, por lo que no debe considerarse una plataforma de producción segura.
