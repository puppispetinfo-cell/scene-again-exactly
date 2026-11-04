import type { Operation, Property, PropertyFilters, PropertyType } from "./types";

const OPS: Operation[] = ["venta", "alquiler"];
const TYPES: PropertyType[] = ["casa", "departamento", "terreno", "local", "oficina"];

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export function parseFilters(raw: Record<string, unknown>): PropertyFilters {
  const s = raw;
  const f: PropertyFilters = {};
  if (OPS.includes(s["operacion"] as Operation)) f.operacion = s["operacion"] as Operation;
  if (typeof s["ubicacion"] === "string" && s["ubicacion"].trim())
    f.ubicacion = s["ubicacion"].trim();
  if (TYPES.includes(s["tipo"] as PropertyType)) f.tipo = s["tipo"] as PropertyType;
  f.precioMax = num(s["precioMax"]);
  f.dormitorios = num(s["dormitorios"]);
  f.banos = num(s["banos"]);
  if (s["piscina"] === true || s["piscina"] === "true") f.piscina = true;
  if (["recientes", "precio-asc", "precio-desc"].includes(s["orden"] as string))
    f.orden = s["orden"] as PropertyFilters["orden"];
  if (s["moneda"] === "USD" || s["moneda"] === "ARS") f.moneda = s["moneda"];
  f.superficieMin = num(s["superficieMin"]);
  const features = s["caracteristicas"];
  if (Array.isArray(features)) {
    const ids = features
      .filter((v): v is string => typeof v === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(v))
      .slice(0, 50);
    if (ids.length) f.caracteristicas = [...new Set(ids)];
  }
  for (const k of Object.keys(f) as (keyof PropertyFilters)[]) if (f[k] === undefined) delete f[k];
  return f;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function filterProperties(list: Property[], f: PropertyFilters): Property[] {
  const out = list.filter((p) => {
    if (f.operacion && p.operation !== f.operacion) return false;
    if (f.tipo && p.type !== f.tipo) return false;
    if (f.ubicacion) {
      const hay = norm(`${p.title} ${p.location ?? ""}`);
      if (!hay.includes(norm(f.ubicacion))) return false;
    }
    // Price-on-request listings are kept out when a max price is set (unknown price).
    if (
      f.precioMax &&
      (!p.price || p.price.currency !== (f.moneda ?? "USD") || p.price.amount > f.precioMax)
    )
      return false;
    if (f.dormitorios && (p.bedrooms ?? 0) < f.dormitorios) return false;
    if (f.banos && (p.bathrooms ?? 0) < f.banos) return false;
    if (f.piscina && !p.amenities.includes("Piscina")) return false;
    if (f.moneda && p.price?.currency !== f.moneda) return false;
    if (f.superficieMin && (p.coveredArea ?? p.lotArea ?? 0) < f.superficieMin) return false;
    if (f.caracteristicas?.some((id) => !(p.featureIds ?? []).includes(id))) return false;
    return true;
  });
  const price = (p: Property) => p.price?.amount ?? Infinity;
  if (f.orden === "precio-asc") out.sort((a, b) => price(a) - price(b));
  else if (f.orden === "precio-desc")
    out.sort((a, b) => (b.price?.amount ?? -1) - (a.price?.amount ?? -1));
  else out.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return out;
}

export function formatPrice(p: Property["price"]) {
  if (!p) return "Precio a consultar";
  return `${p.currency} ${p.amount.toLocaleString("es-AR")}`;
}

export function formatArea(n: number) {
  return `${n.toLocaleString("es-AR")} m²`;
}

export const TYPE_LABEL: Record<PropertyType, string> = {
  casa: "Casa",
  departamento: "Departamento",
  terreno: "Terreno",
  local: "Local",
  oficina: "Oficina",
};
