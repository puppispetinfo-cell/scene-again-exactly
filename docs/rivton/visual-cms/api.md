# REST adicional de RIVTON Core 0.3.0

Se conserva el namespace `rivton-core/v1` y la REST de fase 2. Nuevos campos son aditivos; las variantes editoriales se describen en `wordpress/contracts/studio.ts` y se validan sobre respuestas reales. La REST legacy no pasa a ser un editor visual ni se habilita automáticamente el proveedor público de React.

| Recurso | Acceso y comportamiento |
|---|---|
| GET admin/dashboard | Capacidades de contenido o leads; conteos reales de registros autorizados y cambios si puede ver auditoría. Servicios externos sin configurar. |
| GET admin/catalog/{properties,pages,locations,features,categories,team,leads} | Permiso por tipo; 25 por página, after como offset, search, status, sort; filtros por operation/propertyTypeId/cityId/neighborhoodId/agentId. Orden updated-desc/title-asc/price-asc/price-desc; precios agrupados por moneda. |
| admin/locations, admin/team | CRUD y transiciones con las reglas de los recursos existentes; geografía validada por nivel y padre. |
| GET admin/workspaces/{pages,properties,team,configuration}/{id} | Sesión/permiso por recurso; documento del borrador o live, ETag de live, draftRevision/baseRevision/hasDraft. No-store. |
| PUT misma ruta | Nonce, If-Match y X-Draft-Revision; valida DTO y referencias, guarda sólo workspace y versión de borrador. |
| DELETE misma ruta | Nonce, If-Match y X-Draft-Revision; descarta el borrador activo, conserva sus versiones y recupera live. |
| POST .../publish | Publisher + permiso del recurso; valida revisión live, revisión del borrador y referencias; publica y crea versión durable. Configuración de integraciones requiere además su capability. |
| POST .../unpublish | Despublica con autorización y concurrencia; no elimina el registro. |
| GET .../revisions | Historial live paginado por after; draftItems contiene las últimas 100 versiones de borrador. Metadatos autorizados, sin endpoint público. |
| POST .../restore | Body revision entero y source live/draft; If-Match + X-Draft-Revision. Restaura mediante workspace, no publica. |
| POST .../preview | Misma autorización por recurso y nonce; documento guardado, revisiones, mode representative, reactConnected false, expiración informativa. No emite enlaces públicos ni tokens bearer. |
| GET admin/import/reports | Administración completa; informes persistidos y estado de recuperación, paginados. |
| POST admin/import/preview | intake opcional; por defecto usa el relevamiento incluido. Plan validado y token ligado al usuario. |
| POST admin/import/apply | token + approved true; omite conflictos y no duplica entidades. Informe y respaldos privados. |
| POST admin/import/rollback | reportId + approved true; comprueba revisiones y restaura transaccionalmente sin forzar cambios posteriores. |
| GET team | Sólo integrantes publicados y visibles, paginación after. Sin biografías/fotos privadas en borrador. |
| GET taxonomies | Añade locations; categorías y atributos siguen publicados. Filtros pueden derivar opciones de fuentes administradas. |
| POST contact-intent | Público, origen autorizado, consentimiento con revisión de política publicada y privacidad aprobada; plantilla validada y URL fija wa.me del WhatsApp configurado. No guarda lead ni confirma envío. Rate limit y límite 8 KB. |

Las rutas administrativas mantienen `register_rest_route`, `permission_callback`, autorización en servidor por recurso y nonce en escrituras. El navegador no recibe credenciales administrativas externas. Los errores conservan estado HTTP y requestId; no incluyen SQL ni stack traces. Los drafts viven separados de los registros publicados y no alimentan snapshot ni listados públicos.

Duplicar con X-Draft-Revision copia el workspace guardado y comprueba su revisión; sin ese header conserva la copia legacy del registro live. La copia recibe ID nuevo y queda en borrador.

Las escrituras administrativas anteriores conservan su semántica compatible. El nuevo panel usa workspaces para la edición editorial y de configuración. Un consumidor nuevo debe usar este flujo; PATCH sobre un recurso ya publicado de la API anterior sigue siendo una escritura directa autorizada y auditada.

## Modelos adicionales

Geografía: provincia → localidad → barrio con parentId estable, slug, nombre, descripción, imagen, coordenadas, orden, activo y SEO. Propiedad añade provinceId/cityId/neighborhoodId, agentId, videos y attributes tipado. Conserva location como proyección compatible, actualizado desde referencias al leer y al guardar. Cambiar padres/niveles o archivar registros vinculados se bloquea; renombrar conserva referencias. Las URLs de filtros legacy mantienen las claves existentes; un futuro cambio de slug comercial personalizado requiere una política explícita de alias/redirección antes de publicarlo.

Sección: label comprensible, contenido, medios, acciones, diseño base y overrides desktop/tablet/mobile. Story contiene hasta tres subescenas coordinadas, cada una con recursos, texto, layout, overrides y CTA. FAQs son pares independientes con ID y grupo. Se resuelve `{...base, ...overrides[device]}`; restablecer elimina la propiedad del override.

Filtros: source manual/operations/types/cities/neighborhoods/features. Se derivan opciones de catálogos publicados y visibles, manteniendo etiquetas configuradas y claves URL. Snapshot sigue proyectando sólo familias que entiende el frontend legacy; la integración completa usará las taxonomías y propertyTypeId.

contact-intent acepta formId contact/publish-property, fields permitidos por configuración y consent accepted/privacyRevision. Devuelve url, state intent_only, leadStored false y messageSent false. No es generate_lead ni schedule_visit. Submissions, en cambio, persiste sólo con almacenamiento y privacidad aprobados; conserva el contrato anterior de consentimientos, origen, idempotencia y límites.

## Conexión React siguiente

Consumir DTOs publicados para SSR, sin credenciales privadas; resolver referencias y overrides; conservar las animaciones y el wordmark por defecto; enlazar filtros y acciones con sus claves compatibles; implementar preview SSR autenticado desde servidor cuando exista un entorno de React autorizado. La vista representativa actual no certifica scroll, hidratación ni igualdad visual dentro de React. Revalidar por revisión pública; los drafts no la incrementan. Cada instalación mantiene sus propios usuarios, medios y configuración.
