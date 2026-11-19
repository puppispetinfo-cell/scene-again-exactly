import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/media/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!/^[a-f0-9-]{36}$/.test(params.id))
          return new Response("No disponible", { status: 404 });
        try {
          const { sessionClient } = await import("@/platform/server/client");
          const client = sessionClient();
          const { data: path, error } = await client.rpc("deliver_media", { p_id: params.id });
          if (error || !path) return new Response("No disponible", { status: 404 });
          const { data } = await client.storage.from("property-media").createSignedUrl(path, 60);
          if (!data) return new Response("No disponible", { status: 404 });
          return new Response(null, {
            status: 302,
            headers: {
              Location: data.signedUrl,
              "Cache-Control": "private, no-store",
              "X-Content-Type-Options": "nosniff",
              "Referrer-Policy": "no-referrer",
            },
          });
        } catch {
          return new Response("No disponible", { status: 503 });
        }
      },
    },
  },
});
