import { chromium, expect } from "playwright/test";
import { readFileSync } from "node:fs";
const browser = await chromium.launch(),
  context = await browser.newContext({ viewport: { width: 1600, height: 1000 } }),
  page = await context.newPage();
try {
  await page.goto("http://127.0.0.1:9401/wp-login.php");
  await page.locator("#user_login").fill("qa-admin");
  await page.locator("#user_pass").fill(readFileSync(".tmp/native/password.txt", "utf8").trim());
  await page.locator("#wp-submit").click();
  await page.goto("http://127.0.0.1:9401/wp-admin/admin.php?page=estate-core");
  const root = page.locator("#estate-core-admin"),
    nav = (label) =>
      root
        .getByRole("navigation", { name: "Administración RIVTON" })
        .getByRole("button", { name: label, exact: true });
  await expect(root.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await page.screenshot({ path: "artifacts/wp-rivton-dashboard.png", fullPage: true });
  await nav("Constructor visual").click();
  await root.getByRole("button", { name: /Inicio ·/ }).click();
  await expect(page.locator(".ec-preview-scene img").first()).toBeVisible();
  await page.screenshot({ path: "artifacts/wp-rivton-builder.png", fullPage: true });
  await nav("Marca").click();
  await root
    .locator("summary")
    .filter({ hasText: /^Identidad y contacto$/ })
    .click();
  await expect(root.getByRole("textbox", { name: "Email", exact: true })).toHaveValue(
    "rivtongroup@gmail.com",
  );
  await expect(root.getByRole("textbox", { name: "WhatsApp", exact: true })).toHaveValue(
    "5493513437509",
  );
  await page.screenshot({ path: "artifacts/wp-rivton-contact.png", fullPage: true });
  await nav("Equipo").click();
  for (const name of ["Maximiliano Carpio", "Alejo Carpio", "Tomás Colantone", "Antonino Rivilli"])
    await expect(root.getByRole("cell", { name, exact: true })).toBeVisible();
  await page.screenshot({ path: "artifacts/wp-rivton-team.png", fullPage: true });
  console.log("RIVTON real profile visible in dashboard, builder, contact and team.");
} finally {
  await browser.close();
}
