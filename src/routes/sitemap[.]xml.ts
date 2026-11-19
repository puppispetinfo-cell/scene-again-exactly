import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { sitemap } = await import("@/platform/server/discovery");
        return sitemap();
      },
    },
  },
});
