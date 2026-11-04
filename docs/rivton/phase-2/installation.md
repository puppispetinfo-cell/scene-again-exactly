# Instalación y operación

## Requisitos y entorno

Plugin sin dependencias Composer ni servicios Node en hosting. Requiere WordPress >=6.8 y PHP >=8.1 por sintaxis/funciones usadas; la combinación ejecutada se registra en verification.md. La base local verificada usa SQLite de WordPress Playground. MySQL/MariaDB y otros PHP requieren el ensayo de staging correspondiente antes de declarar compatibilidad de producción.

Usar una instalación independiente por inmobiliaria. Activación en red se rechaza; multisite no se considera certificado. WordPress, DB, medios, usuarios, dominio, credenciales, backups y opciones pertenecen a cada instalación/prefijo. No hay backend central compartido ni llamadas comerciales externas.

## Instalar

1. Respaldar la base y uploads en el WordPress de desarrollo/staging. Mantener producción sin cambios.
2. En Plugins > Añadir plugin > Subir plugin, elegir artifacts/rivton-core-0.2.0.zip. Verificar el SHA-256 del archivo recibido.
3. Activar como administrador. La migración 1 crea tablas propias y capabilities, registra el installation ID y aplica el perfil inicial. No importa el catálogo React.
4. Abrir RIVTON Core y guardar identidad, dominio, contactos y configuración visual. Los campos son estructurados; los errores no guardan contenido inválido. No pegar secretos ni snippets de tracking.
5. Revisar las páginas Home, Nosotros, Contacto, Publicar, FAQ, Privacidad, Términos y Cookies, inicialmente en borrador y sin textos legales. Editar contenido real y obtener revisión jurídica antes de publicar documentos legales.
6. Subir medios con derechos, ALT y dimensiones; elegir galería y foto principal (primer elemento). En HTTPS los recursos conservan su URL absoluta del CMS. Las rutas relativas son sólo conveniencia del desarrollo HTTP local: no conectar ese entorno a Vercel.
7. Crear usuarios con roles mínimos, configurar MFA con la solución autorizada de la instalación y revisar permisos. El plugin no implementa su propio proveedor MFA.
8. Probar rutas usando la URL que genera `rest_url`; activar enlaces permanentes para el namespace wp-json habitual. No habilitar el proveedor WordPress del frontend todavía.

El snapshot legacy responde 503 si falta la imagen institucional requerida por el contrato, en lugar de inventar una foto. Es posible administrar el CMS antes de completar esa configuración.

## Actualizaciones, respaldo y desinstalación

Versión de plugin 0.2.0, versión de almacenamiento 1. La migración se ejecuta una vez y se comprueba idempotencia. Las escrituras de documentos usan revisión y compare-and-swap; la auditoría se persiste dentro de la transacción. Para ampliar el almacenamiento, añadir una migración monotónica nueva y ensayar con un backup; no reescribir el paso 1 ni borrar tablas de clientes.

Tablas: `{prefix}estate_records` y `{prefix}estate_audit`. Opciones `estate_*` guardan installation ID, versión, revisión pública y contadores temporales de abuso. La galería usa la biblioteca multimedia nativa de WordPress. Exportar DB completa y uploads juntos, cifrar y comprobar restore en staging antes de actualizar.

Desactivar no borra contenido. Desinstalar conserva tablas/opciones/roles/capabilities para impedir pérdida accidental de catálogo y consultas. No hay borrado mediante URL pública. La eliminación definitiva requiere procedimiento explícito del operador, backup verificado, revisión de retención de PII y autorización; no se ejecuta en esta fase.

El perfil RIVTON se mantiene en profiles/rivton.json. Para otro cliente usar otro perfil empaquetado/constante de instalación `ESTATE_CORE_PROFILE`, o editar nombre, dominio, identidad y tokens desde el panel. La lógica usa namespace EstateCore y claves neutrales; el namespace REST rivton-core/v1 se conserva por compatibilidad contractual, no para decidir reglas por marca.

## Límites operativos

Proyección v1 acotada a 10.000 propiedades y 4 MB de documentos agregados antes de cargarlos en memoria; snapshot máximo 2 MB. Listado público paginado, límite 1..100; el catálogo actual se filtra con proyección cacheada y debe migrarse a consulta de base indexada antes de superar ese límite. No se hace truncamiento silencioso del catálogo. Los contadores usan REMOTE_ADDR, no X-Forwarded-For no confiable; ajustar WAF/proxy confiable y ensayar límites en infraestructura real.
