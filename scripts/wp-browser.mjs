import { chromium, expect } from "playwright/test";
import { writeFileSync, readFileSync } from "node:fs";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const passed = [],
  errors = [];
page.setDefaultTimeout(30000);
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort(),
  );
  await page.goto("http://127.0.0.1:9400/wp-admin/admin.php?page=estate-core", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await expect(page.locator("#estate-core-admin nav")).toBeVisible({ timeout: 30000 });
  const api = await page.evaluate(() => window.EstateCoreAdmin.api);
  console.log("REST base", api);
  const clean = await page.evaluate(async () => {
    const r = await fetch(window.EstateCoreAdmin.api + "configuration");
    return { status: r.status, body: await r.json() };
  });
  if (clean.status !== 200 || clean.body.schemaVersion !== 1) throw new Error("Invalid HTTP JSON");
  passed.push("Public REST returns valid HTTP JSON");
  await page.getByRole("button", { name: "Propiedades", exact: true }).click();
  await page.getByRole("button", { name: "Nueva Propiedades", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Título", exact: true })
    .fill("Browser integration fixture");
  await page
    .getByRole("textbox", { name: "Slug", exact: true })
    .fill("browser-integration-fixture-" + Date.now());
  const draftResponse = page.waitForResponse(
    (r) => r.url().endsWith("/admin/properties") && r.request().method() === "POST",
    { timeout: 60000 },
  );
  await page.getByRole("button", { name: "Guardar borrador / cambios", exact: true }).click();
  const firstResponse = await draftResponse;
  if (!firstResponse.ok()) throw new Error("Draft save: " + (await firstResponse.text()));
  await expect(page.getByRole("status")).toContainText("Guardado", { timeout: 30000 });
  passed.push("Admin creates and persists draft through REST nonce");
  const jpeg = readFileSync("src/assets/jardin-claret.jpg").toString("base64");
  const uploaded = await page.evaluate(async (encoded) => {
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    const r = await fetch("/wp-json/wp/v2/media", {
      method: "POST",
      headers: {
        "X-WP-Nonce": window.EstateCoreAdmin.nonce,
        "Content-Type": "image/jpeg",
        "Content-Disposition": 'attachment; filename="integration-photo.jpg"',
      },
      body: bytes,
    });
    return { status: r.status, data: await r.json() };
  }, jpeg);
  if (uploaded.status !== 201)
    throw new Error("Media upload failed: " + JSON.stringify(uploaded.data));
  passed.push("WordPress validates and stores a real JPEG upload");
  await page
    .getByRole("button", { name: "Agregar Galería (primera: principal)", exact: true })
    .click();
  await page
    .locator("summary")
    .filter({ hasText: /^images 1$/ })
    .click();
  await page
    .getByRole("button", { name: "Elegir de la biblioteca multimedia", exact: true })
    .click();
  const modal = page.locator(".media-modal");
  await expect(modal).toBeVisible();
  await modal.getByRole("tab", { name: "Media Library", exact: true }).click();
  await modal.locator(".attachment").first().click({ timeout: 30000 });
  await modal.locator(".media-button-select").click();
  await expect(modal).not.toBeVisible();
  const saveMedia = page.waitForResponse(
    (r) => r.url().includes("/admin/properties/") && r.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Guardar borrador / cambios", exact: true }).click();
  const mediaResponse = await saveMedia;
  if (!mediaResponse.ok()) throw new Error("Gallery save failed: " + (await mediaResponse.text()));
  passed.push("Media library picker fills validated gallery metadata");
  const publish = page.waitForResponse(
    (r) => r.url().includes("/publish") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  if (!(await publish).ok()) throw new Error("Publish failed");
  await expect(page.locator("#estate-editor h2")).toContainText("published");
  passed.push("Admin publishes a property with a real gallery image");
  const first = await page.locator("#estate-editor small").first().textContent();
  await page.getByRole("button", { name: "Duplicar como borrador", exact: true }).click();
  await expect
    .poll(() => page.locator("#estate-editor small").first().textContent())
    .not.toBe(first);
  passed.push("Admin duplicate creates independent ID");
  await page.getByRole("button", { name: "Archivar", exact: true }).click();
  await expect(page.locator("#estate-editor h2")).toContainText("archived");
  passed.push("Admin archives a property");
  await page.getByRole("button", { name: "Configuración global", exact: true }).click();
  await page
    .locator("summary")
    .filter({ hasText: /^Identidad y contacto$/ })
    .click();
  await page
    .getByRole("textbox", { name: "Texto del footer", exact: true })
    .fill("Browser configuration fixture");
  await page.getByRole("button", { name: "Guardar configuración", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Guardado");
  passed.push("Admin saves global structured configuration");
  await page.locator('details[data-estate-path="configuration.theme"] > summary').click();
  await page.locator('details[data-estate-path="configuration.theme.colors"] > summary').click();
  if (!(await page.getByRole("textbox", { name: "primary", exact: true }).count())) {
    await page.getByRole("combobox", { name: "Nueva clave Colores", exact: true }).selectOption("primary");
    await page.getByRole("button", { name: "Agregar campo", exact: true }).click();
  }
  await page.getByRole("textbox", { name: "primary", exact: true }).fill("#1a2b3c");
  await expect(page.locator(".estate-swatch")).toHaveCSS("background-color", "rgb(26, 43, 60)");
  await page.locator('details[data-estate-path="configuration.menus.0"] > summary').click();
  if (!(await page.locator('details[data-estate-path="configuration.menus.0.items.0"]').count())) {
    await page.getByRole("button", { name: "Agregar items", exact: true }).first().click();
  }
  await page.locator('details[data-estate-path="configuration.menus.0.items.0"] > summary').click();
  await page
    .getByRole("textbox", { name: "Texto", exact: true })
    .fill("Browser navigation fixture");
  await page.getByRole("textbox", { name: "Destino", exact: true }).fill("/contacto");
  const configurationSave = page.waitForResponse(
    (r) => r.url().endsWith("/admin/configuration") && r.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "Guardar configuración", exact: true }).click();
  if (!(await configurationSave).ok()) throw new Error("Visual or navigation configuration failed");
  const visible = await page.evaluate(
    async () => await (await fetch(window.EstateCoreAdmin.api + "configuration")).json(),
  );
  if (
    visible.theme.colors.primary !== "#1a2b3c" ||
    !visible.menus
      .find((menu) => menu.location === "header")
      .items.some((item) => item.href === "/contacto")
  )
    throw new Error("Configuration not persisted publicly");
  passed.push("Visual token preview and navigation edit persist through WordPress");
  await page.getByRole("button", { name: "Páginas", exact: true }).click();
  await page.getByRole("button", { name: "Nueva Páginas", exact: true }).click();
  await page.getByRole("textbox", { name: "Título", exact: true }).fill("Browser block fixture");
  await page
    .getByRole("textbox", { name: "Slug", exact: true })
    .fill("browser-blocks-" + Date.now());
  await page.getByRole("button", { name: "Agregar Secciones", exact: true }).click();
  await page.getByRole("button", { name: "Agregar Secciones", exact: true }).click();
  const sectionItems = page
    .locator("#estate-editor > .estate-field .estate-array-item")
    .filter({ has: page.locator("summary").filter({ hasText: /^sections / }) });
  const sectionIds = await sectionItems.locator("small").allTextContents();
  await page.getByRole("button", { name: "Subir", exact: true }).nth(1).click();
  const reordered = await sectionItems.locator("small").allTextContents();
  if (sectionIds[0] !== reordered[1]) throw new Error("Section reorder did not preserve IDs");
  const pageSave = page.waitForResponse(
    (r) => r.url().endsWith("/admin/pages") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Guardar borrador / cambios", exact: true }).click();
  const savedPage = await pageSave;
  if (!savedPage.ok()) throw new Error("Page save failed: " + (await savedPage.text()));
  const savedBody = await savedPage.json();
  if (savedBody.document.sections[0].order !== 0 || savedBody.document.sections[1].order !== 1)
    throw new Error("Section order was not persisted");
  passed.push("Block editor reorders sections with stable IDs and persists order");
  await page.screenshot({ path: "artifacts/wp-admin.png" });
  await page.goto("http://127.0.0.1:9400/wp-admin/admin.php?page=estate-core-audit", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: "Auditoría", exact: true })).toBeVisible();
  await expect(page.locator(".widefat tbody tr").first()).toBeVisible();
  passed.push("WordPress audit screen displays real administrative actions");
  writeFileSync(
    "artifacts/wp-browser.json",
    JSON.stringify({ success: true, passed, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed, errors }));
} catch (error) {
  await page.screenshot({ path: ".tmp/wp-browser-failure.png" });
  writeFileSync(".tmp/wp-browser-failure.txt", String(error));
  console.error(String(error));
  console.log("BROWSER ERRORS", errors);
  console.log("PANEL", await page.locator("#estate-core-admin").innerText());
  process.exitCode = 1;
} finally {
  await browser.close();
}
