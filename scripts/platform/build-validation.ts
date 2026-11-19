import { z } from "zod";
import { schemas, catalogSchema } from "../../src/platform/contracts";
import { readFileSync, writeFileSync } from "node:fs";
const path = "supabase/migrations/20261118230832_platform_foundation.sql";
let sql = readFileSync(path, "utf8");
const marker = "-- BEGIN GENERATED DOCUMENT VALIDATION";
sql = sql.split(marker)[0];
const validator = readFileSync("scripts/platform/document-validation.sql", "utf8");
const schemasSQL = Object.entries({ ...schemas, catalog: catalogSchema })
  .map(
    ([kind, schema]) =>
      `insert into rivton_private.document_schemas(kind,definition)values('${kind}','${JSON.stringify(z.toJSONSchema(schema, { unrepresentable: "any" })).replaceAll("'", "''")}'::jsonb);`,
  )
  .join("\n");
writeFileSync(
  path,
  `${sql}${marker}\n${validator}\n${schemasSQL}\n-- END GENERATED DOCUMENT VALIDATION\n`,
);
