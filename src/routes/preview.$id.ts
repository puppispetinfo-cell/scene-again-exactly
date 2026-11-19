import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/preview/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { startPreview } = await import("@/platform/server/preview");
          const destination = await startPreview(params.id);
          return new Response(null, {
            status: 303,
            headers: {
              Location: destination,
              "Cache-Control": "private, no-store",
              "X-Robots-Tag": "noindex, nofollow",
              "Referrer-Policy": "no-referrer",
            },
          });
        } catch {
          return new Response("Iniciá sesión para previsualizar este contenido.", {
            status: 403,
            headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
          });
        }
      },
    },
  },
});
