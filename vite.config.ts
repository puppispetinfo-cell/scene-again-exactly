// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import {loadEnv} from "vite";
Object.assign(process.env,loadEnv(process.env["NODE_ENV"]??"development",process.cwd(),""));
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {preset: process.env["NITRO_PRESET"]??"vercel"},
  vite: {
    server: {
      // Playwright traces contain HTML; watching them can reload the app mid-test.
      watch: { ignored: ["**/.tmp/**","**/.vercel/**","**/.output/**","**/docs/platform/evidence/**"] },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
