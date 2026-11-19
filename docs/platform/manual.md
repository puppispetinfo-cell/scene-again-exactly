# Manual administrativo

## Propiedades

1. Abrir Propiedades y elegir **Nueva propiedad**.
2. Arrastrar fotos al formulario o elegir varios archivos. Las miniaturas aparecen inmediatamente; se procesa un máximo de dos cargas simultáneas. Las imágenes pasan por Storage privado y se verifican/optimizan en servidor. No se admiten SVG, ejecutables, animaciones ni formatos no aprobados. Videos nuevos no están habilitados.
3. Reordenar con arrastre o botones; la primera imagen es la principal. Editar ALT en cada miniatura. La opción secundaria permite reutilizar imágenes existentes.
4. Completar título, tipo, operación, provincia/localidad, descripción y precio. El código se genera automáticamente y es único. Los estados comercial y editorial son independientes. La dirección exacta se oculta por defecto.
5. Revisar las sugerencias SEO. La URL, title, descripción y opciones de compartir se pueden editar. Las ediciones manuales no se reemplazan automáticamente.
6. Guardar borrador o publicar. Se admiten borradores incompletos; publicar exige los campos mínimos y referencias válidas.

Un precio desconocido se representa con `null` y “Precio a consultar”, nunca con cero. No se convierten monedas. Retirar una ficha la quita del catálogo público y prepara el estado 410.

## Constructor visual

Elegir una página y un elemento del diseño existente. Cambiar textos, botones o fotos. Mobile hereda la configuración compartida; Restablecer mobile elimina sus cambios particulares. Las escenas conservan un único sticky stage y su coreografía; no se ofrece un constructor de animaciones o HTML.

Destacadas y novedades permiten selección automática o referencias a propiedades del catálogo, en orden de selección. No se duplican inmuebles. Los tipos visibles en Inicio se eligen de los catálogos.

**Guardar → Previsualizar → Publicar**. El preview abre la ruta real de React con el borrador guardado. Es privado, requiere la sesión del administrador y vence a los diez minutos. El panel muestra una representación del elemento; esa representación no se presenta como el render completo. Salir de preview elimina su cookie.

El historial permite recuperar versiones como borrador. Restaurar no publica automáticamente. Un conflicto de edición rechaza el guardado y conserva lo escrito en pantalla: no sobrescribir otra versión sin revisar.

## Configuración

Marca y contacto contiene identidad, WhatsApp, menú, filtros, colores y datos institucionales. Equipo agrupa los registros de integrantes, con cargo, biografía y foto opcionales. No completar información personal no confirmada.

El enlace de temporarios inicial es `https://www.tempohogar.com.ar/` y permanece editable.

Catálogos y filtros permite agregar tipos, operaciones y atributos con su tipo de dato. Las URLs de categorías ya creadas se mantienen estables al cambiar etiquetas. No se permite desactivar referencias usadas por una propiedad publicada.

## Consultas y formularios

Los formularios iniciales permanecen desactivados. Primero revisar y publicar la política de privacidad; después seleccionarla en cada formulario, configurar campos y marcar la aprobación correspondiente. Sin política publicada y consentimiento no se almacena la consulta.

La bandeja muestra consultas persistidas, permite seguimiento, notas y contacto. La exportación CSV requiere rol de propietario, protege celdas interpretables como fórmulas y está acotada a 500 registros por descarga. Búsqueda y filtro del listado actual son por página; una búsqueda global requiere ampliar ese módulo.

Abrir WhatsApp prepara un mensaje, no demuestra su envío. Las notificaciones por email no están configuradas. Calendly permanece deshabilitado.

## Marketing

Elegir un modo: gestor de etiquetas o carga directa. No se cargan ambas vías. Los IDs se validan y las integraciones parten desactivadas. Las etiquetas no esenciales requieren consentimiento; cambiar preferencias permite revocarlo.

`generate_lead` corresponde exclusivamente a una consulta almacenada y confirmada por la base. Un clic en WhatsApp sigue siendo `whatsapp_click`. No se emiten reservas confirmadas sin un proveedor real.

Los IDs guardados no prueban envíos: la verificación con DebugView, Tag Assistant y Events Manager está pendiente de disponer de identificadores y configuración autorizados.
