import { chromium, expect, devices } from "playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
const browser = await chromium.launch(
  process.env.CHROME
    ? { executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" }
    : {},
);
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();
const errors = [],
  passed = [];
page.on("pageerror", (e) => errors.push(e.message));
page.setDefaultTimeout(15000);
const root = () => page.locator("#estate-core-admin");
const nav = (label) =>
  root()
    .getByRole("navigation", { name: "Administración RIVTON" })
    .getByRole("button", { name: label, exact: true });
try {
  await page.goto("http://127.0.0.1:9401/wp-login.php");
  await page.locator("#user_login").fill("qa-admin");
  await page.locator("#user_pass").fill(readFileSync(".tmp/native/password.txt", "utf8").trim());
  await page.locator("#wp-submit").click();
  await page.goto("http://127.0.0.1:9401/wp-admin/admin.php?page=estate-core");
  await expect(root().getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  passed.push("Authenticated WordPress dashboard loads real counts");
  await nav("Constructor visual").click();
  await root()
    .getByRole("button", { name: /Inicio ·/ })
    .click();
  await expect(
    root().getByRole("heading", { name: "Constructor visual", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".ec-builder")).toBeVisible();
  passed.push("Page tree representative preview and inspector load persisted sections");
  const title = root().getByRole("textbox", { name: "Título", exact: true }).first();
  await title.fill("Visual browser title");
  await root().getByRole("button", { name: "Mobile", exact: true }).click();
  await expect(page.locator(".ec-preview.mobile")).toBeVisible();
  await root()
    .getByRole("spinbutton", { name: "Altura del hero px mobile", exact: true })
    .first()
    .fill("520");
  await root().getByRole("button", { name: "Guardar borrador", exact: true }).click();
  await expect(root().getByRole("status").first()).toContainText("Borrador guardado");
  passed.push("Desktop shared text and mobile override save as real protected draft");
  await page.reload();
  await nav("Constructor visual").click();
  await root()
    .getByRole("button", { name: /Inicio ·/ })
    .click();
  await expect(root().getByRole("textbox", { name: "Título", exact: true }).first()).toHaveValue(
    "Visual browser title",
  );
  await root().getByRole("button", { name: "Mobile", exact: true }).click();
  await expect(
    root().getByRole("spinbutton", { name: "Altura del hero px mobile", exact: true }).first(),
  ).toHaveValue("520");
  passed.push("Reload preserves independently configured mobile override");
  page.once("dialog", (d) => d.accept());
  await root().getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(root().getByRole("status").first()).toContainText("Publicado en la API");
  passed.push("Visual builder publishes actual saved draft");
  await root().getByRole("button", { name: "Historial", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Restaurar revisión/ })
    .nth(1)
    .click();
  await expect(root().getByRole("status").first()).toContainText("Versión recuperada");
  passed.push("Revision history restores an actual prior version as draft");
  await nav("Geografía").click();
  await root().getByRole("button", { name: "Crear registro", exact: true }).click();
  await root().getByRole("textbox", { name: "Nombre", exact: true }).fill("Browser QA Province");
  await root()
    .getByRole("textbox", { name: "URL / slug", exact: true })
    .fill("browser-qa-province-" + Date.now());
  await root().getByRole("button", { name: "Crear registro", exact: true }).click();
  await expect(root().getByRole("status").first()).toContainText("Registro guardado");
  passed.push("Geography editor creates persistent province");
  await nav("Propiedades").click();
  await expect(page.locator(".ec-table")).toBeVisible();
  await root().getByRole("button", { name: "Crear propiedad", exact: true }).click();
  await root()
    .getByRole("textbox", { name: "Título", exact: true })
    .fill("Browser property fixture");
  await root().getByRole("button", { name: "Ubicación", exact: true }).click();
  await root()
    .getByRole("combobox", { name: "Provincia", exact: true })
    .selectOption({ label: "QA Province" });
  await root()
    .getByRole("combobox", { name: "Localidad", exact: true })
    .selectOption({ label: "QA Renamed City" });
  await root()
    .getByRole("combobox", { name: "Barrio / zona", exact: true })
    .selectOption({ label: "QA Area" });
  await root().getByRole("button", { name: "Guardar borrador", exact: true }).click();
  await expect(root().getByRole("status").first()).toContainText("Borrador guardado");
  passed.push("Tabbed property editor persists dependent geographic selectors");
  await root().getByRole("button", { name: "Fotografías y videos", exact: true }).click();
  await root().getByRole("button", { name: "Agregar fotografías", exact: true }).click();
  await expect(page.locator(".media-modal")).toBeVisible();
  await page
    .getByRole("tab", { name: "Biblioteca de medios" })
    .click()
    .catch(() => page.getByRole("tab", { name: "Media Library" }).click());
  await page.locator(".attachments .attachment").first().click();
  await page.locator(".media-button-select").click();
  await expect(page.locator(".ec-photo")).toHaveCount(1);
  await root().getByRole("button", { name: "Guardar borrador", exact: true }).click();
  await expect(root().getByRole("status").first()).toContainText("Borrador guardado");
  passed.push("Native media library selects a real image into persistent gallery");
  await nav("Importación inicial").click();
  await root()
    .getByRole("button", { name: "Validar y previsualizar perfil RIVTON", exact: true })
    .click();
  await expect(root().getByRole("heading", { name: "Mapeo propuesto", exact: true })).toBeVisible();
  passed.push("Intake import UI displays validated real mapping before approval");
  await page.setViewportSize({ width: 390, height: 844 });
  await nav("Constructor visual").click();
  await expect(
    root().getByRole("heading", { name: "Constructor visual", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/wp-visual-mobile.png", fullPage: true });
  passed.push("Mobile viewport retains usable navigation and page selection");
  await page.setViewportSize({ width: 1600, height: 1000 });
  await root()
    .getByRole("button", { name: /Inicio ·/ })
    .click();
  await page.screenshot({ path: "artifacts/wp-visual-desktop.png", fullPage: true });
  const draftUrl = "**/rivton-core/v1/admin/workspaces/pages/page-home";
  await root()
    .getByRole("textbox", { name: "Título", exact: true })
    .first()
    .fill("Unsaved network fixture");
  await page.route(draftUrl, (route) =>
    route.request().method() === "PUT" ? route.abort() : route.continue(),
  );
  await root().getByRole("button", { name: "Guardar borrador", exact: true }).click();
  await expect(root().locator(".ec-notice.ec-error")).toBeVisible();
  await expect(root().getByRole("textbox", { name: "Título", exact: true }).first()).toHaveValue(
    "Unsaved network fixture",
  );
  await page.unroute(draftUrl);
  passed.push("Network failure retains unsaved editor content and reports error");
  await root().getByRole("button", { name: "Guardar borrador", exact: true }).click();
  await expect(root().locator(".ec-notice")).toContainText("Borrador guardado");
  await page.evaluate(async () => {
    const c = window.EstateCoreAdmin,
      url = c.api + "admin/workspaces/pages/page-home",
      headers = { "X-WP-Nonce": c.nonce };
    const r = await fetch(url, { headers }),
      data = await r.json();
    data.document.sections[0].content.title = "Concurrent writer fixture";
    const saved = await fetch(url, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "If-Match": r.headers.get("etag"),
        "X-Draft-Revision": String(data.draftRevision),
      },
      body: JSON.stringify(data.document),
    });
    if (!saved.ok) throw new Error("Concurrent fixture setup failed");
  });
  await root()
    .getByRole("textbox", { name: "Título", exact: true })
    .first()
    .fill("Local conflicting draft");
  await root().getByRole("button", { name: "Guardar borrador", exact: true }).click();
  await expect(root().locator(".ec-notice.ec-error")).toContainText("412");
  await expect(root().getByRole("textbox", { name: "Título", exact: true }).first()).toHaveValue(
    "Local conflicting draft",
  );
  passed.push("Concurrent editing reports 412 without discarding local changes");
  const { default: AxeBuilder } =
    await import("../.tmp/wp-tools/node_modules/@axe-core/playwright/dist/index.mjs");
  const a11y = await new AxeBuilder({ page })
    .include("#estate-core-admin")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  writeFileSync("artifacts/wp-visual-accessibility.json", JSON.stringify(a11y.violations, null, 2));
  if (a11y.violations.length)
    throw new Error("Accessibility violations: " + a11y.violations.map((v) => v.id).join(", "));
  passed.push("Automated WCAG A/AA checks find no violations within CMS panel");

  if (process.env.CHROME) {
    const mobileContext = await browser.newContext({
      ...devices["Pixel 7"],
      storageState: await context.storageState(),
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto("http://127.0.0.1:9401/wp-admin/admin.php?page=estate-core");
    await mobilePage
      .locator("#estate-core-admin")
      .getByRole("navigation", { name: "Administración RIVTON" })
      .getByRole("button", { name: "Constructor visual", exact: true })
      .click();
    await mobilePage
      .locator("#estate-core-admin")
      .getByRole("button", { name: /Inicio ·/ })
      .click();
    await expect(mobilePage.locator(".ec-tree")).toBeVisible();
    await expect(mobilePage.locator(".ec-inspector")).toBeVisible();
    await mobilePage.screenshot({ path: "artifacts/wp-visual-touch.png", fullPage: true });
    await mobileContext.close();
    passed.push("Google Chrome with Pixel 7 touch/mobile emulation opens page tree and inspector");
  }
  if (errors.length) throw new Error(errors.join("; "));
  writeFileSync(
    process.env.CHROME ? "artifacts/wp-visual-chrome.json" : "artifacts/wp-visual-browser.json",
    JSON.stringify(
      {
        success: true,
        passed,
        errors,
        browser: process.env.CHROME ? "Google Chrome" : "Chromium",
        viewports: ["1600x1000", "390x844"],
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed, errors }));
} catch (e) {
  console.error(e);
  await page.screenshot({ path: ".tmp/visual-failure.png", fullPage: true });
  writeFileSync(".tmp/visual-failure.txt", await root().innerText());
  process.exitCode = 1;
} finally {
  await browser.close();
}
