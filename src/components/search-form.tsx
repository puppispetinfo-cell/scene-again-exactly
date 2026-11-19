import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ExternalLink,
  Building2,
  Wallet,
  BedDouble,
  Bath,
  ArrowRight,
} from "lucide-react";
import { PremiumSelect } from "@/components/premium-select";
import { Button } from "@/components/ui/button";
import type { PropertyFilters } from "@/lib/types";
import type { SearchFilterDefinition } from "@/core/contracts";
import { useFilterDefinitions } from "@/core/filter-context";
import { TEMPORARIOS_URL } from "./site";

const sel =
  "h-12 w-full appearance-none rounded-lg border bg-background px-3 text-sm font-medium outline-none focus:border-foreground";
const icons = { tipo: Building2, precioMax: Wallet, dormitorios: BedDouble, banos: Bath };
const additionalKeys = new Set(["piscina", "superficieMin", "caracteristicas"]);
const numericKeys = new Set(["precioMax", "dormitorios", "banos", "superficieMin"]);
export function SearchForm({
  initial = {},
  immersive = false,
}: {
  initial?: PropertyFilters;
  immersive?: boolean;
}) {
  const definitions = useFilterDefinitions()
    .filter((d) => d.visible)
    .sort((a, b) => a.order - b.order);
  const operation = definitions.find((d) => d.key === "operacion");
  const navigate = useNavigate();
  const [f, setF] = useState<PropertyFilters>({ operacion: "venta", ...initial });
  const [more, setMore] = useState(false);
  const set = <K extends keyof PropertyFilters>(k: K, v: PropertyFilters[K] | "") =>
    setF((s) => ({ ...s, [k]: v === "" ? undefined : v }));
  const update = (key: keyof PropertyFilters, value: string) => {
    setF((s) => ({
      ...s,
      [key]: value === "" ? undefined : numericKeys.has(key) ? Number(value) : value,
    }));
  };
  const render = (d: SearchFilterDefinition) => {
    if (d.key === "ubicacion")
      return (
        <label key={d.id} className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            data-search-location
            aria-label={d.label}
            placeholder={d.placeholder ?? d.label}
            value={f.ubicacion ?? ""}
            onChange={(e) => set("ubicacion", e.target.value)}
            className={`${sel} pl-9`}
          />
        </label>
      );
    if (d.key === "piscina")
      return (
        <label key={d.id} className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!f.piscina}
            onChange={(e) => set("piscina", e.target.checked || "")}
            className="h-4 w-4 accent-foreground"
          />
          {d.label}
        </label>
      );
    if (d.key === "caracteristicas")
      return (
        <fieldset key={d.id} className="mt-3 space-y-2 text-sm">
          <legend>{d.label}</legend>
          {d.options.map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={f.caracteristicas?.includes(option.value) ?? false}
                onChange={(e) =>
                  set(
                    "caracteristicas",
                    e.target.checked
                      ? [...(f.caracteristicas ?? []), option.value]
                      : (f.caracteristicas ?? []).filter((id) => id !== option.value),
                  )
                }
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      );
    if (d.presentation === "number")
      return (
        <label key={d.id} className="text-sm">
          {d.label}
          <input
            type="number"
            min="0"
            aria-label={d.label}
            value={String(f[d.key] ?? "")}
            onChange={(e) => update(d.key, e.target.value)}
            className={sel}
          />
        </label>
      );
    const icon = d.key in icons ? icons[d.key as keyof typeof icons] : undefined;
    return (
      <PremiumSelect
        key={d.id}
        label={d.label}
        {...(icon ? { icon } : {})}
        value={String(f[d.key] ?? "")}
        onValueChange={(value) => update(d.key, value)}
        options={[{ value: "", label: d.emptyLabel ?? d.label }, ...d.options]}
      />
    );
  };
  const additional = definitions.filter((d) => additionalKeys.has(d.key));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        navigate({ to: "/propiedades", search: f });
      }}
      className={`search-panel rounded-lg border bg-background p-4 sm:p-5 ${immersive ? "immersive-search" : ""}`}
    >
      <div className="mb-4 flex items-center gap-2 text-sm">
        {operation?.presentation === "tabs"
          ? operation.options.map((op) => (
              <Button
                key={op.value}
                variant="ghost"
                type="button"
                onClick={() => update("operacion", op.value)}
                aria-pressed={f.operacion === op.value}
                className={`rounded-full px-4 py-2 font-medium ${f.operacion === op.value ? "bg-ink text-ink-foreground hover:bg-ink/90 hover:text-ink-foreground" : "text-muted-foreground"}`}
              >
                {op.label}
              </Button>
            ))
          : operation
            ? render(operation)
            : null}
        <a
          href={TEMPORARIOS_URL}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-muted-foreground"
        >
          Temporarios <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {definitions
          .filter((d) => d.key !== "operacion" && d.key !== "orden" && !additionalKeys.has(d.key))
          .map(render)}
      </div>
      {additional.length > 0 && (
        <Button
          variant="ghost"
          type="button"
          aria-expanded={more}
          onClick={() => setMore(!more)}
          className="mt-3 px-0 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <SlidersHorizontal className="h-4 w-4" /> Filtros adicionales
        </Button>
      )}
      {more && additional.map(render)}
      <Button type="submit" className="group mt-4 h-12 w-full rounded-lg font-semibold">
        Buscar propiedades <ArrowRight className="transition-transform group-hover:translate-x-1" />
      </Button>
    </form>
  );
}
