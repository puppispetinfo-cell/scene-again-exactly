import { createServerFn } from "@tanstack/react-start";
import { z } from "@/lib/validation";
import {
  schemas,
  propertyDraftSchema,
  pageSchema,
  settingsSchema,
  marketingSchema,
  formSchema,
  type SiteConfig,
  type PageDocument,
} from "./contracts";
import { defaultTheme } from "@/core/theme";
import { defaultFilters } from "@/core/filter-definitions";
import type { ContentSnapshot } from "@/core/repository";
import type { SearchFilterDefinition } from "@/core/contracts";
import type { Property } from "@/lib/types";
export interface PublicSnapshot extends ContentSnapshot {
  preview?: boolean;
  siteOrigin?: string;
  environment?: "development" | "staging" | "production";
  pages: Record<string, PageDocument>;
  configuration: SiteConfig | null;
  catalogs: {
    id: string;
    kind: string;
    slug: string;
    label: string;
    definition: Record<string, unknown>;
  }[];
  formIds?: Record<string, string>;
  forms: Record<string, z.infer<typeof formSchema>>;
  marketing: z.infer<typeof marketingSchema> | null;
  members: z.infer<typeof schemas.team>[];
}
export const readPublic = createServerFn({ method: "GET" }).handler(async () => {
  const { publishedSnapshot } = await import("./server/public");
  return JSON.stringify(await publishedSnapshot());
});
