import { writeFileSync } from "node:fs";
import { defaultTheme } from "../src/core/theme.ts";
import { defaultFilters } from "../src/core/filter-definitions.ts";
const entity = { id: "new", schemaVersion: 1, revision: 0, extensions: {} };
const seo = { title: "", description: "", index: false, follow: true, structuredData: [] };
const menus = ["header", "mobile", "dock", "footer"].map((location) => ({
  ...entity,
  id: `menu-${location}`,
  location,
  items: [],
}));
const defaults = {
  configuration: {
    ...entity,
    site: {
      ...entity,
      name: "",
      locale: "es-AR",
      currencies: ["ARS", "USD"],
      domain: "https://example.invalid",
      socials: [],
      footerText: "",
      legalPageIds: [],
    },
    theme: defaultTheme,
    menus,
    filters: defaultFilters,
    team: { title: "", body: "" },
    integrations: {
      ...entity,
      gtm: { enabled: false },
      ga4: { enabled: false },
      googleAds: { enabled: false },
      meta: { enabled: false, serverEventsEnabled: false },
      searchConsole: { enabled: false },
      consentRequired: true,
      utmDefaults: {},
    },
    chrome: {
      headerHeight: 64,
      headerRadius: 999,
      dockRadius: 24,
      menuRadius: 28,
      footerColumns: 4,
    },
  },
  property: {
    ...entity,
    slug: "",
    title: "",
    operation: "venta",
    type: "casa",
    categoryIds: [],
    featureIds: [],
    status: "published",
    price: null,
    amenities: [],
    description: "",
    images: [],
    featured: false,
    publishedAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
    calendly: { enabled: false, label: "", mode: "link" },
    seo,
  },
  page: { ...entity, slug: "", title: "", status: "draft", seo, sections: [] },
  category: { ...entity, slug: "", label: "", kind: "type", visible: true, order: 0 },
  feature: { ...entity, label: "", valueType: "boolean" },
  section: {
    ...entity,
    type: "text",
    content: {},
    design: { variant: "default" },
    visible: true,
    order: 0,
    responsive: { mobile: { visible: true }, desktop: { visible: true } },
    actions: [],
    media: [],
  },
};
writeFileSync(
  "wordpress/rivton-core/schemas/defaults.json",
  JSON.stringify(defaults, null, 2) + "\n",
);
writeFileSync(
  "wordpress/rivton-core/profiles/rivton.json",
  JSON.stringify({ name: "RIVTON Group", locale: "es-AR", theme: defaultTheme }, null, 2) + "\n",
);
