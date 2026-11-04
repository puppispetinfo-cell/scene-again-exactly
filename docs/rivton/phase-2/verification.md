# Verificación y pendientes — Fase 2

Fecha: 2026-11-04. Base revisada `ae7b1a3`, rama `codex/rivton-core-phase-2`. Entorno de desarrollo desechable: WordPress 6.8.3, PHP 8.3.36, SQLite de WordPress Playground; navegador Chromium emulado a 1440 × 1000. No se usaron datos de clientes ni servicios de producción.

## Evidencia y aceptación

| Requisito | Resultado y evidencia | Estado |
|---|---|---|
| ZIP instalable | Instalación y activación desde ZIP en otro WordPress limpio; 13 archivos instalados comparados por SHA-256 contra el ZIP | Implementado y verificado en desarrollo |
| Validación PHP y REST | 79 comprobaciones PHP, incluidas 11 unitarias; `artifacts/wp-integration.json`, con `success: true` y `lastError: null` | Implementado y verificado |
| Contratos con React | 4 pruebas Zod sobre propiedad y snapshots realmente devueltos por PHP | Implementado y verificado |
| Administración real | 11 pruebas de navegador; `artifacts/wp-browser.json`, sin errores JavaScript, captura `artifacts/wp-admin.png` | Implementado y verificado |
| Propiedades y medios | Crear, guardar, publicar, duplicar y archivar; cargar JPEG real y seleccionarlo en biblioteca WP | Implementado y verificado |
| Configuración y páginas | Persistencia de configuración, token de color con preview, navegación, bloques ordenados con IDs estables; editor estructurado sin código arbitrario | Implementado y verificado |
| Permisos y seguridad | Anónimo denegado, agentes restringidos por propietario, edición de otro recurso bloqueada, escalamiento denegado, nonce obligatorio, XSS/SQLi rechazados, SVG rechazado | Implementado y verificado para casos automatizados; no certificación |
| Concurrencia, publicación y caché | If-Match obligatorio, revisión obsoleta rechazada, invalidación pública, borradores privados, retiradas 410 y paginación | Implementado y verificado |
| Consultas | Consentimiento con revisión legal, idempotencia, límites y honeypot, PII privada, estados y auditoría | Implementado y verificado |
| Notificaciones | Estado explícito `not_configured`; no se invoca entrega ficticia | Preparado; proveedor y entrega pendientes |
| Integraciones e insights | Campos configurables; webhooks/insights no habilitados responden 503 | Preparado para configurar; servicios y autorización pendientes |
| SEO y legales | Campos de metadatos y páginas vacías en borrador; no documentos legales inventados | Preparado; revisión de contenido y renderizado público en fases posteriores |
| Frontend existente | `bun run typecheck`, 29 pruebas existentes y `bun run build` pasan; sin cambios en src, package.json, bun.lock ni vite.config.ts respecto a la base | Verificado; conexión WordPress pendiente Fase 3 |
| Compatibilidad operativa | Sintaxis analizada como PHP 8.1; ejecución real sólo PHP 8.3 / WP 6.8.3 / SQLite | Matriz MySQL/MariaDB y otras versiones pendiente en staging |
| Publicación comercial | MFA, restauración de backups, pruebas de actualización con datos reales, accesibilidad/responsive completo, revisión de infraestructura y dependencias | Pendiente; no se autoriza producción |

El navegador prueba el panel real, no toda la accesibilidad del producto. No se repitió la suite visual del frontend porque sus archivos no cambiaron; la evidencia visual de Fase 1 se conserva como antecedente. La actualización idempotente del esquema 1 se prueba, pero no demuestra una migración entre versiones comerciales que aún no existen.

## Reproducir

Herramientas aisladas, fuera del ZIP y sin modificar dependencias del frontend: Node 24.18.0, `@wp-playground/cli@3.1.62`, `php-parser`, `zod-to-json-schema@3.25.1`, `zod@3.25.76`. Python para empaquetado. Instalarlas en `.tmp/wp-tools` (`npm install --prefix .tmp/wp-tools ...`) y conservar el lock de esa instalación local al reproducir el entorno. WordPress no requiere Node ni estas herramientas.

1. `node scripts/check-wp-php.mjs` analiza sintaxis PHP 8.1. La ejecución real posterior también analiza el código con PHP.
2. `python scripts/package-wp.py` genera ZIP reproducible y SHA-256. No incluye herramientas, tests, credenciales ni datos del entorno.
3. `.tmp/wp-tools/node_modules/node/bin/node.exe --experimental-wasm-jspi scripts/test-wp-zip.mjs` instala ese ZIP y corre tests. Descarga WordPress/PHP la primera vez; requiere red. El aviso del CLI sobre un único worker no constituye un fallo del plugin.
4. `python scripts/verify-wp-artifact.py` exige éxito del informe y compara cada archivo instalado con el ZIP entregado.
5. `node node_modules/vitest/vitest.mjs run --config wordpress/vitest.config.ts` valida las respuestas reales con los contratos existentes.
6. Para UI: iniciar el mismo ejecutable Node con `--experimental-wasm-jspi scripts/wp-admin-server.mjs`; esperar `ADMIN SERVER READY`. Ejecutar `node scripts/wp-browser.mjs`. El servidor sólo escucha en 127.0.0.1:9400, monta el código fuente y usa login automático de un WordPress desechable. Detener con Ctrl+C.
7. Frontend: `bun run typecheck`, `bun run test`, `bun run build`.

Los tests PHP eliminan únicamente registros del plugin dentro de su fixture y requieren `ESTATE_CORE_TESTING`. Nunca ejecutarlos sobre una instalación de un cliente. Los datos de prueba son fixtures explícitos, no catálogo inicial. Los informes versionados pueden regenerarse al ejecutar las pruebas.

Los JSON Schema empaquetados se generan desde Fase 1 mediante `build-wp-schemas.mjs`, `build-wp-defaults.mjs`, `extend-wp-schemas.mjs` y `extend-wp-types.mjs`, en ese orden. Después de regenerarlos hay que reconstruir el ZIP y repetir todas las verificaciones del artefacto. La extensión de tipos agrega `propertyTypeId` y `legacyType` sin alterar el frontend existente; ver el contrato REST.

## Riesgos y dependencias

La persistencia usa tablas propias; no hay interoperabilidad implícita con CPT/ACF. La proyección legacy tiene límites de volumen documentados y debe evolucionar antes de catálogos grandes. Los cambios del panel aún no afectan al sitio React. No se verificaron SMTP, Calendly, APIs analíticas ni Google/Meta porque no están habilitados. No hay credenciales administrativas en el frontend ni se solicitó producción. Las vulnerabilidades de dependencias identificadas en Fase 1 siguen siendo un bloqueo para publicar.
