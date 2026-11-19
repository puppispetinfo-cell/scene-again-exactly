import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/media")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { upload } = await import("@/platform/server/images");
          return Response.json(await upload(request), { headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "No se pudo subir la foto." },
            { status: 400, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
