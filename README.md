# Scene Again Exactly

Versión actual del backend: [RIVTON Core 0.3.0 — CMS visual](docs/rivton/visual-cms/README.md).

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b2e4a0f4-4a1a-4a7f-a6da-6346f91e5a3c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## RIVTON Core — arquitectura administrable

La documentación de Fase 1 está en [docs/rivton/README.md](docs/rivton/README.md): auditoría, contratos, tokens, repositorios, API propuesta, panel, seguridad, SEO, analítica, QA y roadmap de nueve fases. Ver [verification.md](docs/rivton/verification.md) para evidencia ejecutada y limitaciones.

`bun run typecheck`, `bun run test`, `bun run build`. Pruebas de navegador: instalar Chromium con `bunx playwright install chromium`, iniciar Vite en 4173 y ejecutar `bun run test:e2e`.

Trabajar en ramas independientes; no publicar automáticamente en producción. WordPress y las integraciones reales corresponden a las siguientes fases.
