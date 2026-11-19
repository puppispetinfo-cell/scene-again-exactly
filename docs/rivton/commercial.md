# Producto comercial reutilizable

Primera versión: instalaciones independientes por inmobiliaria. Cada cliente tiene dominio, WordPress, DB/media, catálogo, usuarios/permisos, configuración de identidad, integraciones y secretos propios. No hay selector de tenant ni acceso compartido a leads. La reutilización ocurre en motor/componentes/plugin versionados y plantillas compatibles.

## Separación del motor

src/core contiene contratos, validación y repositorios neutrales; fixtures RIVTON quedan en data. La vista aprobada será una plantilla de componentes registrada, con design tokens y contenido separado. No copiar marcas a constantes del motor; RIVTON es configuración inicial, no nombre del producto de cada cliente. Los IDs de propiedades se conservan al exportar/importar, con revisión de colisiones por instalación; slugs editables independientes de ID.

## Instalación y datos

Wizard WordPress de datos reales: identidad, dominio canonical, idioma/monedas, contactos, páginas legales en borrador, catálogo vacío o importación explícita, destinatarios verificados, integraciones desactivadas. Validación de configuración antes de publicar. No incluir demo inmuebles en instalaciones de clientes sin opción explícita y señalización.

Export JSON con schemaVersion, engineVersion, templateVersion, revision y recursos referenciados; excluir secretos, leads/PII y roles de sistema. Import dry-run, límites de tamaño, lista de cambios/conflictos, backup, migración por versión, transacción/publicación y auditoría. Media por URL aprobada o paquete verificado, sin fetch arbitrario que habilite SSRF. Probar export/import round trip y rechazo de versiones incompatibles.

Actualizaciones del plugin con migraciones idempotentes y pruebas N-1 -> N sin pérdida de contenido, rollback compatible y changelog. No borrar datos al desactivar/desinstalar por defecto; política explícita para borrado autorizado. Matriz WordPress/PHP/DB y dependencias se fija tras pruebas Fase 2, no se presume soporte universal.

## Entrega comercial y soporte

Definir licencia de software, derechos de imágenes/fuentes/librerías, términos de soporte, mantenimiento, SLA, hosting, costos de terceros, política de privacidad y tratamiento de datos con asesoría correspondiente. No se inventan precios o condiciones comerciales. Paquete: plugin firmado/versionado, frontend plantilla, configuración ejemplo sin PII, manual admin, runbook, guías DNS/secrets, backup/restore, capacitación y matriz de QA.

Criterio de reutilización: provisionar una segunda inmobiliaria de prueba con configuración distinta sin modificar motor, verificar que dominio/catálogo/branding/medición/usuarios no se cruzan; sólo entonces declarar primera versión comercial. Evaluar multi-tenancy más adelante por costos, aislamiento, seguridad y demanda real mediante ADR separado.
