import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import * as contracts from "../src/core/contracts.ts";
import { themeSettingsSchema } from "../src/core/theme.ts";
const require = createRequire(import.meta.url);
const { zodToJsonSchema } = require("../.tmp/wp-tools/node_modules/zod-to-json-schema");
const schemas = {};
for (const [name, value] of Object.entries({ ...contracts, themeSettingsSchema }))
  if (name.endsWith("Schema") && value?._def)
    schemas[name] = zodToJsonSchema(value, { $refStrategy: "none", target: "jsonSchema7" });
writeFileSync(
  "wordpress/rivton-core/schemas/contracts.json",
  JSON.stringify(schemas, null, 2) + "\n",
);
