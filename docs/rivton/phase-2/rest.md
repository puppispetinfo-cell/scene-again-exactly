# REST efectiva — 0.2.0

Base: URL generada por WordPress rest_url('rivton-core/v1/'); con enlaces permanentes normalmente /wp-json/rivton-core/v1/. Contrato editorial completo y snapshot son proyecciones distintas. Todas las respuestas públicas contienen únicamente registros publicados; borradores, papelera, leads, propietario y auditoría no son públicos. Extensiones no registradas se redactan de salida pública.

| Recurso | Métodos y estado |
|---|---|
| snapshot | GET, schemaVersion 1 y revision; projection legacy de catálogo/settings/team/theme/filters; 503 sin imagen institucional, 413 >2MB/10k propiedades |
| configuration | GET, identidad/theme/menus/filtros/team/IDs de integraciones/chrome; menús ocultos omitidos |
| taxonomies | GET categorías/características publicadas y filtros |
| pages?slug= | GET página publicada por slug, 404 si no está publicada |
| properties | GET con limit 1..100, cursor opaco, filtros y orden; items y nextCursor |
| properties/{id} | GET publicada; 404 privada/inexistente, 410 archivada/retirada |
| admin/configuration | GET y PUT, capability y If-Match para escribir |
| admin/properties, pages, categories, features | GET listado (after, 100 por página), POST crear |
| admin/{colección}/{id} | GET y PATCH con permiso por recurso, If-Match |
| admin/{colección}/{id}/publish, archive, trash, duplicate | POST, If-Match y permisos; duplicación queda en borrador |
| admin/leads | GET; privados, paginados y autorizados |
| admin/leads/{id} | GET y PATCH state; sin envío de notificaciones |
| admin/audit | GET, after y máximo 100; sólo estate_view_audit |
| admin/insights | GET privado: 503 not_configured; no métricas inventadas |
| submissions | POST, 202 accepted + submissionId + notificationStatus:not_configured; no-store |
| webhooks/calendly, webhooks/revalidate | POST: 503 deshabilitados; no aceptan ni procesan eventos sin integración autorizada |

Publicación y duplicación se implementan por colección plural (`admin/properties/{id}/publish`). El patrón abstracto {resource} de Fase 1 se concreta así. La propiedad editorial mantiene type como familia legacy y añade propertyTypeId para un tipo configurable; categorías de tipo personalizado añaden legacyType. La proyección snapshot descarta opciones de tipo que el parser React antiguo no conoce y conserva el significado de sus claves; la configuración completa permite los tipos registrados para Fase 3.

Filtros públicos: operacion, tipo (familia o slug/ID de tipo configurado), ubicacion, precioMax, moneda, superficieMin (cubiertos, o terreno si no existe), dormitorios, banos, piscina, caracteristicas (array o JSON array de IDs), categoria (ID) y orden. Orden: recientes/precio-asc/precio-desc. Precios sin cotización quedan fuera de precioMax; moneda implícita USD para conservar el filtro aprobado. En orden mixto por precio se agrupa por moneda, sin conversión inventada. Un cursor inválido devuelve 400 y uno anterior a una revisión de catálogo devuelve 409 para reiniciar paginación.

Privados: sesión WordPress + X-WP-Nonce para mutaciones. No se implementa un flujo de Application Passwords para escrituras de navegador; cualquier acceso servidor futuro debe diseñarse explícitamente. If-Match es la ETag del GET de ese recurso (`"id:revision"`). 428 si falta, 412 si está obsoleta. Respuestas públicas ETag por revisión del contenido; If-None-Match produce 304. Borradores y leads no cambian la revisión pública; publicar/retirar/cambiar configuración invalida la caché/proyección.

Errores WordPress con code/message/data.status y requestId por HTTP. Validación usa 400/422, permisos 401/403, conflictos 409/412, tamaño 413 y tipo de contenido 415. Errores de runtime se convierten en 503 genérico y no exponen stack/SQL. Privados/errores/submissions usan no-store.

Submission v1 conserva los campos LeadSubmission y requiere formId contact o publish-property, honeypot vacío y consent.privacyRevision igual a `pageId:revision` de una página publicada incluida en site.legalPageIds. Los destinatarios no son parámetros públicos. Sólo se persiste; no se llama wp_mail ni se declara entregado. Se limita 5/min por IP y 20/h por IP/formulario; el WAF es un control adicional pendiente de infraestructura. La clave idempotente genera una identidad única de lead y rechaza un mismo UUID con payload distinto (409).

CORS: sólo origen de WordPress y dominio configurado para lecturas públicas/envío; sin credenciales CORS. Las rutas administrativas no habilitan acceso cross-origin. Origin es una señal antiabuso, no autenticación: se combina con validación, límites, consentimiento y claves idempotentes. Webhooks permanecen cerrados hasta tener verificación de firma/replay en su fase.
