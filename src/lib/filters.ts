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
  if (typeof s["operacion"] === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s["operacion"]) && s["operacion"].length<=128) f.operacion = s["operacion"];
  if (typeof s["ubicacion"] === "string" && s["ubicacion"].trim())
    f.ubicacion = s["ubicacion"].trim();
  if (typeof s["tipo"] === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s["tipo"]) && s["tipo"].length<=128) f.tipo = s["tipo"];
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
      if (!hay.includes(norm(f.ubicacion)) && !(p.locationIds??[]).includes(f.ubicacion)) return false;
    }
    // Price-on-request listings are kept out when a max price is set (unknown price).
    if (
      f.precioMax &&
      (!p.price || p.price.currency !== (f.moneda ?? "USD") || p.price.amount > f.precioMax)
    )
      return false;
    if (f.dormitorios && (p.bedrooms ?? 0) < f.dormitorios) return false;
    if (f.banos && (p.bathrooms ?? 0) < f.banos) return false;
    if (f.piscina && !p.amenities.some(a=>["piscina","pileta"].includes(norm(a)))) return false;
    if (f.moneda && p.price?.currency !== f.moneda) return false;
    if (f.superficieMin && (p.coveredArea ?? p.lotArea ?? 0) < f.superficieMin) return false;
    if (f.caracteristicas?.some((id) => !(p.featureIds ?? []).includes(id))) return false;
    return true;
  });
  const price = (p: Property) => p.price?.amount ?? Infinity;
  const currency=(a:Property,b:Property)=>!a.price||!b.price?Number(!a.price)-Number(!b.price):a.price.currency.localeCompare(b.price.currency);
  if (f.orden === "precio-asc") out.sort((a, b) => currency(a,b) || price(a) - price(b));
  else if (f.orden === "precio-desc")
    out.sort((a, b) => currency(a,b) || (b.price?.amount ?? -1) - (a.price?.amount ?? -1));
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
