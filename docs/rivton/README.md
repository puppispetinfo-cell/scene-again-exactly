# RIVTON Core — Fase 1

Entrega actual: [RIVTON Core 0.3.0 — CMS visual](visual-cms/README.md), con pruebas nativas MariaDB, constructor y perfil inicial. Los informes siguientes conservan el contexto histórico de sus fases.

La implementación posterior del plugin y su evidencia están en [Fase 2](phase-2/README.md). El resto de este documento describe la entrega histórica de Fase 1; sus pendientes de plugin se actualizan en ese informe.

Estado: entrega de arquitectura y refactorización inicial de Fase 1, con verificación registrada en verification.md. La integración editorial completa está planificada en Fase 3. No es un producto listo para publicar. Rama `codex/rivton-core-phase-1`; base obtenida de main, commit `079f5501c52104d816152c392f2c6531e470bcca`. Fecha: 2026-11-04.

## Entregables y evidencia

- [Auditoría y matriz](audit.md), inventario por archivo con SHA-256 `source-inventory.json`, ubicaciones candidatas `hardcoded-inventory.json`.
- [Arquitectura y decisiones](architecture.md), contratos Zod/TypeScript en `src/core/contracts.ts`, `theme.ts` y contrato compatible en `repository.ts`.
- [Contrato API propuesto](api.md), [panel WordPress](admin.md).
- [Evidencia de verificación](verification.md), [riesgos de dependencias](dependencies.md).
- [Seguridad](security.md), [SEO/AEO/GEO](seo.md), [analítica](analytics.md).
- [Publicación](release.md), [comercialización](commercial.md), [backlog de nueve fases](backlog.md), [QA](qa.md).

## Uso local

`bun install --frozen-lockfile`, `bun run test`, `bunx tsc --noEmit`, `bun run build`.
Seleccionar mock (predeterminado) o wordpress mediante `.env.example`. La URL es pública y no incluye credenciales. El proveedor WordPress no debe activarse hasta implementar el contrato. Un fallo externo produce un error controlado; nunca sustituye silenciosamente el catálogo real por fixtures. TTL local 30 segundos; no se requiere redeploy para datos servidos por ese recurso. Cambiar la URL del proveedor sí requiere configurar el entorno.

## Límites actuales

El plugin, endpoints reales, páginas legales, reporting, consentimiento, scripts de medición y despliegue no se construyen en esta fase. Se conserva la presentación existente. La extracción restante de textos, menús y secciones está identificada, no se declara terminada. El registro de secciones es una base tipada y ordenable; todavía no renderiza páginas CMS ni reordena las escenas existentes. Los DTO comerciales amplios y el snapshot compatible son contratos distintos y explícitos, no una supuesta respuesta ACF.
