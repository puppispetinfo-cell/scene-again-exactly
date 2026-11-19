import { useState } from "react";
import { adminLeads, adminLeadStatus, exportLeads } from "@/platform/admin-functions";
import { Block, Input, Select, TextArea, useAsync } from "./fields";
const labels: Record<string, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  following: "En seguimiento",
  closed: "Cerrado",
  discarded: "Descartado",
};
export function Leads({ canExport = false }: { canExport?: boolean }) {
  const [offset, setOffset] = useState(0),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [selected, setSelected] = useState<any>(null),
    [error, setError] = useState("");
  const result = useAsync(() => adminLeads({ data: offset }), [offset]);
  return (
    <>
      <header className="admin-page-title">
        <div>
          <p>Contactos reales</p>
          <h1>Consultas</h1>
        </div>
        <span>{result.data?.count ?? 0} consultas</span>
        {canExport && (
          <button
            className="admin-secondary"
            onClick={async () => {
              try {
                const csv = await exportLeads();
                const url = URL.createObjectURL(
                  new Blob([csv], { type: "text/csv;charset=utf-8" }),
                );
                const link = document.createElement("a");
                link.href = url;
                link.download = "consultas.csv";
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              } catch (e) {
                setError(e instanceof Error ? e.message : "No se pudo exportar.");
              }
            }}
          >
            Exportar consultas
          </button>
        )}
      </header>
      <div className="admin-two">
        <Input label="Buscar en esta página" value={query} onChange={setQuery} />
        <Select
          label="Estado"
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "Todos" },
            ...Object.entries(labels).map(([value, label]) => ({ value, label })),
          ]}
        />
      </div>
      {result.error && <p role="alert">{result.error}</p>}
      <div className="admin-editor-grid">
        <Block title="Bandeja de consultas">
          {result.loading ? (
            <p>Cargando…</p>
          ) : !result.data?.rows.length ? (
            <p>
              No hay consultas recibidas. Los formularios sólo almacenan datos cuando existe una
              política aprobada y consentimiento.
            </p>
          ) : (
            result.data.rows
              .filter(
                (r) =>
                  (!status || r.status === status) &&
                  JSON.stringify(r.answers).toLowerCase().includes(query.toLowerCase()),
              )
              .map((r) => (
                <button key={r.id} className="admin-row" onClick={() => setSelected(r)}>
                  <strong>{r.answers.name ?? r.answers.nombre ?? "Consulta"}</strong>
                  <span>
                    {labels[r.status]} · {new Date(r.created_at).toLocaleDateString("es-AR")}
                  </span>
                </button>
              ))
          )}
          <div className="admin-pagination">
            <button disabled={!offset} onClick={() => setOffset((v) => Math.max(0, v - 25))}>
              Anterior
            </button>
            <button
              disabled={offset + 25 >= (result.data?.count ?? 0)}
              onClick={() => setOffset((v) => v + 25)}
            >
              Siguiente
            </button>
          </div>
        </Block>
        {selected && (
          <Block title="Detalle de la consulta">
            {Object.entries(selected.answers).map(([key, value]) => (
              <p key={key}>
                <strong>{key}: </strong>
                {String(value)}
              </p>
            ))}
            <Select
              label="Estado"
              value={selected.status}
              onChange={(v) => setSelected({ ...selected, status: v })}
              options={Object.entries(labels).map(([value, label]) => ({ value, label }))}
            />
            <TextArea
              label="Notas internas"
              value={selected.notes}
              onChange={(v) => setSelected({ ...selected, notes: v })}
            />
            {error && <p role="alert">{error}</p>}
            <button
              className="admin-primary"
              onClick={async () => {
                try {
                  await adminLeadStatus({
                    data: { id: selected.id, status: selected.status, notes: selected.notes },
                  });
                  result.refresh();
                  setError("");
                } catch (e) {
                  setError(e instanceof Error ? e.message : "No se pudo guardar.");
                }
              }}
            >
              Guardar seguimiento
            </button>
            {typeof selected.answers.phone === "string" &&
              /^[+\d\s()-]{6,30}$/.test(selected.answers.phone) && (
                <a
                  className="admin-secondary"
                  href={`https://wa.me/${selected.answers.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Contactar por WhatsApp
                </a>
              )}
            {typeof selected.answers.email === "string" &&
              /^[^\s@]+@[^\s@]+$/.test(selected.answers.email) && (
                <a className="admin-secondary" href={`mailto:${selected.answers.email}`}>
                  Escribir email
                </a>
              )}
          </Block>
        )}
      </div>
    </>
  );
}
