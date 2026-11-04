import { test, expect } from "@playwright/test";
const hydrated = async (page: import("@playwright/test").Page) => {
  await expect(
    page.getByRole("contentinfo").getByText("Luis Jos\u00e9 de Tejeda 3883 local A", { exact: true }),
  ).toBeVisible();
};
const routes = [
  "/",
  "/propiedades",
  "/propiedades/jardin-claret",
  "/nosotros",
  "/contacto",
  "/publicar",
  "/favoritos",
  "/no-existe",
];
for (const [index, path] of routes.entries()) {
  test(`approved layout ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    if (path !== "/no-existe") await hydrated(page);
    await expect.poll(async () => page.getByRole("combobox").evaluateAll(nodes => nodes.every(node => Boolean(node.textContent?.trim())))).toBe(true);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images]
          .filter((img) => img.loading !== "lazy")
          .map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  img.onload = () => resolve();
                  img.onerror = () => resolve();
                }),
          ),
      );
    });
    await expect(page).toHaveScreenshot(`route-${index}.png`, { animations: "disabled" });
  });
}
test("search, URL, detail, gallery and favorites", async ({ page }) => {
  await page.goto("/propiedades?operacion=venta&precioMax=300000&dormitorios=4");
  await hydrated(page);
  await expect(page.getByText("Albert Brucce Sabin 6079", { exact: true })).toBeVisible();
  await expect(page.getByText("Jardín Claret", { exact: true })).toHaveCount(0);
  await page.getByText("Albert Brucce Sabin 6079", { exact: true }).click();
  await expect(page).toHaveURL(/albert-brucce-sabin-6079/);
  await hydrated(page);
  await page.getByRole("button", { name: "Foto siguiente" }).click();
  await expect(page.getByText("2/2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Agregar a favoritos" }).click();
  await page.goto("/favoritos");
  await hydrated(page);
  await expect(page.getByText("Albert Brucce Sabin 6079", { exact: true })).toBeVisible();
});
test("mobile navigation and local form validation", async ({ page }, info) => {
  test.skip(info.project.name === "desktop", "Mobile menu is intentionally hidden on desktop");
  await page.goto("/");
  await hydrated(page);
  await page.getByRole("button", { name: "Abrir menú" }).click();
  const menu = page.getByRole("dialog", { name: "Menú de navegación" });
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Contacto", exact: true }).click();
  await expect(menu).not.toBeVisible();
  await expect(page).toHaveURL(/contacto/);
  await page.getByRole("button", { name: "Enviar consulta" }).click();
  await expect(page.locator("form .text-destructive")).toHaveCount(3);
  await expect(page.getByRole("status")).toHaveCount(0);
});
test("search selects preserve accessible controls and URL submit", async ({ page }) => {
  await page.goto("/");
  await hydrated(page);
  await page.getByRole("combobox", { name: "Tipo de inmueble" }).click();
  await page.getByRole("option", { name: "Departamento", exact: true }).click();
  await page.getByRole("button", { name: "Buscar propiedades", exact: true }).click();
  await expect(page).toHaveURL(/tipo=departamento/);
  await expect(page.getByRole("heading", { name: "No encontramos propiedades" })).toBeVisible();
});
test("reduced motion keeps the search and hides later scenes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await hydrated(page);
  await expect(page.getByRole("button", { name: "Buscar propiedades", exact: true })).toBeVisible();
  await expect(page.locator(".story-second")).toBeHidden();
});

test('opening story scenes and return to search',async({page})=>{
 await page.goto('/'); await hydrated(page);
 const geometry=await page.locator('.scroll-story').evaluate(node=>({top:node.getBoundingClientRect().top+window.scrollY,distance:node.getBoundingClientRect().height-node.querySelector<HTMLElement>('.story-stage')!.offsetHeight}));
 for (const [progress,selector,name] of [[0.5,'.story-second','story-second'],[0.95,'.story-third','story-third']] as const) {
  await page.evaluate(top=>window.scrollTo({top,behavior:'instant'}),geometry.top+geometry.distance*progress);
  await expect.poll(()=>page.locator(selector).evaluate(node=>Number(getComputedStyle(node).opacity))).toBe(1);
  await expect(page.locator('.story-intro')).toHaveAttribute('aria-hidden','true');
  await expect(page).toHaveScreenshot(`${name}.png`,{animations:'disabled'});
 }
 await page.getByRole('button',{name:'Buscar',exact:true}).click();
 await expect(page.locator('input[data-search-location],input[aria-label="Ubicación"]')).toBeFocused();
});
