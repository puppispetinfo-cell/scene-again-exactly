import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Engine = require("../.tmp/wp-tools/node_modules/php-parser");
const engine = new Engine({ parser: { phpVersion: "8.1", suppressErrors: false } });
function walk(dir) {
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith(".php")) {
      engine.parseCode(fs.readFileSync(full, "utf8"), full);
      console.log("PHP syntax OK", full);
    }
  }
}
walk("wordpress");
