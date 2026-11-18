import { chromium, expect } from "playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
const browser = await chromium.launch(),
  context = await browser.newContext({ viewport: { width: 1600, height: 1000 } }),
  page = await context.newPage();
const passed = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.setDefaultTimeout(15000);
const root = page.locator("#estate-core-admin"),
  nav = (name) =>
    root
      .getByRole("navigation", { name: "Administración RIVTON" })
      .getByRole("button", { name, exact: true });
try {
  await page.goto("http://127.0.0.1:9401/wp-login.php");
  await page.locator("#user_login").fill("qa-admin");
  await page.locator("#user_pass").fill(readFileSync(".tmp/native/password.txt", "utf8").trim());
  await page.locator("#wp-submit").click();
  await page.goto("http://127.0.0.1:9401/wp-admin/admin.php?page=estate-core");
  for (const name of ["rivton-intake.php", "rivton-intake.json"]) {
    const response = await page.request.get(
      "http://127.0.0.1:9401/wp-content/plugins/rivton-core/profiles/" + name,
    );
    const body = await response.text();
    if (
      (name.endsWith(".php") && response.status() !== 404) ||
      body.includes("raw_answers") ||
      body.includes("rivton-client-intake-v1")
    )
      throw new Error("Private intake source exposed");
  }
  passed.push("Intake source cannot be fetched as PHP data or a static JSON file");
  await nav("Constructor visual").click();
  await root.getByRole("button", { name: /Inicio ·/ }).click();
  await root.getByRole("combobox", { name: "Tipo de bloque", exact: true }).selectOption("faq");
  await root.getByRole("button", { name: "Agregar bloque", exact: true }).click();
  await root.getByRole("button", { name: "Agregar pregunta", exact: true }).click();
  await root.getByRole("textbox", { name: "Pregunta", exact: true }).fill("Pregunta de QA");
  await root
    .getByRole("textbox", { name: "Respuesta", exact: true })
    .fill("Respuesta de QA sin condiciones comerciales.");
  await root.getByRole("button", { name: "Guardar borrador", exact: true }).click();
  await expect(root.locator(".ec-notice")).toContainText("Borrador guardado");
  const before = await page.evaluate(
    async () =>
      await (
        await fetch(window.EstateCoreAdmin.api + "admin/workspaces/pages/page-home", {
          headers: { "X-WP-Nonce": window.EstateCoreAdmin.nonce },
        })
      ).json(),
  );
  const last = before.document.sections.at(-1);
  if (last.type !== "faq" || last.faqs[0].question !== "Pregunta de QA")
    throw new Error("FAQ not persisted");
  passed.push("Specific FAQ editor persists independent question and answer");
  await root
    .locator(".ec-tree-entry")
    .last()
    .getByRole("button", { name: "Subir sección", exact: true })
    .click();
  await root.getByRole("button", { name: "Guardar borrador", exact: true }).click();
  await expect(root.locator(".ec-notice")).toContainText("Borrador guardado");
  const after = await page.evaluate(
    async () =>
      await (
        await fetch(window.EstateCoreAdmin.api + "admin/workspaces/pages/page-home", {
          headers: { "X-WP-Nonce": window.EstateCoreAdmin.nonce },
        })
      ).json(),
  );
  if (
    after.document.sections.at(-2).id !== last.id ||
    after.document.sections.at(-2).order !== after.document.sections.length - 2
  )
    throw new Error("Section reorder failed");
  passed.push("Visual section reordering persists order and preserves stable ID");
  await nav("Propiedades").click();
  await root.getByRole("button", { name: "Crear propiedad", exact: true }).click();
  await root.getByRole("textbox", { name: "Título", exact: true }).fill("Extended UI fixture");
  await root
    .getByRole("button", { name: "Características y amenities", exact: true })
    .last()
    .click();
  await root.getByRole("spinbutton", { name: "Antigüedad", exact: true }).fill("5");
  await root.getByRole("checkbox", { name: "Pileta", exact: true }).check();
  await root.getByRole("button", { name: "Fotografías y videos", exact: true }).click();
  await root.getByRole("button", { name: "Agregar fotografías", exact: true }).click();
  try {
    await page
      .getByRole("tab", { name: "Biblioteca de medios", exact: true })
      .click({ timeout: 2000 });
  } catch {
    await page.getByRole("tab", { name: "Media Library", exact: true }).click();
  }
  const assets = page.locator(".attachments .attachment");
  await assets.nth(0).click();
  await assets.nth(1).click({ modifiers: ["Control"] });
  await page.locator(".media-button-select").click();
  await expect(page.locator(".ec-photo")).toHaveCount(2);
  const initial = await page.locator(".ec-photo img").first().getAttribute("src");
  await page
    .locator(".ec-photo")
    .nth(1)
    .getByRole("button", { name: "Principal", exact: true })
    .click();
  const reordered = await page.locator(".ec-photo img").first().getAttribute("src");
  if (initial === reordered) throw new Error("Main image did not change");
  await root
    .getByRole("textbox", { name: "ALT de fotografía 1", exact: true })
    .fill("QA reordered image");
  await root.getByRole("button", { name: "SEO", exact: true }).click();
  await root.getByRole("textbox", { name: "Meta title", exact: true }).fill("QA SEO title");
  await root
    .locator("summary")
    .filter({ hasText: /^Open Graph/ })
    .click();
  await root.getByRole("button", { name: "Personalizar Open Graph", exact: true }).click();
  await root
    .locator("summary")
    .filter({ hasText: /^Open Graph/ })
    .click();
  await root
    .getByRole("textbox", { name: "Título Open Graph", exact: true })
    .fill("QA share title");
  await root.getByRole("button", { name: "Guardar borrador", exact: true }).click();
  await expect(root.locator(".ec-notice")).toContainText("Borrador guardado");
  const props = await page.evaluate(async () => {
    const c = window.EstateCoreAdmin,
      r = await fetch(c.api + "admin/catalog/properties?search=Extended", {
        headers: { "X-WP-Nonce": c.nonce },
      }),
      list = await r.json();
    return await (
      await fetch(c.api + "admin/workspaces/properties/" + list.items[0].id, {
        headers: { "X-WP-Nonce": c.nonce },
      })
    ).json();
  });
  if (props.document.images[0].alt !== "QA reordered image" || props.document.images.length !== 2)
    throw new Error("Gallery order/ALT not persisted");
  passed.push("Multiple native images persist reordered main image and ALT");
  if (
    props.document.attributes["feature-age"] !== 5 ||
    props.document.attributes["feature-pool"] !== true
  )
    throw new Error("Typed attributes not persisted");
  passed.push("Numeric structural attribute and boolean amenity persist as typed values");
  if (
    props.document.seo.title !== "QA SEO title" ||
    props.document.seo.openGraph.title !== "QA share title"
  )
    throw new Error("SEO not persisted");
  passed.push("SEO and Open Graph controls persist actual metadata");
  await root.getByRole('button',{name:'Publicación',exact:true}).click();
  const copyResponse=page.waitForResponse(r=>r.url().endsWith('/duplicate')&&r.request().method()==='POST');page.once('dialog',d=>d.accept());await root.getByRole('button',{name:'Duplicar propiedad',exact:true}).click();const copied=await(await copyResponse).json();if(copied.document.id===props.document.id||copied.document.title!=='Extended UI fixture'||copied.document.images.length!==2)throw new Error('UI duplicate did not copy saved workspace');await expect(root.getByRole('textbox',{name:'Título',exact:true})).toHaveValue('Extended UI fixture');passed.push('Property duplication copies saved working document and gallery to independent draft');
  await nav("Navegación y filtros").click();
  const filterBox = root
    .getByRole("heading", { name: "Filtros del buscador", exact: true })
    .locator("..");
  await filterBox
    .getByRole("textbox", { name: "Nombre visible", exact: true })
    .first()
    .fill("Operación comercial QA");
  await root.getByRole("button", { name: "Guardar borrador", exact: true }).click();
  await expect(root.locator(".ec-notice")).toContainText("Borrador guardado");
  page.once("dialog", (d) => d.accept());
  await root.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(root.locator(".ec-notice")).toContainText("Publicado en la API");
  const config = await page.evaluate(
    async () => await (await fetch(window.EstateCoreAdmin.api + "configuration")).json(),
  );
  if (config.filters[0].label !== "Operación comercial QA")
    throw new Error("Filter label not published");
  passed.push("Editable search filter label publishes through configuration API");
  if (errors.length) throw new Error(errors.join(";"));
  writeFileSync(
    "artifacts/wp-cms-controls.json",
    JSON.stringify({ success: true, passed, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed, errors }));
} catch (e) {
  console.error(e);
  await page.screenshot({ path: ".tmp/cms-controls-failure.png", fullPage: true });
  writeFileSync(".tmp/cms-controls-failure.txt", await root.innerText());
  process.exitCode = 1;
} finally {
  await browser.close();
}
