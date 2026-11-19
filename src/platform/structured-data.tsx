import { useLocation } from "@tanstack/react-router";
import { usePublished } from "./content-context";
export function encodeStructuredData(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
export function StructuredData() {
  const cms = usePublished(),
    path = useLocation().pathname;
  if (!cms?.configuration || cms.preview) return null;
  const origin = cms.siteOrigin;
  if (!origin || !origin.startsWith("https://")) return null;
  const config = cms.configuration;
  const organization = {
    "@type": "Organization",
    "@id": origin + "/#organization",
    name: config.name,
    url: origin,
    email: config.email,
    telephone: "+" + config.whatsapp,
    sameAs: [config.instagram],
  };
  const p = cms.properties.find((p) => path === `/propiedades/${p.slug}`);
  const graph: unknown[] = [organization];
  if (p) {
    graph.push({
      "@type": "RealEstateListing",
      "@id": origin + path,
      name: p.title,
      description: p.description,
      url: origin + path,
      datePosted: p.publishedAt,
      image: p.images.map((image) => new URL(image.src, origin).href),
      about: { "@type": "Place", name: p.title, address: p.location },
      ...(p.price
        ? {
            mainEntity: {
              "@type": "Offer",
              price: p.price.amount,
              priceCurrency: p.price.currency,
              url: origin + path,
              seller: { "@id": origin + "/#organization" },
            },
          }
        : {}),
    });
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: origin + "/" },
        { "@type": "ListItem", position: 2, name: "Propiedades", item: origin + "/propiedades" },
        { "@type": "ListItem", position: 3, name: p.title, item: origin + path },
      ],
    });
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: encodeStructuredData({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  );
}
