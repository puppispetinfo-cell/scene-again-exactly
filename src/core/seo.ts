import { seoSettingsSchema, urlSchema, type SEOSettings } from "./contracts";
// Pure metadata projection for TanStack route heads. No markup, scripts or invented schema data.
export function buildSEOHead(
  input: SEOSettings,
  siteOrigin: string,
  path: string,
  environment: "development" | "staging" | "production",
) {
  const seo = seoSettingsSchema.parse(input);
  const origin = new URL(siteOrigin);
  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  )
    throw new Error("Invalid canonical origin");
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid page path");
  urlSchema.parse(path);
  const canonical = new URL(seo.canonical ?? path, origin).href;
  const index = environment === "production" && seo.index;
  return {
    meta: [
      { title: seo.title },
      { name: "description", content: seo.description },
      {
        name: "robots",
        content: `${index ? "index" : "noindex"},${seo.follow ? "follow" : "nofollow"}`,
      },
      { property: "og:title", content: seo.openGraph?.title ?? seo.title },
      { property: "og:description", content: seo.openGraph?.description ?? seo.description },
      { property: "og:url", content: canonical },
      { property: "og:type", content: "website" },
      ...(seo.openGraph?.image
        ? [{ property: "og:image", content: new URL(seo.openGraph.image.src, origin).href }]
        : []),
    ],
    links: [{ rel: "canonical", href: canonical }],
  };
}
