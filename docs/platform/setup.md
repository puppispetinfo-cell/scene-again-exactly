# Instalación de desarrollo y configuración

## Base y compatibilidad

Rama `codex/rivton-platform`, basada en `ae7b1a3`: frontend aprobado, contratos y regresiones de fase 1. No incluye los commits del plugin ni continúa el PR apilado de WordPress. Los cambios interrumpidos de aquella integración quedaron conservados en un stash local y no se mezclaron en esta rama.

Se mantienen React 19 y TanStack Start/Router existentes. Se verificó documentación oficial actual y las APIs de los paquetes instalados. Se usan `createServerFn().validator()` y handlers del router; no Next.js ni React Router. Nitro genera el artefacto de Vercel; Sharp se ejecuta sólo en servidor Node.

Documentación consultada:
- https://tanstack.com/start/latest/docs/framework/react/guide/server-functions
- https://tanstack.com/start/latest/docs/framework/react/guide/server-routes
- https://supabase.com/changelog.md
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/storage/security/access-control
- https://vercel.com/kb/guide/deploy-a-tanstack-start-app-to-vercel

## Variables

| Variable | Uso | Secreta |
|---|---|---|
| `VITE_CONTENT_PROVIDER` | `mock` para pruebas locales o `supabase` para datos reales | No |
| `SUPABASE_URL` | URL del proyecto autorizado | No, pero sólo se usa en servidor |
| `SUPABASE_PUBLISHABLE_KEY` | Clave publicable; todas las operaciones siguen RLS | No; no se requiere enviarla al navegador |
| `APP_ORIGIN` | Origen exacto HTTPS del administrador; se valida el Origin de las escrituras | No |
| `SITE_ORIGIN` | Origen canónico HTTPS del sitio | No |
| `SITE_ENVIRONMENT` | `staging` o `production`; staging bloquea indexación | No |
| `PREVIEW_SECRET` | Al menos 32 caracteres aleatorios para firmar cookies temporales de preview | **Sí** |
| `ADMIN_REQUIRE_MFA` | `true` exige sesión `aal2`; requiere inscribir antes el factor | No |
| `NITRO_PRESET` | Predeterminado `vercel`; `node-server` sólo para smoke local | No |
| `ALLOW_LOCAL_REGRESSION_FIXTURES` | Excepción de pruebas sobre build local, sólo con host localhost/127.0.0.1 | No; nunca configurar en Vercel |

No usar prefijos `VITE_` para contraseñas, tokens, claves de servidor o el secreto de preview. No hay variables operativas de WordPress.

## Migraciones

Aplicar por orden, exclusivamente al proyecto de desarrollo revisado:

1. `20261118230832_platform_foundation.sql`: documentos privados/publicados separados, revisiones, roles, catálogos, leads, auditoría, referencias, permisos, validación de documentos y funciones transaccionales.
2. `20261119132855_platform_storage.sql`: buckets privados de originales y derivados, con políticas por usuario/referencia publicada.
3. `20261119134210_rivton_initial_profile.sql`: configuración real y páginas aprobadas; FAQs, legales, equipo y formularios preparados en borrador. Cero propiedades.

`bun run seed:build` regenera validación SQL desde Zod y el seed desde `config/clients/rivton.json`. El seed usa IDs deterministas e INSERT con conflicto sin sobrescritura. No se ejecuta al iniciar el servidor ni al desplegar.

El conector identificó el proyecto **RIVTON**, ref. `ejeicsezxegqarizfyqo`, inicialmente sin tablas ni migraciones. La confirmación remota venció: su instalación sigue pendiente. No asumir que los archivos locales ya existen en ese proyecto.

## Primer administrador

Email indicado por el usuario: `rivtongroup@gmail.com`. No se generó ni registró una contraseña y todavía no se solicitó una invitación.

Con la base aplicada, usar la invitación oficial de Auth y asignar `platform_members.role='owner'`. El script opcional `scripts/platform/bootstrap-owner.ts` usa exclusivamente una clave de servidor temporal `SUPABASE_SERVICE_ROLE_KEY`; no forma parte de la aplicación normal y se niega a continuar si ya hay un propietario. Ejecutarlo requiere disponer de esa credencial por un canal seguro. No crear filas de `auth.users` a mano para fabricar sesiones.

Antes de invitar:
- Configurar Site URL y Redirect URLs con el origen HTTPS autorizado.
- Configurar entrega real de emails y verificarla.
- Para invitación/recuperación SSR, usar una plantilla de email con el enlace a `/auth/callback?token_hash={{ .TokenHash }}&type=invite` o `type=recovery`, dentro del origen autorizado. El callback también admite intercambio PKCE por `code`.
- La contraseña se establece en el flujo de recuperación de `/admin`; se exige un mínimo de 12 caracteres.
- Inscribir MFA antes de activar `ADMIN_REQUIRE_MFA` y verificar recuperación de cuenta.

Los emails de invitación o recuperación no se consideran entregados por haber invocado una API. Revisar logs del proveedor y recepción efectiva.
