# Panel único WordPress

RIVTON Core tendrá pantallas Configuración, Identidad, Navegación, Páginas, Propiedades, Taxonomías y filtros, Equipo/sucursales, Formularios/consultas, SEO/redirecciones, Integraciones/consentimiento, Insights, Auditoría y Herramientas de importación/exportación. No hay panel paralelo React.

| Rol propuesto | Capacidades |
|---|---|
| Agente | editar sus propiedades en borrador, ver consultas asignadas |
| Editor | editar contenido/propiedades, gestionar media; sin secretos ni integraciones |
| Publicador | revisar/publicar contenido y legales aprobados |
| Responsable comercial | ver y asignar consultas, reportes autorizados |
| Administrador técnico | identidad/tokens, integraciones, roles, migraciones, backups |

Separar rivton_edit_properties, rivton_edit_content, rivton_publish_content, rivton_manage_leads, rivton_view_insights, rivton_manage_settings, rivton_manage_integrations, rivton_view_audit y rivton_manage_migrations. Revisar ownership de recurso incluso con capability global. MFA exigido a privilegiados. Ningún rol editorial puede introducir scripts, cambiar destinatarios externos o modificar permisos.

Editor inicial de secciones: lista numerada, mover arriba/abajo, duplicar con nuevo UUID, activar/desactivar, campos por tipo, vista mobile/desktop, previsualización privada noindex y publicación explícita con revisión. No aceptar nombres de componentes, clases, CSS, HTML ni JS arbitrario. Registrar revisiones y actor/fecha/diferencia redactada. Avisar si se elimina bloque referenciado o se cambia slug. Slug modificado mantiene 301 desde anterior y prohíbe bucles.

Filtros: editar etiqueta, opciones permitidas, orden, visibilidad y presentación compatible. ID y clave URL no se cambian para renombrar una etiqueta. Las opciones apuntan a categorías/características por ID. Un cambio de tipo de campo requiere migración y pruebas. Previsualizar resultados con el mismo esquema publicado. Moneda, superficie y características por ID están soportadas por el parser y evaluador; permanecen ocultas en la configuración aprobada y necesitan datos/opciones reales para activarse.

Media: ALT obligatorio salvo decorativas, dimensiones, derechos, estado ilustrativo, upload con MIME/extensión reales, límites de tamaño, sin SVG no saneado. Reemplazo de logo conserva proporción y layout mediante reglas del componente. Información fiscal/legal sólo de datos aportados y verificados. Privacidad/términos/cookies se crean como borradores para revisión jurídica, no se publican automáticamente.

Integraciones reciben sólo IDs aprobados; secretos se guardan fuera de respuestas públicas y exportaciones. Confirmar conexión por servidor y auditoría. Reportes muestran sin conexión/sin datos cuando falten credenciales. Formularios distinguen aceptado, pendiente, notificado, fallido y atendido. Nunca mostrar enviado por validación local.
