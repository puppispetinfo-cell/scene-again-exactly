import { useEffect, useRef, useState } from "react";
import { adminSave, adminPublish, adminHistory, adminRead } from "@/platform/admin-functions";
import type { ContentRecord, Kind } from "@/platform/contracts";
import { useUnsaved } from "./fields";
export function useDocument<T extends object>(record: ContentRecord, initial: T) {
  const [document, setDocument] = useState(initial),
    [revision, setRevision] = useState(record.revision),
    [saved, setSaved] = useState(JSON.stringify(initial)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const inFlight = useRef(false),
    conflict = useRef(false);
  const failedSnapshot = useRef("");
  const latest = useRef(document);
  latest.current = document;
  const dirty = JSON.stringify(document) !== saved;
  useUnsaved(dirty);
  const save = async () => {
    if (inFlight.current || conflict.current) return null;
    inFlight.current = true;
    setBusy(true);
    setError("");
    const snapshot = latest.current;
    try {
      const slug =
        "slug" in snapshot && typeof snapshot.slug === "string" ? snapshot.slug : record.slug;
      const row = await adminSave({
        data: {
          id: record.id,
          kind: record.kind,
          slug: slug || record.slug,
          document: snapshot,
          expected: revision,
        },
      });
      setRevision(row.revision);
      setSaved(JSON.stringify(snapshot));
      failedSnapshot.current = "";
      setNotice("Borrador guardado");
      return row as ContentRecord;
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo guardar.";
      setError(message);
      conflict.current = message.toLowerCase().includes("otra persona");
      failedSnapshot.current = JSON.stringify(snapshot);
      return null;
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  };
  useEffect(() => {
    if (!dirty || conflict.current || failedSnapshot.current === JSON.stringify(document)) return;
    const timer = setTimeout(() => {
      void save();
    }, 1600);
    return () => clearTimeout(timer);
  }, [document, dirty, revision]);
  const publish = async (enabled = true) => {
    if (inFlight.current || conflict.current) return;
    if (!enabled && !window.confirm("¿Retirar este contenido del sitio público?")) return;
    const row = dirty || revision === 0 ? await save() : { revision };
    if (!row) return;
    setBusy(true);
    setError("");
    try {
      await adminPublish({ data: { id: record.id, expected: row.revision, publish: enabled } });
      setNotice(
        enabled
          ? "Publicado. El sitio ya puede mostrar esta versión."
          : "Contenido retirado del sitio.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo publicar.");
    } finally {
      setBusy(false);
    }
  };
  const reload = async () => {
    if (
      !window.confirm(
        "Se descartarán los cambios sin guardar y se cargará la última versión guardada. ¿Continuar?",
      )
    )
      return;
    setBusy(true);
    try {
      const row = await adminRead({ data: record.id });
      setDocument(row.document as T);
      setRevision(row.revision);
      setSaved(JSON.stringify(row.document));
      conflict.current = false;
      failedSnapshot.current = "";
      setError("");
      setNotice("Versión guardada cargada");
    } catch {
      setError("No se pudo recargar el contenido. Tus cambios siguen en pantalla.");
    } finally {
      setBusy(false);
    }
  };
  const loadHistory = () => adminHistory({ data: record.id });
  const restore = async (version?: number) => {
    if (
      !window.confirm(
        "Se reemplazará el borrador en pantalla. La versión publicada no cambia hasta que publiques.",
      )
    )
      return;
    try {
      const history = await adminHistory({ data: record.id });
      const previous = history.find((r: { revision: number }) =>
        version === undefined ? r.revision < revision : r.revision === version,
      );
      if (!previous) {
        setNotice("Todavía no hay una versión anterior.");
        return;
      }
      setDocument(previous.document as T);
      conflict.current = false;
      setNotice("Versión anterior recuperada en el borrador.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo recuperar.");
    }
  };
  return {
    document,
    setDocument,
    revision,
    dirty,
    busy,
    error,
    notice,
    save,
    publish,
    restore,
    loadHistory,
    reload,
    clearConflict: () => {
      conflict.current = false;
      setError("");
    },
  };
}
export function SaveBar({
  state,
  onPreview,
}: {
  state: {
    busy: boolean;
    dirty: boolean;
    revision: number;
    error: string;
    notice: string;
    save: () => Promise<unknown>;
    publish: (enabled?: boolean) => Promise<unknown>;
    restore: (revision?: number) => Promise<unknown>;
    loadHistory?: () => Promise<any[]>;
    reload?: () => Promise<void>;
  };
  onPreview?: () => void;
}) {
  const [history, setHistory] = useState<any[] | null>(null);
  const [historyError, setHistoryError] = useState("");
  return (
    <>
      <div className="admin-savebar">
        <span role="status">
          {state.busy
            ? "Guardando…"
            : state.dirty
              ? "Cambios pendientes"
              : state.notice || "Sin cambios pendientes"}
        </span>
        <button
          type="button"
          className="admin-secondary"
          disabled={state.busy || !state.revision}
          onClick={() => void state.restore()}
        >
          Versión anterior
        </button>
        {state.loadHistory && (
          <button
            type="button"
            className="admin-secondary"
            disabled={state.busy || !state.revision}
            onClick={async () => {
              try {
                setHistory(await state.loadHistory!());
                setHistoryError("");
              } catch {
                setHistoryError("No se pudo cargar el historial. Intentá nuevamente.");
              }
            }}
          >
            Historial
          </button>
        )}
        {onPreview && (
          <button type="button" className="admin-secondary" onClick={onPreview}>
            Previsualizar
          </button>
        )}
        <button
          type="button"
          className="admin-secondary"
          disabled={state.busy}
          onClick={() => void state.save()}
        >
          Guardar borrador
        </button>
        <button
          type="button"
          className="admin-primary"
          disabled={state.busy}
          onClick={() => void state.publish()}
        >
          Publicar
        </button>
        {state.revision > 0 && (
          <button
            type="button"
            className="admin-link"
            disabled={state.busy}
            onClick={() => void state.publish(false)}
          >
            Retirar
          </button>
        )}
      </div>
      {history && (
        <section className="admin-card" aria-label="Historial de versiones">
          <div className="admin-photo-controls">
            <h2>Historial de versiones</h2>
            <button type="button" onClick={() => setHistory(null)}>
              Cerrar
            </button>
          </div>
          {history.map((item) => (
            <button
              type="button"
              className="admin-row"
              key={item.revision}
              onClick={() => {
                void state.restore(item.revision);
                setHistory(null);
              }}
            >
              <strong>Versión {item.revision}</strong>
              <span>
                {new Date(item.created_at).toLocaleString("es-AR")} · Recuperar como borrador
              </span>
            </button>
          ))}
        </section>
      )}
      {historyError && (
        <p role="alert" className="admin-error">
          {historyError}
        </p>
      )}
      {state.error && (
        <p className="admin-error" role="alert">
          {state.error}
          {state.reload && (
            <button type="button" className="admin-link" onClick={() => void state.reload!()}>
              Recargar versión guardada
            </button>
          )}
        </p>
      )}
    </>
  );
}
