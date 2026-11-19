# RIVTON Platform

Aplicación React + TanStack Start existente con sitio público y administración propia en `/admin`. La nueva arquitectura usa Supabase Auth, PostgreSQL y Storage. Los PR anteriores de WordPress no son dependencias operativas de esta rama.

**Estado: implementación en revisión, no entrega productiva certificada.** El proyecto Supabase `RIVTON` fue identificado por lectura; las solicitudes de aplicar la migración vencieron en la confirmación del conector. No se aplicaron migraciones ni seeds remotos ni se invitó todavía al administrador. WordPress y producción permanecen intactos.

- [Instalación y variables](docs/platform/setup.md)
- [Uso del administrador](docs/platform/manual.md)
- [Seguridad y límites](docs/platform/security.md)
- [QA y criterios pendientes](docs/platform/qa.md)
- [Migración, publicación y reutilización](docs/platform/operations.md)
- [Relevamiento validado](docs/platform/intake-report.json)

## Desarrollo

```powershell
bun install --frozen-lockfile
bun run dev
bun run typecheck
bun run test
bun run test:database
bun run test:e2e
bun run build
bun audit
```

Copiar `.env.example` a `.env.local` y completar valores autorizados. `VITE_CONTENT_PROVIDER=mock` es una elección explícita para regresiones locales; no es un fallback frente a errores de datos. Producción debe usar `supabase`.

Las pruebas de PostgreSQL usan un motor PostgreSQL real embebido mediante PGlite, con identidades sintéticas aisladas y una función `auth.uid()` de prueba. No prueban el servicio remoto de Auth o Storage ni representan propiedades comerciales.

Los documentos históricos de `docs/rivton/` conservan las decisiones de fases anteriores; las instrucciones vigentes para esta rama están en `docs/platform/`.
