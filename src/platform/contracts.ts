import { z } from "@/lib/validation";
import { urlSchema } from "@/core/contracts";
export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 150);
const short = z.string().max(300),
  text = z.string().max(15000),
  uuid = z.string().uuid();
export const mediaSchema = z
  .object({
    id: uuid,
    src: urlSchema,
    alt: z.string().max(1000),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();
export const seoSchema = z
  .object({
    title: z.string().max(200),
    description: z.string().max(500),
    canonical: urlSchema.optional(),
    openGraphTitle: z.string().max(200).optional(),
    openGraphDescription: z.string().max(500).optional(),
    index: z.boolean(),
    manual: z.boolean().default(false),
  })
  .strict();
export const layoutSchema = z
  .object({
    title: short.optional(),
    subtitle: z.string().max(2000).optional(),
    body: text.optional(),
    image: mediaSchema.optional(),
    focalX: z.number().min(0).max(100).optional(),
    focalY: z.number().min(0).max(100).optional(),
  })
  .strict();
export const elementSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    label: short,
    title: short,
    subtitle: z.string().max(2000),
    body: text,
    image: mediaSchema.optional(),
    mobile: layoutSchema.default({}),
    desktop: layoutSchema.default({}),
    button: z.object({ label: short, href: urlSchema }).optional(),
    visible: z.boolean().default(true),
    propertyIds: z.array(uuid).max(20).default([]),
    categoryIds: z.array(uuid).max(20).default([]),
    automatic: z.boolean().default(true),
  })
  .strict();
export const pageSchema = z
  .object({
    title: short,
    slug: z.string().regex(/^(\/|[a-z0-9]+(?:-[a-z0-9]+)*)$/),
    elements: z.array(elementSchema).max(40),
    reviewApproved: z.boolean().default(false),
    seo: seoSchema,
  })
  .strict();
export const propertyDraftSchema = z
  .object({
    title: short.default(""),
    slug: z.string().max(150).default(""),
    code: z.string().max(40).default(""),
    typeId: uuid.nullable().default(null),
    operationId: uuid.nullable().default(null),
    commercialStatus: z
      .enum(["available", "reserved", "sold", "rented", "unavailable"])
      .default("available"),
    featured: z.boolean().default(false),
    novelty: z.boolean().default(false),
    summary: z.string().max(1000).default(""),
    description: text.default(""),
    provinceId: z.string().max(30).default(""),
    province: short.default(""),
    cityId: z.string().max(30).default(""),
    city: short.default(""),
    neighborhood: short.default(""),
    address: short.default(""),
    publicAddress: z.boolean().default(false),
    price: z
      .object({ amount: z.number().finite().min(0).max(1e12), currency: z.enum(["ARS", "USD"]) })
      .nullable()
      .default(null),
    attributes: z
      .record(
        z.string(),
        z.union([
          z.string().max(200),
          z.number().finite().min(0).max(1e9),
          z.boolean(),
          z.array(z.string().max(100)).max(50),
        ]),
      )
      .default({}),
    images: z.array(mediaSchema).max(60).default([]),
    seo: seoSchema.default({ title: "", description: "", index: true, manual: false }),
  })
  .strict();
export const propertyPublishSchema = propertyDraftSchema.superRefine((p, ctx) => {
  for (const key of [
    "title",
    "slug",
    "typeId",
    "operationId",
    "provinceId",
    "cityId",
    "description",
  ] as const)
    if (!p[key])
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: "Completá este campo antes de publicar",
      });
  if (p.price && p.price.amount <= 0)
    ctx.addIssue({
      code: "custom",
      path: ["price"],
      message: "Ingresá el precio o elegí precio a consultar",
    });
  if (!p.images.length)
    ctx.addIssue({ code: "custom", path: ["images"], message: "Agregá al menos una fotografía" });
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug))
    ctx.addIssue({ code: "custom", path: ["slug"], message: "La URL no es válida" });
});
export const catalogSchema = z
  .object({
    kind: z.enum(["type", "operation", "attribute"]),
    label: short.min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    active: z.boolean(),
    order: z.number().int().min(0),
    valueType: z.enum(["number", "boolean", "text", "select", "multiselect"]).default("boolean"),
    options: z.array(short).max(100).default([]),
    filterVisible: z.boolean().default(true),
    cardVisible: z.boolean().default(true),
  })
  .strict();
export const fieldSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
    label: short,
    type: z.enum(["name", "email", "phone", "text", "textarea", "select", "checkbox", "consent"]),
    required: z.boolean(),
    help: z.string().max(500),
    options: z.array(short).max(100),
  })
  .strict();
export const formSchema = z
  .object({
    name: short,
    active: z.boolean(),
    fields: z.array(fieldSchema).max(20),
    storeLead: z.boolean(),
    whatsapp: z.boolean(),
    emailEnabled: z.boolean(),
    recipient: z.string().email().or(z.literal("")),
    privacyApproved: z.boolean(),
    privacyRevision: z.string().max(100),
    successMessage: z.string().max(1000),
  })
  .strict();
export const settingsSchema = z
  .object({
    name: short,
    whatsapp: z.string().regex(/^\d{6,20}$/),
    email: z.string().email(),
    address: short,
    hours: short,
    instagram: urlSchema,
    temporariesUrl: urlSchema,
    footerText: z.string().max(1000),
    presentation: text,
    history: text,
    services: z.array(short),
    values: z.array(short),
    coverage: short,
    logo: mediaSchema.optional(),
    alternateLogo: mediaSchema.optional(),
    favicon: mediaSchema.optional(),
    whatsappTemplate: z.string().max(2000),
    filters: z
      .array(
        z
          .object({
            key: z.string().regex(/^[a-zA-Z]+$/),
            label: short,
            visible: z.boolean(),
            order: z.number().int().min(0).max(100),
          })
          .strict(),
      )
      .max(20)
      .default([]),
    menu: z.array(z.object({ label: short, href: urlSchema })).max(20),
    theme: z
      .object({
        colors: z.partialRecord(
          z.enum([
            "primary",
            "secondary",
            "background",
            "foreground",
            "ink",
            "ink-foreground",
            "graphite",
            "sand",
          ]),
          z.string().regex(/^#[0-9a-f]{6}$/i),
        ),
      })
      .strict(),
  })
  .strict();
const integration = (regex: RegExp) =>
  z
    .object({ enabled: z.boolean(), id: z.string().regex(regex).or(z.literal("")) })
    .refine((v) => !v.enabled || Boolean(v.id), {
      message: "Completá el identificador antes de activar",
    });
export const marketingSchema = z
  .object({
    name: z.literal("Marketing").default("Marketing"),
    mode: z.enum(["gtm", "direct"]),
    gtm: integration(/^GTM-[A-Z0-9]+$/),
    ga4: integration(/^G-[A-Z0-9]+$/),
    meta: integration(/^\d{5,30}$/),
    ads: integration(/^AW-\d+$/),
    adsLabels: z.partialRecord(
      z.enum(["generate_lead", "contact_form_submit", "whatsapp_click"]),
      z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
    ),
    consentRequired: z.literal(true),
  })
  .strict();
export const teamSchema = z
  .object({
    name: short.min(1),
    role: short.optional(),
    biography: text.optional(),
    photo: mediaSchema.optional(),
  })
  .strict();
export const schemas = {
  property: propertyDraftSchema,
  page: pageSchema,
  settings: settingsSchema,
  form: formSchema,
  marketing: marketingSchema,
  team: teamSchema,
};
export const kindSchema = z.enum(["property", "page", "settings", "form", "marketing", "team"]);
export type Kind = z.infer<typeof kindSchema>;
export type Estate = z.infer<typeof propertyDraftSchema>;
export type PageDocument = z.infer<typeof pageSchema>;
export type Element = z.infer<typeof elementSchema>;
export type SiteConfig = z.infer<typeof settingsSchema>;
export type Catalog = z.infer<typeof catalogSchema> & { id: string };
export interface ContentRecord {
  id: string;
  kind: Kind;
  slug: string;
  document: Record<string, unknown>;
  revision: number;
  status: "draft" | "published" | "archived";
  updated_at: string;
}
export function suggestSEO(p: Estate) {
  return {
    title: `${p.title} | RIVTON`,
    description: [
      p.summary || p.title,
      p.city,
      p.neighborhood,
      p.price
        ? `${p.price.currency} ${p.price.amount.toLocaleString("es-AR")}`
        : "Precio a consultar",
    ]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 160),
    slug: slugify(p.title),
    alt: [p.title, p.city].filter(Boolean).join(" — "),
  };
}
export function normalizeNeighborhood(s: string) {
  return s.trim().replace(/\s+/g, " ").normalize("NFC");
}
export function publicProperty(p: Estate) {
  return { ...p, address: p.publicAddress ? p.address : "" };
}
