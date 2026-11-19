import { usePublished } from "@/platform/content-context";
import { track } from "@/platform/measurement";
import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Home,
  Search,
  Heart,
  PlusCircle,
  Menu,
  X,
  Users,
  Mail,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { getSettings } from "@/services/content";
import type { SiteSettings } from "@/lib/types";
import { Button } from "@/components/ui/button";

export const TEMPORARIOS_URL = "https://www.tempohogar.com.ar/";

export function Logo({
  className = "",
  alternate = false,
}: {
  className?: string;
  alternate?: boolean;
}) {
  const config = usePublished()?.configuration;
  const logo = alternate ? (config?.alternateLogo ?? config?.logo) : config?.logo;
  if (logo)
    return (
      <img
        src={logo.src}
        alt={config?.name ?? "RIVTON Group"}
        width={logo.width}
        height={logo.height}
        className={`h-10 w-auto max-w-40 object-contain ${className}`}
      />
    );
  return (
    <span
      className={`relative inline-flex flex-col items-start leading-none text-ink-foreground ${className}`}
      aria-label="RIVTON Group"
    >
      <svg viewBox="0 0 120 14" className="h-3 w-[7.5rem]" aria-hidden>
        <path d="M2 13 Q60 -4 118 6" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <span className="absolute right-0 top-0 text-[7px] font-semibold tracking-[0.35em]">
        GROUP
      </span>
      <span className="-mt-0.5 font-sans text-[26px] font-medium tracking-[0.12em]">RIVTON</span>
    </span>
  );
}

const MENU = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/propiedades", label: "Explorar propiedades", icon: Search },
  { to: "/favoritos", label: "Favoritos", icon: Heart },
  { to: "/publicar", label: "Publicá tu propiedad", icon: PlusCircle },
  { to: "/nosotros", label: "Nosotros", icon: Users },
  { to: "/contacto", label: "Contacto", icon: Mail },
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  const cms = usePublished();
  const icons: Record<string, typeof Home> = {
    "/": Home,
    "/propiedades": Search,
    "/favoritos": Heart,
    "/publicar": PlusCircle,
    "/nosotros": Users,
    "/contacto": Mail,
  };
  const menu = cms?.configuration
    ? [
        { to: "/", label: "Inicio", icon: Home },
        ...cms.configuration.menu
          .filter((m) => m.href.startsWith("/") && m.href !== "/")
          .map((m) => ({ to: m.href, label: m.label, icon: icons[m.href] ?? ExternalLink })),
      ]
    : MENU;
  const temporaries = cms?.configuration?.temporariesUrl ?? TEMPORARIOS_URL;
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      {location.pathname !== "/" && <div className="h-[88px] bg-background" aria-hidden="true" />}
      <header data-scrolled={scrolled} className="site-header fixed top-3 z-40 text-ink-foreground">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link to="/" aria-label="Inicio">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm lg:flex">
            {menu.slice(1).map((m) => (
              <Link
                key={m.to}
                to={m.to}
                className="opacity-80 transition-opacity hover:opacity-100"
                activeProps={{ className: "opacity-100 underline underline-offset-8" }}
              >
                {m.label.replace(" propiedades", "")}
              </Link>
            ))}
            <a
              href={temporaries}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 opacity-80 hover:opacity-100"
            >
              Temporarios <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </nav>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="hover:bg-ink-foreground/10 hover:text-ink-foreground lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </header>

      {open && (
        <div
          className="mobile-menu fixed z-50 flex flex-col text-ink-foreground animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <div className="flex h-16 items-center justify-between px-5">
            <Logo />
            <Button
              autoFocus
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="hover:bg-ink-foreground/10 hover:text-ink-foreground"
            >
              <X className="h-7 w-7" />
            </Button>
          </div>
          <div className="mx-5 border-t border-ink-foreground/15" />
          <nav className="flex flex-1 flex-col gap-1 px-5 py-6">
            {menu.map((m) => (
              <Link
                key={m.to}
                to={m.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-4 py-3 text-lg"
              >
                <m.icon className="h-5 w-5 opacity-80" /> {m.label}
              </Link>
            ))}
            <a
              href={temporaries}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4 py-3 text-lg"
            >
              <ExternalLink className="h-5 w-5 opacity-80" /> Temporarios ↗
            </a>
          </nav>
        </div>
      )}

      <main>{children}</main>
      <Footer />

      <nav
        data-scrolled={scrolled}
        className="mobile-dock fixed z-40 lg:hidden"
        aria-label="Navegación inferior"
      >
        <div className="grid grid-cols-5">
          {[
            { to: "/", label: "Inicio", icon: Home },
            { to: "/propiedades", label: "Explorar", icon: Search },
            { to: "/favoritos", label: "Favoritos", icon: Heart },
            { to: "/publicar", label: "Publicar", icon: PlusCircle },
          ].map((t) => (
            <Link
              key={t.to}
              to={t.to}
              activeOptions={{ exact: t.to === "/" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground"
              activeProps={{ className: "!text-foreground font-semibold" }}
            >
              <t.icon className="h-5 w-5" /> {t.label}
            </Link>
          ))}
          <Button
            variant="ghost"
            onClick={() => setOpen(true)}
            className="h-auto flex-col gap-1 rounded-none py-2.5 text-[11px] text-muted-foreground"
          >
            <Menu className="h-5 w-5" /> Menú
          </Button>
        </div>
      </nav>
    </div>
  );
}

function Footer() {
  const cms = usePublished();
  const temporaries = cms?.configuration?.temporariesUrl ?? TEMPORARIOS_URL;
  const menu = cms?.configuration
    ? cms.configuration.menu
        .filter((m) => m.href.startsWith("/"))
        .map((m) => ({ to: m.href, label: m.label }))
    : MENU.slice(1);
  const [local, setSettings] = useState<SiteSettings | null>(null);
  useEffect(() => {
    let active = true;
    if (cms) return;
    void getSettings()
      .then((settings) => {
        if (active) setSettings(settings);
      })
      .catch(() => {
        if (active) setSettings(null);
      });
    return () => {
      active = false;
    };
  }, [cms]);
  const s = cms?.settings ?? local;
  return (
    <footer className="bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <Logo alternate />
          <p className="mt-6 max-w-sm font-display text-2xl leading-snug text-ink-foreground/85">
            {cms?.configuration?.footerText ?? "Propiedades con criterio, en Córdoba."}
          </p>
        </div>
        <div>
          <p className="label-caps mb-4 text-ink-foreground/50">Navegación</p>
          <ul className="space-y-2 text-sm text-ink-foreground/80">
            {menu.map((m) => (
              <li key={m.to}>
                <Link to={m.to}>{m.label}</Link>
              </li>
            ))}
            <li>
              <a href={temporaries} target="_blank" rel="noreferrer">
                Temporarios ↗
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="label-caps mb-4 text-ink-foreground/50">Oficina</p>
          {s?.address && (
            <p className="flex gap-2 text-sm text-ink-foreground/80">
              <MapPin className="h-4 w-4 shrink-0" /> {s.address}
            </p>
          )}
          {s && s.socials.length > 0 && (
            <ul className="mt-4 flex gap-4 text-sm">
              {s.socials.map((x) => (
                <li key={x.url}>
                  <a href={x.url} target="_blank" rel="noreferrer">
                    {x.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-ink-foreground/10">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 px-5 py-5 text-xs text-ink-foreground/50 lg:px-8">
          <span>
            © {new Date().getFullYear()} {cms?.configuration?.name ?? "RIVTON Group"}
          </span>
          <span className="flex gap-5">
            {cms?.pages["terminos"] ? (
              <a href="/terminos">Términos y condiciones</a>
            ) : (
              <span>Términos y condiciones</span>
            )}
            {cms?.pages["privacidad"] ? (
              <a href="/privacidad">Política de privacidad</a>
            ) : (
              <span>Política de privacidad</span>
            )}
          </span>
        </div>
      </div>
    </footer>
  );
}

export function PageTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-6 pt-8 lg:px-8 lg:pt-14">
      {eyebrow && <p className="label-caps mb-3 text-muted-foreground">{eyebrow}</p>}
      <h1 className="text-4xl leading-[1.05] lg:text-6xl">{title}</h1>
      {children && (
        <div className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {children}
        </div>
      )}
    </div>
  );
}
