import { editableFields } from "@/platform/editable-fields";
import { useState } from "react";
import { adminList, adminRead, adminCatalogs } from "@/platform/admin-functions";
import { pageSchema, type ContentRecord, type Element } from "@/platform/contracts";
import { Block, Check, Input, Select, TextArea, useAsync } from "./fields";
import { PhotoDrop } from "./photo-drop";
import { SaveBar, useDocument } from "./use-document";
export function Builder() {
  const pages = useAsync(() => adminList({ data: { kind: "page", offset: 0, query: "" } }));
  const [selected, setSelected] = useState<ContentRecord | null>(null);
  return (
    <>
      <header className="admin-page-title">
        <div>
          <p>Contenido del sitio</p>
          <h1>Constructor visual</h1>
          <span>Cambiá textos y fotos conservando el diseño aprobado.</span>
        </div>
      </header>
      {pages.error && <p role="alert">{pages.error}</p>}
      <Select
        label="Página"
        value={selected?.id ?? ""}
        onChange={(id) => {
          const r = pages.data?.rows.find((r) => r.id === id);
          if (r) setSelected(r as ContentRecord);
        }}
        options={[
          { value: "", label: "Elegí una página" },
          ...(pages.data?.rows ?? []).map((r) => ({
            value: r.id,
            label: String(r.document.title ?? r.slug),
          })),
        ]}
      />
      {selected && <PageEditor key={selected.id} record={selected} />}
    </>
  );
}
function PageEditor({ record }: { record: ContentRecord }) {
  const state = useDocument(record, pageSchema.parse(record.document));
  const [index, setIndex] = useState(0),
    [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const properties = useAsync(() =>
    adminList({ data: { kind: "property", offset: 0, query: "" } }),
  );
  const catalogs = useAsync(() => adminCatalogs());
  const [propertyQuery, setPropertyQuery] = useState("");
  const e = state.document.elements[index];
  const fields = editableFields(record.slug, e?.id ?? "");
  const change = (patch: Partial<Element>) =>
    state.setDocument((d) => ({
      ...d,
      elements: d.elements.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));
  const base = e
    ? { title: e.title, subtitle: e.subtitle, body: e.body, image: e.image, ...e[device] }
    : null;
  const update = (key: "title" | "subtitle" | "body", value: string) => {
    if (!e) return;
    if (device === "mobile") change({ mobile: { ...e.mobile, [key]: value } });
    else change({ [key]: value });
  };
  return (
    <>
      {["privacidad", "cookies", "terminos"].includes(record.slug) && (
        <Block title="Revisión del documento legal">
          <Check
            label="Confirmo que el texto fue revisado y aprobado comercial y jurídicamente"
            value={state.document.reviewApproved}
            onChange={(v) => state.setDocument((d) => ({ ...d, reviewApproved: v }))}
          />
          <p className="admin-help">
            El borrador se mantiene privado hasta que marques la aprobación y publiques.
          </p>
        </Block>
      )}
      <SaveBar
        state={state}
        onPreview={() => {
          window.open(`/preview/${record.id}`, "_blank", "noopener,noreferrer");
        }}
      />
      <Block title="Título y descripción para buscadores">
        <Input
          label="Título"
          value={state.document.seo.title}
          onChange={(v) =>
            state.setDocument((d) => ({ ...d, seo: { ...d.seo, title: v, manual: true } }))
          }
        />
        <TextArea
          label="Descripción"
          value={state.document.seo.description}
          onChange={(v) =>
            state.setDocument((d) => ({ ...d, seo: { ...d.seo, description: v, manual: true } }))
          }
        />
        <Check
          label="Permitir indexación en producción"
          value={state.document.seo.index}
          onChange={(v) =>
            state.setDocument((d) => ({ ...d, seo: { ...d.seo, index: v, manual: true } }))
          }
        />
      </Block>
      <div className="admin-builder">
        <aside className="admin-card">
          <h2>Elementos</h2>
          {state.document.elements.map((element, i) => (
            <button
              key={element.id}
              className={`admin-element ${i === index ? "selected" : ""}`}
              onClick={() => setIndex(i)}
            >
              <span>{element.label}</span>
              <small>{element.visible ? "Visible" : "Oculto"}</small>
            </button>
          ))}
        </aside>
        <section className="admin-card admin-builder-center">
          <div className="admin-device">
            <button
              className={device === "desktop" ? "selected" : ""}
              onClick={() => setDevice("desktop")}
            >
              Desktop
            </button>
            <button
              className={device === "mobile" ? "selected" : ""}
              onClick={() => setDevice("mobile")}
            >
              Mobile
            </button>
          </div>
          <p className="admin-help">
            Vista del elemento. “Previsualizar” abre el sitio real con el último borrador guardado,
            sólo para tu sesión.
          </p>
          {base && (
            <div
              className={`admin-element-preview ${device}`}
              style={
                base.image
                  ? {
                      backgroundImage: `linear-gradient(0deg,rgba(0,0,0,.55),rgba(0,0,0,.2)),url("${base.image.src.replace(/["\\]/g, "")}")`,
                    }
                  : undefined
              }
            >
              <p>{e?.label}</p>
              <h2>{base.title}</h2>
              <p>{base.subtitle}</p>
              <p>{base.body}</p>
              {e?.button && <span className="admin-preview-button">{e.button.label}</span>}
            </div>
          )}
        </section>
        <aside className="admin-card">
          {e && base && (
            <>
              <h2>{e.label}</h2>
              <p className="admin-help">
                {device === "mobile"
                  ? "Los campos mobile heredan los valores compartidos hasta que los cambies."
                  : "Contenido compartido. Mobile puede tener cambios propios."}
              </p>
              {fields.has("title") && (
                <Input
                  label="Título"
                  value={base.title ?? ""}
                  onChange={(v) => update("title", v)}
                />
              )}
              {fields.has("subtitle") && (
                <TextArea
                  label="Subtítulo"
                  value={base.subtitle ?? ""}
                  onChange={(v) => update("subtitle", v)}
                />
              )}
              {fields.has("body") && (
                <TextArea
                  label={e.id.startsWith("scene-") ? "Etiqueta superior" : "Texto"}
                  value={base.body ?? ""}
                  onChange={(v) => update("body", v)}
                />
              )}
              {fields.has("image") && (
                <>
                  <h3>Fotografía {device === "mobile" ? "mobile" : "principal"}</h3>
                  <PhotoDrop
                    single
                    images={base.image ? [base.image] : []}
                    onChange={(images) => {
                      if (device === "mobile") {
                        const mobile = { ...e.mobile };
                        if (images[0]) mobile.image = images[0];
                        else delete mobile.image;
                        change({ mobile });
                      } else {
                        const next = { ...e };
                        if (images[0]) next.image = images[0];
                        else delete next.image;
                        change(next);
                      }
                    }}
                  />
                </>
              )}
              {device === "mobile" && Object.keys(e.mobile).length > 0 && (
                <button
                  className="admin-secondary"
                  onClick={() => {
                    if (window.confirm("¿Usar nuevamente el contenido compartido para mobile?"))
                      change({ mobile: {} });
                  }}
                >
                  Restablecer mobile
                </button>
              )}
              {e.button && fields.has("button") && (
                <>
                  <Input
                    label="Texto del botón"
                    value={e.button.label}
                    onChange={(v) => change({ button: { ...e.button!, label: v } })}
                  />
                  <Input
                    label="Enlace del botón"
                    value={e.button.href}
                    onChange={(v) => change({ button: { ...e.button!, href: v } })}
                  />
                </>
              )}
              {["featured", "latest"].includes(e.id) && (
                <section>
                  <h3>Propiedades de esta sección</h3>
                  <Check
                    label="Selección automática"
                    value={e.automatic}
                    onChange={(v) => change({ automatic: v })}
                  />
                  {!e.automatic && (
                    <>
                      <Input
                        label="Buscar entre las propiedades cargadas"
                        value={propertyQuery}
                        onChange={setPropertyQuery}
                      />
                      {(properties.data?.rows ?? [])
                        .filter((p) =>
                          String(p.document.title ?? "")
                            .toLowerCase()
                            .includes(propertyQuery.toLowerCase()),
                        )
                        .map((p) => (
                          <Check
                            key={p.id}
                            label={String(p.document.title || "Sin título")}
                            value={e.propertyIds.includes(p.id)}
                            onChange={(v) =>
                              change({
                                propertyIds: v
                                  ? [...e.propertyIds, p.id]
                                  : e.propertyIds.filter((id) => id !== p.id),
                              })
                            }
                          />
                        ))}
                      <p className="admin-help">
                        Se respeta el orden de selección. Sólo se mostrarán fichas publicadas.
                      </p>
                      {e.propertyIds.map((id, i) => (
                        <div key={id} className="admin-photo-controls">
                          <span>
                            {String(
                              properties.data?.rows.find((p) => p.id === id)?.document.title ??
                                "Propiedad seleccionada",
                            )}
                          </span>
                          <button
                            disabled={i === 0}
                            onClick={() => {
                              const ids = [...e.propertyIds];
                              [ids[i - 1], ids[i]] = [ids[i]!, ids[i - 1]!];
                              change({ propertyIds: ids });
                            }}
                          >
                            Subir
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </section>
              )}
              {e.id === "categories" && (
                <section>
                  <h3>Tipos visibles en Inicio</h3>
                  {(catalogs.data ?? [])
                    .filter((c) => c.kind === "type" && c.active)
                    .map((c) => (
                      <Check
                        key={c.id}
                        label={c.label}
                        value={e.categoryIds.includes(c.id)}
                        onChange={(v) =>
                          change({
                            categoryIds: v
                              ? [...e.categoryIds, c.id]
                              : e.categoryIds.filter((id) => id !== c.id),
                          })
                        }
                      />
                    ))}
                </section>
              )}
              {!e.id.startsWith("scene-") && (
                <Check
                  label="Mostrar este elemento"
                  value={e.visible}
                  onChange={(v) => change({ visible: v })}
                />
              )}
            </>
          )}
        </aside>
      </div>
    </>
  );
}
