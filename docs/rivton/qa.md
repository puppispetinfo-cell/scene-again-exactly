# Matriz QA y criterios de aceptación

Estados: implementado y verificado (evidencia ejecutada), implementado pendiente de verificar, preparado para configurar, pendiente, bloqueado por credenciales/servicios externos. No usar archivo existente como evidencia de funcionamiento. Los reportes son de esta revisión, no certificación del producto final.

## Criterios y alcance

| QA ID / familia | Criterio objetivo | Evidencia requerida | Fase / estado inicial |
|---|---|---|---|
| QA-UNIT | DTOs rechazan URLs/datos peligrosos; mock aislado; caché/invalidate/retry correctos; secciones ordenadas y eventos gated | Vitest, core.test.ts + tests existentes | F1, ejecución registrada en verification.md |
| QA-TYPE/BUILD | typecheck sin errores y build cliente/SSR con exit 0 | comandos y versiones en verification.md | F1, ejecución registrada |
| QA-VIS | capturas de base inalterada vs rama en mismo OS/Chromium/fuentes; sin cambio perceptible ni overflow añadido | Playwright rutas desktop/mobile/corto/landscape, screenshots diff y revisión | F1, implementado y verificado; ver verification.md |
| QA-SEARCH | URLs existentes siguen encontrando mismos inmuebles; tipo/precio/dormitorios/baños/orden/piscina se conservan | tests filters + E2E y esquema actual | F1 básico; moneda/superficie/features F3 |
| QA-E2E | home -> buscar -> listado -> ficha -> galería -> favorito, menú mobile y contacto | Playwright; sin errores de navegación/hidratación | F1 básico; backend real F3/4 |
| QA-API | mismo DTO PHP/TS, version/revision, paginación, IDs únicos, no drafts/PII, 400/401/403/404/410/413/422/429/503 correctos | tests de contrato contra plugin real con fixtures y snapshots | F2/3 pendiente plugin |
| QA-SEC | no ejecución XSS, SSRF/CSRF/inyección/replay bloqueados, tamaño/limit/CORS, secretos/deps revisados | tests negativos y revisión ASVS con evidencia por control | F1 fronteras; sistema completo F7 pendiente |
| QA-PERM | anónimo/agente/editor/publicador/admin no acceden a operaciones/recursos ajenos | matriz rol x endpoint x recurso, pruebas automatizadas WP | F2/7 pendiente |
| QA-SEO | HTML SSR indexable y H1/title/description únicos, canonical; 301/404/410/robots/headers/sitemap correctos y sin drafts | HTTP sin JS, crawler, schema validation y Search Console | F5 pendiente configuración/credenciales |
| QA-CONTENT | información real, media con derechos y ALT/dimensiones, FAQ visible, legales borrador revisados | aprobación editorial/jurídica y auditoría de enlaces | F5 bloqueado por contenidos/revisión |
| QA-FORM | validación + persistencia + idempotencia + notificación + errores/retry, sin falso enviado | servidor de prueba y mail autorizado, pruebas spam/fallo | F4 bloqueado por plugin/mail |
| QA-CAL | deshabilitado/falta URL/link/modal/embed; apertura sin conversión; confirmación/cancelación/reprogramación reales | webhook firmado con cuenta sandbox/autorizada, replay/firma falsa | F4/6 bloqueado credenciales |
| QA-AN | no tag no esencial antes de consentimiento; loader único; eventos sin PII, IDs estables, sin doble conversión | unitarias, network, GTM preview/GA4 DebugView y servidor outbox | F1 contrato; F6 bloqueado servicios |
| QA-A11Y | WCAG2.2 AA: teclado, focus visible/trap/retorno, semántica, contraste, labels/errores, lector, reduced-motion | axe + manual y dispositivos; no certificar por pasar scanner | F7 pendiente completo |
| QA-PERF | LCP <=2.5s, INP <=200ms, CLS <=0.1 p75 con datos reales; presupuesto lab registrado si no hay field | Lighthouse/CrUX/RUM autorizado, media/fuentes/scripts revisión | F7 pendiente, sin métricas inventadas |
| QA-RESTORE | backup cifrado restaura DB/media/config, respeta RPO/RTO acordados y no pierde leads nuevos | ensayo aislado con hashes/tiempos e informe | F8 pendiente infraestructura |
| QA-MIG | install/update N-1/export-import idempotente sin pérdida y rollback compatible | fixtures por versión, roundtrip/dry-run/colisión/backup restore | F2/9 pendiente |
| QA-OPS | TLS/DNS/entornos/WAF/health/logs redactados/alerta y rollback funcionan | smoke y alertas simuladas, runbook firmado | F8 bloqueado infraestructura |
| QA-ISOLATION | segunda inmobiliaria no comparte catálogo/PII/secretos/dominio/roles | instalación independiente y tests de acceso cruzado | F9 pendiente |
| QA-HANDOFF | administrador edita contenido/tokens publicado sin código/redeploy, conoce restore/soporte | sesión de capacitación y acta de aceptación | F9 pendiente |

## Ejecución local reproducible

- `bun install --frozen-lockfile`
- `bun run typecheck`, `bun run test`, `bun run build`.
- `bunx playwright install chromium`, levantar `bun run dev -- --host 127.0.0.1 --port 4173`, ejecutar `bun run test:e2e`.
- Preparar la base con `python scripts/prepare-baseline.py`; las referencias se generan exclusivamente contra copia intacta del commit base en puerto 4174: RIVTON_TEST_URL=http://127.0.0.1:4174 con `bun run test:visual:baseline`. No actualizar snapshots contra la rama para ocultar diferencias.
- Referencias guardadas por proyecto/OS en e2e/regression.spec.ts-snapshots. Repetir mismo browser/OS y fuentes; Linux/macOS requieren referencias propias revisadas. Artefactos y trazas locales en .tmp/playwright-artifacts. Resultado JSON en .tmp/playwright-results.json.

El test de formularios comprueba validación local, no entrega de correo. El de Calendly no se declara ejecutado sin proveedor. Las capturas no demuestran navegación de lector de pantalla ni cumplimiento WCAG. El navegador emulado no reemplaza pruebas en dispositivos físicos antes de producción.
