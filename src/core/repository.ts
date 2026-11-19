import { z } from "@/lib/validation";
import { urlSchema } from "./contracts";
import type { Property, SiteSettings, TeamInfo } from "@/lib/types";
import { themeSettingsSchema, defaultTheme, type ThemeSettings } from "./theme";
import { searchFilterDefinitionSchema, type SearchFilterDefinition } from "./contracts";
import { defaultFilters } from "./filter-definitions";
const image = z.object({ src: urlSchema, alt: z.string().max(1000) });
const property = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().max(300),
  operation: z.enum(["venta", "alquiler"]),
  type: z.enum(["casa", "departamento", "terreno", "local", "oficina"]),
  price: z
    .object({ amount: z.number().finite().nonnegative(), currency: z.enum(["USD", "ARS"]) })
    .nullable(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  lotArea: z.number().finite().nonnegative().optional(),
  coveredArea: z.number().finite().nonnegative().optional(),
  location: z.string().optional(),
  code: z.string().optional(),
  amenities: z.array(z.string()),
  featureIds: z.array(z.string().min(1).max(128)).max(100).optional(),
  description: z.string().max(10000).optional(),
  images: z.array(image),
  featured: z.boolean(),
  featuredOrder: z.number().int().optional(),
  publishedAt: z.string().date(),
  whatsapp: z
    .string()
    .regex(/^\d{6,20}$/)
    .optional(),
  calendlyUrl: z
    .string()
    .url()
    .refine((v) => {
      const u = new URL(v);
      return u.protocol === "https:" && u.hostname === "calendly.com" && !u.username && !u.password;
    })
    .optional(),
  coordinates: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .optional(),
});
export const snapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: z.string().min(1),
    properties: z.array(property).max(10000),
    settings: z.object({
      whatsapp: z
        .string()
        .regex(/^\d{6,20}$/)
        .optional(),
      email: z.string().email().optional(),
      phone: z.string().max(40).optional(),
      address: z.string().max(1000).optional(),
      socials: z.array(z.object({ label: z.string(), url: urlSchema })),
    }),
    team: z.object({ title: z.string(), body: z.string(), image }),
    theme: themeSettingsSchema.default(defaultTheme),
    filters: z.array(searchFilterDefinitionSchema).max(30).default(defaultFilters),
  })
  .superRefine((snapshot, ctx) => {
    for (const [name, values] of [
      ["property IDs", snapshot.properties.map((p) => p.id)],
      ["property slugs", snapshot.properties.map((p) => p.slug)],
      ["filter IDs", snapshot.filters.map((f) => f.id)],
      ["filter keys", snapshot.filters.map((f) => f.key)],
    ] as const) {
      if (new Set(values).size !== values.length)
        ctx.addIssue({ code: "custom", message: `Duplicate ${name}` });
    }
  });
export interface ContentSnapshot {
  schemaVersion: 1;
  revision: string;
  properties: Property[];
  settings: SiteSettings;
  team: TeamInfo;
  theme?: ThemeSettings | undefined;
  filters?: SearchFilterDefinition[] | undefined;
}
export interface ContentRepository {
  read(): Promise<ContentSnapshot>;
  invalidate(): void;
}
export class ContentUnavailableError extends Error {
  constructor() {
    super("Content temporarily unavailable");
    this.name = "ContentUnavailableError";
  }
}
export class MockContentRepository implements ContentRepository {
  constructor(private readonly snapshot: ContentSnapshot) {
    snapshotSchema.parse(snapshot);
  }
  async read() {
    return structuredClone(this.snapshot);
  }
  invalidate() {}
}
export class HttpContentRepository implements ContentRepository {
  private cached: { value: ContentSnapshot; expires: number } | undefined;
  private pending: Promise<ContentSnapshot> | undefined;
  private generation = 0;
  constructor(
    private readonly endpoint: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly ttl = 30000,
  ) {
    const u = new URL(endpoint);
    if (u.protocol !== "https:" || u.username || u.password || u.search || u.hash)
      throw new Error("Invalid public snapshot endpoint");
    if (!Number.isFinite(ttl) || ttl < 0 || ttl > 300000) throw new Error("Invalid cache TTL");
  }
  invalidate() {
    this.generation++;
    this.cached = undefined;
    this.pending = undefined;
  }
  async read(): Promise<ContentSnapshot> {
    if (this.cached && this.cached.expires > Date.now()) return structuredClone(this.cached.value);
    if (!this.pending) {
      const generation = this.generation;
      const task = this.load().then((value) => {
        if (generation === this.generation) this.cached = { value, expires: Date.now() + this.ttl };
        return value;
      });
      this.pending = task;
      void task
        .finally(() => {
          if (this.pending === task) this.pending = undefined;
        })
        .catch(() => {});
    }
    return structuredClone(await this.pending);
  }
  private async load(): Promise<ContentSnapshot> {
    try {
      const r = await this.fetcher(this.endpoint, {
        headers: { Accept: "application/json" },
        credentials: "omit",
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok || !r.headers.get("content-type")?.includes("application/json")) throw new Error();
      const reader = r.body?.getReader();
      if (!reader) throw new Error();
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          length += chunk.value.byteLength;
          if (length > 2000000) {
            await reader.cancel();
            throw new Error();
          }
          chunks.push(chunk.value);
        }
      } finally {
        reader.releaseLock();
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      return snapshotSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
    } catch {
      throw new ContentUnavailableError();
    }
  }
}
export function createContentRepository(
  config: { provider: string; publicEndpoint?: string | undefined },
  mock: ContentSnapshot,
): ContentRepository {
  if (config.provider === "mock") return new MockContentRepository(mock);
  if (config.provider === "http" && config.publicEndpoint)
    return new HttpContentRepository(config.publicEndpoint);
  throw new Error("Invalid content provider configuration");
}
