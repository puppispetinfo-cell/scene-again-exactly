import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/preview/end")({
  server: {
    handlers: {
      GET: async () => {
        const { deleteCookie } = await import("@tanstack/react-start/server");
        deleteCookie("rivton-preview", { path: "/" });
        return new Response(null, {
          status: 303,
          headers: { Location: "/", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
