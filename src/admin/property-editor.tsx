import { useState } from "react";
import { adminCatalogs } from "@/platform/admin-functions";
import { georefSearch } from "@/platform/georef";
import {
  propertyDraftSchema,
  slugify,
  suggestSEO,
  type ContentRecord,
  type Estate,
} from "@/platform/contracts";
import { Block, Input, TextArea, Select, Check, useAsync } from "./fields";
import { PhotoDrop } from "./photo-drop";
import { SaveBar, useDocument } from "./use-document";
export function PropertyEditor({ record }: { record: ContentRecord }) {
  const state = useDocument(record, propertyDraftSchema.parse(record.document));
  const p = state.document;
  const set = <K extends keyof Estate>(key: K, value: Estate[K]) =>
    state.setDocument((d) => ({ ...d, [key]: value }));
  const catalog = useAsync(() => adminCatalogs()),
    provinces = useAsync(() => georefSearch({ data: { query: "" } }));
  const [cityQuery, setCityQuery] = useState(p.city);
  const cities = useAsync(
    () =>
      p.provinceId
        ? georefSearch({ data: { province: p.provinceId, query: cityQuery } })
        : Promise.resolve({ rows: [], cached: false as const, unavailable: false as const }),
    [p.provinceId, cityQuery],
  );
  const entries = catalog.data ?? [];
  const options = (kind: string) => [
    { value: "", label: "Seleccionar" },
    ...entries
      .filter((c) => c.kind === kind && c.active)
      .map((c) => ({ value: c.id, label: c.label })),
  ];
  const suggestions = suggestSEO(p);
  return (
    <div className="admin-editor">
      <header className="admin-page-title">
        <div>
          <p>Propiedades</p>
          <h1>{p.title || "Nueva propiedad"}</h1>
          <span>
            {record.status === "published" ? "Hay una versión publicada" : "Borrador privado"}
          </span>
        </div>
      </header>
      <SaveBar state={state} />
      <div className="admin-editor-grid">
        <div>
          <Block
            title="Fotografías"
            help="La primera foto es la principal. Arrastrá las miniaturas para ordenarlas."
          >
            <PhotoDrop images={p.images} onChange={(images) => set("images", images)} />
          </Block>
          <Block title="Datos principales">
            <Input
              label="Título"
              value={p.title}
              onChange={(title) => {
                state.setDocument((d) => ({
                  ...d,
                  title,
                  slug: d.seo.manual ? d.slug : slugify(title),
                  seo: d.seo.manual ? d.seo : { ...d.seo, title: `${title} | RIVTON` },
                }));
              }}
            />
            <div className="admin-two">
              <Input
                label="Código interno"
                value={p.code}
                onChange={(v) => set("code", v)}
                help="Se genera al crear la propiedad. Podés cambiarlo."
              />
              <Select
                label="Estado comercial"
                value={p.commercialStatus}
                onChange={(v) => set("commercialStatus", v as Estate["commercialStatus"])}
                options={[
                  { value: "available", label: "Disponible" },
                  { value: "reserved", label: "Reservada" },
                  { value: "sold", label: "Vendida" },
                  { value: "rented", label: "Alquilada" },
                  { value: "unavailable", label: "No disponible" },
                ]}
              />
              <Select
                label="Tipo de inmueble"
                value={p.typeId ?? ""}
                onChange={(v) => set("typeId", v || null)}
                options={options("type")}
              />
              <Select
                label="Operación"
                value={p.operationId ?? ""}
                onChange={(v) => set("operationId", v || null)}
                options={options("operation")}
              />
            </div>
            <Check label="Destacada" value={p.featured} onChange={(v) => set("featured", v)} />
            <Check label="Novedad" value={p.novelty} onChange={(v) => set("novelty", v)} />
          </Block>
          <Block
            title="Ubicación"
            help="La provincia y localidad se verifican en la fuente oficial. La dirección exacta se mantiene privada salvo que elijas mostrarla."
          >
            <Select
              label="Provincia"
              value={p.provinceId}
              onChange={(id) => {
                const province = provinces.data?.rows.find((r) => r.id === id);
                state.setDocument((d) => ({
                  ...d,
                  provinceId: id,
                  province: province?.name ?? "",
                  cityId: "",
                  city: "",
                  neighborhood: "",
                }));
                setCityQuery("");
              }}
              options={[
                { value: "", label: "Elegir provincia" },
                ...(provinces.data?.rows ?? []).map((r) => ({ value: r.id, label: r.name })),
              ]}
            />
            <Input label="Buscar localidad" value={cityQuery} onChange={setCityQuery} />
            <Select
              label="Localidad"
              value={p.cityId}
              onChange={(id) => {
                const city = cities.data?.rows.find((r) => r.id === id);
                state.setDocument((d) => ({
                  ...d,
                  cityId: id,
                  city: city?.name ?? "",
                  neighborhood: "",
                }));
              }}
              options={[
                { value: "", label: "Elegir localidad" },
                ...(cities.data?.rows ?? []).map((r) => ({ value: r.id, label: r.name })),
              ]}
            />
            {cities.data?.unavailable && (
              <p role="status">
                El servicio de ubicaciones no está disponible. Podés guardar el borrador y completar
                la localidad después.
              </p>
            )}
            <Input
              label="Barrio o zona"
              value={p.neighborhood}
              onChange={(v) => set("neighborhood", v.replace(/\s{2,}/g, " "))}
            />
            <Input
              label="Dirección exacta (opcional)"
              value={p.address}
              onChange={(v) => set("address", v)}
            />
            <Check
              label="Mostrar dirección exacta en la ficha pública"
              value={p.publicAddress}
              onChange={(v) => set("publicAddress", v)}
            />
          </Block>
          <Block title="Precio">
            <Check
              label="Precio a consultar"
              value={p.price === null}
              onChange={(v) => set("price", v ? null : { amount: 0, currency: "USD" })}
            />
            {p.price && (
              <div className="admin-two">
                <Input
                  label="Importe"
                  type="number"
                  value={p.price.amount}
                  onChange={(v) =>
                    set("price", { amount: Number(v), currency: p.price?.currency ?? "USD" })
                  }
                />
                <Select
                  label="Moneda"
                  value={p.price.currency}
                  onChange={(v) =>
                    set("price", { amount: p.price?.amount ?? 1, currency: v as "ARS" | "USD" })
                  }
                  options={[
                    { value: "USD", label: "USD" },
                    { value: "ARS", label: "ARS" },
                  ]}
                />
              </div>
            )}
          </Block>
          <Block title="Características">
            <div className="admin-two">
              {entries
                .filter((c) => c.kind === "attribute" && c.active)
                .map((c) => {
                  const def = c.definition;
                  const value = p.attributes[c.id];
                  const change = (v: Estate["attributes"][string]) =>
                    set("attributes", { ...p.attributes, [c.id]: v });
                  return def.valueType === "boolean" ? (
                    <Check key={c.id} label={c.label} value={value === true} onChange={change} />
                  ) : def.valueType === "select" ? (
                    <Select
                      key={c.id}
                      label={c.label}
                      value={String(value ?? "")}
                      onChange={change}
                      options={[
                        { value: "", label: "Sin especificar" },
                        ...(def.options ?? []).map((s: string) => ({ value: s, label: s })),
                      ]}
                    />
                  ) : def.valueType === "multiselect" ? (
                    <fieldset key={c.id}>
                      <legend>{c.label}</legend>
                      {(def.options ?? []).map((s: string) => (
                        <Check
                          key={s}
                          label={s}
                          value={Array.isArray(value) && value.includes(s)}
                          onChange={(v) =>
                            change(
                              v
                                ? [...(Array.isArray(value) ? value : []), s]
                                : (Array.isArray(value) ? value : []).filter((x) => x !== s),
                            )
                          }
                        />
                      ))}
                    </fieldset>
                  ) : (
                    <Input
                      key={c.id}
                      label={c.label}
                      type={def.valueType === "number" ? "number" : "text"}
                      value={typeof value === "number" || typeof value === "string" ? value : ""}
                      onChange={(v) => {
                        if (v === "") {
                          const next = { ...p.attributes };
                          delete next[c.id];
                          set("attributes", next);
                        } else change(def.valueType === "number" ? Number(v) : v);
                      }}
                    />
                  );
                })}
            </div>
          </Block>
          <Block title="Descripción">
            <TextArea
              label="Presentación breve"
              value={p.summary}
              onChange={(v) => set("summary", v)}
            />
            <TextArea
              label="Descripción completa"
              value={p.description}
              onChange={(v) => set("description", v)}
            />
          </Block>
        </div>
        <aside>
          <Block
            title="Cómo aparece en búsquedas"
            help="Las sugerencias usan los datos de esta ficha. Si las editás, se conservan tus cambios."
          >
            <button
              type="button"
              className="admin-secondary"
              onClick={() => {
                if (
                  p.seo.manual &&
                  !window.confirm("¿Reemplazar el SEO editado por las sugerencias?")
                )
                  return;
                state.setDocument((d) => ({
                  ...d,
                  slug: suggestions.slug,
                  seo: {
                    ...d.seo,
                    title: suggestions.title,
                    description: suggestions.description,
                    manual: false,
                  },
                }));
              }}
            >
              Aplicar sugerencias
            </button>
            <Input
              label="URL de la propiedad"
              value={p.slug}
              onChange={(v) => {
                set("slug", v);
                set("seo", { ...p.seo, manual: true });
              }}
            />
            <Input
              label="Título para buscadores"
              value={p.seo.title}
              onChange={(v) => set("seo", { ...p.seo, title: v, manual: true })}
            />
            <TextArea
              label="Descripción para buscadores"
              value={p.seo.description}
              onChange={(v) => set("seo", { ...p.seo, description: v, manual: true })}
            />
            <Check
              label="Permitir indexación al publicar en producción"
              value={p.seo.index}
              onChange={(v) => set("seo", { ...p.seo, index: v, manual: true })}
            />
            <div className="admin-search-preview">
              <small>rivton / propiedades / {p.slug}</small>
              <h3>{p.seo.title || suggestions.title}</h3>
              <p>{p.seo.description || suggestions.description}</p>
            </div>
            <ul className="admin-checklist">
              {!p.description && <li>Falta la descripción del inmueble.</li>}
              {!p.images.length && <li>Agregá una foto principal.</li>}
              {p.images.some((i) => !i.alt) && <li>Completá la descripción de las fotos.</li>}
              {!p.cityId && <li>Elegí la localidad.</li>}
            </ul>
          </Block>
          <Block
            title="Publicación"
            help="Podés guardar un borrador incompleto. Para publicar necesitás título, tipo, operación, localidad, descripción y una foto."
          >
            <p>Las modificaciones no cambian la versión pública hasta que publiques.</p>
            <p className="admin-help">
              {state.revision ? "Borrador guardado" : "Todavía no guardada"}
            </p>
          </Block>
        </aside>
      </div>
    </div>
  );
}
