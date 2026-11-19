import type { SearchFilterDefinition } from "./contracts";
const base = {
  schemaVersion: 1 as const,
  revision: 0,
  extensions: {},
  visible: true,
  categoryIds: [],
  featureIds: [],
};
const options = (values: (string | number)[], label: (v: string) => string = (v) => v) =>
  values.map((v) => ({ value: String(v), label: label(String(v)) }));
export const defaultFilters: SearchFilterDefinition[] = [
  {
    ...base,
    id: "filter-operation",
    key: "operacion",
    label: "Operación",
    presentation: "tabs",
    order: 0,
    options: [
      { value: "venta", label: "Comprar" },
      { value: "alquiler", label: "Alquilar" },
    ],
  },
  {
    ...base,
    id: "filter-location",
    key: "ubicacion",
    label: "Ubicación",
    placeholder: "¿Dónde buscás?",
    presentation: "text",
    order: 1,
    options: [],
  },
  {
    ...base,
    id: "filter-type",
    key: "tipo",
    label: "Tipo de inmueble",
    presentation: "select",
    order: 2,
    options: options(
      ["casa", "departamento", "terreno", "local", "oficina"],
      (v) => v.charAt(0).toUpperCase() + v.slice(1),
    ),
  },
  {
    ...base,
    id: "filter-price",
    key: "precioMax",
    label: "Precio máximo",
    emptyLabel: "Sin límite de precio",
    presentation: "select",
    order: 3,
    options: options(
      [150000, 250000, 350000, 500000, 750000],
      (v) => `Hasta USD ${Number(v).toLocaleString("es-AR")}`,
    ),
  },
  {
    ...base,
    id: "filter-bedrooms",
    key: "dormitorios",
    label: "Dormitorios",
    presentation: "select",
    order: 4,
    options: options([1, 2, 3, 4], (v) => `${v}+ dorm.`),
  },
  {
    ...base,
    id: "filter-bathrooms",
    key: "banos",
    label: "Baños",
    presentation: "select",
    order: 5,
    options: options([1, 2, 3, 4], (v) => `${v}+ baños`),
  },
  {
    ...base,
    id: "filter-pool",
    key: "piscina",
    label: "Con piscina",
    presentation: "checkbox",
    order: 6,
    options: [],
  },
  {
    ...base,
    id: "filter-sort",
    key: "orden",
    label: "Ordenar",
    presentation: "select",
    order: 7,
    options: [
      { value: "recientes", label: "Más recientes" },
      { value: "precio-asc", label: "Menor precio" },
      { value: "precio-desc", label: "Mayor precio" },
    ],
  },
  ...(["moneda", "superficieMin", "caracteristicas"] as const).map((key, i) => ({
    ...base,
    id: `filter-${key}`,
    key,
    label: key,
    presentation:
      key === "moneda"
        ? ("select" as const)
        : key === "superficieMin"
          ? ("number" as const)
          : ("multiselect" as const),
    visible: false,
    order: 8 + i,
    options: [],
  })),
];
