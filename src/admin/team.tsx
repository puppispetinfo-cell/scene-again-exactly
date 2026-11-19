import { useState } from "react";
import { adminList } from "@/platform/admin-functions";
import { teamSchema, slugify, type ContentRecord } from "@/platform/contracts";
import { Block, Input, TextArea, useAsync } from "./fields";
import { PhotoDrop } from "./photo-drop";
import { SaveBar, useDocument } from "./use-document";
export function Team() {
  const list = useAsync(() => adminList({ data: { kind: "team", offset: 0, query: "" } })),
    [selected, setSelected] = useState<ContentRecord | null>(null);
  return (
    <>
      <header className="admin-page-title">
        <div>
          <h1>Equipo</h1>
          <span>No es necesario agregar un cargo o una biografía si no están confirmados.</span>
        </div>
        <button
          className="admin-primary"
          onClick={() =>
            setSelected({
              id: crypto.randomUUID(),
              kind: "team",
              slug: `integrante-${crypto.randomUUID().slice(0, 8)}`,
              document: { name: "" },
              revision: 0,
              status: "draft",
              updated_at: new Date().toISOString(),
            })
          }
        >
          + Agregar integrante
        </button>
      </header>
      {list.error && <p role="alert">{list.error}</p>}
      <div className="admin-editor-grid">
        <Block title="Integrantes">
          {list.data?.rows.map((r) => (
            <button
              className="admin-row"
              key={r.id}
              onClick={() => setSelected(r as ContentRecord)}
            >
              <strong>{r.document.name}</strong>
              <span>{r.status === "published" ? "Publicado" : "Borrador"}</span>
            </button>
          ))}
        </Block>
        {selected && <TeamEditor key={selected.id} record={selected} />}
      </div>
    </>
  );
}
function TeamEditor({ record }: { record: ContentRecord }) {
  const initial = { ...record.document, name: String(record.document["name"] ?? "") };
  const state = useDocument(
    record,
    initial as {
      name: string;
      role?: string;
      biography?: string;
      photo?: ReturnType<typeof teamSchema.parse>["photo"];
    },
  );
  const p = state.document;
  return (
    <Block title={p.name || "Nuevo integrante"}>
      <Input
        label="Nombre"
        value={p.name}
        onChange={(name) => state.setDocument((d) => ({ ...d, name }))}
      />
      <Input
        label="Cargo (opcional)"
        value={p.role ?? ""}
        onChange={(role) => state.setDocument((d) => ({ ...d, role }))}
      />
      <TextArea
        label="Presentación (opcional)"
        value={p.biography ?? ""}
        onChange={(biography) => state.setDocument((d) => ({ ...d, biography }))}
      />
      <PhotoDrop
        single
        images={p.photo ? [p.photo] : []}
        onChange={(images) => {
          const next = { ...p };
          if (images[0]) next.photo = images[0];
          else delete next.photo;
          state.setDocument(next);
        }}
      />
      <SaveBar state={state} />
    </Block>
  );
}
