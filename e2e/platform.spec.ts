import { test, expect } from "@playwright/test";
test("admin shows a private login and no management data without a session", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.locator('html[data-app-ready="true"]')).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Bienvenido." })).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Nueva propiedad" })).toHaveCount(0);
  await expect(page.getByText("Consultas nuevas", { exact: true })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/WordPress|Supabase|Lovable|Codex/);
  await page.screenshot({ path: `docs/platform/evidence/login-${test.info().project.name}.png` });
});
test("private preview refuses an anonymous request", async ({ request }) => {
  const response = await request.get("/preview/10000000-0000-4000-8000-000000000001");
  expect(response.status()).toBe(403);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
});
test("cross-origin media request is rejected before storage", async ({ request }) => {
  const response = await request.post("/api/media", {
    headers: { Origin: "https://untrusted.example" },
    data: "invalid",
  });
  expect(response.status()).toBe(400);
  expect(await response.text()).not.toMatch(/stack|service_role|eyJhbG/);
});
test("staging robots blocks crawling", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("Disallow: /");
});
