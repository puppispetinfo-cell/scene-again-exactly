import { useState } from "react";
import { adminCatalogs, adminSaveCatalog } from "@/platform/admin-functions";
import { catalogSchema, slugify } from "@/platform/contracts";
import { Block, Check, Input, Select, TextArea, useAsync } from "./fields";
export function Catalogs() {
  const list = useAsync(() => adminCatalogs()),
    [selected, setSelected] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const create = () =>
    setSelected({
      id: crypto.randomUUID(),
      revision: 0,
      definition: catalogSchema.parse({
        kind: "type",
        label: "",
        slug: "",
        active: true,
        order: 0,
      }),
    });
  return (
    <>
      <header className="admin-page-title">
        <div>
          <p>Configuración comercial</p>
          <h1>Catálogos y filtros</h1>
        </div>
        <button className="admin-primary" onClick={create}>
          + Agregar categoría
        </button>
      </header>
      {list.error && <p role="alert">{list.error}</p>}
      <div className="admin-editor-grid">
        <Block title="Categorías y características">
          {list.loading ? (
            <p>Cargando…</p>
          ) : (
            (list.data ?? []).map((row) => (
              <button
                key={row.id}
                className="admin-row"
                onClick={() =>
                  setSelected({
                    ...row,
                    definition: {
                      ...row.definition,
                      kind: row.kind,
                      label: row.label,
                      slug: row.slug,
                      active: row.active,
                      order: row.sort_order,
                    },
                  })
                }
              >
                <strong>{row.label}</strong>
                <span>
                  {row.kind === "type"
                    ? "Tipo"
                    : row.kind === "operation"
                      ? "Operación"
                      : "Característica"}{" "}
                  · {row.active ? "Activa" : "Inactiva"}
                </span>
              </button>
            ))
          )}
        </Block>
        {selected && (
          <Block title={selected.revision ? "Editar categoría" : "Nueva categoría"}>
            <Select
              label="Grupo"
              value={selected.definition.kind}
              onChange={(v) =>
                setSelected({ ...selected, definition: { ...selected.definition, kind: v } })
              }
              options={[
                { value: "type", label: "Tipo de inmueble" },
                { value: "operation", label: "Operación" },
                { value: "attribute", label: "Característica o comodidad" },
              ]}
            />
            <Input
              label="Nombre"
              value={selected.definition.label}
              onChange={(v) =>
                setSelected({
                  ...selected,
                  definition: {
                    ...selected.definition,
                    label: v,
                    slug: selected.revision ? selected.definition.slug : slugify(v),
                  },
                })
              }
            />
            <Input
              label="Orden"
              type="number"
              value={selected.definition.order}
              onChange={(v) =>
                setSelected({
                  ...selected,
                  definition: { ...selected.definition, order: Number(v) },
                })
              }
            />
            {selected.definition.kind === "attribute" && (
              <>
                <Select
                  label="Tipo de respuesta"
                  value={selected.definition.valueType}
                  onChange={(v) =>
                    setSelected({
                      ...selected,
                      definition: { ...selected.definition, valueType: v },
                    })
                  }
                  options={[
                    { value: "number", label: "Número" },
                    { value: "boolean", label: "Sí / No" },
                    { value: "text", label: "Texto breve" },
                    { value: "select", label: "Elegir una opción" },
                    { value: "multiselect", label: "Elegir varias opciones" },
                  ]}
                />
                {["select", "multiselect"].includes(selected.definition.valueType) && (
                  <TextArea
                    label="Opciones (una por línea)"
                    value={selected.definition.options.join("\n")}
                    onChange={(v) =>
                      setSelected({
                        ...selected,
                        definition: {
                          ...selected.definition,
                          options: v.split("\n").filter(Boolean),
                        },
                      })
                    }
                  />
                )}
              </>
            )}
            <Check
              label="Activa"
              value={selected.definition.active}
              onChange={(v) =>
                setSelected({ ...selected, definition: { ...selected.definition, active: v } })
              }
            />
            <Check
              label="Disponible en filtros"
              value={selected.definition.filterVisible}
              onChange={(v) =>
                setSelected({
                  ...selected,
                  definition: { ...selected.definition, filterVisible: v },
                })
              }
            />
            <Check
              label="Visible en la ficha"
              value={selected.definition.cardVisible}
              onChange={(v) =>
                setSelected({ ...selected, definition: { ...selected.definition, cardVisible: v } })
              }
            />
            {error && (
              <p role="alert" className="admin-error">
                {error}
              </p>
            )}
            <button
              className="admin-primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await adminSaveCatalog({
                    data: {
                      id: selected.id,
                      document: catalogSchema.parse(selected.definition),
                      expected: selected.revision,
                    },
                  });
                  setSelected(null);
                  list.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "No se pudo guardar.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Guardar
            </button>
          </Block>
        )}
      </div>
    </>
  );
}
