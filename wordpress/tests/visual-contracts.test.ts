import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  visualPageSchema,
  geographySchema,
  studioPropertySchema,
  resolveResponsive,
  responsiveLayoutSchema,
} from "../contracts/studio";
const report = JSON.parse(readFileSync("artifacts/wp-visual-integration.json", "utf8"));
describe("visual studio real native WordPress contracts", () => {
  it("has a clean native MariaDB run", () => {
    expect(report.success).toBe(true);
    expect(report.lastError).toBeNull();
    expect(report.environment.database).toContain("MariaDB");
  });
  it("validates actual coordinated home document", () =>
    expect(() => visualPageSchema.parse(report.documents.home)).not.toThrow());
  it("validates actual geographic entity", () =>
    expect(() => geographySchema.parse(report.documents.location)).not.toThrow());
  it("validates property with typed attributes and stable geography", () =>
    expect(() => studioPropertySchema.parse(report.documents.property)).not.toThrow());
  it("inherits base values and resets mobile override without duplicating documents", () => {
    const base = { height: 800, title: "Shared" };
    expect(resolveResponsive(base, { mobile: { height: 500 } }, "mobile")).toEqual({
      height: 500,
      title: "Shared",
    });
    expect(resolveResponsive(base, {}, "mobile")).toEqual(base);
  });
  it("rejects executable colors and unbounded layout values", () => {
    expect(
      responsiveLayoutSchema.safeParse({ overlayColor: "url(javascript:alert(1))" }).success,
    ).toBe(false);
    expect(responsiveLayoutSchema.safeParse({ height: 99999 }).success).toBe(false);
  });
});
