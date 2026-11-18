# Corrección 0.3.1 — subida del ZIP

El filtro global wp_handle_upload_prefilter de RIVTON Core se aplicaba tanto a medios como a paquetes del instalador de WordPress. Por eso rechazaba el propio ZIP del plugin con el mensaje de formatos de fotos/videos. El problema estaba en el plugin; no exige convertir ni descomprimir el ZIP.

0.3.1 exceptúa únicamente paquetes ZIP del instalador nativo update.php, con acción plugin/tema, capability de subida de paquetes, nonce válido y archivo temporal coincidente con el formulario del instalador. No admite ZIP por REST multimedia, async-upload ni usuarios sin permisos. WordPress conserva sus propias verificaciones del paquete. El límite de 10 MB y formatos de fotos/videos se mantiene.

## Instalar desde 0.2.0 o 0.3.0 afectadas

1. Respaldar los datos según update.md.
2. En Plugins, desactivar temporalmente RIVTON Core. No eliminar ni desinstalar. Los datos se conservan.
3. Subir rivton-core-0.3.1.zip en Plugins → Añadir plugin → Subir plugin y reemplazar la versión anterior.
4. Activar RIVTON Core y comprobar el panel.

La desactivación previa es necesaria porque el filtro que impide la subida pertenece al código anterior que sigue activo. Después de instalar 0.3.1, las futuras subidas del paquete mediante el instalador nativo funcionan con RIVTON activo. No se cambió Hostinger ni se autoriza una actualización remota automática.

## Evidencia

- 145 comprobaciones PHP heredadas/CMS sobre WordPress 6.8.3, PHP 8.3.36 y MariaDB 11.4.5, actualizando desde el ZIP 0.2.0 a 0.3.1.
- 8 comprobaciones adicionales: ZIP bloqueado en medios, nonce, coincidencia del paquete, límite/tipo de imágenes y rechazo de usuarios sin permisos; artifacts/wp-upload-regression.json.
- Subida y reemplazo reales del ZIP mediante navegador e instalador WordPress, con RIVTON activo; artifacts/wp-package-upload.json, scripts/test-package-upload.mjs.
- 25 archivos instalados comparados con el ZIP 0.3.1; 10 pruebas de contrato pasan. No se cambió el frontend.
