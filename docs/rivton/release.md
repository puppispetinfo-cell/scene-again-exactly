# Publicación y operación

Este procedimiento es un diseño para Fase 8. No se despliega nada automáticamente. La configuración actual compila con el preset Cloudflare de Lovable/Nitro; migrar el target a Vercel requiere una decisión explícita y verificar SSR, funciones y assets. No se declara Vercel configurado por existir este documento.

## Entornos

Desarrollo usa mock explícito y ningún tag. Staging usa WordPress independiente con datos permitidos, dominio propio, acceso protegido y X-Robots-Tag noindex. Producción usa WordPress/DB/media/credenciales separadas y nunca fixtures como fallback. Dominios canonical y CORS se definen por entorno. Variables VITE_* son públicas; secretos del BFF/WP no deben llevar ese prefijo. Mantener un inventario de variables y rotación, sin valores secretos en git ni logs.

## Secuencia de entrega

1. Inventariar dominio/DNS y responsables, hosting WordPress, versión soportada probada, acceso Vercel y servicios externos; registrar dependencias faltantes.
2. Provisionar HTTPS, DB privada, backups cifrados, usuarios con MFA, capability mínima, WAF/rate limit y actualizaciones. Bloquear indexación staging antes de ponerlo online.
3. Instalar RIVTON Core versionado, ejecutar migración transaccional/idempotente y restauración de backup en ensayo. No alterar URLs sin mapa de redirects.
4. Crear proyecto Vercel con target TanStack Start/Nitro validado en staging; build reproducible con lockfile, variables por entorno, ningún secreto en bundle.
5. Configurar sólo recurso público aprobado y CORS de React, mail del servidor autenticado, límites de formularios, destinatarios verificados, privacidad/legal y consentimiento revisados.
6. Ejecutar gates QA: unitarias, contrato PHP/TS, integración, E2E desktop/mobile, teclado/lector, responsive, snapshots, SEO HTML/headers, seguridad y performance.
7. Validar health checks frontend/CMS/DB/cola sin detalles internos públicos, alertas de uptime/errores/latencia, logs redactados y retención. Probar entrega de correo y recuperación ante proveedor caído.
8. Verificar robots/sitemap/canonical/404/410/301, Search Console DNS, fichas reales, no imágenes ilustrativas presentadas como fotos reales sin indicación.
9. Con autorización y consentimiento, validar GTM/GA4 en DebugView, ausencia de duplicados, WhatsApp como clic y Calendly como reserva sólo confirmada. Confirmar webhooks y cancelaciones con cuenta de pruebas autorizada.
10. Registrar informe de release: commit/build/plugin/schema, resultados y excepciones con responsable, backup previo y rollback ensayado. Obtener aprobación explícita del usuario para producción.
11. Cambiar DNS/publicación en ventana acordada, smoke tests de home/listado/ficha/formularios/enlaces/agenda, verificar TLS y headers. Habilitar indexación exclusivamente producción tras comprobación; enviar sitemap desde cuenta autorizada.
12. Monitorear primeras 24/72 horas, revisar logs/errores/eventos e indexación. Capacitar administradores y entregar manuales, roles, recuperación y soporte.

## Rollback y recuperación

Mantener deployment anterior y plugin compatible con schema actual; no restaurar DB ciegamente sobre leads recibidos. Congelar escrituras si hace falta, exportar cambios nuevos, restaurar backup verificado en entorno aislado y reconciliar datos. Migraciones expand/contract con reversión documentada. RPO/RTO se acuerdan según servicio contratado; propuesta inicial para validar: RPO 24h, RTO 4h, backups diarios y ensayo trimestral. No declarar esos objetivos cumplidos hasta medir restore.

Gate de release: ninguna vulnerabilidad crítica/alta sin tratamiento aprobado, tests obligatorios pasan, no bloqueos de formularios/permiso/indexación, contraste y navegación críticos revisados, contrato compatible y backup recuperable demostrado. Backlog de incumplimientos impide etiquetar producto listo para producción.
