import { z } from "@/lib/validation";

// Versioned public DTOs. No WordPress storage details or private credentials.
export const idSchema = z.string().min(1).max(128);
export const urlSchema = z
  .string()
  .max(2048)
  .regex(
    /^(?:\/(?!\/)[^\\\x00-\x20\x7f]*|https:\/\/[^\/@\\\x00-\x20\x7f]+(?:[\/?#][^\\\x00-\x20\x7f]*)?)$/,
  )
  .refine((value) => {
    if (/[\\\s]/.test(value) || [...value].some((char) => char.charCodeAt(0) < 32)) return false;
    if (/^\/(?!\/)/.test(value)) return true;
    try {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Expected a local path or HTTPS URL");
const text = z.string().max(10000);
const entity = z.object({
  id: idSchema,
  schemaVersion: z.literal(1),
  revision: z.number().int().nonnegative(),
  extensions: z.record(z.string(), z.unknown()).default({}),
});
export const mediaAssetSchema = entity.extend({
  src: urlSchema,
  alt: text,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  kind: z.enum(["image", "video"]),
  illustrative: z.boolean().default(false),
});
export const seoSettingsSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(500),
  canonical: urlSchema.optional(),
  index: z.boolean(),
  follow: z.boolean(),
  openGraph: z
    .object({ title: text, description: text, image: mediaAssetSchema.optional() })
    .optional(),
  structuredData: z
    .array(
      z.object({
        type: z.enum(["Organization", "BreadcrumbList", "RealEstateListing", "FAQPage"]),
        sourceIds: z.array(idSchema),
      }),
    )
    .default([]),
});
export const actionSchema = z.object({
  id: idSchema,
  label: text,
  href: urlSchema,
  newWindow: z.boolean().default(false),
});
export const navigationMenuSchema = entity.extend({
  location: z.enum(["header", "mobile", "dock", "footer"]),
  items: z
    .array(
      actionSchema.extend({
        icon: z.enum(["home", "search", "heart", "publish", "users", "mail", "external"]),
        visible: z.boolean(),
        order: z.number().int(),
      }),
    )
    .max(30),
});
export const siteSettingsSchema = entity.extend({
  name: text,
  locale: z.string().max(35),
  currencies: z.array(z.enum(["ARS", "USD"])),
  domain: z.string().url(),
  logo: mediaAssetSchema.optional(),
  alternateLogo: mediaAssetSchema.optional(),
  favicon: mediaAssetSchema.optional(),
  whatsapp: z
    .string()
    .regex(/^\d{6,20}$/)
    .optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  address: text.optional(),
  socials: z.array(z.object({ label: text, url: urlSchema })),
  footerText: text,
  legalPageIds: z.array(idSchema),
});
const responsiveSchema = z.object({
  visible: z.boolean().default(true),
  columns: z.number().int().min(1).max(6).optional(),
  spacing: z.enum(["compact", "normal", "wide"]).optional(),
});
export const sectionTypes = [
  "story",
  "featured",
  "categories",
  "latest",
  "banner",
  "team",
  "text",
  "faq",
  "lead-form",
] as const;
export const pageSectionSchema = entity.extend({
  type: z.enum(sectionTypes),
  content: z.record(z.string(), text),
  design: z.object({
    variant: z.enum(["default", "dark", "glass"]),
    colorScheme: idSchema.optional(),
  }),
  visible: z.boolean(),
  order: z.number().int(),
  responsive: z.object({ mobile: responsiveSchema, desktop: responsiveSchema }),
  actions: z.array(actionSchema),
  media: z.array(mediaAssetSchema),
});
export const pageDefinitionSchema = entity.extend({
  slug: z.string().regex(/^(\/|[a-z0-9]+(?:-[a-z0-9]+)*)$/),
  title: text,
  status: z.enum(["draft", "published", "archived"]),
  seo: seoSettingsSchema,
  sections: z.array(pageSectionSchema),
});
export const propertyCategorySchema = entity.extend({
  slug: idSchema,
  label: text,
  kind: z.enum(["operation", "type", "location"]),
  visible: z.boolean(),
  order: z.number().int(),
});
export const propertyFeatureSchema = entity.extend({
  label: text,
  icon: idSchema.optional(),
  valueType: z.enum(["boolean", "number", "text"]),
});
export const searchFilterDefinitionSchema = entity
  .extend({
    key: z.enum([
      "operacion",
      "tipo",
      "ubicacion",
      "precioMax",
      "moneda",
      "superficieMin",
      "dormitorios",
      "banos",
      "piscina",
      "caracteristicas",
      "orden",
    ]),
    label: text,
    emptyLabel: text.optional(),
    placeholder: text.optional(),
    presentation: z.enum(["tabs", "select", "text", "number", "checkbox", "multiselect"]),
    options: z.array(z.object({ value: idSchema, label: text })),
    visible: z.boolean(),
    order: z.number().int(),
    categoryIds: z.array(idSchema),
    featureIds: z.array(idSchema),
  })
  .superRefine((filter, ctx) => {
    const presentations: Record<string, string[]> = {
      operacion: ["tabs", "select"],
      tipo: ["select"],
      ubicacion: ["text"],
      precioMax: ["select", "number"],
      moneda: ["select"],
      superficieMin: ["number"],
      dormitorios: ["select", "number"],
      banos: ["select", "number"],
      piscina: ["checkbox"],
      caracteristicas: ["multiselect"],
      orden: ["select"],
    };
    if (!presentations[filter.key]?.includes(filter.presentation))
      ctx.addIssue({ code: "custom", message: "Unsupported filter presentation" });
    const known: Record<string, string[]> = {
      moneda: ["ARS", "USD"],
      orden: ["recientes", "precio-asc", "precio-desc"],
    };
    const values = filter.options.map((o) => o.value);
    if (
      ["tipo", "operacion"].includes(filter.key) &&
      values.some((v) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v))
    )
      ctx.addIssue({ code: "custom", message: "Invalid catalog slug" });
    if (new Set(values).size !== values.length)
      ctx.addIssue({ code: "custom", message: "Duplicate filter option" });
    if (known[filter.key] && values.some((v) => !known[filter.key]?.includes(v)))
      ctx.addIssue({ code: "custom", message: "Unknown catalog value in compatibility schema" });
    if (
      ["precioMax", "dormitorios", "banos", "superficieMin"].includes(filter.key) &&
      values.some((v) => !Number.isFinite(Number(v)) || Number(v) <= 0)
    )
      ctx.addIssue({ code: "custom", message: "Invalid numeric option" });
  });
export const propertySchema = entity.extend({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: text,
  operation: z.enum(["venta", "alquiler"]),
  type: z.enum(["casa", "departamento", "terreno", "local", "oficina"]),
  categoryIds: z.array(idSchema),
  featureIds: z.array(idSchema),
  status: z.enum(["published", "reserved", "sold", "rented", "withdrawn"]),
  price: z
    .object({ amount: z.number().finite().nonnegative(), currency: z.enum(["ARS", "USD"]) })
    .nullable(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  lotArea: z.number().finite().nonnegative().optional(),
  coveredArea: z.number().finite().nonnegative().optional(),
  location: text.optional(),
  code: text.optional(),
  amenities: z.array(text),
  description: text.optional(),
  images: z.array(mediaAssetSchema),
  featured: z.boolean(),
  featuredOrder: z.number().int().optional(),
  publishedAt: z.string().date(),
  updatedAt: z.string().datetime(),
  whatsapp: z
    .string()
    .regex(/^\d{6,20}$/)
    .optional(),
  calendly: z.object({
    enabled: z.boolean(),
    url: z
      .string()
      .url()
      .refine((v) => {
        try {
          const u = new URL(v);
          return (
            u.protocol === "https:" && u.hostname === "calendly.com" && !u.username && !u.password
          );
        } catch {
          return false;
        }
      })
      .optional(),
    label: text,
    mode: z.enum(["link", "modal", "embed"]),
  }),
  seo: seoSettingsSchema,
});
export const teamMemberSchema = entity.extend({
  name: text,
  role: text,
  biography: text,
  photo: mediaAssetSchema.optional(),
  order: z.number().int(),
  visible: z.boolean(),
});
export const leadSubmissionSchema = z.object({
  idempotencyKey: z.string().uuid(),
  formId: idSchema,
  propertyId: idSchema.optional(),
  name: z.string().trim().min(1).max(120),
  email: z.string().email().max(254),
  phone: z.string().max(30).optional(),
  message: z.string().trim().min(1).max(2000),
  consent: z.object({ privacyRevision: idSchema, accepted: z.literal(true) }),
  honeypot: z.literal(""),
});
export const integrationSettingsSchema = entity.extend({
  gtm: z.object({
    enabled: z.boolean(),
    containerId: z
      .string()
      .regex(/^GTM-[A-Z0-9]+$/)
      .optional(),
  }),
  ga4: z.object({
    enabled: z.boolean(),
    measurementId: z
      .string()
      .regex(/^G-[A-Z0-9]+$/)
      .optional(),
  }),
  googleAds: z.object({ enabled: z.boolean(), accountId: idSchema.optional() }),
  meta: z.object({
    enabled: z.boolean(),
    pixelId: z.string().regex(/^\d+$/).optional(),
    serverEventsEnabled: z.boolean(),
  }),
  searchConsole: z.object({
    enabled: z.boolean(),
    verification: z
      .string()
      .regex(/^[a-zA-Z0-9_-]+$/)
      .optional(),
  }),
  consentRequired: z.boolean(),
  utmDefaults: z.record(z.string(), z.string().max(200)),
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type NavigationMenu = z.infer<typeof navigationMenuSchema>;
export type PageDefinition = z.infer<typeof pageDefinitionSchema>;
export type PageSection = z.infer<typeof pageSectionSchema>;
export type Property = z.infer<typeof propertySchema>;
export type PropertyCategory = z.infer<typeof propertyCategorySchema>;
export type SearchFilterDefinition = z.infer<typeof searchFilterDefinitionSchema>;
export type PropertyFeature = z.infer<typeof propertyFeatureSchema>;
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type LeadSubmission = z.infer<typeof leadSubmissionSchema>;
export type SEOSettings = z.infer<typeof seoSettingsSchema>;
export type IntegrationSettings = z.infer<typeof integrationSettingsSchema>;
