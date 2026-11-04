# Matriz de permisos

| Rol | Propiedades | Páginas/bloques | Publicar | Configuración/taxonomías | Consultas | Auditoría/insights |
|---|---|---|---|---|---|---|
| Anónimo | sólo publicadas autorizadas | sólo publicadas visibles | no | lectura pública saneada | sólo envío protegido | no |
| estate_agent | crear/editar borradores propios | no | no | no | no | no |
| estate_editor | crear/editar borradores propios | crear/editar propias | no | no | no | no |
| estate_publisher | editar cualquier propiedad/página | editar cualquiera | sí | no | no | no |
| estate_manager | no | no | no | no | lectura/estado de consultas | insights autorizado sin proveedor, 503 |
| administrator | completo | completo | sí | completo | completo | completo |

Capabilities efectivas: estate_edit_properties, estate_edit_content, estate_publish_content, estate_edit_others, estate_manage_settings, estate_manage_integrations, estate_manage_leads, estate_view_audit, estate_view_insights. Los nombres rivton_* del diseño preliminar no se habían instalado: se sustituyen por claves neutrales estate_* para no acoplar reglas a la marca. Las rutas se mantienen en el namespace contractual v1.

Cada endpoint privado valida capability; cada recurso verifica propietario o estate_edit_others. Publicar y editar contenido ya publicado requieren estate_publish_content. Cambiar integraciones requiere además estate_manage_integrations. Las mutaciones privadas exigen nonce REST e If-Match; el backend fija IDs/revisiones desde la ruta/registro, no desde parámetros JSON del cliente. Las rutas WP core genéricas no exponen estos registros ni sus consultas, ya que no se registran como posts públicos.

Roles WordPress personalizados no reciben install_plugins, edit_themes, manage_options ni capabilities de otros módulos. Biblioteca multimedia depende además de upload_files y los controles MIME de WordPress. Administración de usuarios/MFA/secretos es del WordPress e infraestructura autorizados, fuera de estas respuestas públicas.
