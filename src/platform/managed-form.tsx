import { track } from "./measurement";
import { useState, useRef } from "react";
import { usePublished } from "@/platform/content-context";
import { submitForm } from "@/platform/forms";
import { PremiumSelect } from "@/components/premium-select";
import { Button } from "@/components/ui/button";
export function ManagedForm({
  slug,
  propertyId,
}: {
  slug: string;
  propertyId?: string | undefined;
}) {
  const cms = usePublished(),
    form = cms?.forms[slug];
  const [values, setValues] = useState<Record<string, string | boolean>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<Awaited<ReturnType<typeof submitForm>> | null>(null);
  const key = useRef("");
  const [honeypot, setHoneypot] = useState("");
  const id = cms?.formIds?.[slug];
  if (!form?.active)
    return (
      <p role="status" className="rounded-lg border bg-secondary p-5 text-sm">
        El formulario todavía no está disponible. Podés contactarnos por WhatsApp o email.
      </p>
    );
  const cls =
    "w-full rounded-lg border bg-background px-3 py-3 text-sm outline-none focus:border-foreground";
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        if (!key.current) key.current = crypto.randomUUID();
        try {
          if (!id) throw new Error("Formulario no disponible.");
          const response = await submitForm({
            data: {
              formId: id,
              answers: values,
              key: key.current,
              propertyId: propertyId ?? null,
              path: window.location.pathname,
              honeypot: honeypot as "",
            },
          });
          setResult(response);
          if (response.stored && !response.duplicate)
            track("generate_lead", { form_id: id }, `lead:${key.current}`);
          track(
            slug === "publicar" ? "publish_property_form_submit" : "contact_form_submit",
            { form_id: id },
            `submit:${key.current}`,
          );
        } catch (e) {
          setError(e instanceof Error ? e.message : "No se pudo completar la consulta.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {form.fields.map((field) => (
        <div key={field.id}>
          <label
            className="mb-1 block text-xs font-medium text-muted-foreground"
            htmlFor={`contact-${field.id}`}
          >
            {field.label}
            {field.required ? " *" : ""}
          </label>
          {field.type === "select" ? (
            <PremiumSelect
              id={`contact-${field.id}`}
              label={field.label}
              value={String(values[field.id] ?? "")}
              onValueChange={(v) => setValues((p) => ({ ...p, [field.id]: v }))}
              options={[
                { value: "", label: "Seleccionar" },
                ...(field.id === "property_type"
                  ? cms!.catalogs.filter((c) => c.kind === "type").map((c) => c.label)
                  : field.id === "operation"
                    ? cms!.catalogs.filter((c) => c.kind === "operation").map((c) => c.label)
                    : field.options
                ).map((v) => ({ value: v, label: v })),
              ]}
            />
          ) : field.type === "textarea" ? (
            <textarea
              id={`contact-${field.id}`}
              className={cls}
              maxLength={2000}
              required={field.required}
              rows={4}
              value={String(values[field.id] ?? "")}
              onChange={(e) => setValues((p) => ({ ...p, [field.id]: e.target.value }))}
            />
          ) : ["consent", "checkbox"].includes(field.type) ? (
            <input
              id={`contact-${field.id}`}
              type="checkbox"
              checked={values[field.id] === true}
              required={field.required}
              onChange={(e) => setValues((p) => ({ ...p, [field.id]: e.target.checked }))}
            />
          ) : (
            <input
              id={`contact-${field.id}`}
              className={cls}
              type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
              required={field.required}
              maxLength={2000}
              value={String(values[field.id] ?? "")}
              onChange={(e) => setValues((p) => ({ ...p, [field.id]: e.target.value }))}
            />
          )}
          {field.help && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
        </div>
      ))}
      <div hidden aria-hidden="true">
        <label>
          Sitio web
          <input
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
      </div>
      <Button type="submit" className="h-12 w-full rounded-lg font-semibold" disabled={busy}>
        {busy ? "Procesando…" : "Continuar consulta"}
      </Button>
      {error && (
        <p role="alert" className="rounded-lg border border-destructive p-3 text-sm">
          {error}
        </p>
      )}
      {result && (
        <div role="status" className="rounded-lg bg-secondary p-4 text-sm">
          <p>
            {result.stored ? "Recibimos tu consulta. " : ""}
            {result.message}
          </p>
          {result.whatsapp && (
            <a
              className="mt-3 inline-block underline"
              href={result.whatsapp}

              target="_blank"
              rel="noreferrer"
            >
              Abrir WhatsApp con el mensaje preparado
            </a>
          )}
          <p className="mt-2 text-xs">
            Abrir WhatsApp no confirma el envío del mensaje. No se enviaron notificaciones por
            email.
          </p>
        </div>
      )}
    </form>
  );
}
