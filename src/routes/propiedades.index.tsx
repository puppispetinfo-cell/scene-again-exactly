import { EditableText } from "@/platform/editable";
import { pageSEO } from "@/platform/seo";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { X, List, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import { filterProperties, parseFilters, TYPE_LABEL } from "@/lib/filters";
import type { PropertyFilters } from "@/lib/types";
import { getProperties } from "@/services/content";
import { PropertyCard } from "@/components/property";
import { SearchForm } from "@/components/search-form";
import { useFilterDefinitions } from "@/core/filter-context";
import { PremiumSelect } from "@/components/premium-select";

export const Route = createFileRoute("/propiedades/")({
  validateSearch: (s: Record<string, unknown>): PropertyFilters => parseFilters(s),
  head: ({ matches }) =>
    pageSEO(matches, "propiedades") ?? {
      meta: [
        { title: "Explorar propiedades — RIVTON Group" },
        {
          name: "description",
          content: "Buscá casas, departamentos y terrenos en venta y alquiler con RIVTON Group.",
        },
        { property: "og:title", content: "Explorar propiedades — RIVTON Group" },
        {
          property: "og:description",
          content: "Filtrá por operación, tipo, precio, dormitorios y baños.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    },
  loader: () => getProperties(),
  component: Results,
});

function chipsFor(f: PropertyFilters) {
  const c: { key: keyof PropertyFilters; label: string }[] = [];
  if (f.operacion)
    c.push({
      key: "operacion",
      label:
        f.operacion === "venta" ? "Comprar" : f.operacion === "alquiler" ? "Alquilar" : f.operacion,
    });
  if (f.ubicacion) c.push({ key: "ubicacion", label: f.ubicacion });
  if (f.tipo) c.push({ key: "tipo", label: TYPE_LABEL[f.tipo] ?? f.tipo });
  if (f.precioMax)
    c.push({
      key: "precioMax",
      label: `Hasta ${f.moneda ?? "USD"} ${f.precioMax.toLocaleString("es-AR")}`,
    });
  if (f.dormitorios) c.push({ key: "dormitorios", label: `${f.dormitorios}+ dorm.` });
  if (f.banos) c.push({ key: "banos", label: `${f.banos}+ baños` });
  if (f.piscina) c.push({ key: "piscina", label: "Con piscina" });
  if (f.moneda) c.push({ key: "moneda", label: f.moneda });
  if (f.superficieMin) c.push({ key: "superficieMin", label: `${f.superficieMin} m² +` });
  if (f.caracteristicas?.length)
    c.push({ key: "caracteristicas", label: f.caracteristicas.join(", ") });
  return c;
}

function Results() {
  const sortDefinition = useFilterDefinitions().find((d) => d.key === "orden");
  const all = Route.useLoaderData();
  const f = Route.useSearch();
  const navigate = useNavigate({ from: "/propiedades/" });
  const [view, setView] = useState<"list" | "map">("list");
  const [edit, setEdit] = useState(false);
  const results = filterProperties(all, f);
  const chips = chipsFor(f);

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps mb-2 text-muted-foreground">
            <EditableText page="propiedades" id="heading" field="subtitle" fallback="Explorar" />
          </p>
          <h1 className="text-4xl lg:text-5xl">
            <EditableText page="propiedades" id="heading" field="title" fallback="Propiedades" />
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {sortDefinition?.visible && (
            <PremiumSelect
              label={sortDefinition.label}
              value={f.orden ?? "recientes"}
              onValueChange={(v) =>
                navigate({ search: (p) => ({ ...p, orden: v as PropertyFilters["orden"] }) })
              }
              className="h-10 w-[180px]"
              options={sortDefinition.options}
            />
          )}
          <div className="flex rounded-full border p-1">
            <button
              aria-label="Listado"
              onClick={() => setView("list")}
              className={`rounded-full p-2 ${view === "list" ? "bg-ink text-ink-foreground" : ""}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              aria-label="Mapa"
              onClick={() => setView("map")}
              className={`rounded-full p-2 ${view === "map" ? "bg-ink text-ink-foreground" : ""}`}
            >
              <MapIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setEdit(!edit)}
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros
        </button>
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => navigate({ search: (p) => ({ ...p, [c.key]: undefined }) })}
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-xs font-medium"
          >
            {c.label} <X className="h-3 w-3" />
          </button>
        ))}
        {chips.length > 0 && (
          <Link to="/propiedades" search={{}} className="text-xs underline">
            Limpiar
          </Link>
        )}
      </div>

      {edit && (
        <div className="mt-5">
          <SearchForm key={JSON.stringify(f)} initial={f} />
        </div>
      )}

      {results.length === 0 ? (
        <div className="mt-10 rounded-2xl border bg-muted px-6 py-16 text-center">
          <h2 className="text-3xl">No encontramos propiedades</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
            Ninguna propiedad coincide con estos filtros. Probá ampliar la búsqueda o escribinos y
            te ayudamos.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/propiedades"
              search={{}}
              className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-ink-foreground"
            >
              Ver todas
            </Link>
            <Link to="/contacto" className="rounded-full border px-5 py-3 text-sm font-semibold">
              Contactanos
            </Link>
          </div>
        </div>
      ) : view === "list" ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {results.map((p, i) => (
            <PropertyCard key={p.id} p={p} eager={i < 2} />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="relative grid min-h-96 place-items-center overflow-hidden rounded-2xl border bg-secondary/60 p-8 text-center">
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:40px_40px]" />
            <div className="relative max-w-xs">
              <MapIcon className="mx-auto h-8 w-8" strokeWidth={1.4} />
              <p className="mt-3 font-display text-2xl">Mapa en preparación</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Las ubicaciones se mostrarán cuando cada propiedad tenga su dirección confirmada.
              </p>
            </div>
          </div>
          <div className="grid gap-4">
            {results.map((p) => (
              <PropertyCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
