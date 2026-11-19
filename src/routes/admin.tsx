import { Team } from "@/admin/team";
import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Home,
  Inbox,
  PanelsTopLeft,
  ClipboardList,
  Tags,
  ChartNoAxesCombined,
  Search,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import {
  updatePassword,
  adminSession,
  login,
  logout,
  recover,
  adminList,
  adminDashboard,
} from "@/platform/admin-functions";
import { propertyDraftSchema, type ContentRecord } from "@/platform/contracts";
import { PropertyEditor } from "@/admin/property-editor";
import { Catalogs } from "@/admin/catalogs";
import { Leads } from "@/admin/leads";
import { Builder } from "@/admin/builder";
import { ConfigurationEditor } from "@/admin/configuration";
import { Block, Input, useAsync } from "@/admin/fields";
import adminCss from "@/admin/admin.css?url";
export const Route = createFileRoute("/admin")({
  validateSearch: (s: Record<string, unknown>) => ({
    recuperar: s["recuperar"] === 1 || s["recuperar"] === "1",
  }),
  loader: () => adminSession(),
  head: () => ({
    meta: [{ title: "Administración | RIVTON" }, { name: "robots", content: "noindex,nofollow" }],
    links: [{ rel: "stylesheet", href: adminCss }],
  }),
  component: Admin,
});
const navigation = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "properties", label: "Propiedades", icon: Home },
  { id: "leads", label: "Consultas", icon: Inbox },
  { id: "builder", label: "Constructor visual", icon: PanelsTopLeft },
  { id: "forms", label: "Formularios", icon: ClipboardList },
  { id: "catalogs", label: "Catálogos y filtros", icon: Tags },
  { id: "marketing", label: "Marketing y eventos", icon: ChartNoAxesCombined },
  { id: "seo", label: "SEO", icon: Search },
  { id: "settings", label: "Configuración", icon: Settings },
];
function Admin() {
  const session = Route.useLoaderData();
  const { recuperar } = Route.useSearch();
  const router = useRouter();
  const [settingsTab, setSettingsTab] = useState("general");
  const [active, setActive] = useState("dashboard"),
    [mobile, setMobile] = useState(false);
  if (!session.authenticated) return <Login configured={session.configured} />;
  if (recuperar) return <ResetPassword />;
  return (
    <div className="admin-app">
      <aside className={`admin-sidebar ${mobile ? "open" : ""}`}>
        <a className="admin-brand" href="/admin">
          RIVTON<span>Administración</span>
        </a>
        <nav aria-label="Administración">
          {navigation.map((n) => (
            <button
              key={n.id}
              className={active === n.id ? "active" : ""}
              onClick={() => {
                setActive(n.id);
                setMobile(false);
              }}
            >
              <n.icon size={18} />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="admin-account">
          <span>{session.email}</span>
          <button
            onClick={async () => {
              await logout();
              await router.invalidate();
            }}
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="admin-workspace">
        <div className="admin-topbar">
          <button
            className="admin-menu"
            aria-label="Abrir navegación"
            onClick={() => setMobile((v) => !v)}
          >
            <Menu size={20} />
          </button>
          <span>Tu inmobiliaria, en orden.</span>
          <a href="/" target="_blank" rel="noreferrer">
            Ver sitio ↗
          </a>
        </div>
        <div className="admin-content">
          {active === "dashboard" ? (
            <Dashboard navigate={setActive} />
          ) : active === "properties" ? (
            <Properties />
          ) : active === "leads" ? (
            <Leads canExport={session.role === "owner"} />
          ) : active === "builder" ? (
            <Builder />
          ) : active === "catalogs" ? (
            <Catalogs />
          ) : active === "forms" ? (
            <ConfigurationEditor kind="form" />
          ) : active === "settings" ? (
            <>
              <div className="admin-actions">
                <button className="admin-secondary" onClick={() => setSettingsTab("general")}>
                  Marca y contacto
                </button>
                <button className="admin-secondary" onClick={() => setSettingsTab("team")}>
                  Equipo
                </button>
              </div>
              {settingsTab === "general" ? <ConfigurationEditor kind="settings" /> : <Team />}
            </>
          ) : active === "marketing" ? (
            <ConfigurationEditor kind="marketing" />
          ) : (
            <SEO />
          )}
        </div>
      </div>
    </div>
  );
}
function Login({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const router = useRouter();
  return (
    <div className="admin-app admin-login">
      <form
        className="admin-login-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await login({ data: { email, password } });
            await router.invalidate();
          } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo iniciar sesión.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <a className="admin-brand" href="/">
          RIVTON<span>Administración</span>
        </a>
        <h1>Bienvenido.</h1>
        <p>Ingresá para administrar tu inmobiliaria.</p>
        <Input label="Email" type="email" value={email} onChange={setEmail} />
        <Input label="Contraseña" type="password" value={password} onChange={setPassword} />
        {!configured && <p role="status">El acceso está pendiente de configuración.</p>}
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        <button className="admin-primary" type="submit" disabled={busy || !configured}>
          {busy ? "Ingresando…" : "Ingresar"}
        </button>
        <button
          type="button"
          className="admin-link"
          disabled={!configured || !email}
          onClick={async () => {
            try {
              const result = await recover({ data: email });
              setNotice(result.message);
            } catch {
              setError("No se pudo solicitar la recuperación.");
            }
          }}
        >
          Olvidé mi contraseña
        </button>
      </form>
    </div>
  );
}
function Dashboard({ navigate }: { navigate: (id: string) => void }) {
  const result = useAsync(() => adminDashboard());
  return (
    <>
      <header className="admin-page-title">
        <div>
          <p>Tu espacio de trabajo</p>
          <h1>Todo, en un lugar.</h1>
        </div>
        <button className="admin-primary" onClick={() => navigate("properties")}>
          Ver propiedades
        </button>
      </header>
      {result.error && <p role="alert">{result.error}</p>}
      <div className="admin-stats">
        {[
          ["total", "Propiedades"],
          ["published", "Publicadas"],
          ["drafts", "Borradores"],
          ["archived", "Archivadas"],
          ["leads", "Consultas nuevas"],
        ].map(([key, label]) => (
          <article className="admin-card" key={key}>
            <span>{label}</span>
            <strong>
              {result.loading
                ? "…"
                : typeof result.data?.[key as "total"] === "number"
                  ? result.data[key as "total"]
                  : "Sin acceso"}
            </strong>
          </article>
        ))}
      </div>
      <Block title="Accesos rápidos">
        <div className="admin-actions">
          <button className="admin-secondary" onClick={() => navigate("builder")}>
            Editar Inicio
          </button>
          <button className="admin-secondary" onClick={() => navigate("leads")}>
            Ver consultas
          </button>
          <button className="admin-secondary" onClick={() => navigate("settings")}>
            Cambiar WhatsApp
          </button>
          <button className="admin-secondary" onClick={() => navigate("seo")}>
            Revisar SEO
          </button>
        </div>
      </Block>
      <div className="admin-two">
        <Block title="Propiedades modificadas recientemente">
          {result.data?.recentProperties.map((p) => (
            <button className="admin-row" key={p.id} onClick={() => navigate("properties")}>
              <strong>{p.title}</strong>
              <span>{new Date(p.updatedAt).toLocaleDateString("es-AR")}</span>
            </button>
          ))}
          {result.data && !result.data.recentProperties.length && (
            <p>Todavía no hay propiedades cargadas.</p>
          )}
        </Block>
        <Block title="Últimas consultas">
          {result.data?.recentLeads.map((l) => (
            <button className="admin-row" key={l.id} onClick={() => navigate("leads")}>
              <strong>{l.name}</strong>
              <span>{new Date(l.createdAt).toLocaleDateString("es-AR")}</span>
            </button>
          ))}
          {result.data && !result.data.recentLeads.length && <p>No hay consultas recibidas.</p>}
        </Block>
      </div>
      <Block title="Servicios externos">
        <p>
          Las visitas, conversiones y envíos de email requieren servicios configurados y
          verificados. No se muestran estimaciones.
        </p>
      </Block>
    </>
  );
}
function Properties() {
  const [offset, setOffset] = useState(0),
    [query, setQuery] = useState(""),
    [editing, setEditing] = useState<ContentRecord | null>(null);
  const list = useAsync(
    () => adminList({ data: { kind: "property", offset, query } }),
    [offset, query],
  );
  if (editing)
    return (
      <>
        <button
          className="admin-back"
          onClick={() => {
            if (
              window.confirm(
                "¿Volver al listado? Los cambios que todavía no se guardaron se perderán.",
              )
            ) {
              setEditing(null);
              list.refresh();
            }
          }}
        >
          ← Propiedades
        </button>
        <PropertyEditor key={editing.id} record={editing} />
      </>
    );
  return (
    <>
      <header className="admin-page-title">
        <div>
          <p>Tu catálogo</p>
          <h1>Propiedades</h1>
        </div>
        <button
          className="admin-primary"
          onClick={() => {
            const id = crypto.randomUUID();
            setEditing({
              id,
              kind: "property",
              slug: `borrador-${id.slice(0, 8)}`,
              document: propertyDraftSchema.parse({ code: `RVT-${id.slice(0, 6).toUpperCase()}` }),
              revision: 0,
              status: "draft",
              updated_at: new Date().toISOString(),
            });
          }}
        >
          + Nueva propiedad
        </button>
      </header>
      <Input
        label="Buscar propiedad"
        value={query}
        onChange={(v) => {
          setQuery(v);
          setOffset(0);
        }}
      />
      {list.error && (
        <p role="alert" className="admin-error">
          {list.error}
        </p>
      )}
      <Block title={`${list.data?.count ?? 0} propiedades`}>
        {list.loading ? (
          <p>Cargando…</p>
        ) : !list.data?.rows.length ? (
          <div className="admin-empty">
            <Home size={32} />
            <h2>Tu próximo inmueble empieza acá.</h2>
            <p>
              Agregá fotografías y completá la información. Podés guardar un borrador en cualquier
              momento.
            </p>
          </div>
        ) : (
          <div className="admin-property-list">
            {list.data.rows.map((row) => (
              <button
                className="admin-property-row"
                key={row.id}
                onClick={() => setEditing(row as ContentRecord)}
              >
                {row.document.images?.[0]?.src ? (
                  <img src={row.document.images[0].src} alt="" />
                ) : (
                  <Home size={28} />
                )}
                <div>
                  <strong>{row.document.title || "Sin título"}</strong>
                  <span>
                    {row.document.code} · {row.document.city || "Sin localidad"}
                  </span>
                </div>
                <span>
                  {row.document.price
                    ? `${row.document.price.currency} ${row.document.price.amount.toLocaleString("es-AR")}`
                    : "A consultar"}
                </span>
                <span>
                  {row.status === "published"
                    ? "Publicada"
                    : row.status === "archived"
                      ? "Archivada"
                      : "Borrador"}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="admin-pagination">
          <button disabled={!offset} onClick={() => setOffset((v) => v - 25)}>
            Anterior
          </button>
          <span>
            {offset + 1}–{Math.min(offset + 25, list.data?.count ?? 0)}
          </span>
          <button
            disabled={offset + 25 >= (list.data?.count ?? 0)}
            onClick={() => setOffset((v) => v + 25)}
          >
            Siguiente
          </button>
        </div>
      </Block>
    </>
  );
}
function SEO() {
  const pages = useAsync(() => adminList({ data: { kind: "page", offset: 0, query: "" } }));
  return (
    <>
      <header className="admin-page-title">
        <div>
          <p>Visibilidad orgánica</p>
          <h1>SEO del sitio</h1>
        </div>
      </header>
      <Block title="Páginas">
        {pages.error && <p role="alert">{pages.error}</p>}
        {pages.data?.rows.map((r) => (
          <article className="admin-row" key={r.id}>
            <strong>{r.document.title}</strong>
            <span>
              {r.document.seo?.title ? "Título completo" : "Falta título"} ·{" "}
              {r.document.seo?.description ? "Descripción completa" : "Falta descripción"} ·{" "}
              {r.status === "published" ? "Publicada" : "Borrador privado"}
            </span>
          </article>
        ))}
        <p className="admin-help">
          El SEO de cada propiedad se edita en su ficha. Los borradores y el entorno de pruebas no
          deben indexarse.
        </p>
      </Block>
    </>
  );
}

function ResetPassword() {
  const [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="admin-app admin-login">
      <form
        className="admin-login-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await updatePassword({ data: password });
            window.location.assign("/admin");
          } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo actualizar.");
            setBusy(false);
          }
        }}
      >
        <h1>Tu nueva contraseña</h1>
        <p>Usá al menos 12 caracteres.</p>
        <Input label="Nueva contraseña" type="password" value={password} onChange={setPassword} />
        {error && <p role="alert">{error}</p>}
        <button className="admin-primary" disabled={busy}>
          Guardar contraseña
        </button>
      </form>
    </div>
  );
}
