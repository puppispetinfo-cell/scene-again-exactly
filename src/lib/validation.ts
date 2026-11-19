import { z } from "zod";
// Keep this module in package.json sideEffects: strict CSP forbids Zod's eval probe/JIT.
z.config({ jitless: true });
export { z };
