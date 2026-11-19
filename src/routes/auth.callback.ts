import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url),
          code = url.searchParams.get("code"),
          hash = url.searchParams.get("token_hash"),
          type = url.searchParams.get("type");
        if (
          (!code || code.length > 2000) &&
          (!hash || hash.length > 2000 || !["invite", "recovery"].includes(type ?? ""))
        )
          return new Response("El enlace no es válido o venció.", { status: 400 });
        try {
          const { sessionClient } = await import("@/platform/server/client");
          const auth = sessionClient().auth;
          const { error } = hash
            ? await auth.verifyOtp({ token_hash: hash, type: type as "invite" | "recovery" })
            : await auth.exchangeCodeForSession(code!);
          if (error) return new Response("El enlace no es válido o venció.", { status: 400 });
          return new Response(null, {
            status: 303,
            headers: {
              Location: "/admin?recuperar=1",
              "Cache-Control": "no-store",
              "Referrer-Policy": "no-referrer",
              "X-Robots-Tag": "noindex",
            },
          });
        } catch {
          return new Response("No se pudo verificar el acceso.", { status: 400 });
        }
      },
    },
  },
});
