import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
const csp = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" && /Content Security Policy|hydration|hydrated|nonce/i.test(m.text()))
    errors.push(m.text());
});
await page.addInitScript(() =>
  document.addEventListener("securitypolicyviolation", (e) => {
    window.__csp ??= [];
    window.__csp.push({
      directive: e.violatedDirective,
      blocked: e.blockedURI,
      source: e.sourceFile,
      line: e.lineNumber,
      column: e.columnNumber,
    });
  }),
);
page.setDefaultTimeout(15000);
const response = await page.goto("http://127.0.0.1:4180/");
await page.locator('html[data-app-ready="true"]').waitFor();
await page.getByRole("heading", { name: "Encontrá tu propiedad." }).waitFor();
const headers = response.headers();
const html = await response.text();
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter((m) => !m[1].includes("src=") && !m[1].includes("application/ld+json"))
  .map((m) => ({ nonce: m[1].match(/nonce="([^"]+)"/)?.[1] ?? "", bytes: m[2].length }));
const violations = await page.evaluate(() => window.__csp ?? []);
const result = {
  status: response.status(),
  csp: headers["content-security-policy"],
  robots: headers["x-robots-tag"],
  cache: headers["cache-control"],
  inlineScripts: scripts,
  errors,
  violations,
  hydrated: true,
  scope:
    "localhost production-mode build; explicit regression fixtures, no remote Supabase validation",
};
writeFileSync("docs/platform/evidence/production-smoke.json", JSON.stringify(result, null, 2));
await browser.close();
if (
  result.status !== 200 ||
  !result.csp ||
  errors.length ||
  violations.length ||
  !scripts.length ||
  scripts.some((s) => s.bytes && !s.nonce)
)
  throw new Error("Production CSP/SSR smoke failed; inspect evidence.");
console.log("Production-mode SSR hydrated with enforced nonce CSP and no violations.");
