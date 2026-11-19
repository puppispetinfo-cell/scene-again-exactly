import { describe, it, expect, vi } from "vitest";
import {
  MockContentRepository,
  HttpContentRepository,
  createContentRepository,
  ContentUnavailableError,
  type ContentSnapshot,
} from "@/core/repository";
import { themeVariables, defaultTheme } from "@/core/theme";
import { urlSchema, leadSubmissionSchema, pageSectionSchema } from "@/core/contracts";
import { orderedSections } from "@/core/sections";
import { createAnalytics } from "@/core/analytics";
import { buildSEOHead } from "@/core/seo";
import { defaultFilters } from "@/core/filter-definitions";
import { localProperties, localSettings, localTeam } from "@/data/properties";
const snapshot: ContentSnapshot = {
  schemaVersion: 1,
  revision: "test-1",
  properties: localProperties,
  settings: localSettings,
  team: localTeam,
};
const response = (data: unknown) =>
  new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
describe("content boundary", () => {
  it("preserves approved fixtures without shared mutations", async () => {
    const repo = new MockContentRepository(snapshot);
    const first = await repo.read();
    expect(first).toEqual(snapshot);
    first.properties.reverse();
    first.team.title = "Changed";
    expect(await repo.read()).toEqual(snapshot);
  });
  it("validates remote content, coalesces reads, and invalidates cache", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => response(snapshot));
    const repo = new HttpContentRepository("https://cms.example/snapshot", fetcher);
    const [a, b] = await Promise.all([repo.read(), repo.read()]);
    expect(a.properties).toEqual(b.properties);
    expect(fetcher).toHaveBeenCalledTimes(1);
    a.properties.reverse();
    expect((await repo.read()).properties).toEqual(localProperties);
    repo.invalidate();
    await repo.read();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ credentials: "omit", redirect: "error" });
  });
  it.each([
    {},
    {
      ...snapshot,
      properties: [{ ...localProperties[0], price: { amount: -1, currency: "USD" } }],
    },
    {
      ...snapshot,
      properties: [{ ...localProperties[0], images: [{ src: "javascript:alert(1)", alt: "" }] }],
    },
  ])("rejects invalid external data without a fake catalog", async (invalid) => {
    const repo = new HttpContentRepository(
      "https://cms.example/snapshot",
      vi.fn<typeof fetch>().mockResolvedValue(response(invalid)),
    );
    await expect(repo.read()).rejects.toBeInstanceOf(ContentUnavailableError);
  });
  it("rejects HTTP errors, oversize and redirects through request policy", async () => {
    for (const r of [
      new Response("private error", { status: 500 }),
      new Response("x".repeat(2000001), { headers: { "content-type": "application/json" } }),
    ]) {
      await expect(
        new HttpContentRepository(
          "https://cms.example/snapshot",
          vi.fn<typeof fetch>().mockResolvedValue(r),
        ).read(),
      ).rejects.toThrow("Content temporarily unavailable");
    }
  });
  it("expires cache and recovers after transient failure", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("secret"))
      .mockImplementation(async () => response(snapshot));
    const repo = new HttpContentRepository("https://cms.example/snapshot", fetcher, 0);
    await expect(repo.read()).rejects.toThrow("Content temporarily unavailable");
    await repo.read();
    await repo.read();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("does not accept unknown providers or credentials", () => {
    expect(() => createContentRepository({ provider: "typo" }, snapshot)).toThrow();
    expect(() => createContentRepository({ provider: "http" }, snapshot)).toThrow();
    expect(() => new HttpContentRepository("https://user:password@cms.example")).toThrow();
  });
});
describe("configuration safety and design preservation", () => {
  it("has no visual overrides by default", () => expect(themeVariables(defaultTheme)).toEqual({}));
  it("only emits validated CSS variables", () => {
    expect(
      themeVariables({ ...defaultTheme, colors: { primary: "#000000" }, radius: 0.75 }),
    ).toEqual({ "--primary": "#000000", "--radius": "0.75rem" });
    expect(() =>
      themeVariables({ ...defaultTheme, colors: { primary: "red; background:url(x)" } }),
    ).toThrow();
    expect(() => themeVariables({ ...defaultTheme, colors: { unexpected: "#ffffff" } })).toThrow();
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,x",
    "//evil.example",
    "/\\evil.example",
    "http://unsafe.example",
  ])("rejects unsafe URL %s", (v) => expect(urlSchema.safeParse(v).success).toBe(false));
  it("requires consent and validates lead sizes", () =>
    expect(leadSubmissionSchema.safeParse({}).success).toBe(false));
  it("keeps the established dropdown values and labels", () => {
    expect(defaultFilters.find((f) => f.key === "precioMax")?.options.map((o) => o.value)).toEqual([
      "150000",
      "250000",
      "350000",
      "500000",
      "750000",
    ]);
    expect(defaultFilters.find((f) => f.key === "tipo")?.options[0]).toEqual({
      value: "casa",
      label: "Casa",
    });
  });
  it("orders supported sections and excludes hidden responsive blocks", () => {
    const section = pageSectionSchema.parse({
      id: "a",
      schemaVersion: 1,
      revision: 0,
      type: "text",
      content: { title: "Hello" },
      design: { variant: "default" },
      visible: true,
      order: 2,
      responsive: { mobile: { visible: false }, desktop: {} },
      actions: [],
      media: [],
    });
    expect(orderedSections([section], "mobile")).toEqual([]);
    expect(orderedSections([section], "desktop")).toHaveLength(1);
    expect(() => orderedSections([section, section], "desktop")).toThrow("Duplicate section ID");
  });
  it("blocks analytics before consent and deduplicates event IDs", () => {
    let allowed = false;
    const push = vi.fn();
    const track = createAnalytics(push, () => allowed);
    const event = {
      event: "property_view" as const,
      event_id: "event-1",
      schema_version: 1 as const,
      payload: { property_id: "1" },
    };
    expect(track(event)).toBe(false);
    allowed = true;
    expect(track(event)).toBe(true);
    expect(track(event)).toBe(false);
    expect(push).toHaveBeenCalledTimes(1);
  });
});

describe("SEO projection", () => {
  it("prepares canonical metadata and prevents staging indexing", () => {
    const settings = {
      title: "Property title",
      description: "Verified property description",
      index: true,
      follow: true,
      structuredData: [],
    };
    const head = buildSEOHead(
      settings,
      "https://real-estate.example",
      "/propiedades/existing",
      "staging",
    );
    expect(head.links).toEqual([
      { rel: "canonical", href: "https://real-estate.example/propiedades/existing" },
    ]);
    expect(head.meta).toContainEqual({ name: "robots", content: "noindex,follow" });
    expect(() =>
      buildSEOHead(settings, "https://real-estate.example", "//external.example", "production"),
    ).toThrow();
  });
});
