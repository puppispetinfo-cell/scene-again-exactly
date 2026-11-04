# Plan de conexión React — Fase 3

1. Revisar y aprobar los PR por separado. Mantener frontend mock hasta terminar contrato, datos reales y gates de staging.
2. Instalar el ZIP probado en WordPress de staging con HTTPS y credenciales independientes. Definir dominio público permitido, completar identidad/team/medios y cargar catálogo real con fotos verificadas. Nunca importar fixtures de pruebas.
3. Implementar importación/mapeo autorizado de los IDs/slugs existentes 1/2/3 si se migra el catálogo inicial; mantener favoritos y URLs mediante tabla de correspondencias. El API de edición no permite que el navegador fuerce IDs de otros registros.
4. Para un primer smoke compatible configurar el adaptador existente con la URL completa /snapshot, todavía sólo en staging. Verificar schemaVersion, tamaño, errores, TTL y ETag. El proveedor no cambia silenciosamente a mock si falla WordPress.
5. Adaptar el consumo editorial al DTO completo /configuration y /pages, resolviendo recursos HTTPS del CMS, identidad, chrome, menús por ubicación, textos y recursos, sin alterar las clases, DOM ni animaciones aprobadas. story sigue siendo una unidad de coreografía; no convertir escenas en bloques independientes sin pruebas.
6. Conectar renderers permitidos a las secciones, respetando IDs/orden/visibilidad/mobile/desktop. Preparar preview privado noindex; no insertar HTML/JS/CSS arbitrario. Los campos guardados aquí aún no modifican la interfaz pública.
7. Usar propertyTypeId/categorías para los tipos nuevos y mantener type como familia compatible. La configuración completa admite tipos personalizados; el snapshot sólo proyecta opciones que el parser antiguo entiende. Agregar soporte de nuevos tipos al frontend con pruebas, sin invalidar tipo=casa/operacion=venta ni parámetros previos.
8. Migrar el catálogo a consulta paginada eficiente antes de superar la proyección v1 acotada. Mantener orden por moneda o filtro de moneda; nunca convertir importes sin fuente autorizada.
9. Conectar formularios a submissions con formId, UUID idempotente y política aprobada pageId:revision. Tratar 202 como persistido; mostrar not_configured si no existe mail. No activar generate_lead publicitario ni Calendly confirmed por un clic.
10. SEO SSR usa DTOs individuales y metadatos validados. Sitemap/robots/redirects/retiradas definitivas y Search Console se completan en Fase 5. No indexar staging.
11. Analítica, CMP, GTM/GA4, Ads/Meta/CAPI, reporting y webhooks firmados se implementan en su fase; los endpoints actuales de integrations disabled no deben convertirse en confirmaciones simuladas.
12. Repetir los tests de frontend de Fase 1, 40 comparaciones visuales y recorridos mobile/desktop, contratos contra WordPress, permisos/errores, render HTML sin JS y fallos de red. Exigir staging completo, QA y aprobación explícita antes de producción.

No se modificó VITE_CONTENT_PROVIDER ni ningún componente React en esta rama. Los cambios de identidad y tokens podrán publicarse sin redeploy una vez conectado el consumo runtime y ensayada la revalidación; no se declara demostrado de punta a punta en Fase 2.
