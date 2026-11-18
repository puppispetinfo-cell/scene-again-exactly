import { z } from "zod";
import {
  mediaAssetSchema,
  seoSettingsSchema,
  actionSchema,
  pageDefinitionSchema,
  pageSectionSchema,
  propertySchema,
  propertyFeatureSchema,
  teamMemberSchema,
} from "../../src/core/contracts";
const text = z.string().max(10000),
  id = z.string().min(1).max(128);
export const responsiveLayoutSchema = z
  .object({
    title: z.string().max(500).optional(),
    subtitle: z.string().max(2000).optional(),
    body: text.optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    focalX: z.number().min(0).max(100).optional(),
    focalY: z.number().min(0).max(100).optional(),
    height: z.number().min(200).max(1200).optional(),
    fontSize: z.number().min(12).max(120).optional(),
    spacing: z.number().min(0).max(160).optional(),
    columns: z.number().int().min(1).max(6).optional(),
    visible: z.boolean().optional(),
    overlay: z.number().min(0).max(1).optional(),
    overlayColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    transition: z.number().min(0).max(1).optional(),
    media: mediaAssetSchema.optional(),
    background: mediaAssetSchema.optional(),
    buttonLayout: z.enum(["row", "stack"]).optional(),
    carousel: z.enum(["manual", "auto"]).optional(),
    interval: z.number().min(2000).max(20000).optional(),
  })
  .strict();
export const responsiveOverridesSchema = z
  .object({
    desktop: responsiveLayoutSchema.optional(),
    tablet: responsiveLayoutSchema.optional(),
    mobile: responsiveLayoutSchema.optional(),
  })
  .strict();
export const sceneSchema = z
  .object({
    id,
    schemaVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
    extensions: z.record(z.unknown()).default({}),
    title: z.string().max(500),
    subtitle: z.string().max(2000),
    media: mediaAssetSchema.optional(),
    layout: responsiveLayoutSchema,
    overrides: responsiveOverridesSchema,
    visible: z.boolean(),
    actions: z.array(actionSchema).max(100).optional(),
  })
  .strict();
export const visualSectionSchema = pageSectionSchema.extend({
  type: z.enum([
    "story",
    "featured",
    "categories",
    "latest",
    "banner",
    "team",
    "text",
    "faq",
    "lead-form",
    "hero",
    "search",
    "carousel",
    "cta",
    "services",
    "map",
    "contact",
    "heading",
    "footer",
  ]),
  label: z.string().max(150).optional(),
  layout: responsiveLayoutSchema.optional(),
  overrides: responsiveOverridesSchema.optional(),
  scenes: z.array(sceneSchema).max(3).optional(),
  faqs: z
    .array(
      z
        .object({
          id,
          group: z.enum([
            "Compra",
            "Venta",
            "Alquiler",
            "Publicación",
            "Tasaciones",
            "Visitas",
            "Contacto",
          ]),
          question: z.string().max(500),
          answer: z.string().max(3000),
        })
        .strict(),
    )
    .max(100)
    .optional(),
});
export const visualPageSchema = pageDefinitionSchema.extend({
  sections: z.array(visualSectionSchema),
});
export const geographySchema = z
  .object({
    id,
    schemaVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
    extensions: z.record(z.unknown()).default({}),
    name: z.string().max(150),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    level: z.enum(["province", "city", "neighborhood"]),
    parentId: id.optional(),
    description: text,
    image: mediaAssetSchema.optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    order: z.number().int().nonnegative(),
    active: z.boolean(),
    seo: seoSettingsSchema,
  })
  .strict();
export const catalogFeatureSchema = propertyFeatureSchema.extend({
  icon: z
    .enum([
      "home",
      "bed",
      "bath",
      "area",
      "car",
      "pool",
      "garden",
      "security",
      "gym",
      "balcony",
      "sun",
      "building",
      "check",
    ])
    .optional(),
  valueType: z.enum(["number", "boolean", "text", "select"]),
  group: z.enum(["structural", "amenity"]).optional(),
  order: z.number().int().nonnegative().optional(),
  visible: z.boolean().optional(),
  filterVisible: z.boolean().optional(),
  options: z.array(z.string().max(150)).max(100).optional(),
  unit: z.enum(["m²", "años", "unidades", "ninguna"]).optional(),
});
export const studioPropertySchema = propertySchema.extend({
  propertyTypeId: id.optional(),
  provinceId: id.optional(),
  cityId: id.optional(),
  neighborhoodId: id.optional(),
  agentId: id.optional(),
  videos: z.array(mediaAssetSchema).max(100).optional(),
  attributes: z
    .record(z.union([z.number().min(0).max(1e9), z.boolean(), z.string().max(150)]))
    .optional(),
});
export const studioTeamSchema = teamMemberSchema
  .partial({ role: true, biography: true, photo: true })
  .extend({ order: z.number().int().nonnegative().optional(), visible: z.boolean().optional() });
export type ResponsiveLayout = z.infer<typeof responsiveLayoutSchema>;
export type VisualSection = z.infer<typeof visualSectionSchema>;
export type VisualPage = z.infer<typeof visualPageSchema>;
export type Geography = z.infer<typeof geographySchema>;
export type CatalogFeature = z.infer<typeof catalogFeatureSchema>;
export type StudioProperty = z.infer<typeof studioPropertySchema>;
export interface WorkspaceEnvelope<T> {
  schemaVersion: 1;
  document: T;
  recordStatus: "draft" | "published" | "archived" | "trash";
  draftRevision: number;
  baseRevision: number;
  hasDraft: boolean;
  preview: { mode: "representative"; reactConnected: false };
}
export interface RevisionMetadata {
  sequence: number;
  revision: number;
  actor: number;
  status: string;
  created_at: string;
  source: "live" | "draft";
}
export interface WhatsAppIntent {
  schemaVersion: 1;
  url: string;
  state: "intent_only";
  leadStored: false;
  messageSent: false;
  notice: string;
}
/** Resolve one document without creating a second page. Deleting an override restores inheritance. */
export function resolveResponsive(
  base: ResponsiveLayout,
  overrides: z.infer<typeof responsiveOverridesSchema>,
  device: "desktop" | "tablet" | "mobile",
): ResponsiveLayout {
  return { ...base, ...overrides[device] };
}
