import { useState } from "react";
import { adminList, adminPrivacyPolicies } from "@/platform/admin-functions";
import {
  schemas,
  settingsSchema,
  marketingSchema,
  formSchema,
  type ContentRecord,
  type Kind,
} from "@/platform/contracts";
import { Block, Check, Input, Select, TextArea, useAsync } from "./fields";
import { PhotoDrop } from "./photo-drop";
import { SaveBar, useDocument } from "./use-document";
export function ConfigurationEditor({ kind }: { kind: "settings" | "marketing" | "form" }) {
  const rows = useAsync(() => adminList({ data: { kind, offset: 0, query: "" } }), [kind]),
    [selected, setSelected] = useState<ContentRecord | null>(null);
  const current =
    selected?.kind === kind ? selected : (rows.data?.rows[0] as ContentRecord | undefined);
  return (
    <>
      <header className="admin-page-title">
        <div>
          <p>Administración</p>
          <h1>
            {kind === "settings"
              ? "Configuración"
              : kind === "marketing"
                ? "Marketing y eventos"
                : "Formularios"}
          </h1>
        </div>
      </header>
      {rows.error && <p role="alert">{rows.error}</p>}
      {kind === "form" && (
        <Select
          label="Formulario"
          value={current?.id ?? ""}
          onChange={(id) => setSelected(rows.data!.rows.find((r) => r.id === id) as ContentRecord)}
          options={(rows.data?.rows ?? []).map((r) => ({
            value: r.id,
            label: String(r.document.name ?? r.slug),
          }))}
        />
      )}
      {current ? (
        <DocumentEditor key={current.id} kind={kind} record={current} />
      ) : (
        <Block title="Contenido inicial">
          {rows.loading
            ? "Cargando…"
            : "Todavía no se aplicó la configuración inicial de esta instalación."}
        </Block>
      )}
    </>
  );
}
function DocumentEditor({
  kind,
  record,
}: {
  kind: "settings" | "marketing" | "form";
  record: ContentRecord;
}) {
  const policies = useAsync(
    () => (kind === "form" ? adminPrivacyPolicies() : Promise.resolve([])),
    [kind],
  );
  const state = useDocument<any>(record, schemas[kind].parse(record.document));
  const d = state.document;
  const set = (key: string, value: unknown) =>
    state.setDocument((v: any) => ({ ...v, [key]: value }));
  return (
    <>
      <SaveBar state={state} />
      {kind === "settings" ? (
        <div className="admin-editor-grid">
          <div>
            <Block title="Identidad y contacto">
              {[
                ["name", "Nombre comercial"],
                ["whatsapp", "WhatsApp (código de país y número)"],
                ["email", "Email de contacto"],
                ["address", "Dirección"],
                ["hours", "Horarios"],
                ["instagram", "Instagram"],
                ["temporariesUrl", "Alquileres temporarios"],
                ["footerText", "Texto del footer"],
              ].map(([key, label]) => (
                <Input key={key} label={label!} value={d[key!]} onChange={(v) => set(key!, v)} />
              ))}
            </Block>
            <Block title="Información institucional">
              <TextArea
                label="Presentación"
                value={d.presentation}
                onChange={(v) => set("presentation", v)}
              />
              <TextArea label="Historia" value={d.history} onChange={(v) => set("history", v)} />
              {[
                ["services", "Servicios"],
                ["values", "Valores"],
              ].map(([key, label]) => (
                <TextArea
                  key={key}
                  label={`${label} (uno por línea)`}
                  value={d[key!].join("\n")}
                  onChange={(v) => set(key!, v.split("\n"))}
                />
              ))}
              <Input label="Cobertura" value={d.coverage} onChange={(v) => set("coverage", v)} />
            </Block>
            <Block title="WhatsApp">
              <TextArea
                label="Mensaje de consulta de propiedad"
                value={d.whatsappTemplate}
                onChange={(v) => set("whatsappTemplate", v)}
              />
              <p className="admin-help">
                Variables disponibles: {"{title}, {code}, {url}, {operation}, {city}"}. Abrir
                WhatsApp no confirma el envío.
              </p>
            </Block>
            <Block
              title="Filtros del buscador"
              help="Las opciones se obtienen de los catálogos activos. Los nombres y la visibilidad se controlan acá."
            >
              {(d.filters ?? []).map((f: any, i: number) => (
                <div className="admin-two" key={f.key}>
                  <Input
                    label="Nombre del filtro"
                    value={f.label}
                    onChange={(v) =>
                      set(
                        "filters",
                        d.filters.map((x: any, n: number) => (n === i ? { ...x, label: v } : x)),
                      )
                    }
                  />
                  <Input
                    label="Orden"
                    type="number"
                    value={f.order}
                    onChange={(v) =>
                      set(
                        "filters",
                        d.filters.map((x: any, n: number) =>
                          n === i ? { ...x, order: Number(v) } : x,
                        ),
                      )
                    }
                  />
                  <Check
                    label="Mostrar filtro"
                    value={f.visible}
                    onChange={(v) =>
                      set(
                        "filters",
                        d.filters.map((x: any, n: number) => (n === i ? { ...x, visible: v } : x)),
                      )
                    }
                  />
                </div>
              ))}
            </Block>
            <Block title="Navegación">
              {d.menu.map((item: { label: string; href: string }, i: number) => (
                <div key={i} className="admin-two">
                  <Input
                    label="Nombre del enlace"
                    value={item.label}
                    onChange={(v) =>
                      set(
                        "menu",
                        d.menu.map((m: unknown, n: number) =>
                          n === i ? { ...item, label: v } : m,
                        ),
                      )
                    }
                  />
                  <Input
                    label="Destino"
                    value={item.href}
                    onChange={(v) =>
                      set(
                        "menu",
                        d.menu.map((m: unknown, n: number) => (n === i ? { ...item, href: v } : m)),
                      )
                    }
                  />
                </div>
              ))}
            </Block>
          </div>
          <aside>
            {[
              ["logo", "Logo principal"],
              ["alternateLogo", "Logo alternativo"],
              ["favicon", "Icono del navegador"],
            ].map(([key, label]) => (
              <Block key={key} title={label!}>
                <PhotoDrop
                  single
                  images={d[key!] ? [d[key!]] : []}
                  onChange={(images) => {
                    const next = { ...d };
                    if (images[0]) next[key!] = images[0];
                    else delete next[key!];
                    state.setDocument(next);
                  }}
                />
              </Block>
            ))}
            <Block title="Colores">
              <p className="admin-help">Los valores iniciales conservan la identidad aprobada.</p>
              {[
                "primary",
                "secondary",
                "background",
                "foreground",
                "ink",
                "ink-foreground",
                "graphite",
                "sand",
              ].map((key) => (
                <Input
                  key={key}
                  label={
                    (
                      {
                        primary: "Principal",
                        secondary: "Secundario",
                        background: "Fondo",
                        foreground: "Texto",
                        ink: "Fondo oscuro",
                        "ink-foreground": "Texto sobre oscuro",
                        graphite: "Grafito",
                        sand: "Arena",
                      } as Record<string, string>
                    )[key]!
                  }
                  value={d.theme.colors[key] ?? ""}
                  onChange={(v) => {
                    const colors = { ...d.theme.colors };
                    if (v) colors[key] = v;
                    else delete colors[key];
                    set("theme", { colors });
                  }}
                />
              ))}
            </Block>
          </aside>
        </div>
      ) : kind === "marketing" ? (
        <>
          <Block
            title="Etiquetas de medición"
            help="Se mantienen desactivadas hasta que configures identificadores reales y verifiques los envíos. Las etiquetas no esenciales requieren consentimiento."
          >
            <Select
              label="Cómo se cargan las etiquetas"
              value={d.mode}
              onChange={(v) => set("mode", v)}
              options={[
                { value: "gtm", label: "Gestor de etiquetas" },
                { value: "direct", label: "Integraciones directas" },
              ]}
            />
            {[
              ["gtm", "Google Tag Manager"],
              ["ga4", "Google Analytics 4"],
              ["meta", "Meta Pixel"],
              ["ads", "Google Ads"],
            ].map(([key, label]) => (
              <div key={key} className="admin-integration">
                <Check
                  label={`Activar ${label}`}
                  value={d[key!].enabled}
                  onChange={(v) => set(key!, { ...d[key!], enabled: v })}
                />
                <Input
                  label="Identificador"
                  value={d[key!].id}
                  onChange={(v) => set(key!, { ...d[key!], id: v })}
                />
              </div>
            ))}
            <p className="admin-help">
              Elegí una sola vía de carga. No se ejecutan etiquetas directas cuando está
              seleccionado el gestor.
            </p>
          </Block>
          <Block title="Conversiones">
            {["generate_lead", "contact_form_submit", "whatsapp_click"].map((event) => (
              <Input
                key={event}
                label={
                  (
                    {
                      generate_lead: "Consulta recibida y almacenada",
                      contact_form_submit: "Formulario procesado",
                      whatsapp_click: "Apertura de WhatsApp",
                    } as Record<string, string>
                  )[event]!
                }
                value={d.adsLabels[event] ?? ""}
                onChange={(v) => {
                  const labels = { ...d.adsLabels };
                  if (v) labels[event] = v;
                  else delete labels[event];
                  set("adsLabels", labels);
                }}
              />
            ))}
            <p>
              La medición de visitas y clics no prueba una consulta recibida ni una reserva. Las
              conversiones publicitarias permanecen desactivadas hasta verificar su definición y
              diagnóstico en cada proveedor.
            </p>
          </Block>
        </>
      ) : (
        <>
          <Block title="Configuración del formulario">
            <Input label="Nombre" value={d.name} onChange={(v) => set("name", v)} />
            <Check label="Formulario activo" value={d.active} onChange={(v) => set("active", v)} />
            <Check
              label="Guardar consulta en la bandeja"
              value={d.storeLead}
              onChange={(v) => set("storeLead", v)}
            />
            <Check
              label="Preparar mensaje en WhatsApp"
              value={d.whatsapp}
              onChange={(v) => set("whatsapp", v)}
            />
            <Check
              label="Política de privacidad revisada y aprobada"
              value={d.privacyApproved}
              onChange={(v) => set("privacyApproved", v)}
            />
            <Select
              label="Política de privacidad aprobada"
              value={d.privacyRevision}
              onChange={(v) => set("privacyRevision", v)}
              options={[
                { value: "", label: "Seleccionar una política publicada" },
                ...(policies.data ?? []),
              ]}
            />
            <p className="admin-help">
              La política debe revisarse y publicarse antes de habilitar consultas con datos
              personales.
            </p>
            <TextArea
              label="Confirmación para el visitante"
              value={d.successMessage}
              onChange={(v) => set("successMessage", v)}
            />
            <Input
              label="Destinatario de notificaciones"
              value={d.recipient}
              onChange={(v) => set("recipient", v)}
            />
            <p className="admin-help">
              Notificaciones por email: no configuradas. Guardar una dirección no habilita el envío.
            </p>
          </Block>
          <Block title="Campos permitidos">
            {d.fields.map((field: any, i: number) => (
              <div className="admin-form-field" key={field.id}>
                <Input
                  label="Nombre del campo"
                  value={field.label}
                  onChange={(v) =>
                    set(
                      "fields",
                      d.fields.map((f: any, n: number) => (n === i ? { ...f, label: v } : f)),
                    )
                  }
                />
                <Select
                  label="Tipo de campo"
                  value={field.type}
                  onChange={(v) =>
                    set(
                      "fields",
                      d.fields.map((f: any, n: number) => (n === i ? { ...f, type: v } : f)),
                    )
                  }
                  options={[
                    { value: "name", label: "Nombre" },
                    { value: "email", label: "Email" },
                    { value: "phone", label: "Teléfono" },
                    { value: "text", label: "Texto breve" },
                    { value: "textarea", label: "Texto largo" },
                    { value: "select", label: "Selector" },
                    { value: "checkbox", label: "Sí / No" },
                    { value: "consent", label: "Consentimiento" },
                  ]}
                />
                <Check
                  label="Obligatorio"
                  value={field.required}
                  onChange={(v) =>
                    set(
                      "fields",
                      d.fields.map((f: any, n: number) => (n === i ? { ...f, required: v } : f)),
                    )
                  }
                />
                <Input
                  label="Ayuda breve"
                  value={field.help}
                  onChange={(v) =>
                    set(
                      "fields",
                      d.fields.map((f: any, n: number) => (n === i ? { ...f, help: v } : f)),
                    )
                  }
                />
                {field.type === "select" && (
                  <TextArea
                    label="Opciones (una por línea)"
                    value={field.options.join("\n")}
                    onChange={(v) =>
                      set(
                        "fields",
                        d.fields.map((f: any, n: number) =>
                          n === i ? { ...f, options: v.split("\n").filter(Boolean) } : f,
                        ),
                      )
                    }
                  />
                )}
                <button
                  className="admin-secondary"
                  disabled={i === 0}
                  onClick={() => {
                    const next = [...d.fields];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    set("fields", next);
                  }}
                >
                  Subir
                </button>
                <button
                  className="admin-link"
                  onClick={() =>
                    set(
                      "fields",
                      d.fields.filter((_: unknown, n: number) => n !== i),
                    )
                  }
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              className="admin-secondary"
              onClick={() =>
                set("fields", [
                  ...d.fields,
                  {
                    id: `field_${crypto.randomUUID().slice(0, 8)}`,
                    label: "Nuevo campo",
                    type: "text",
                    required: false,
                    help: "",
                    options: [],
                  },
                ])
              }
            >
              + Agregar campo
            </button>
          </Block>
        </>
      )}
    </>
  );
}
