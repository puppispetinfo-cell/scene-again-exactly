import { publicClient } from "./client";
const xml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!,
  );
export async function sitemap() {
  try {
    const origin = new URL(process.env["SITE_ORIGIN"] ?? "");
    if (origin.protocol !== "https:" || origin.pathname !== "/") throw new Error();
    const { data, error } = await publicClient()
      .from("published_content")
      .select("kind,slug,document,published_at")
      .in("kind", ["page", "property"])
      .limit(1001);
    if (error || !data || data.length > 1000) throw new Error();
    const urls = data
      .filter(
        (r) =>
          r.document.seo?.index &&
          r.document.commercialStatus !== "unavailable" &&
          r.slug !== "ficha",
      )
      .map((r) => ({
        loc: new URL(
          r.kind === "property" ? `/propiedades/${r.slug}` : r.slug === "/" ? "/" : `/${r.slug}`,
          origin,
        ).href,
        lastmod: r.published_at,
      }));
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${xml(u.loc)}</loc><lastmod>${xml(u.lastmod)}</lastmod></url>`).join("")}</urlset>`,
      {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Robots-Tag": process.env["SITE_ENVIRONMENT"] === "production" ? "index" : "noindex",
        },
      },
    );
  } catch {
    return new Response("El sitemap no está disponible.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
export async function llms() {
  try {
    const { data } = await publicClient()
      .from("published_content")
      .select("document")
      .eq("kind", "settings")
      .eq("slug", "global")
      .single();
    if (!data) throw new Error();
    const s = data.document;
    return new Response(
      `# ${s.name}\n\n${s.presentation}\n\nCobertura: ${s.coverage}\nContacto: ${s.email}\n\n## Contenido\n- [Propiedades](/propiedades)\n- [Nosotros](/nosotros)\n- [Contacto](/contacto)\n\nLas condiciones y disponibilidad de cada inmueble deben confirmarse con el equipo.\n`,
      { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } },
    );
  } catch {
    return new Response("Contenido no disponible.", { status: 503 });
  }
}
export async function contentRedirect(path: string) {
  if (!path.startsWith("/propiedades/") || process.env["VITE_CONTENT_PROVIDER"] === "mock")
    return null;
  const { data } = await publicClient()
    .from("content_redirects")
    .select("target,status")
    .eq("path", path)
    .maybeSingle();
  if (!data) return null;
  if (
    data.status === 301 &&
    typeof data.target === "string" &&
    data.target.startsWith("/") &&
    !data.target.startsWith("//")
  )
    return new Response(null, { status: 301, headers: { Location: data.target } });
  return new Response(
    '<!doctype html><html lang="es"><meta name="robots" content="noindex"><meta charset="utf-8"><title>Propiedad no disponible — RIVTON Group</title><body><main><h1>Propiedad no disponible</h1><p>Esta propiedad fue retirada del catálogo.</p><a href="/propiedades">Explorar propiedades</a></main></body></html>',
    {
      status: 410,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    },
  );
}
