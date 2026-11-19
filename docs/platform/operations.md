# Publicación, migración y reutilización

## Entornos

Mantener proyectos independientes de desarrollo/staging/producción. El proyecto RIVTON encontrado está vacío; no se asume una instalación remota completa. No se modificó Hostinger, DNS, dominios ni el frontend público desplegado.

El repositorio incluye configuración de build Vercel. No se creó ni promovió un deployment. Usar un origen de preview protegido y no indexable; después configurar Auth Redirect URLs y variables para ese origen. Revisar runtime Node compatible con Sharp y que las dependencias nativas correspondan a Linux en el build remoto.

## Secuencia para habilitar staging

1. Revisar las tres migraciones SQL y confirmar su aplicación en el proyecto correcto. La confirmación del conector expiró, por lo que esto sigue pendiente.
2. Ejecutar verificación de RLS y los advisors sobre la base real, antes de habilitar usuarios o publicar formularios.
3. Verificar que el perfil se precargó una sola vez, que no hay propiedades inventadas y que legales, FAQs, equipo y formularios están en sus estados previstos.
4. Configurar Auth, invitación/recuperación, primer owner `rivtongroup@gmail.com` y MFA según la política adoptada. Verificar recepción del email; no compartir contraseñas.
5. Configurar preview React con `VITE_CONTENT_PROVIDER=supabase` y secretos sólo en servidor. Confirmar robots/noindex, CSP, cookies y ausencia de secretos en assets.
6. Ejecutar los flujos A–E del pedido con datos de prueba aislados, revisión previa y reversión. No modificar contenido comercial aprobado para demostrar un test.
7. Guardar evidencia de publicación y restauración sin redeploy. No dar por aprobado ese flujo sólo por tener sus funciones o tests de base de datos.
8. Revisión comercial/jurídica, accesibilidad manual, carga, backups/restauración y servicios externos. Sólo después pedir aprobación para producción.

## Migración de WordPress

WordPress anterior permanece intacto. El JSON confirmado está incorporado como datos de cliente en `config/clients/rivton.json`, sin instrucciones ejecutables ni credenciales. No se hizo una nueva importación remota en WordPress.

Antes del corte definitivo, obtener un export autorizado y backup del contenido privado/público anterior. Comparar por ID y slug configuración, páginas, revisiones elegidas, categorías, equipo, propiedades y medios. No asumir que el repositorio contiene cambios agregados posteriormente. Un export privado y la conciliación con cambios posteriores siguen pendientes.

No copiar tokens, usuarios, contraseñas, PHP ni scripts del sistema anterior. Migrar datos mediante DTOs validados; conservar un manifiesto de IDs antiguos/nuevos, hashes de medios, URLs y redirecciones aprobadas. Presentar conflictos antes de aplicar; no sobrescribir ediciones del nuevo panel.

## Rollback y operación

Las migraciones de fundación son aditivas. No ejecutar un reset de la base remota para “deshacer” una entrega. Respaldar antes de cambios; recuperar el deployment anterior y el backup compatible si existe un incidente. Restaurar un documento editorial mediante revisiones no requiere restaurar toda la base.

Definir por entorno responsables, retención, cifrado, pruebas de restauración, monitoreo, alertas, logs sin PII, límites de consumo y actualización de dependencias. Estas políticas operativas requieren configuración y prueba remotas.

## Nuevo cliente

Preferir un proyecto Supabase y un deployment separados por inmobiliaria. Crear un perfil confirmado con IDs deterministas propios; aplicar migraciones versionadas, identidad, contactos, menús, catálogos y páginas aprobadas. Mantener integraciones, usuarios y catálogos aislados. No reutilizar claves ni copiar consultas personales de otro cliente.

El motor y el panel son reutilizables; la configuración inicial RIVTON vive en un perfil separado. La ampliación a otras variantes visuales debe conservar las restricciones de los componentes existentes. No se construyó multitenancy compartido ni se certificó todavía un paquete comercial listo para terceros.

## SEO y medición

Sitemap y robots se generan dinámicamente a partir de publicaciones/entorno. Borradores y previews nunca entran al sitemap; staging bloquea rastreo y emite noindex. Search Console y Bing Webmaster se verifican después de configurar un dominio autorizado; no se simularon envíos o indexación.

`llms.txt` es un recurso complementario, no una promesa de aparición en respuestas de IA. El contenido real, las FAQs revisadas, la consistencia institucional y el HTML SSR son la base editorial.

Las conversiones necesitan IDs y definiciones reales, consentimiento y verificación en DebugView, Tag Assistant, Events Manager y diagnósticos de Ads. No se crean campañas ni presupuestos.

Referencias jurídicas usadas para los borradores, sujetos a revisión de las prácticas reales:
- https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/actualizacion
- https://www.argentina.gob.ar/aaip/datospersonales/derechos
