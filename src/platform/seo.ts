import { buildSEOHead } from "@/core/seo";
import type { PublicSnapshot } from "./public-content";
import type { Property } from "@/lib/types";
interface Match {
  loaderData?: unknown;
  pathname?: string;
  search?: object;
}
function snapshot(matches: Match[]) {
  return (matches[0]?.loaderData as { cms?: PublicSnapshot } | undefined)?.cms;
}
export function pageSEO(matches: Match[], slug: string) {
  const cms = snapshot(matches),
    page = cms?.pages[slug];
  if (!cms || !page) return null;
  const last = matches[matches.length - 1];
  const filtered = slug === "propiedades" && Object.keys(last?.search ?? {}).length > 0;
  return buildSEOHead(
    {
      title: page.seo.title,
      description: page.seo.description,
      ...(page.seo.canonical ? { canonical: page.seo.canonical } : {}),
      openGraph: {
        title: page.seo.openGraphTitle ?? page.seo.title,
        description: page.seo.openGraphDescription ?? page.seo.description,
      },
      index: page.seo.index && !cms.preview && !filtered && slug !== "favoritos",
      follow: true,
      structuredData: [],
    },
    cms.siteOrigin ?? "https://rivton.example",
    slug === "/" ? "/" : `/${slug}`,
    cms.environment ?? "staging",
  );
}
export function propertySEO(matches: Match[], p: Property | undefined) {
  const cms = snapshot(matches);
  if (!cms || !p?.seo) return null;
  return buildSEOHead(
    { ...p.seo, index: p.seo.index && !cms.preview },
    cms.siteOrigin ?? "https://rivton.example",
    `/propiedades/${p.slug}`,
    cms.environment ?? "staging",
  );
}
