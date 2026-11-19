import {usePublished} from "@/platform/content-context";
import {ManagedForm} from "@/platform/managed-form";
import { useState, type ReactNode } from "react";
import { z } from "@/lib/validation";
import { PremiumSelect } from "@/components/premium-select";
import { Button } from "@/components/ui/button";

// Validates locally. There is no backend yet, so we never claim the message was sent.
export type Field = { name: string; label: string; type?: "text" | "email" | "tel" | "textarea" | "select"; options?: string[]; required?: boolean };

function LegacyLeadForm({ fields, submitLabel, defaults = {} }: { fields: Field[]; submitLabel: string; defaults?: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string>>(defaults);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const schema = z.object(
    Object.fromEntries(
      fields.map((f) => {
        let s = z.string().trim().max(1000, "Máximo 1000 caracteres");
        if (f.type === "email") s = s.email("Ingresá un email válido");
        if (f.type === "tel") s = s.regex(/^[+\d\s()-]{6,20}$/, "Ingresá un teléfono válido");
        return [f.name, f.required ? s.min(1, "Campo obligatorio") : s.or(z.literal("")).optional()];
      }),
    ),
  );

  const cls = "w-full rounded-lg border bg-background px-3 py-3 text-sm outline-none focus:border-foreground";
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const r = schema.safeParse(values);
        if (!r.success) {
          setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
          setDone(false);
          return;
        }
        setErrors({});
        setDone(true);
      }}
      className="space-y-3"
    >
      {fields.map((f) => (
        <div key={f.name}>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor={f.name}>{f.label}{f.required && " *"}</label>
          {f.type === "textarea" ? (
            <textarea id={f.name} rows={4} className={cls} value={values[f.name] ?? ""} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
          ) : f.type === "select" ? (
            <PremiumSelect id={f.name} label={f.label} invalid={Boolean(errors[f.name])} value={values[f.name] ?? ""} onValueChange={(v) => setValues({ ...values, [f.name]: v })} options={[{value:"",label:"Seleccionar"}, ...(f.options ?? []).map((o) => ({value:o,label:o}))]} />
          ) : (
            <input id={f.name} type={f.type ?? "text"} className={cls} value={values[f.name] ?? ""} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
          )}
          {errors[f.name] && <p className="mt-1 text-xs text-destructive">{errors[f.name]}</p>}
        </div>
      ))}
      <Button type="submit" className="h-12 w-full rounded-lg font-semibold">{submitLabel}</Button>
      {done && (
        <Notice>
          Los datos son válidos. El envío todavía no está conectado: tu solicitud <strong>no fue enviada</strong>. Estará disponible cuando se configure el formulario.
        </Notice>
      )}
    </form>
  );
}

const Notice = ({ children }: { children: ReactNode }) => (
  <p role="status" className="rounded-lg bg-secondary p-3 text-sm">{children}</p>
);

export function LeadForm(props:{fields:Field[];submitLabel:string;defaults?:Record<string,string>;purpose?:string;propertyId?:string|undefined}){const cms=usePublished();return cms?.configuration?<ManagedForm slug={props.purpose??"contacto"} propertyId={props.propertyId}/>:<LegacyLeadForm {...props}/>;}
