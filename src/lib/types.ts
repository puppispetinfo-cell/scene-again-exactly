// Content model shaped to map 1:1 from a future WordPress REST API (custom post types + ACF).

export type Operation = "venta" | "alquiler";
export type PropertyType = "casa" | "departamento" | "terreno" | "local" | "oficina";

export interface PropertyImage {
  src: string;
  alt: string;
}

export interface Property {
  id: string;
  slug: string;
  title: string;
  operation: Operation;
  type: PropertyType;
  /** null = "Precio a consultar" */
  price: { amount: number; currency: "USD" | "ARS" } | null;
  bedrooms?: number | undefined;
  bathrooms?: number | undefined;
  lotArea?: number | undefined; // m² terreno
  coveredArea?: number | undefined; // m² cubiertos
  location?: string | undefined;
  code?: string | undefined;
  amenities: string[];
  featureIds?: string[] | undefined;
  description?: string | undefined;
  images: PropertyImage[];
  featured: boolean;
  featuredOrder?: number | undefined;
  publishedAt: string; // ISO
  whatsapp?: string | undefined;
  calendlyUrl?: string | undefined;
  coordinates?: { lat: number | undefined; lng: number } | undefined;
}

export interface SiteSettings {
  whatsapp?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
  socials: { label: string; url: string }[];
}

export interface TeamInfo {
  title: string;
  body: string;
  image: PropertyImage;
}

export interface PropertyFilters {
  operacion?: Operation | undefined;
  ubicacion?: string | undefined;
  tipo?: PropertyType | undefined;
  precioMax?: number | undefined;
  dormitorios?: number | undefined;
  banos?: number | undefined;
  piscina?: boolean | undefined;
  moneda?: "USD" | "ARS" | undefined;
  superficieMin?: number | undefined;
  caracteristicas?: string[] | undefined;
  orden?: "recientes" | "precio-asc" | "precio-desc" | undefined;
}
