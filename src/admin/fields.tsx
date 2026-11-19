import { useEffect, useState, useRef, type ReactNode } from "react";
import { PremiumSelect } from "@/components/premium-select";
export function Input({
  label,
  value,
  onChange,
  type = "text",
  help,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  help?: string;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      {help && <small>{help}</small>}
    </label>
  );
}
export function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="admin-field">
      <span>{label}</span>
      <PremiumSelect label={label} value={value} onValueChange={onChange} options={options} />
    </div>
  );
}
export function Check({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="admin-check">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
export function Block({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <section className="admin-card">
      <h2>{title}</h2>
      {help && <p className="admin-help">{help}</p>}
      {children}
    </section>
  );
}
export function useAsync<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [generation, refresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    load()
      .then((v) => {
        if (active) setData(v);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "No se pudo cargar la información.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [...deps, generation]);
  return { data, error, loading, refresh: () => refresh((v) => v + 1) };
}
export function useUnsaved(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handle = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handle);
    return () => window.removeEventListener("beforeunload", handle);
  }, [dirty]);
}
