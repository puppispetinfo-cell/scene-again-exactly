import { z } from "@/lib/validation";
import { setResponseHeader, getRequest } from "@tanstack/react-start/server";
import type { PublicSnapshot } from "../public-content";
import {
  schemas,suggestSEO,
  propertyDraftSchema,
  pageSchema,
  settingsSchema,
  marketingSchema,
  formSchema,
  type SiteConfig,
  type PageDocument,
} from "../contracts";
import { defaultTheme } from "@/core/theme";
import { defaultFilters } from "@/core/filter-definitions";
import type { ContentSnapshot } from "@/core/repository";
import type { SearchFilterDefinition } from "@/core/contracts";
import type { Property } from "@/lib/types";

const requests = new WeakMap<Request, Promise<PublicSnapshot>>();
export function publishedSnapshot() {
  const request = getRequest();
  let pending = requests.get(request);
  if (!pending) {
    pending = loadPublic();
    requests.set(request, pending);
  }
  return pending;
}
async function loadPublic(): Promise<PublicSnapshot> {
  if (process.env["VITE_CONTENT_PROVIDER"] === "mock") {
    if (
      process.env["NODE_ENV"] === "production" &&
      (process.env["ALLOW_LOCAL_REGRESSION_FIXTURES"] !== "true" ||
        !["localhost", "127.0.0.1"].includes(new URL(getRequest().url).hostname))
    )
      throw new Error("El contenido de esta instalación no está configurado.");
    const { localProperties, localSettings, localTeam } = await import("@/data/properties");
    return {
      schemaVersion: 1,
      revision: "explicit-mock",
      properties: localProperties,
      settings: localSettings,
      team: localTeam,
      theme: defaultTheme,
      filters: defaultFilters,
      pages: {},
      configuration: null,
      catalogs: [],
      forms: {},
      marketing: null,
      members: [],
    };
  }
  if (process.env["VITE_CONTENT_PROVIDER"] !== "supabase")
    throw new Error("Elegí un proveedor de contenido válido para esta instalación.");
  const { publicClient } = await import("./client");
  const client = publicClient();
  const [{ data: rows, error }, { data: catalogs, error: catalogError }] = await Promise.all([
    client.from("published_content").select("*").order("id").limit(1001),
    client.from("catalog_entries").select("*").eq("active", true).order("sort_order").limit(501),
  ]);
  if (error || catalogError || !rows || !catalogs || rows.length > 1000 || catalogs.length > 500)
    throw new Error("El contenido no está disponible en este momento.");
  const { previewDocument } = await import("./preview");
  const preview = await previewDocument();
  if (preview) {
    const index = rows.findIndex((r) => r.id === preview.id);
    const replacement = { ...preview, published_at: new Date().toISOString() };
    if (index >= 0) rows[index] = replacement;
    else rows.push(replacement);
    setResponseHeader("Cache-Control", "private, no-store");
    setResponseHeader("X-Robots-Tag", "noindex, nofollow");
  }
  const configRow = rows.find((r) => r.kind === "settings");
  if (!configRow) throw new Error("La configuración inicial todavía no está publicada.");
  const config = settingsSchema.parse(configRow.document);
  const pages: Record<string, PageDocument> = {},
    forms: PublicSnapshot["forms"] = {},
    formIds: Record<string, string> = {};
  const members: PublicSnapshot["members"] = [];
  const properties: Property[] = [];
  let marketing: PublicSnapshot["marketing"] = null;
  for (const row of rows) {
    if (row.kind === "page") pages[row.slug] = pageSchema.parse(row.document);
    else if (row.kind === "team") members.push(schemas.team.parse(row.document));
    else if (row.kind === "form") {
      forms[row.slug] = formSchema.parse({ ...row.document, recipient: "" });
      formIds[row.slug] = row.id;
    } else if (row.kind === "marketing") marketing = marketingSchema.parse(row.document);
    else if (row.kind === "property") {
      const p = propertyDraftSchema.parse(row.document);
      if (p.commercialStatus === "unavailable") continue;
      const type = catalogs.find((c) => c.id === p.typeId),
        op = catalogs.find((c) => c.id === p.operationId);
      if (!type || !op) throw new Error("Una categoría del catálogo necesita revisión.");
      const number = (slug: string) => {
        const c = catalogs.find((c) => c.kind === "attribute" && c.slug === slug);
        const v = c ? p.attributes[c.id] : undefined;
        return typeof v === "number" ? v : undefined;
      };
      const amenity = catalogs.filter((c) => c.kind === "attribute" && p.attributes[c.id] === true);
      properties.push({
        id: row.id,
        slug: row.slug,
        title: p.title,
        code: p.code,
        operation: op.slug,
        operationLabel: op.label,
        type: type.slug,
        price: p.price,
        bedrooms: number("dormitorios"),
        bathrooms: number("banos"),
        coveredArea: number("superficie-cubierta"),
        lotArea: number("superficie-del-terreno"),
        location: [p.neighborhood, p.city, p.province].filter(Boolean).join(", "),
        locationIds: [p.provinceId, p.cityId],
        amenities: amenity.map((c) => c.label),
        featureIds: amenity.map((c) => c.id),
        description: p.description,
        images: p.images,
        featured: p.featured,
        novelty: p.novelty,
        publishedAt: row.published_at.slice(0, 10),
        typeLabel: type.label,
        seo: {
          title: p.seo.manual?p.seo.title:(p.seo.title||suggestSEO(p).title),
          description: p.seo.manual?p.seo.description:(p.seo.description||suggestSEO(p).description),
          index: p.seo.index,
          follow: true,
          openGraph: {
            title: p.seo.openGraphTitle ?? p.seo.title ?? p.title,
            description: p.seo.openGraphDescription ?? p.seo.description ?? p.summary,
          },
          structuredData: [],
        },
        attributes: p.attributes,
        commercialStatus: p.commercialStatus,
      });
    }
  }
  const filters: SearchFilterDefinition[] = defaultFilters.map((f) =>
    f.key === "tipo"
      ? {
          ...f,
          options: catalogs
            .filter((c) => c.kind === "type" && c.definition.filterVisible !== false)
            .map((c) => ({ value: c.slug, label: c.label })),
        }
      : f.key === "operacion"
        ? {
            ...f,
            options: catalogs
              .filter((c) => c.kind === "operation" && c.definition.filterVisible !== false)
              .map((c) => ({ value: c.slug, label: c.label })),
          }
        : f.key === "caracteristicas"
          ? {
              ...f,
              visible: true,
              options: catalogs
                .filter(
                  (c) =>
                    c.kind === "attribute" &&
                    c.definition.filterVisible &&
                    c.definition.valueType === "boolean",
                )
                .map((c) => ({ value: c.id, label: c.label })),
            }
          : f,
  );
  const about = pages["nosotros"]?.elements.find((e) => e.id === "about");
  const teamImage = about?.image ?? pages["/"]?.elements.find((e) => e.id === "team")?.image;
  return {
    siteOrigin: process.env["SITE_ORIGIN"] ?? "https://rivton.example",
    environment: process.env["SITE_ENVIRONMENT"] === "production" ? "production" : "staging",
    preview: Boolean(preview),
    schemaVersion: 1,
    revision: rows.map((r) => `${r.id}:${r.revision}`).join(","),
    properties,
    settings: { ...config, socials: [{ label: "Instagram", url: config.instagram }] },
    team: {
      title: about?.title ?? "",
      body: about?.body ?? "",
      image: teamImage ?? { src: "", alt: "" },
    },
    theme: { ...defaultTheme, colors: config.theme.colors },
    filters: filters.map((f) => {
      const override = config.filters.find((o) => o.key === f.key);
      return override
        ? { ...f, label: override.label, visible: override.visible, order: override.order }
        : f;
    }),
    pages,
    configuration: config,
    catalogs,
    formIds,
    forms,
    marketing,
    members,
  };
}
