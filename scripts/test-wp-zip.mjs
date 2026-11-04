import { runCLI } from "../.tmp/wp-tools/node_modules/@wp-playground/cli/index.js";
import path from "node:path";
const root = process.cwd();
await runCLI({
  command: "run-blueprint",
  php: "8.3",
  wp: "6.8.3",
  workers: 1,
  blueprint: {
    preferredVersions: { php: "8.3", wp: "6.8.3" },
    steps: [
      {
        step: "installPlugin",
        pluginData: { resource: "vfs", path: "/estate-results/rivton-core-0.2.0.zip" },
        options: { activate: true },
      },
      {
        step: "runPHP",
        code: "<?php if(!defined('ESTATE_CORE_TESTING'))define('ESTATE_CORE_TESTING',true);require '/estate-tests/integration.php';",
      },
    ],
  },
  mount: [
    { hostPath: path.join(root, "wordpress/tests"), vfsPath: "/estate-tests" },
    { hostPath: path.join(root, "artifacts"), vfsPath: "/estate-results" },
  ],
});
console.log("ZIP INSTALL + WORDPRESS TESTS COMPLETED");
