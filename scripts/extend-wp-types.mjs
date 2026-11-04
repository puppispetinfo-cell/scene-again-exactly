import fs from "node:fs";
const path = "wordpress/rivton-core/schemas/contracts.json",
  schemas = JSON.parse(fs.readFileSync(path));
schemas.propertySchema.properties.propertyTypeId = { type: "string", minLength: 1, maxLength: 128 };
schemas.propertyCategorySchema.properties.legacyType = {
  type: "string",
  enum: ["casa", "departamento", "terreno", "local", "oficina"],
};
fs.writeFileSync(path, JSON.stringify(schemas, null, 2) + "\n");
const p = "wordpress/rivton-core/schemas/defaults.json",
  defaults = JSON.parse(fs.readFileSync(p));
defaults.property.propertyTypeId = "category-casa";
fs.writeFileSync(p, JSON.stringify(defaults, null, 2) + "\n");
