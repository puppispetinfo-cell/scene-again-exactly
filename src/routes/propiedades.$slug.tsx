import { propertySEO } from "@/platform/seo";
import { usePublished, useElement } from "@/platform/content-context";
import { track } from "@/platform/measurement";
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Bed,
  Bath,
  Ruler,
  Home,
  CalendarDays,
  MessageCircle,
  Check,
} from "lucide-react";
import { getPropertyBySlug, getSettings } from "@/services/content";
import { formatArea, formatPrice } from "@/lib/filters";
import { FavButton } from "@/components/property";

export const Route = createFileRoute("/propiedades/$slug")({
  loader: async ({ params }) => {
    const p = await getPropertyBySlug(params.slug);
    if (!p) throw notFound();
    return { p, settings: await getSettings() };
  },
  head: ({ loaderData, matches }) =>
    propertySEO(matches, loaderData?.p) ?? {
      meta: loaderData
        ? [
            { title: `${loaderData.p.title} — RIVTON Group` },
            {
              name: "description",
              content: `${loaderData.p.title}: ${formatPrice(loaderData.p.price)}. Propiedad en ${loaderData.p.operation} con RIVTON Group.`,
            },
            { property: "og:title", content: `${loaderData.p.title} — RIVTON Group` },
            {
              property: "og:description",
              content: `${formatPrice(loaderData.p.price)} · ${loaderData.p.bedrooms ?? "-"} dormitorios`,
            },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary_large_image" },
            ...(loaderData.p.images[0]?.src.startsWith("https://")
              ? [
                  { property: "og:image", content: loaderData.p.images[0].src },
                  { name: "twitter:image", content: loaderData.p.images[0].src },
                ]
              : []),
          ]
        : [
            { title: "Propiedad no disponible — RIVTON Group" },
            { name: "robots", content: "noindex" },
            {
              name: "description",
              content:
                "Esta propiedad ya no está disponible. Explorá otras propiedades de RIVTON Group.",
            },
            { property: "og:title", content: "Propiedad no disponible — RIVTON Group" },
            { property: "og:description", content: "Explorá otras propiedades de RIVTON Group." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary_large_image" },
          ],
    },
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="text-4xl">Propiedad no disponible</h1>
      <Link to="/propiedades" className="mt-6 inline-block underline">
        Ver propiedades
      </Link>
    </div>
  ),
  component: Detail,
});

function Detail() {
  const { p, settings } = Route.useLoaderData();
  const router = useRouter();
  const [i, setI] = useState(0);
  const n = p.images.length;
  const cms = usePublished();
  const contact = useElement("ficha", "contact");
  const wa = cms?.configuration?.whatsapp ?? p.whatsapp ?? settings.whatsapp;
  const template = cms?.configuration?.whatsappTemplate ?? "Hola, me interesa {title}";
  const waText = template.replace(
    /\{(title|code|url|operation|city)\}/g,
    (_, key: string) =>
      ({
        title: p.title,
        code: p.code ?? "",
        url: `${cms?.siteOrigin ?? ""}/propiedades/${p.slug}`,
        operation: p.operation,
        city: p.location ?? "",
      })[key as "title"] ?? "",
  );
  const cur = p.images[i] ?? p.images[0];

  const facts = [
    p.bedrooms != null && { icon: Bed, value: p.bedrooms, label: "Dormitorios" },
    p.bathrooms != null && { icon: Bath, value: p.bathrooms, label: "Baños" },
    p.coveredArea != null && { icon: Home, value: formatArea(p.coveredArea), label: "Cubiertos" },
    p.lotArea != null && { icon: Ruler, value: formatArea(p.lotArea), label: "Terreno" },
  ].filter(Boolean) as { icon: typeof Bed; value: string | number; label: string }[];

  return (
    <div className="mx-auto max-w-7xl lg:px-8 lg:py-10">
      <div className="lg:grid lg:grid-cols-[1.5fr_1fr] lg:gap-12">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted lg:rounded-2xl">
          <img
            src={cur?.src}
            alt={cur?.alt}
            width={1280}
            height={896}
            className="h-full w-full object-cover"
          />
          <button
            onClick={() => router.history.back()}
            aria-label="Volver"
            className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-background/95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <FavButton id={p.id} className="absolute right-4 top-4 h-10 w-10" />
          {n > 1 && (
            <>
              <button
                aria-label="Foto anterior"
                onClick={() => setI((i - 1 + n) % n)}
                className="absolute left-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-background/80"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                aria-label="Foto siguiente"
                onClick={() => setI((i + 1) % n)}
                className="absolute right-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-background/80"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          <span className="absolute bottom-4 right-4 rounded-full bg-ink/70 px-3 py-1 text-xs text-ink-foreground">
            {i + 1}/{n}
          </span>
        </div>

        <div className="px-5 py-6 lg:px-0 lg:py-0">
          <div className="flex items-center justify-between">
            <span className="label-caps rounded-sm bg-secondary px-2 py-1 text-[10px]">
              {p.operationLabel ??
                (p.operation === "venta"
                  ? "Venta"
                  : p.operation === "alquiler"
                    ? "Alquiler"
                    : p.operation)}
            </span>
            {p.code && <span className="text-xs text-muted-foreground">Código: {p.code}</span>}
          </div>
          <h1 className="mt-3 text-4xl lg:text-5xl">{p.title}</h1>
          {p.location && <p className="mt-1 text-sm text-muted-foreground">{p.location}</p>}
          <p className="mt-3 text-3xl font-bold tracking-tight">{formatPrice(p.price)}</p>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            {facts.map((f) => (
              <div key={f.label} className="rounded-xl border p-3 text-center">
                <f.icon className="mx-auto h-5 w-5" strokeWidth={1.4} />
                <p className="mt-1 text-sm font-semibold">{f.value}</p>
                <p className="text-[11px] text-muted-foreground">{f.label}</p>
              </div>
            ))}
          </div>

          {p.amenities.length > 0 && (
            <div className="mt-6">
              <h2 className="text-2xl">Comodidades</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {p.amenities.map((a) => (
                  <li
                    key={a}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.description && (
            <div className="mt-6">
              <h2 className="text-2xl">Descripción</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                {p.description}
              </p>
            </div>
          )}

          {p.calendlyUrl && (
            <a
              href={p.calendlyUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 flex items-center gap-3 rounded-xl bg-secondary p-4"
            >
              <CalendarDays className="h-5 w-5" />
              <span className="flex-1 text-sm font-semibold">Agendá una visita</span>
              <ChevronRight className="h-4 w-4" />
            </a>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link
              to={contact?.button?.href ?? "/contacto"}
              search={{ propiedad: p.title }}
              className={`grid h-12 place-items-center rounded-lg border text-sm font-semibold ${wa ? "" : "col-span-2 bg-ink text-ink-foreground"}`}
            >
              {contact?.button?.label ?? "Consultar"}
            </Link>
            {wa && (
              <a
                href={`https://wa.me/${wa}?text=${encodeURIComponent(waText)}`}
                data-property-id={p.id}
                target="_blank"
                rel="noreferrer"
                className="flex h-12 items-center justify-center gap-2 rounded-lg bg-ink text-sm font-semibold text-ink-foreground"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {n > 1 && (
        <div className="no-scrollbar mx-5 flex gap-2 overflow-x-auto pb-10 lg:mx-0 lg:mt-6">
          {p.images.map((img, k) => (
            <button
              key={k}
              onClick={() => setI(k)}
              className={`h-20 w-28 shrink-0 overflow-hidden rounded-lg border-2 ${k === i ? "border-foreground" : "border-transparent"}`}
            >
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
