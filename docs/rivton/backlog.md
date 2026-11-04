# Roadmap Scrum / Kanban — nueve fases

Estados permitidos: pendiente, preparado para configurar, implementado pendiente de verificar, implementado y verificado, bloqueado por credenciales/servicios externos. Kanban: Backlog -> Ready (dependencias resueltas) -> En curso -> Revisión -> QA -> Done; cada movimiento requiere evidencia y responsable. WIP recomendado 2, sin cerrar por existencia de archivo. Los IDs F1..F9 vinculan requisitos, criterios, archivos y QA. Prioridad P0 bloquea entrega, P1 necesaria, P2 evolución.

## FASE 1 — Auditoría y arquitectura administrable

| ID | Descripción / prioridad | Dependencias | Aceptación objetiva | Estado | Pruebas / archivos | Riesgos |
|---|---|---|---|---|---|---|
| F1-01 | Inventario de base y matriz editable P0 | acceso repo | cada archivo de commit base con hash, referencias de todos los grupos pedidos | implementado y verificado por script | audit-source.py, source/hardcoded-inventory.json, audit.md | coincidencias automáticas requieren interpretación |
| F1-02 | 14 DTOs estables y validación P0 | F1-01 | tipos exportados, versión/revisión/ID, rechazo de datos inválidos | implementado y verificado unitariamente | core/contracts.ts, theme.ts, core.test.ts | proyección legacy aún cerrada |
| F1-03 | Repositorios y proveedor por entorno P0 | F1-02 | mock conserva fixtures, WP valida/limita/cacha/invalida y falla sin inventar datos | implementado y verificado unitariamente | repository.ts, services/content.ts, .env.example | API real pendiente F2 |
| F1-04 | Tokens runtime preservando diseño P0 | F1-01/02 | defaults iguales a main, allowlist sin CSS arbitrario, SSR aplica valores | implementado y verificado (defaults y variables) | theme.ts, styles.css, __root.tsx, e2e | fuentes y responsive |
| F1-05 | Registro de secciones y esquema filtros P1 | F1-02 | tipos permitidos, ID/orden/responsive, claves URL estables; scaffold extensible | implementado y verificado en utilidades; integración total F3 | sections.ts, filter-definitions.ts, search-form.tsx | reordenar story internamente rompe coreografía |
| F1-06 | API/panel y requisitos maestros P0 | F1-01/02 | documentos enlazados de seguridad/SEO/medición/release/comercial y QA por fase | preparado para configurar e implementar | docs/rivton | no equivale a plugin operativo |
| F1-07 | Regresión y cambios revisables P0 | F1-03/04/05 | typecheck/build/tests pasan, comparaciones base/branch y evidencia, rama independiente | implementado y verificado | core.test.ts, e2e, qa.md | diferencias host/fuentes |

## FASE 2 — WordPress RIVTON Core

| ID | Descripción / prioridad | Dependencias | Aceptación objetiva | Estado | Pruebas / archivos previstos | Riesgos |
|---|---|---|---|---|---|---|
| F2-01 | Plugin, registros y taxonomías; migraciones P0 | F1-02/06 | ZIP instalado, migración idempotente, IDs preservados; matriz completa en staging | implementado y verificado WP 6.8.3/PHP 8.3/SQLite; MySQL/MariaDB pendiente | wordpress/rivton-core, scripts/test-wp-zip.mjs; QA-MIG | tablas propias según ADR; compatibilidad pendiente |
| F2-02 | Panel único, roles, auditoría, media P0 | F2-01 | CRUD por capability/recurso, revisión y publish, uploads validados, auditoría | implementado y verificado; MFA depende del entorno y sigue pendiente | 79 checks PHP y 11 navegador; phase-2/verification.md | no certifica infraestructura ni accesibilidad completa |
| F2-03 | API pública/admin/submissions P0 | F2-01/02 | DTO compatible, drafts privados, ETag/If-Match, límites/CORS/nonce, idempotencia | implementado y verificado en desarrollo | wordpress/tests, phase-2/rest.md; QA-API/FORM | SMTP y webhooks deshabilitados |
| F2-04 | Configuración comercial P1 | F2-02 | identidad/tokens, menús, filtros, páginas/bloques, SEO, legales borrador, contactos y equipo | implementado y verificado en WordPress; consumo React F3 | assets/admin.js, contratos JSON; QA-PERM | no inventar datos; destinatarios/transporte de notificaciones pendientes |

Evidencia, límites y reproducción: [entrega Fase 2](phase-2/README.md), [verificación](phase-2/verification.md). Esta actualización no cierra los gates de seguridad, publicación o comercialización de las fases posteriores.

## FASE 3 — Integración React/WordPress

| ID | Descripción / prioridad | Dependencias | Aceptación objetiva | Estado | Pruebas / archivos previstos | Riesgos |
|---|---|---|---|---|---|---|
| F3-01 | Conectar snapshot/recursos reales P0 | F2-03 | loader SSR y navegador equivalentes, sin credenciales, caída controlada, invalidación de publicación <60s sin redeploy | pendiente; plugin local disponible, staging por configurar | core/repository.ts, services/content.ts; QA-API/E2E | latencia/tamaño |
| F3-02 | Extraer todo el contenido/UI de matriz P0 | F2-04/F3-01 | logo/menús/header/dock/footer/textos/media/CTA/SEO editables; defaults conservan main | pendiente | components/site/scroll-story, routes/**, core/configuration; QA-VIS | regresión visual |
| F3-03 | Renderers y editor simple de secciones P1 | F3-02 | crear/reordenar/ocultar/reusar bloques compatible desktop/mobile, preview privado y revisiones | pendiente | core/sections, components/sections/**; QA-VIS/A11Y | DOM/scroll |
| F3-04 | Filtros integrales de catálogo P0 | F2-01/F3-01 | nombres/opciones/orden/visibilidad, moneda/superficie/features, URL legacy intacta, valores compartidos propiedades | pendiente | filters.ts, search-form, results; QA-SEARCH | monedas/taxonomías |

## FASE 4 — Funciones inmobiliarias completas

| ID | Descripción / prioridad | Dependencias | Aceptación objetiva | Estado | Pruebas / archivos previstos | Riesgos |
|---|---|---|---|---|---|---|
| F4-01 | Catálogo, galería, estados, mapa, relacionados P1 | F3-01/04 | datos reales, ubicación autorizada, estados de venta/reserva/retiro, paginación y fallback | pendiente | routes/propiedades*, plugin/properties; QA-E2E | privacidad/exactitud |
| F4-02 | Contacto/publicación y gestión de oportunidades P0 | F2-03/F3-02 | persistencia confirmada, notificaciones auditables, spam limitado, estado comercial y asignación | bloqueado por servicio mail futuro | lead-form, plugin/leads; QA-FORM | pérdida/duplicación |
| F4-03 | Calendly opcional por inmueble P1 | F4-01 | url/label/mode administrables, fallback, aperturas separadas de reservas confirmadas | bloqueado por cuenta autorizada | integrations/calendly/**; QA-CAL | plan/webhooks |

## FASE 5 — SEO, AEO, GEO y contenido

| ID | Descripción / prioridad | Dependencias | Aceptación objetiva | Estado | Pruebas / archivos previstos | Riesgos |
|---|---|---|---|---|---|---|
| F5-01 | Head SSR/canonical/redirect/404/410 P0 | F3-02/F4-01 | todos los casos seo.md verificables por HTTP sin JS, sin duplicados | pendiente | routes/**, server; QA-SEO | indexación |
| F5-02 | Sitemap dinámico/robots/Search Console P0 | F5-01 | sólo indexables 200, lastmod real, índice al necesitar, staging excluido y GSC verificado | bloqueado GSC/dominio | routes/sitemap/robots, plugin/seo; QA-SEO | fuga drafts |
| F5-03 | Institucional/FAQ/legal/zonas/schema real P1 | F2-04/F5-01 | contenido revisado, H1 semántico, JSON-LD seguro, sin reviews ni zonas ficticias; borradores legales aprobados | bloqueado contenido y revisión legal | CMS pages, seo/schema; QA-CONTENT | legal/datos falsos |

## FASE 6 — Analítica, conversiones e integraciones

| ID | Descripción / prioridad | Dependencias | Aceptación objetiva | Estado | Pruebas / archivos previstos | Riesgos |
|---|---|---|---|---|---|---|
| F6-01 | Consentimiento y loader único GTM/GA4 P0 | F5-03 | no esenciales bloqueados por defecto, revocación, eventos analytics.md sin PII ni duplicados | bloqueado IDs/consentimiento | core/analytics, integrations; QA-AN | privacidad/duplicados |
| F6-02 | Outbox, Calendly webhooks y dedup server P0 | F4-02/03 | firmas/replay/idempotencia, confirmación real, cancelación/reprogramación donde proveedor permita | bloqueado credenciales | plugin/webhooks/outbox; QA-CAL/AN | atribución falsa |
| F6-03 | Insights autorizados y feed futuro P1 | F6-01/02 | métricas con fuente/período/latencia, sin datos inventados, acceso por rol; feed validado según requisitos vigentes | bloqueado APIs | plugin/insights/feeds; QA-AN/PERM | costos/cuotas/PII |
| F6-04 | Google Ads/Meta/CAPI preparación P2 | F6-01/02 | IDs/UTM/reglas configurables, sin doble tag ni campañas; servidor con tokens privados | pendiente | plugin/integrations; QA-AN | políticas cambiantes |

## FASE 7 — Seguridad, accesibilidad y performance

| ID | Descripción / prioridad | Dependencias | Aceptación objetiva | Estado | Pruebas / archivos previstos | Riesgos |
|---|---|---|---|---|---|---|
| F7-01 | Verificación ASVS5/API/WP/infra P0 | F2..F6 | controles aplicables mapeados a IDs, pruebas de ataques y permisos, secretos/deps escaneados, hallazgos triados | pendiente | security.md, CI, plugin/**; QA-SEC/PERM | amenazas residuales |
| F7-02 | WCAG2.2 AA y mobile real/emulado P0 | F3/4 | teclado/focus/contraste/dialog/form/lector/reduced-motion, axe y revisión manual sin bloqueos críticos | pendiente | components/**; QA-A11Y/VIS | no basta automatización |
| F7-03 | CWV/fuentes/media/scripts/cache P1 | F3..F6 | presupuestos LCP<=2.5s, INP<=200ms, CLS<=0.1 p75 donde haya datos; lab documentado sin inventar field | pendiente | styles/media/loaders; QA-PERF | terceros/red |

## FASE 8 — Staging, QA y publicación

| ID | Descripción / prioridad | Dependencias | Aceptación objetiva | Estado | Pruebas / archivos previstos | Riesgos |
|---|---|---|---|---|---|---|
| F8-01 | Provisionar staging/target Vercel/WP/DNS/TLS P0 | F7 | entornos aislados, noindex + protección, secretos separados, health/monitor/logs/alertas | bloqueado infraestructura | release.md, deployment config; QA-OPS | preset actual Cloudflare |
| F8-02 | Restore/migración/rollback y QA completo P0 | F8-01 | backup restaurado, plugin actualizado sin pérdida, matriz QA con evidencia y excepciones revisadas | pendiente | runbooks/tests; QA-RESTORE/MIG | datos nuevos |
| F8-03 | Aprobación y publicación controlada P0 | F8-02 | aprobación explícita, checklist release ejecutado, smoke post-DNS, SEO/GSC/eventos/mail/agenda verificados | bloqueado aprobación futura | informe release; QA-SMOKE | cambios irreversibles |

## FASE 9 — Empaquetado, documentación y producto comercial

| ID | Descripción / prioridad | Dependencias | Aceptación objetiva | Estado | Pruebas / archivos previstos | Riesgos |
|---|---|---|---|---|---|---|
| F9-01 | Wizard/import/export/versionado/plantillas P1 | F8-02 | export sin PII/secretos, dry-run/roundtrip, migraciones N-1 sin pérdida, variantes visuales compatibles | pendiente | plugin/tools/templates; QA-MIG | aislamiento/licencias |
| F9-02 | Segunda instalación independiente P0 comercial | F9-01 | marca/dominio/catálogo/roles/medición separados sin cambiar motor ni datos cruzados | pendiente | provisioning/tests; QA-ISOLATION | costos/soporte |
| F9-03 | Manuales/capacitación/licencia/SLA/soporte P1 | F9-02 | paquete reproducible, runbooks, contratos revisados, entrega y aceptación de cliente | pendiente | commercial.md, manuales; QA-HANDOFF | obligaciones legales |

Las nueve fases son obligatorias; la preparación de Fase 1 no marca Done las posteriores. No se implementa producción, campañas ni multi-tenancy compartido en esta rama.
