# QA y estado de entrega — 0.3.0

Evidencia obtenida en instalaciones desechables locales. No se modificó Hostinger, main ni el frontend público. Entorno nativo: WordPress 6.8.3, PHP 8.3.36 y MariaDB 11.4.5, tablas InnoDB. No se declara compatibilidad probada con versiones distintas ni una certificación de seguridad/accesibilidad.

| Área | Evidencia / criterio objetivo | Estado |
|---|---|---|
| Instalación limpia | Activación directa del ZIP 0.3.0, almacenamiento 3; `artifacts/wp-clean-install.json` | Implementado y verificado en MariaDB |
| Actualización 0.2.0 | Instalación de ZIP anterior, registro persistido, reemplazo por ZIP nuevo, ID/documento intactos y versión capturada; `artifacts/wp-upgrade.json` | Implementado y verificado |
| Regresión PHP | 79 comprobaciones heredadas, incluidas validación, permisos, XSS, SQLi, CSRF, IDOR, caché, medios y formularios; `artifacts/wp-integration.json` | Verificado en MariaDB |
| Nueva integración | 66 comprobaciones de perfil, idempotencia, no sobrescritura, recuperación, drafts privados, publicación, revisiones live/draft, geografía, atributos, medios, permisos y WhatsApp; `artifacts/wp-visual-integration.json` | Implementado y verificado |
| Artefacto entregado | SHA-256 de cada uno de los 25 archivos instalados coincide con el ZIP; `scripts/verify-wp-artifact.py` | Verificado |
| Contratos | 10 pruebas Zod, incluyendo respuestas reales normalizadas por REST y herencia responsive; tipado adicional wordpress/tsconfig.json | Verificado |
| Constructor y propiedades | 14 recorridos Chromium: árbol/inspector, editar/guardar/recargar mobile, publicar, restaurar, crear provincia, selectores dependientes, media, import preview, error de red y conflicto sin descartar edición | Verificado; `artifacts/wp-visual-browser.json` |
| Controles específicos | 8 recorridos adicionales: protección del relevamiento, FAQs, orden/IDs, galería/principal/ALT, atributos tipados, SEO/OG, duplicación del borrador y filtros publicados; artifacts/wp-cms-controls.json | Implementado y verificado |
| Accesibilidad básica | Axe A/AA sobre el panel inspeccionado, sin infracciones; labels nativos, botones por teclado, dialog, focus, controles de orden y aviso de cambios | Verificado en recorridos automatizados; no certifica todo WCAG 2.2 AA |
| Chrome y móvil | 15 recorridos adicionales en Google Chrome instalado y emulación táctil Pixel 7; `artifacts/wp-visual-chrome.json` y capturas | Verificación registrada en el informe de esa ejecución; no prueba dispositivos físicos |
| Frontend | Sin diferencias en src/package.json/bun.lock/vite.config.ts; tipado, 29 pruebas y compilación existentes pasan | Verificado; React no conectado |
| Preview exacto | Contrato protegido por sesión/capability/recurso; renderer representativo real de documentos | Implementado y verificado como representativo; React/SSR/scroll pendiente de integración |
| Publicación/servicios | Sin deploy, campañas, emails, métricas de tráfico o reservas inventadas; Calendly y SMTP no configurados | Servicios externos pendientes de configuración autorizada |

Los informes registran success y lastError; la existencia de un archivo no equivale a aprobar una prueba. Las capturas muestran el fixture de QA, no propiedades reales para publicar. Las cifras de dashboard se calculan de sus registros y nunca se presentan como tráfico de RIVTON.

## Reproducción

Herramientas de prueba aisladas, sin alterar dependencias públicas: Node, Python, PHP portable oficial, MariaDB portable oficial y WordPress descargado. `scripts/setup-native-wp.ps1` prepara `.tmp/native`, crea una clave QA local y arranca sólo en 127.0.0.1:3309, sin instalar un servicio. Los binarios usados son únicamente herramientas de desarrollo; no se incluyen en el ZIP. La instalación requiere conexión a sus fuentes oficiales y revisión de sus versiones antes de reutilizarla en otro momento.

1. `python scripts/package-wp.py` genera ZIP y checksum.
2. `node scripts/test-native-wp.mjs` crea otra base y otro directorio QA, instala 0.2.0 desde su ZIP, verifica actualización y corre las baterías PHP contra 0.3.0. Nunca recibe una ruta de WordPress de un cliente.
3. `$env:ESTATE_CLEAN_INSTALL='1'; node scripts/test-native-wp.mjs` comprueba instalación limpia directa y repite las baterías. Quitar la variable después.
4. `python scripts/verify-wp-artifact.py`, `node node_modules/vitest/vitest.mjs run --config wordpress/vitest.config.ts`, `node node_modules/typescript/bin/tsc --project wordpress/tsconfig.json`.
5. UI: WordPress local servido en 127.0.0.1:9401, con usuario QA y clave de `.tmp/native/password.txt`, plugin extraído del mismo ZIP, fixture de `visual-integration.php` en un entorno separado de los informes finales. Ejecutar `node scripts/test-visual-browser.mjs`; para Chrome, `$env:CHROME='1'` antes de repetir. Usa perfiles temporales y no el perfil personal del navegador. Requiere Playwright y axe instalado sólo en `.tmp/wp-tools`.
6. `bun run typecheck`, `bun run test`, `bun run build`. No se repite la regresión visual pública porque sus archivos no cambian; el panel nuevo sí tiene evidencia de navegador.

Los tests borran únicamente datos del plugin dentro de las fixtures indicadas y exigen ESTATE_CORE_TESTING. Nunca ejecutarlos en un sitio con datos reales. Las bases QA se conservan con nombres únicos; detener MariaDB con mariadb-admin y su archivo client.ini local al terminar. No publicar `.tmp`, contraseñas, dumps ni los binarios de desarrollo.

## Pendientes y límites precisos

- Integración React real, preview SSR autorizado, igualdad visual, coreografía y reduced motion de la web pública: siguiente fase. Los campos guardados no alteran aún Vercel ni la web.
- Revisión de contenido y datos personales reales del cliente: intake.md. No aprobar legales ni almacenamiento de leads automáticamente.
- SMTP/notificaciones, analítica, conversiones, calendarios y webhooks: servicios no habilitados; no se consideraron funcionales por tener campos de configuración.
- Pruebas en Hostinger, otros PHP/WP, MySQL separado de MariaDB, Safari/iOS físico, lectores de pantalla y auditoría integral WCAG: no ejecutadas. La combinación MariaDB requerida sí se probó localmente.
- Restore completo de backups, MFA, WAF, hardening y revisión de dependencias vulnerables identificadas en Fase 1: controles previos a producción; no resueltos por este ZIP.
- Catálogos y dashboard acotados; una inmobiliaria que exceda los límites documentados requiere consultas indexadas adicionales. Live history es paginado y el panel presenta el lote disponible; draft history devuelve las últimas 100 versiones. No es una papelera de medios privados: WordPress conserva su biblioteca nativa.

Evidencia de precarga real sin propiedades ficticias: artifacts/wp-profile-demo.json y las capturas wp-rivton-dashboard.png, wp-rivton-builder.png, wp-rivton-contact.png y wp-rivton-team.png.

La entrega permite comenzar la conexión del administrador con React; no equivale a publicar automáticamente el producto comercial completo.
