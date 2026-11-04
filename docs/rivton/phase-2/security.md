# Seguridad y decisiones técnicas

## Implementado

- Namespace PHP EstateCore y almacenamiento por prefijo de WordPress. La identidad RIVTON vive en un perfil; las reglas no comparan nombres de inmobiliarias. Namespace REST v1 retenido por contrato.
- Schema JSON generado a partir de los contratos Zod de Fase 1 y refinamientos PHP de URL, host Calendly, referencias, presentación de filtros, slugs, IDs únicos y configuración. Escrituras con límites de cuerpo, tipos estrictos, listas acotadas y rechazo de campos desconocidos. Texto plano sanitizado; render del panel con textContent/escape de WordPress.
- URLs HTTPS o rutas locales; sin data/javascript, backslashes, credenciales ni código CSS/JS. Dominio HTTPS salvo loopback de desarrollo. Tokens CSS allowlist con rangos/colores definidos; no se aceptan snippets.
- Permission callbacks en todas las rutas, capabilities por operación, comprobación de propietario/estate_edit_others, nonce para mutaciones y publicación separada de edición. IDs de ruta se toman de get_url_params; un id enviado en JSON no elige otro recurso.
- SQL mediante wpdb prepare/insert/update; tablas/campos construidos sólo desde constantes y prefijo de WordPress. Control de concurrencia mediante revisión en el WHERE y If-Match. Documento y auditoría en transacción. Cambios públicos incrementan revisión e invalidan cache/ETag; leads no alteran la revisión pública.
- Público sólo publicaciones autorizadas; se omiten bloques/enlaces ocultos, se redactan extensiones no registradas y no se registran endpoints públicos de leads/auditoría. No existen campos públicos para tokens privados o destinatarios de notificaciones.
- Biblioteca WP con upload_files, límite 10MB y extensiones permitidas (JPG/PNG/WebP/AVIF/MP4), filtros de upload/sideload y comprobación de MIME/contenido real por WordPress. SVG activo no permitido.
- Formularios con origen permitido, consentimiento de revisión exacta, honeypot, IDs de formulario acotados, cuerpo <=16KB, idempotencia y límites por IP. Los datos privados no se entregan por rutas públicas ni se incluyen en auditoría. No se usa X-Forwarded-For sin confianza.
- Errores estructurados, requestId HTTP y mensajes genéricos ante fallos internos. No se activa ningún webhook sin credenciales/firma: endpoints devuelven 503 y no aceptan confirmaciones falsas.

## ADR — almacenamiento de registros

El plugin nuevo usa tablas propias versionadas en vez de exponer wp_posts/ACF o mantener dos fuentes de verdad. `{prefix}estate_records` guarda DTO, ID estable, propietario, estado editorial, revisión y slug; `{prefix}estate_audit` guarda metadatos del cambio. Eso permite CAS y auditoría transaccional sin publicar accidentalmente campos privados mediante REST genérica de WP. La administración sigue siendo exclusivamente WordPress y los medios son nativos. Esta decisión concreta el almacenamiento del backend nuevo; no sustituye TanStack ni reconstruye el frontend.

Taxonomías del dominio se representan como registros category/feature y no como términos de WordPress asociados a posts nativos. Tienen su propia pantalla y referencias por ID. No se declara soporte para plugins externos que esperen CPT/ACF; una integración de ese tipo exige adaptador explícito.

## Límites y gates pendientes

Esto no es certificación ASVS ni sistema invulnerable. MFA/SSO, TLS/WAF, base privada, backups cifrados y restore, retención/supresión de PII, CSP del despliegue, escaneo de infraestructura y auditoría independiente siguen en el roadmap. WordPress y sus otros plugins deben mantenerse actualizados y con mínimos privilegios.

SQLite de Playground y el navegador local proporcionan evidencia de desarrollo. El motor MySQL/MariaDB real y PHP distintos requieren staging y ensayo transaccional antes de producción. Las escrituras privadas actuales están orientadas a sesión WP + nonce; no se habilita un secreto administrativo en React ni se presume un flujo Application Passwords ya probado.

La auditoría es append-only a través del plugin, no inmutable frente a quien controla la base/servidor. No registrar queries o cuerpos con PII en herramientas externas; configurar redacción/retención de logs. Los límites de PHP/plugin no reemplazan límites de solicitud, rate limits y challenge en el proxy/WAF.

Las alertas de dependencias frontend de Fase 1 no se resuelven aquí. El plugin no añade dependencias PHP de terceros ni carga scripts de tracking. Las herramientas Node/Playground se usan sólo en desarrollo, fuera del ZIP y del bundle público.
