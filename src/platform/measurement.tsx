import { useEffect, useState, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { usePublished } from "./content-context";
export type SemanticEvent =
  | "page_view"
  | "view_property"
  | "search_properties"
  | "select_property"
  | "contact_form_start"
  | "contact_form_submit"
  | "publish_property_form_submit"
  | "whatsapp_click"
  | "phone_click"
  | "email_click"
  | "generate_lead"
  | "schedule_visit";
type Consent = { analytics: boolean; advertising: boolean; version: 1 };
let consent: Consent = { analytics: false, advertising: false, version: 1 };
const sent = new Set<string>();
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & {
      queue?: unknown[][];
      loaded?: boolean;
      version?: string;
      push?: unknown;
      callMethod?: (...args: unknown[]) => void;
    };
    _fbq?: Window["fbq"];
  }
}
const mapping: Partial<Record<SemanticEvent, string>> = {
  page_view: "PageView",
  view_property: "ViewContent",
  generate_lead: "Lead",
  contact_form_submit: "Contact",
};
export function track(
  event: SemanticEvent,
  payload: { property_id?: string; form_id?: string; result_count?: number } = {},
  id: string = crypto.randomUUID(),
) {
  if ((!consent.analytics && !consent.advertising) || sent.has(id)) return false;
  sent.add(id);
  if (sent.size > 1000) sent.delete(sent.values().next().value!);
  const safe = { ...payload, event_id: id };
  window.dataLayer ??= [];
  window.dataLayer.push({ event, ...safe });
  window.dispatchEvent(new CustomEvent("rivton-event", { detail: { event, payload: safe } }));
  return true;
}
function script(id: string, src: string) {
  if (document.getElementById(id)) return;
  const node = document.createElement("script");
  node.id = id;
  node.src = src;
  node.async = true;
  document.head.append(node);
}
export function Measurement() {
  const cms = usePublished(),
    config = cms?.marketing;
  const path = useLocation().pathname;
  const visit = useRef({ path: "", count: 0 });
  if (visit.current.path !== path) {
    visit.current = { path, count: visit.current.count + 1 };
  }
  const [loaded, setLoaded] = useState(false),
    [choice, setChoice] = useState<Consent | null>(null),
    [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("rivton-consent-v1") ?? "null");
      if (
        stored?.version === 1 &&
        typeof stored.analytics === "boolean" &&
        typeof stored.advertising === "boolean"
      ) {
        setChoice(stored);
        consent = stored;
      } else setOpen(true);
    } catch {
      setOpen(true);
    }
    setLoaded(true);
  }, []);
  const save = (value: Consent) => {
    consent = value;
    setChoice(value);
    try {
      localStorage.setItem("rivton-consent-v1", JSON.stringify(value));
    } catch {}
    setOpen(false);
    if (
      choice &&
      ((choice.analytics && !value.analytics) || (choice.advertising && !value.advertising))
    ) {
      window.location.reload();
      return;
    }
    window.gtag?.("consent", "update", {
      analytics_storage: value.analytics ? "granted" : "denied",
      ad_storage: value.advertising ? "granted" : "denied",
      ad_user_data: value.advertising ? "granted" : "denied",
      ad_personalization: value.advertising ? "granted" : "denied",
    });
    if (!value.advertising) window.fbq?.("consent", "revoke");
  };
  useEffect(() => {
    if (!config || !choice || cms?.preview) return;
    window.dataLayer ??= [];
    if (config.mode === "gtm") {
      if (config.gtm.enabled && config.gtm.id && (choice.analytics || choice.advertising)) {
        window.gtag ??= function () {
          window.dataLayer!.push(arguments as unknown as Record<string, unknown>);
        };
        window.gtag("consent", "default", {
          analytics_storage: choice.analytics ? "granted" : "denied",
          ad_storage: choice.advertising ? "granted" : "denied",
          ad_user_data: choice.advertising ? "granted" : "denied",
          ad_personalization: choice.advertising ? "granted" : "denied",
        });
        script("rivton-gtm", `https://www.googletagmanager.com/gtm.js?id=${config.gtm.id}`);
      }
      return;
    }
    if (
      (choice.analytics && config.ga4.enabled && config.ga4.id) ||
      (choice.advertising && config.ads.enabled && config.ads.id)
    ) {
      window.gtag ??= function () {
        window.dataLayer!.push(arguments as unknown as Record<string, unknown>);
      };
      window.gtag("consent", "default", {
        analytics_storage: choice.analytics ? "granted" : "denied",
        ad_storage: choice.advertising ? "granted" : "denied",
        ad_user_data: choice.advertising ? "granted" : "denied",
        ad_personalization: choice.advertising ? "granted" : "denied",
      });
      window.gtag("js", new Date());
      const id = config.ga4.enabled && choice.analytics ? config.ga4.id : config.ads.id;
      script("rivton-google", `https://www.googletagmanager.com/gtag/js?id=${id}`);
      if (config.ga4.enabled && choice.analytics)
        window.gtag("config", config.ga4.id, { send_page_view: false });
      if (config.ads.enabled && choice.advertising) window.gtag("config", config.ads.id);
    }
    // Meta is loaded only after advertising consent; IDs are schema-validated before reaching this component.
    if (choice.advertising && config.meta.enabled && config.meta.id && !window.fbq) {
      const queue: unknown[][] = [];
      const fb = ((...args: unknown[]) => {
        if (fb.callMethod) fb.callMethod(...args);
        else queue.push(args);
      }) as NonNullable<Window["fbq"]>;
      fb.queue = queue;
      fb.loaded = true;
      fb.version = "2.0";
      fb.push = fb;
      window.fbq = fb;
      window._fbq = fb;
      window.fbq("init", config.meta.id);
      script("rivton-meta", "https://connect.facebook.net/en_US/fbevents.js");
    }
    const handler = (e: Event) => {
      const { event, payload } = (
        e as CustomEvent<{ event: SemanticEvent; payload: Record<string, unknown> }>
      ).detail;
      if (choice.analytics && config.ga4.enabled) window.gtag?.("event", event, payload);
      if (choice.advertising && config.ads.enabled) {
        const label = config.adsLabels[event as keyof typeof config.adsLabels];
        if (label)
          window.gtag?.("event", "conversion", {
            send_to: `${config.ads.id}/${label}`,
            transaction_id: payload["event_id"],
          });
      }
      if (choice.advertising && config.meta.enabled && mapping[event])
        window.fbq?.("track", mapping[event], payload, { eventID: payload["event_id"] });
    };
    window.addEventListener("rivton-event", handler);
    return () => window.removeEventListener("rivton-event", handler);
  }, [config, choice, cms?.preview]);
  useEffect(() => {
    if (!loaded || !choice || !config || cms?.preview) return;
    track("page_view", {}, `page:${path}:${visit.current.count}:${performance.timeOrigin}`);
    const match = cms?.properties.find((p) => path === `/propiedades/${p.slug}`);
    if (match)
      track(
        "view_property",
        { property_id: match.id },
        `property:${match.id}:${visit.current.count}:${performance.timeOrigin}`,
      );
  }, [path, loaded, choice, config, cms]);
  useEffect(() => {
    if (!config || cms?.preview) return;
    const click = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest("a");
      if (!a) return;
      try {
        const url = new URL(a.href);
        if (url.hostname === "wa.me")
          track(
            "whatsapp_click",
            a.dataset["propertyId"] ? { property_id: a.dataset["propertyId"] } : {},
          );
        else if (url.protocol === "tel:") track("phone_click");
        else if (url.protocol === "mailto:") track("email_click");
      } catch {}
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, [config, cms?.preview]);
  if (!config || cms?.preview) return null;
  return (
    <>
      {loaded && open && (
        <section className="consent-panel" aria-label="Preferencias de privacidad">
          <h2>Tu privacidad</h2>
          <p>
            Podés elegir si permitís medición de uso y publicidad. Consultar propiedades no requiere
            aceptar estas tecnologías.
          </p>
          <div>
            <button onClick={() => save({ version: 1, analytics: false, advertising: false })}>
              Sólo necesarias
            </button>
            <button onClick={() => save({ version: 1, analytics: true, advertising: false })}>
              Permitir medición
            </button>
            <button onClick={() => save({ version: 1, analytics: true, advertising: true })}>
              Aceptar todas
            </button>
          </div>
        </section>
      )}
      <button className="consent-preferences" onClick={() => setOpen(true)}>
        Privacidad
      </button>
    </>
  );
}
