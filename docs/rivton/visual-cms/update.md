# Actualizar desde RIVTON Core 0.2.0

No ejecutar estos pasos en Hostinger sin autorización. La entrega sólo se probó en entornos locales desechables. WordPress sigue siendo el único panel y los datos quedan en la instalación independiente de cada inmobiliaria.

1. Respaldar base completa, uploads, plugin 0.2.0, opciones y configuración. Probar restauración en staging y conservar ese respaldo fuera del servidor.
2. Verificar PHP ≥8.1 y WordPress ≥6.8, espacio disponible y transacciones InnoDB. La ejecución nativa probada corresponde a PHP 8.3.36 / WP 6.8.3 / MariaDB 11.4.5; otras combinaciones requieren su ensayo.
3. En staging, subir `rivton-core-0.3.0.zip` mediante Plugins → Añadir → Subir y aceptar reemplazar el plugin existente. No desinstalar ni borrar tablas.
4. La migración conserva `estate_records`, `estate_audit`, IDs, slugs, propietarios y revisiones existentes. Añade `estate_revisions`, `estate_drafts` y `estate_draft_versions`. La versión de almacenamiento pasa a 3. Se captura la versión actual de los documentos existentes; no se reconstruye un historial anterior inexistente.
5. Abrir RIVTON Core, comprobar dashboard, propiedades anteriores, fotos, permisos y API. Guardar un borrador y comprobar que la publicación anterior siga intacta; ensayar publicar, restaurar y un conflicto entre sesiones.
6. Revisar el perfil inicial en Importación, aprobar sólo cuando corresponda. La actualización por sí sola no sobrescribe datos comerciales ni publica textos. Los conflictos se omiten. No se importan fixtures QA.
7. Revisar privacidad, conservación de leads y consentimientos antes de habilitar formularios reales. No hay SMTP ni Calendly activados por la actualización.

Desactivar o desinstalar sigue conservando datos y roles. Revertir sólo el código a 0.2.0 no es un rollback operativo completo: esa versión no entiende el historial ni los workspaces nuevos. Si fuera necesario volver atrás, detener escrituras y restaurar el backup conjunto de base, uploads y plugin, con ensayo previo. La recuperación de una importación es independiente y comprueba que no haya cambios posteriores antes de restaurar sus registros. Los archivos multimedia quedan reutilizables para evitar borrar recursos compartidos.

La incorporación de nuevas tablas es aditiva. No se sustituyeron las tablas de registros por CPT/ACF ni se migró el frontend. Las escrituras documentales, versiones y auditoría usan transacciones y compare-and-swap. Las importaciones aplican sus registros y el informe dentro de una transacción; los archivos se registran antes y se retienen si hay recuperación.
