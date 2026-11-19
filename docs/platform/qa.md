# Estado de entrega y aceptación — 19/11/2026

Esta rama implementa la plataforma nativa React/TanStack Start + Supabase. No modifica WordPress ni constituye una publicación o aceptación integral de producción.

## Evidencia ejecutada

| Área | Resultado | Alcance |
|---|---|---|
| Tipado | Verificado | Aplicación y E2E, TypeScript sin errores |
| Unitarias | 40 aprobadas | Contratos, filtros, imágenes reales y estado del editor |
| Base de datos | 21 comprobaciones aprobadas | PostgreSQL 18.6 embebido; migraciones, RLS, roles, concurrencia, publicación, referencias, privacidad, formularios y seed idempotente |
| Compilación | Verificada | Artefacto Vercel, sin despliegue |
| Navegador | 67 aprobadas, 1 omitida; 32 capturas aprobadas | Regresión sobre fixtures locales; no sustituye Auth/Storage remotos |
| CSP e hidratación | Verificado localmente | Build de producción con nonce, sin errores ni violaciones; ver production-smoke.json |
| Dependencias | Sin avisos en auditoría ejecutada | No equivale a certificación de seguridad |
| Georef | Lectura real verificada | Respuesta 200 y 24 provincias; selector completo remoto aún requiere prueba autenticada |
| Supabase remoto | Bloqueado | Proyecto RIVTON existe y está vacío; tres intentos de apply_migration devolvieron confirmación vencida. No se aplicaron migraciones ni se invitó al propietario |

Los informes se encuentran en evidence/. Los tests de base usan usuarios sintéticos exclusivamente dentro de PostgreSQL local. Las capturas muestran únicamente el acceso no autenticado. No se fabricaron capturas del administrador autenticado.

## Criterios pendientes de aceptación externa

1. Aplicar las tres migraciones en RIVTON y verificar tablas, permisos y buckets. Repetir instalación y segunda ejecución del perfil sin duplicados ni pérdida de ediciones.
2. Configurar Auth, URLs autorizadas y entrega de correo. Invitar a rivtongroup@gmail.com, establecer contraseña y verificar recuperación, cierre de sesión y MFA.
3. Como propietario/editor, crear una propiedad real de prueba autorizada, cargar fotos, ordenar galería, guardar borrador, publicar, editar simultáneamente y recuperar una revisión. Verificar denegación con usuario ajeno y anónimo.
4. Editar texto e imagen mobile de una escena; comprobar herencia, restablecimiento, preview privado React y publicación sin cambio involuntario de coreografía.
5. Probar Storage real: presign, tamaño, archivo falso, EXIF, lectura privada, referencia publicada y errores/reintentos de red.
6. Aprobar legales, configurar retención y activar formularios solo con autorización. Verificar consentimiento, idempotencia, bandeja y contacto; SMTP sigue sin configurar.
7. Staging HTTPS: repetir responsive, teclado, lector de pantalla, CSP, SEO, caché, rendimiento y flujo completo. Medición con IDs autorizados y herramientas del proveedor; no hay conversiones verificadas.
8. Verificar backups/restauración, alertas, protección de abuso, acceso de emergencia y rollback antes de solicitar publicación.

## Backlog de cierre

| ID | Prioridad | Trabajo / dependencia | Aceptación y prueba | Estado / riesgo |
|---|---|---|---|---|
| RIV-01 | P0 | Migraciones remotas, conector operativo | Tablas/RLS/storage verificadas y seed repetido | Bloqueado por confirmación del conector |
| RIV-02 | P0 | Propietario y Auth; depende RIV-01 y correo | Invitación recibida y sesión real por rol | Preparado, no ejecutado |
| RIV-03 | P0 | E2E autenticado; depende RIV-02 | Criterios 3–5 con evidencia real | Pendiente; no declarar módulos aceptados solo por código |
| RIV-04 | P0 | Privacidad/retención comercial y jurídica | Aprobación explícita y formulario real | Borradores y formularios desactivados |
| RIV-05 | P1 | Exportación WordPress privado si hay cambios posteriores | Conciliación sin sobrescribir contenido del cliente | Pendiente; WP intacto |
| RIV-06 | P1 | Auditoría de exportaciones y búsqueda global de leads | Registro de descarga y filtros server-side | Pendiente; búsqueda actual por página, CSV máximo 500 |
| RIV-07 | P1 | Limpieza de medios huérfanos y escala del catálogo | Job seguro y pruebas de carga | Pendiente; límites actuales documentados |
| RIV-08 | P1 | Staging y operación; depende RIV-03 | CSP, backups, alertas, SEO, AA manual y CWV reales | Preparado para configurar; sin despliegue |
| RIV-09 | P2 | Analítica y publicidad; depende consentimiento e IDs | Eventos sin duplicar y conversiones confirmadas | Preparado; tags desactivados |
| RIV-10 | P2 | Producto comercial independiente | Instalación reproducible, migraciones y recuperación verificadas | Pendiente de aceptación anterior |

Archivos afectados: RIV-01/02 supabase/ y scripts/platform/; RIV-03 src/admin/, src/platform/ y e2e/; RIV-04 configuración/formularios y config/clients/; RIV-05 importación conciliada aún por desarrollar; RIV-06 leads/admin-functions; RIV-07 media/storage; RIV-08 vercel.json, server y documentación operativa; RIV-09 measurement/configuración; RIV-10 empaquetado y manuales.

El constructor se limita a elementos compatibles con las plantillas existentes; no promete un editor universal de layouts. El preview renderiza React mediante sesión y cookie firmada, pero su recorrido autenticado remoto está pendiente. No se activaron Calendly, SMTP ni anuncios. No se desplegó en Hostinger ni Vercel.
