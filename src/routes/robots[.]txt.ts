import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const production = process.env["SITE_ENVIRONMENT"] === "production";
        const origin = process.env["SITE_ORIGIN"] ?? "";
        return new Response(
          production
            ? `User-agent: *\nDisallow: /admin\nDisallow: /preview\nDisallow: /api/\nDisallow: /_serverFn/\n${origin ? `Sitemap: ${origin.replace(/\/$/, "")}/sitemap.xml\n` : ""}`
            : "User-agent: *\nDisallow: /\n",
          { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
