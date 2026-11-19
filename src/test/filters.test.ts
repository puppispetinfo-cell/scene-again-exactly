import { describe, expect, it } from "vitest";
import { filterProperties, formatPrice, parseFilters } from "@/lib/filters";
import { localProperties } from "@/data/properties";

describe("property search", () => {
  it("Alquilar shows no results when only sale listings exist", () => {
    expect(filterProperties(localProperties, { operacion: "alquiler" })).toHaveLength(0);
  });
  it("max USD 300.000 returns only Albert Brucce Sabin 6079", () => {
    expect(filterProperties(localProperties, { precioMax: 300000 }).map((p) => p.slug)).toEqual(["albert-brucce-sabin-6079"]);
  });
  it("4+ bedrooms excludes the 3-bedroom family house", () => {
    expect(filterProperties(localProperties, { dormitorios: 4 }).map((p) => p.slug)).not.toContain("casa-familiar");
  });
  it("price on request is shown as 'Precio a consultar'", () => {
    expect(formatPrice(null)).toBe("Precio a consultar");
  });
  it("parses filters from the URL and drops invalid values", () => {
    expect(parseFilters({ operacion: "venta", dormitorios: "3", tipo: "<script>" })).toEqual({ operacion: "venta", dormitorios: 3 });
  });
});
