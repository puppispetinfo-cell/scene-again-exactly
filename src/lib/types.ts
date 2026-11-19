// Public projection shared by search, home, detail and favorites.

export type Operation = string;
export type PropertyType = string;

export interface PropertyImage {
  src: string;
  alt: string;
}

export interface Property {
  id: string;
  slug: string;
  title: string;
  operation: Operation;
  operationLabel?: string | undefined;
  type: PropertyType;
  typeLabel?: string | undefined;
  locationIds?: string[] | undefined;
  novelty?: boolean | undefined;
  commercialStatus?: string | undefined;
  attributes?: Record<string,unknown> | undefined;
  seo?: import("@/core/contracts").SEOSettings | undefined;
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
