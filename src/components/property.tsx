import { Link } from "@tanstack/react-router";
import { Bed, Bath, Ruler, Heart } from "lucide-react";
import type { Property } from "@/lib/types";
import { formatArea, formatPrice } from "@/lib/filters";
import { useFavorites } from "@/hooks/use-favorites";
import { Button } from "@/components/ui/button";

export function FavButton({ id, className = "" }: { id: string; className?: string }) {
  const { has, toggle } = useFavorites();
  const on = has(id);
  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      aria-label={on ? "Quitar de favoritos" : "Agregar a favoritos"}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
      className={`glass-control grid h-9 w-9 place-items-center rounded-full text-foreground ${className}`}
    >
      <Heart className={`h-4 w-4 ${on ? "fill-foreground" : ""}`} />
    </Button>
  );
}

export function Specs({ p, className = "" }: { p: Property; className?: string }) {
  const area = p.coveredArea ?? p.lotArea;
  return (
    <div
      className={`flex flex-wrap items-center gap-4 text-[13px] text-muted-foreground ${className}`}
    >
      {p.bedrooms != null && (
        <span className="inline-flex items-center gap-1.5">
          <Bed className="h-4 w-4" />
          {p.bedrooms}
        </span>
      )}
      {p.bathrooms != null && (
        <span className="inline-flex items-center gap-1.5">
          <Bath className="h-4 w-4" />
          {p.bathrooms}
        </span>
      )}
      {area != null && (
        <span className="inline-flex items-center gap-1.5">
          <Ruler className="h-4 w-4" />
          {formatArea(area)}
        </span>
      )}
    </div>
  );
}

const OpTag = ({ p }: { p: Property }) => (
  <span className="glass-control label-caps rounded-full px-3 py-1.5 text-[10px] text-foreground">
    {p.operationLabel ??
      (p.operation === "venta" ? "Venta" : p.operation === "alquiler" ? "Alquiler" : p.operation)}
  </span>
);

export function PropertyCard({ p, eager }: { p: Property; eager?: boolean }) {
  return (
    <Link
      to="/propiedades/$slug"
      params={{ slug: p.slug }}
      className="group block overflow-hidden rounded-xl border bg-card"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={p.images[0]?.src}
          alt={p.images[0]?.alt}
          loading={eager ? "eager" : "lazy"}
          width={1280}
          height={896}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3">
          <OpTag p={p} />
        </div>
        <FavButton id={p.id} className="absolute right-3 top-3" />
      </div>
      <div className="space-y-1.5 p-4">
        <p className="text-xl font-bold tracking-tight">{formatPrice(p.price)}</p>
        <p className="font-display text-xl">{p.title}</p>
        {p.location && <p className="text-[13px] text-muted-foreground">{p.location}</p>}
        <Specs p={p} className="pt-1" />
      </div>
    </Link>
  );
}

export function PropertyRow({ p }: { p: Property }) {
  return (
    <Link
      to="/propiedades/$slug"
      params={{ slug: p.slug }}
      className="group grid grid-cols-[8rem_minmax(0,1fr)] gap-4 overflow-hidden rounded-xl border bg-card sm:grid-cols-[12rem_minmax(0,1fr)]"
    >
      <div className="relative h-full min-h-28 overflow-hidden">
        <img
          src={p.images[0]?.src}
          alt={p.images[0]?.alt}
          loading="lazy"
          width={1280}
          height={896}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 py-3 pr-3">
        <div className="flex items-start justify-between gap-2">
          <span className="label-caps text-[10px] text-muted-foreground">
            {p.operationLabel ??
              (p.operation === "venta"
                ? "Venta"
                : p.operation === "alquiler"
                  ? "Alquiler"
                  : p.operation)}
          </span>
          <FavButton id={p.id} className="-mt-1 h-8 w-8 border" />
        </div>
        <p className="truncate font-display text-lg">{p.title}</p>
        <p className="text-base font-bold">{formatPrice(p.price)}</p>
        <Specs p={p} className="mt-1 gap-3" />
      </div>
    </Link>
  );
}
