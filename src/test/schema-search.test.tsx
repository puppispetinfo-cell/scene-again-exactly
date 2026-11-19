import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SearchForm } from "@/components/search-form";
import { FilterDefinitionsContext } from "@/core/filter-context";
import { defaultFilters } from "@/core/filter-definitions";
import { parseFilters, filterProperties } from "@/lib/filters";
import { localProperties } from "@/data/properties";
import { searchFilterDefinitionSchema } from "@/core/contracts";
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));
describe("schema-driven search compatibility", () => {
  it("uses configurable labels, visibility and order without changing URL keys", () => {
    const filters = defaultFilters.map((d) => ({
      ...d,
      label: d.key === "banos" ? "Bathrooms configured" : d.label,
      visible: d.key === "tipo" ? false : d.visible,
      order: d.key === "banos" ? 1 : d.order,
    }));
    render(
      <FilterDefinitionsContext.Provider value={filters}>
        <SearchForm />
      </FilterDefinitionsContext.Provider>,
    );
    expect(screen.queryByRole("combobox", { name: "Tipo de inmueble" })).toBeNull();
    expect(screen.getAllByRole("combobox")[0]).toHaveAccessibleName("Bathrooms configured");
    const location = screen.getByRole("textbox", {
      name: defaultFilters.find((d) => d.key === "ubicacion")!.label,
    });
    fireEvent.change(location, { target: { value: "Centro" } });
    fireEvent.submit(location.closest("form")!);
    expect(navigate).toHaveBeenLastCalledWith({
      to: "/propiedades",
      search: { operacion: "venta", ubicacion: "Centro" },
    });
  });
  it("rejects incompatible presentations and unsafe taxonomy slugs", () => {
    const type = defaultFilters.find((d) => d.key === "tipo")!;
    expect(
      searchFilterDefinitionSchema.safeParse({ ...type, presentation: "checkbox" }).success,
    ).toBe(false);
    expect(
      searchFilterDefinitionSchema.safeParse({
        ...type,
        options: [{ value: "../invalid-type", label: "Unknown" }],
      }).success,
    ).toBe(false);
  });
  it("supports currency, area and stable feature IDs without currency conversion", () => {
    const properties = localProperties.map((p) => ({
      ...p,
      featureIds: p.id === "1" ? ["pool"] : [],
    }));
    const filters = parseFilters({
      moneda: "USD",
      superficieMin: "400",
      caracteristicas: ["pool", "pool"],
    });
    expect(filters).toEqual({ moneda: "USD", superficieMin: 400, caracteristicas: ["pool"] });
    expect(filterProperties(properties, filters).map((p) => p.id)).toEqual(["1"]);
    expect(filterProperties(properties, { moneda: "ARS" })).toEqual([]);
  });
});
