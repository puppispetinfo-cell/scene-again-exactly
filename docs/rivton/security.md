# Seguridad: objetivos y verificación

Objetivo propuesto: OWASP ASVS 5.0 nivel 2 para aplicación y administración, con matriz de controles aplicables por versión antes de publicación. No es certificación ni declaración de cumplimiento. Referencia oficial [ASVS 5.0](https://asvs.owasp.org/). Se requiere mapear IDs exactos desde su catálogo en Fase 7; no inventar identificadores ni considerar este documento evidencia de controles implementados.

## Modelo de amenazas

Activos: PII de leads, catálogo y precios, contenido publicado, secretos, backups, reputación. Límites de confianza: visitante -> SSR/API -> WordPress/DB; admin -> plugin; webhook -> API; scripts externos -> navegador. Riesgos: XSS almacenado en contenidos/enlaces, privilegio editorial escalado, IDOR en consultas, SSRF desde URL configurable, spam/CSRF, replay de webhooks, exfiltración por tags, dependency compromise y acceso cruzado entre clientes.

## Controles y evidencia requerida

| Capa / amenaza | Control previsto | Evidencia de aceptación |
|---|---|---|
| HTML/DOM XSS | React escaping, texto plano, esquemas de bloques, sin dangerouslySetInnerHTML no confiable | payloads script/event-handler/javascript no ejecutan; revisión sinks |
| URLs/media | HTTPS o ruta local validada, destinos aprobados, no credenciales/redirects | tests URLs peligrosas; allowlist de hosts de producción |
| Configuración SSRF | URL CMS sólo operador, host allowlist, egress bloquea redes privadas/metadata | pruebas DNS/rebinding en infraestructura; pendiente |
| Scripts/CSP | IDs permitidos, loader único, CSP nonce con hashes/hosts mínimos | Report-Only en staging y política enforce después de QA; no unsafe-eval ni wildcard |
| Secretos | server-only, vault/env separadas, scanner bundle/CI | scan de dist y secret scanning sin hallazgos |
| Roles/IDOR | capabilities + resource checks + MFA | casos anónimo/agente/editor/admin sobre recursos ajenos |
| WP input/SQL | validación server, sanitización, escape salida, $wpdb->prepare | tests de inyección y revisión PHP |
| Upload | MIME real, extensión, tamaño, permisos, antivirus según hosting | rechazar polyglot/SVG activo/ejecutable |
| Formularios | CSRF/origin, límites, idempotencia, honeypot/challenge | 429/413/replay verificados, no duplicar envío |
| API | JSON acotado, permisos, CORS, errores seguros | contratos, 401/403/422 y sin detalles internos |
| Webhooks | HMAC/timestamp/event ID, rotación | firma falsa/replay rechazados y confirmación real |
| Infra | TLS, DB privada, WAF, entornos aislados, actualizaciones | escaneo TLS/red, backup/restore probado |
| Logs/PII | redactar campos, retención definida, acceso restringido | búsqueda de email/teléfono/token en logs de prueba |
| Supply chain | lockfile, revisión vulnerabilidades/secrets en CI | informe fechado, triage con responsable; sin afirmar ausencia total |

Headers: CSP compatible con SSR y proveedores habilitados, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy con permisos mínimos, frame-ancestors restringido y HSTS cuando TLS/subdominios estén preparados. No se aplica política CSP improvisada que rompa hidratación o estilos del diseño.

Implementado en esta fase: DTO externo validado, sin adaptador any/HTML rendered, timeout, límite de cuerpo, no cookies al CMS, no redirects y errores genéricos. Los campos legacy de contacto/footer todavía requieren revisar manejo de fallos y migración a loaders. Hay CSRF middleware TanStack existente: conservarlo y verificar rutas privadas futuras. Rate limits, permisos WP, CSP, MFA, backups y pruebas de intrusión quedan pendientes, no implementados por existir este plan.

Retención PII y base legal se definen con responsable según jurisdicción aplicable. Solicitudes de acceso/supresión, minimización, consentimiento y acuerdos con proveedores antes de publicar. Backups cifrados y restore en entorno aislado; rotación de claves con inventario de dependencias.
