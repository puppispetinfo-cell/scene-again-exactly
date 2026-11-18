# Contrato REST inicial RIVTON Core v1

Versión implementada actual: [REST adicional 0.3.0](visual-cms/api.md) sobre [REST 0.2.0](phase-2/rest.md).

Documento de diseño de Fase 1. Para los endpoints implementados, cuerpos, permisos, límites y diferencias vigentes consultar el [contrato REST de Fase 2](phase-2/rest.md). Las propuestas de este documento no habilitan integraciones pendientes. El adaptador recibe la URL completa por configuración; no concatena rutas supuestas ni depende de ACF.
Namespace propuesto `/wp-json/rivton-core/v1`. Versiones mayores incompatibles en namespace nuevo; cambios aditivos compatibles dentro de v1. Proyección snapshot validada por `snapshotSchema` más theme y filters; DTO editorial completo en `contracts.ts`.

| Acceso | Método/recurso propuesto | Respuesta / permiso |
|---|---|---|
| Público | GET /snapshot | schemaVersion:1, revision:string, properties:Property legacy[], settings:SiteSettings legacy, team:TeamInfo, theme?:ThemeSettings, filters?:SearchFilterDefinition[] |
| Público | GET /configuration | SiteSettings, ThemeSettings, NavigationMenu[], IntegrationSettings con IDs públicos solamente |
| Público | GET /pages?slug= | PageDefinition publicada o 404 |
| Público | GET /properties?cursor=&limit= | DTO Property comercial, cursor opaco, limit 1..100; filtros con claves URL legacy |
| Público | GET /properties/{stableId} | sólo inmueble autorizado, 404 inexistente, 410 retirado según política |
| Público | GET /taxonomies | PropertyCategory[], PropertyFeature[], SearchFilterDefinition[] |
| Privado | GET/PUT /admin/configuration | rivton_manage_settings; revisión esperada obligatoria |
| Privado | POST/PATCH /admin/pages, /admin/properties | rivton_edit_content / rivton_edit_properties; permiso por recurso |
| Privado | POST /admin/{resource}/{id}/publish | rivton_publish_content; validar referencias y campos antes de publicar |
| Privado | GET/PATCH /admin/leads/{id} | rivton_manage_leads; PII nunca pública |
| Privado | GET /admin/audit | rivton_view_audit; registro append-only |
| Privado | GET /admin/insights | rivton_view_insights; sólo APIs autorizadas, sin inventar métricas |
| Formulario | POST /submissions | LeadSubmission, 202 { submissionId,status:'accepted' }; aceptación no equivale a notificación entregada |
| Integración servidor | POST /webhooks/calendly | firma y replay check; confirmar eventos reales |
| Integración servidor | POST /webhooks/revalidate | HMAC, timestamp ±5min, nonce/event ID único; revision e IDs afectados |

## Snapshot compatible

`{schemaVersion:1,revision:'wp:42',properties:[],settings:{socials:[]},team:{title:'...',body:'...',image:{src:'https://cms.example/uploads/team.jpg',alt:'...'}}}`. Los textos del ejemplo no se publican. Theme omitido usa CSS aprobado; filtros omitidos usan defaults compatibles. Un array de propiedades vacío es un catálogo vacío real, no fallo. Falta de campos obligatorios o tipo inválido produce error; no completar precios, fechas o contactos ficticios. Para preservar fechas de la base la proyección publishedAt usa YYYY-MM-DD; el DTO editorial guarda updatedAt datetime.

Snapshot sólo para primera integración pequeña, máximo 2 MB. Antes de crecer usar recursos paginados; no truncar silenciosamente. Requerir IDs y slugs únicos, referencias existentes y consistencia de tipos/opciones al publicar; validación relacional server-side pendiente. Sólo status publicado; no drafts, leads, claves, destinatarios ni extensiones privadas.

## Protocolos y seguridad

JSON UTF-8, UTC para timestamps, ID opaco estable no basado en título. ETag por revisión y Cache-Control público con TTL acotado; respuestas administrativas/submissions no-store. Escrituras con If-Match obligatorio: 412 conflicto, 428 revisión ausente. Errores `{code,message,requestId,fieldErrors?}` sin stack/SQL/PII. 400 inválido, 401 no autenticado, 403 sin capability, 404 ausente, 410 retirado, 413 tamaño, 422 inconsistencia, 429 límite con Retry-After, 503 servicio no disponible.

WordPress usa register_rest_route en rest_api_init, permission_callback por endpoint y callbacks de validación/sanitización. Sesión WP + nonce REST para administración same-origin; nonce no reemplaza autorización. Application Passwords sólo entre servidores si necesarias, nunca navegador. HTTPS obligatorio. CORS sólo dominios públicos autorizados; endpoints privados no habilitan CORS general. Rechazar claves desconocidas en escrituras. Páginas de texto plano o bloques sanitizados permitidos, nunca CSS/JS/HTML libre.

POST submissions: JSON hasta 16KB, allowlist de formId y campos, límite inicial configurable 5/min por IP y 20/h por formulario, honeypot, challenge progresivo y almacenamiento mínimo. Rate limiting en servidor/WAF, no sólo cliente. Clave de idempotencia UUID conservada 24h, vincular hash de payload; replay idéntico retorna mismo ID, payload diferente 409. Destinatarios resueltos por formId en servidor, no aceptados del usuario. CSRF/origin checks y política antiabuso; no usar secretos en web pública. Webhooks guardan event ID para evitar repetición y registran intentos sin payload sensible.

Referencia de implementación: [WordPress Custom Endpoints](https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/).
