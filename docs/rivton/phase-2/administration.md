# Manual de administración

## Propiedades

Abrir Propiedades > Nueva Propiedades. Completar título y slug, descripción, código, operación, ubicación, superficies, dormitorios/baños, precio/moneda o precio a consultar, características y categorías. Guardar produce un borrador, no una publicación. ID y revisión son del servidor y no cambian al editar el slug.

Tipo de inmueble permite categorías configurables por ID. Los tipos nuevos requieren una familia compatible (casa/departamento/terreno/local/oficina) para mantener filtros y transporte legacy. El documento guarda propertyTypeId y categoryIds además de type (familia). El listado completo permite buscar por slug de tipo nuevo; el snapshot legacy conserva sus opciones conocidas, sin falsificar tipos ni romper URLs anteriores. El frontend de Fase 3 deberá usar el ID de tipo y el catálogo completo para las nuevas etiquetas.

En galería, Agregar crea un recurso estructurado. Elegir de la biblioteca permite seleccionar una imagen cargada en WordPress; revisar ALT, dimensiones y marca de imagen ilustrativa. La primera es la foto principal; Subir/Bajar cambia su orden. Publicar requiere título, slug y al menos una imagen. Duplicar crea otro ID y slug, siempre en borrador. Archivar retira la ficha y el endpoint público devuelve 410; Papelera la quita de lectura pública. Ningún agente puede publicar ni editar fichas ajenas.

Estados comerciales: disponible/published, reservada, vendida, alquilada, retirada. Son independientes del estado editorial de borrador/publicación/papelera. Destacada y orden son editables. WhatsApp admite dígitos, Calendly sólo HTTPS de calendly.com; no implica reserva ni activa webhooks.

## Configuración global

Identidad/contacto: nombre, logos/variante/favicon, idioma/monedas, dominio, dirección, teléfono, email, redes, pie y páginas legales aprobadas. Los campos opcionales se habilitan con Agregar y se desactivan explícitamente.

Tokens: colores admitidos, fuentes del catálogo de Fase 1 y pesos, escalas de texto/títulos/espacios, radios, ancho, blur, botones y colores por sección. Colores tienen muestra local para HEX; el servidor valida valores antes de guardar. Chrome contiene parámetros acotados de header, dock, menú y footer preparados para el mapeo de Fase 3. No hay entrada CSS libre ni URL arbitraria de fuentes.

Menús: hay ubicaciones header, mobile (hamburguesa), dock (inferior) y footer. Agregar elementos con ID estable, texto, destino local/HTTPS, icono permitido, visibilidad, orden y nueva pestaña. Los elementos ocultos se conservan para edición privada y se omiten de la configuración pública.

Filtros: clave URL, etiqueta, presentación compatible, opciones, orden y visibilidad. Los slugs venta/alquiler y familias legacy se conservan. Tipo puede referir a categorías nuevas registradas; los datos completos son para el consumidor de Fase 3 y el snapshot mantiene proyección compatible. No usar texto libre como ID de característica. Moneda no realiza conversiones ficticias.

Integraciones: sólo identificadores públicos y flags validados. No hay campos de token privado ni snippets. Las conversiones servidor no se habilitan en esta versión. El banner indica que los servicios externos y el frontend todavía no están conectados.

## Páginas y bloques

Editar una página existente o crear un borrador. Tipos permitidos: story, featured, categories, latest, banner, team, text, faq y lead-form. Cada bloque tiene contenido de texto plano, recursos, acciones, variante default/dark/glass, visibilidad, orden y configuración mobile/desktop. Subir/Bajar mantiene IDs y actualiza el orden persistido. Es una estructura extensible, no un editor visual drag-and-drop.

Los campos de contenido son claves y textos (por ejemplo title/body), nunca JSON libre, HTML o JS ejecutable. El tipo determina el renderer permitido que implementará Fase 3. Los bloques ocultos no se entregan al público. FAQ se carga con preguntas/respuestas reales; legales permanecen vacíos hasta revisión. No hay generador de contenido legal.

## Consultas y auditoría

Consultas muestra solicitudes de contacto/publicación y PII sólo a administradores y responsables comerciales autorizados. Estados: new, assigned, contacted, closed. Assigned es un estado; asignación fina a agentes y CRM corresponde a la fase funcional siguiente. Cambiar estado no envía email: el sistema indica not_configured.

El envío público exige una referencia aprobada a política de privacidad publicada y su revisión exacta `pageId:revision`, consentimiento, honeypot vacío, formId autorizado e idempotencyKey UUID. Una aceptación 202 confirma persistencia, no notificación ni conversión publicitaria.

Auditoría permite consultar actor, acción, recurso, revisión, estado y fecha UTC; no ofrece edición ni borrado y no almacena mensajes, emails ni secretos en ese registro. La inmutabilidad frente a administradores de base de datos requiere controles externos; no se promete un log a prueba de manipulación.

## Conflictos

Si otra persona guardó primero, la API devuelve 412. Recargar y revisar la nueva versión antes de reintentar; no hay sobrescritura forzada silenciosa. Las categorías/características referidas por propiedades publicadas no se archivan hasta retirar referencias. Un slug duplicado devuelve 409. La validación fallida muestra el campo o motivo y no se publica el documento inválido.
