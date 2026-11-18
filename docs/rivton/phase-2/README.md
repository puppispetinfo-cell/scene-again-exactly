# RIVTON Core — Fase 2, versión 0.2.0

Informe histórico. La versión posterior y sus herramientas vigentes están en [CMS visual 0.3.0](../visual-cms/README.md).

Primera implementación PHP para WordPress independiente, construida desde `ae7b1a3` (PR #1), en `codex/rivton-core-phase-2`. React, TanStack Start, sus rutas, estilos y proveedor activo no se modifican.

- [ZIP instalable](../../../artifacts/rivton-core-0.2.0.zip) y [SHA-256](../../../artifacts/rivton-core-0.2.0.zip.sha256).
- [Código fuente](../../../wordpress/rivton-core).
- [Instalación y operación](installation.md), [manual de administración](administration.md).
- [REST implementada](rest.md), [permisos](permissions.md), [seguridad y decisiones](security.md).
- [QA y estado](verification.md), [conexión React para Fase 3](phase-3.md).

El plugin administra contenido real en WordPress. La web pública existente aún usa mock, por decisión de alcance. Guardar o publicar aquí no cambia el frontend hasta implementar Fase 3.

No se habilitan emails, GTM/GA4/Ads/Meta ni webhooks de Calendly. Las consultas se persisten y muestran `notificationStatus: not_configured`; insights y webhooks no configurados devuelven 503 sin aceptar eventos. No se inventaron propiedades ni contenido legal en el instalador: sólo categorías de configuración y páginas vacías en borrador. Los registros de prueba existen exclusivamente en WordPress local desechable.

Esta entrega no autoriza producción ni fusiona main. Los avisos de dependencias de Fase 1 siguen siendo un gate de publicación; esta fase no los elimina ni declara el producto listo para producción.
