import { readFileSync, writeFileSync } from "node:fs";
const path = "wordpress/rivton-core/schemas/contracts.json";
const s = JSON.parse(readFileSync(path));
const object = (properties) => ({
  type: "object",
  properties,
  additionalProperties: false,
  required: Object.keys(properties),
});
const optionalObject = (properties) => ({
  type: "object",
  properties,
  additionalProperties: false,
});
s.configurationSchema = object({
  id: s.idSchema,
  schemaVersion: { const: 1 },
  revision: { type: "integer", minimum: 0 },
  extensions: { type: "object", additionalProperties: false },
  site: s.siteSettingsSchema,
  theme: s.themeSettingsSchema,
  menus: { type: "array", items: s.navigationMenuSchema, maxItems: 4 },
  filters: { type: "array", items: s.searchFilterDefinitionSchema, maxItems: 30 },
  team: {
    ...object({
      title: { type: "string", maxLength: 1000 },
      body: { type: "string", maxLength: 10000 },
      image: s.mediaAssetSchema,
    }),
    required: ["title", "body"],
  },
  integrations: s.integrationSettingsSchema,
  chrome: object({
    headerHeight: { type: "integer", minimum: 48, maximum: 100 },
    headerRadius: { type: "number", minimum: 0, maximum: 999 },
    dockRadius: { type: "number", minimum: 0, maximum: 64 },
    menuRadius: { type: "number", minimum: 0, maximum: 64 },
    footerColumns: { type: "integer", minimum: 1, maximum: 6 },
  }),
});
// Commercial v1 keeps the React family enum and references configurable type/zone records by stable categoryIds.
writeFileSync(path, JSON.stringify(s, null, 2) + "\n");
