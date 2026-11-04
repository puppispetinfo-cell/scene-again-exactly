import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  expect: { timeout: 10000, toHaveScreenshot: { maxDiffPixelRatio: 0.0002 } },
  workers: 1,
  reporter: [["list"], ["json", { outputFile: ".tmp/playwright-results.json" }]],
  outputDir: ".tmp/playwright-artifacts",
  use: {
    baseURL: process.env["RIVTON_TEST_URL"] ?? "http://127.0.0.1:4173",
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    {
      name: "mobile",
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: "short-mobile",
      use: { viewport: { width: 390, height: 667 }, isMobile: true, hasTouch: true },
    },
    {
      name: "landscape",
      use: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
    },
  ],
});
