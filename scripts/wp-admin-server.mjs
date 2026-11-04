import { runCLI } from "../.tmp/wp-tools/node_modules/@wp-playground/cli/index.js";
import path from "node:path";
const base = process.cwd();
const server = await runCLI({
  command: "server",
  php: "8.3",
  wp: "6.8.3",
  port: 9400,
  workers: 1,
  login: true,
  blueprint: {
    preferredVersions: { php: "8.3", wp: "6.8.3" },
    steps: [{ step: "activatePlugin", pluginPath: "rivton-core/rivton-core.php" }],
  },
  mount: [
    {
      hostPath: path.join(base, "wordpress/rivton-core"),
      vfsPath: "/wordpress/wp-content/plugins/rivton-core",
    },
  ],
});
await new Promise((resolve) => server.server.close(resolve));
await new Promise((resolve) => server.server.listen(9400, "127.0.0.1", resolve));
console.log("ADMIN SERVER READY");
process.on("SIGINT", async () => {
  await server[Symbol.asyncDispose]();
  process.exit(0);
});
