# Seguridad y límites operativos

## Controles implementados

- Auth SSR con cookies HttpOnly, SameSite=Lax y Secure en producción. Se valida el usuario en servidor y la membresía activa en cada operación. Las decisiones de permisos no usan `user_metadata`.
- Roles owner/editor/agent/analyst; el propietario administra configuración e integraciones. Un agente puede trabajar propiedades y consultas, pero no publicar páginas ni autoasignarse permisos.
- RLS en todas las tablas expuestas. Los borradores, revisiones, leads y auditoría no tienen permisos anónimos. La tabla publicada contiene únicamente la copia pública; una lectura pública no puede seleccionar por accidente el borrador de la misma fila.
- Escrituras por funciones controladas: wrappers públicos `SECURITY INVOKER`, implementaciones privadas con autorización explícita, `search_path` vacío y permisos EXECUTE revocados por defecto. Las funciones públicas de formularios son la excepción deliberada a exigir login: validan política publicada, consentimiento, campos, tamaño y cuota global antes de persistir.
- Validación compartida Zod y validación JSON en PostgreSQL generada desde los contratos. Referencias de catálogos, tipos de atributos, medios, códigos únicos y revisión esperada se comprueban antes de publicar.
- CAS transaccional: un guardado desactualizado falla en lugar de sobrescribir cambios. Revisiones y auditoría se conservan.
- Protección CSRF mediante Origin exacto para escrituras de la aplicación y cookies Lax. Sin CORS abierto en la aplicación.
- HTML editorial no ejecutable: React escapa textos; no hay campos de HTML/CSS/JS libre. URLs sólo locales o HTTPS, con controles de protocolo y credenciales. El JSON-LD lo genera el código con datos reales y escape de caracteres de cierre.
- Fotos: 10 MB, formatos reales comprobados mediante decodificación, rechazo de SVG/MIME falso/animación, límite de píxeles, reorientación, eliminación de EXIF y salida WebP. Originales privados, intenciones temporales, cuota de 200 cargas por usuario/día y reclamación única de procesamiento. Dos cargas simultáneas en la interfaz. Los derivados no se sobreescriben ni se borran desde el navegador.
- Sólo medios referenciados por documentos publicados pueden entregarse a visitantes; la entrega de medios de borradores requiere permisos. URLs firmadas breves de lectura; las de carga sólo autorizan un objeto privado, no son credenciales administrativas.
- Leads: destinatario privado eliminado de la proyección pública, ausencia de lectura anónima, consentimiento y revisión de política reales, deduplicación por clave con comprobación del contenido; cuota global de 20 solicitudes aceptadas/minuto. No se afirman envíos por email ni mensajes de WhatsApp recibidos.
- Cabeceras de seguridad, CSP con nonce de SSR y hosts permitidos, `nosniff`, política de referrer, frame denial y noindex de staging. En desarrollo CSP se emite en modo report-only; su aplicación productiva aún requiere smoke real.
- No se incluyen claves administrativas en el navegador. La clave service-role sólo aparece como nombre de variable en el procedimiento explícito de bootstrap, nunca como valor ni como credencial de la aplicación normal.

## Evidencia y límites

`bun audit` final devolvió cero avisos para el lockfile verificado. Se actualizaron Zod, Sharp, Vite, Vitest y dependencias transitivas afectadas; no se desactivó la regla de antigüedad mínima de paquetes.

Los tests de PostgreSQL comprueban RLS, intentos de escritura anónimos, no miembros, elevación de rol, conflictos, separación borrador/publicado, validación de URLs, privacidad de direcciones y leads, revisiones, publicación y redirecciones. No equivalen a una auditoría ASVS completa o una prueba de penetración de infraestructura.

Pendiente antes de producción:

- Aplicar y revisar las políticas en Supabase real y ejecutar los recorridos con sesiones reales, Auth, Storage y MFA.
- Verificar CSP con el build desplegado y proveedores realmente habilitados. No hay IDs de medición ni scripts comerciales activados.
- Rate limiting distribuido de ingreso y protección de intentos inválidos antes de SQL, protección de fuerza bruta/CAPTCHA según el proveedor Auth y configuración de hosting. La cuota SQL limita solicitudes aceptadas; no reemplaza un WAF.
- Limpieza programada y supervisada de originales vencidos y derivados huérfanos. No se eliminan automáticamente archivos compartidos o publicados. Los originales de una finalización intentada se eliminan en `finally`; una pestaña abandonada puede dejar un original privado hasta su limpieza.
- Enrolamiento y recuperación MFA, validación de sesiones revocadas y configuración de emails reales.
- Backups remotos, restauración y monitoreo. No se ejecutaron pruebas de recuperación del servicio administrado.
- Publicación pública v1: carga acotada a 1000 documentos publicados y 500 categorías. Un exceso falla de forma explícita. Para catálogos grandes se necesita consulta pública paginada en base de datos antes de comercializar esa escala. La interfaz administrativa sí pagina registros.
- Completar auditoría de exportaciones de leads y visualización del historial de sus cambios. La exportación actual está restringida a owner y acotada a 500 filas.

No se declara invulnerabilidad ni aptitud productiva/comercial final.
