import { chromium, expect } from "playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
const browser = await chromium.launch(),
  context = await browser.newContext(),
  page = await context.newPage();
try {
  await page.goto("http://127.0.0.1:9401/wp-login.php");
  await page.locator("#user_login").fill("qa-admin");
  await page.locator("#user_pass").fill(readFileSync(".tmp/native/password.txt", "utf8").trim());
  await page.locator("#wp-submit").click();
  await page.goto("http://127.0.0.1:9401/wp-admin/plugin-install.php?tab=upload");
  await page.locator("#pluginzip").setInputFiles("artifacts/rivton-core-0.3.1.zip");
  await page.locator("#install-plugin-submit").click();
  await expect(
    page.getByRole("link", { name: "Replace current with uploaded", exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await page.getByRole("link", { name: "Replace current with uploaded", exact: true }).click();
  await expect(page.locator("body")).toContainText("Plugin updated successfully", {
    timeout: 60000,
  });
  await page.goto("http://127.0.0.1:9401/wp-admin/plugins.php");
  await expect(page.locator('tr[data-slug="rivton-core"]')).toContainText("0.3.1");
  writeFileSync(
    "artifacts/wp-package-upload.json",
    JSON.stringify(
      {
        success: true,
        version: "0.3.1",
        checks: [
          "Core plugin ZIP upload succeeds while RIVTON is active",
          "Core overwrite completes",
          "Updated plugin remains installed at 0.3.1",
        ],
      },
      null,
      2,
    ),
  );
  console.log("Actual WordPress plugin upload and overwrite passed");
} catch (e) {
  console.error(e);
  console.log((await page.locator("body").innerText()).slice(-2200));
  process.exitCode = 1;
} finally {
  await browser.close();
}
