# Verificación de Fase 1 — 2026-11-04

Base: commit `079f5501c52104d816152c392f2c6531e470bcca` de main. Rama: `codex/rivton-core-phase-1`. Entorno Windows, Node 24.15.0, Bun 1.4.3, TypeScript 5.9.3, Vitest 4.1.11, Vite 8.1.5, Playwright 1.64.1 / Chromium 156. No producción ni servicios de negocio conectados.

| Verificación ejecutada | Resultado |
|---|---|
| Inventario estático reproducible de la base | 105 archivos leídos, hash/tamaño/tipo; 824 ubicaciones candidatas clasificadas |
| Tipado aplicación (`tsc --noEmit`) | exit 0 |
| Tipado navegador (`tsc --project tsconfig.e2e.json`) | exit 0 |
| Build Vite cliente + SSR + Nitro | exit 0, con preset Cloudflare original conservado |
| Vitest | 4 archivos, 29 tests pasan; incluye los 6 existentes |
| ESLint del core y pruebas nuevas | exit 0 |
| Regresión Playwright final | 51 pasan, 1 omitido intencionalmente (menú mobile oculto en desktop), 0 fallos; 40 capturas comparadas |
| Auditoría de dependencias | exit 1: hallazgos documentados en dependencies.md, bloqueo preproducción |
| Diff whitespace | git diff --check sin errores |

## Método visual y de comportamiento

Copia intacta de main en .tmp/baseline, preparada desde git archive del commit base y servida en 4174. Rama servida en 4173. Referencias generadas exclusivamente en main y almacenadas en e2e/regression.spec.ts-snapshots; no se actualizan contra la rama para aceptar diferencias. 40 capturas: ocho rutas más escenas segunda/tercera, en cuatro proyectos (1440x900, 390x844, 390x667, 844x390). Tolerancia máxima 0.02% de píxeles con umbral de comparación por defecto de Playwright; no equivale a certificación pixel-perfect universal entre sistemas.

Se espera la hidratación del footer, las etiquetas de Radix y las fuentes antes de capturar; imágenes lazy fuera de viewport no bloquean el test. Los fallos iniciales por capturas transitorias y por esperar el mensaje literal Campo obligatorio se corrigieron en el test: el formulario existente puede mostrar Required cuando falta una clave. Se verifica que existan los tres errores y no un estado enviado. No se cambió ese comportamiento durante la refactorización.

Se corrigió el fallback de botones en la nueva capa de tokens: sólo se activa su override cuando hay configuración de botones. Sin esa condición, una variable CSS sin valor podía reemplazar el radio/alto aprobado. Las referencias de main se conservaron y la corrección se volvió a contrastar.

Recorridos: URL de búsqueda legacy, selección accesible de tipo y submit, ficha, galería, favorito persistido, menú mobile -> Contacto, validación de formulario vacío, reduced-motion y progresión de escenas con retorno a input/foco. Sólo se omite el test del menú mobile en el proyecto desktop, donde está oculto por diseño.

## Alcance verificado y límites

Implementado y verificado localmente: contratos/validadores, repositorios con red simulada, caché/invalidación/retry, default tokens sin overrides, emisión allowlist de CSS, configuración básica de filtros, parser/evaluador extendidos, metadata helper, consentimiento/dedup del dispatcher, navegación y visuales según reporte final.

Preparado para configurar: URL pública del CMS, contrato WordPress, campos comerciales/SEO/integraciones, registro extensible de secciones y dataLayer tipado sin disparos. El mock es el proveedor activo; no se probó un WordPress real.

Pendiente en fases posteriores: plugin/panel/capabilities, integración editorial de textos/menús/logo/media/secciones restantes, publicación sin redeploy demostrada contra CMS real, renderers completos, sitemap/robots/redirects reales, privacidad/legales revisados, consentimiento UI, integraciones y conversiones reales, reporting, seguridad ASVS completa, AA manual, CWV de campo, backups/migraciones/aislamiento y despliegue Vercel validado. Credenciales y servicios externos sólo se solicitarán cuando corresponda implementarlos.

No se certifica seguridad, WCAG AA, entrega de formularios ni reservas Calendly. No se inventaron datos de rendimiento, personas, contactos, propiedades nuevas o reseñas. Permanecen las imágenes ilustrativas y los datos ya presentes en la base, con su limitación documentada.


## Observaciones del entorno de pruebas

Las capturas se ejecutan contra Vite en desarrollo, no contra un deployment de producción. El preset instrumentado de la base mostró advertencias de hidratación de atributos de inspección/estilo (por ejemplo data-tsd-source y style); no se declara una consola libre de advertencias ni se modificó ese preset para ocultarlas. El smoke del bundle publicado y el triage de esas advertencias corresponden al gate de staging.

Los HTML contenidos en trazas de Playwright provocaban recargas del watcher de Vite al estar en .tmp. La configuración de desarrollo ahora ignora exclusivamente esa carpeta de artefactos; los archivos de aplicación siguen vigilados. Se repitió la matriz tras ese aislamiento. Las referencias visuales siguen siendo las de main intacto.
