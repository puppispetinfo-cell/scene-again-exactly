import { pageSEO } from "@/platform/seo";
import { EditableImage, EditableText } from "@/platform/editable";
import { useElement, usePublished } from "@/platform/content-context";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Home, Building2, Trees, Waves, KeyRound, ExternalLink, ArrowRight } from "lucide-react";
import strip from "@/assets/architecture-strip.jpg";
import { PropertyCard, PropertyRow } from "@/components/property";
import { TEMPORARIOS_URL } from "@/components/site";
import { getFeatured, getLatest, getTeam } from "@/services/content";
import { ScrollStory } from "@/components/scroll-story";
import { ScrollEffects } from "@/components/scroll-effects";

export const Route = createFileRoute("/")({
  head: ({ matches }) =>
    pageSEO(matches, "/") ?? {
      meta: [
        { title: "RIVTON Group — Encontrá tu propiedad en Córdoba" },
        {
          name: "description",
          content:
            "Comprá o alquilá casas y departamentos en Córdoba con RIVTON Group. Propiedades seleccionadas y asesoramiento profesional.",
        },
        { property: "og:title", content: "RIVTON Group — Encontrá tu propiedad" },
        {
          property: "og:description",
          content: "Propiedades seleccionadas en Córdoba, con asesoramiento profesional.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    },
  loader: async () => ({
    featured: await getFeatured(),
    latest: await getLatest(4),
    team: await getTeam(),
  }),
  component: Index,
});

const CATS = [
  { label: "Casas", icon: Home, search: { tipo: "casa" as const } },
  { label: "Departamentos", icon: Building2, search: { tipo: "departamento" as const } },
  { label: "Terrenos", icon: Trees, search: { tipo: "terreno" as const } },
  { label: "Con piscina", icon: Waves, search: { piscina: true } },
  { label: "Alquileres", icon: KeyRound, search: { operacion: "alquiler" as const } },
];

function Index() {
  const data = Route.useLoaderData();
  const cms = usePublished();
  const featuredSlot = useElement("/", "featured"),
    latestSlot = useElement("/", "latest"),
    publish = useElement("/", "publish");
  const select = (slot: typeof featuredSlot, automatic: typeof data.featured) =>
    slot && !slot.automatic
      ? slot.propertyIds
          .map((id) => cms?.properties.find((p) => p.id === id))
          .filter((p): p is (typeof automatic)[number] => Boolean(p))
      : automatic;
  const featured = select(featuredSlot, data.featured),
    latest = select(latestSlot, data.latest),
    team = data.team;
  const teamElement = cms?.pages["/"]?.elements.find((e) => e.id === "team");
  const categoryElement = cms?.pages["/"]?.elements.find((e) => e.id === "categories");
  const cats =
    cms?.configuration && categoryElement?.categoryIds.length
      ? categoryElement.categoryIds
          .map((id) => cms.catalogs.find((c) => c.id === id))
          .filter((c): c is NonNullable<typeof c> => Boolean(c))
          .map((c) => ({
            label: c.label,
            icon: c.slug === "departamento" ? Building2 : c.slug === "terreno" ? Trees : Home,
            search: { tipo: c.slug },
          }))
          .concat(CATS.slice(3) as any)
      : CATS;
  const visible = (id: string) =>
    cms?.pages["/"]?.elements.find((e) => e.id === id)?.visible !== false;
  return (
    <ScrollEffects>
      <ScrollStory />

      {/* 5. Featured carousel */}
      <section hidden={!visible("featured")} className="py-12 lg:py-20">
        <SectionHead
          eyebrow={<EditableText page="/" id="featured" field="subtitle" fallback="Selección" />}
          title={
            <EditableText page="/" id="featured" field="title" fallback="Propiedades destacadas" />
          }
        />
        <div className="safe-carousel no-scrollbar" data-reveal="rise">
          {featured.map((p) => (
            <div key={p.id} className="carousel-item shrink-0 snap-start">
              <PropertyCard p={p} />
            </div>
          ))}
        </div>
      </section>

      {/* 6. Categories */}
      <section hidden={!visible("categories")} className="category-band py-12 lg:py-16">
        <SectionHead
          eyebrow={<EditableText page="/" id="categories" field="subtitle" fallback="Explorar" />}
          title={
            <EditableText page="/" id="categories" field="title" fallback="¿Qué estás buscando?" />
          }
        />
        <div
          data-reveal="stagger"
          className="mx-auto grid max-w-7xl grid-cols-3 gap-3 px-5 sm:grid-cols-6 lg:px-8"
        >
          {cats.map((c) => (
            <Link
              key={c.label}
              to="/propiedades"
              search={c.search}
              className="glass-tile flex flex-col items-center gap-2 rounded-lg border px-2 py-5 text-center text-xs font-medium transition-colors hover:border-foreground"
            >
              <c.icon className="h-6 w-6" strokeWidth={1.4} /> {c.label}
            </Link>
          ))}
          <a
            href={TEMPORARIOS_URL}
            target="_blank"
            rel="noreferrer"
            className="glass-tile flex flex-col items-center gap-2 rounded-lg border px-2 py-5 text-center text-xs font-medium hover:border-foreground"
          >
            <ExternalLink className="h-6 w-6" strokeWidth={1.4} /> Temporarios
          </a>
        </div>
      </section>

      {/* 7. Latest */}
      <section hidden={!visible("latest")} className="py-12 lg:py-20">
        <SectionHead
          eyebrow={<EditableText page="/" id="latest" field="subtitle" fallback="Novedades" />}
          title={
            <EditableText page="/" id="latest" field="title" fallback="Últimas incorporadas" />
          }
          link
          action={latestSlot?.button}
        />
        <div
          data-reveal="stagger"
          className="mx-auto grid max-w-7xl gap-3 px-5 md:grid-cols-2 lg:px-8"
        >
          {latest.map((p) => (
            <PropertyRow key={p.id} p={p} />
          ))}
        </div>
      </section>

      {/* 8. Graphite banner */}
      <section hidden={!visible("publish")} data-reveal="rise" className="px-5 lg:px-8">
        <Link
          to={publish?.button?.href ?? "/publicar"}
          className="group relative mx-auto block max-w-7xl overflow-hidden rounded-2xl bg-graphite text-ink-foreground"
        >
          <EditableImage
            page="/"
            id="publish"
            fallback={strip}
            alt=""
            width={1600}
            height={912}
            className="parallax-image absolute inset-0 h-full w-full object-cover opacity-40"
          />
          <div className="relative px-6 py-12 lg:px-14 lg:py-20">
            <p className="label-caps mb-4 text-ink-foreground/60">
              <EditableText
                page="/"
                id="publish"
                field="subtitle"
                fallback="Publicá con nosotros"
              />
            </p>
            <h2 className="max-w-xl text-4xl leading-[1.05] lg:text-6xl">
              <EditableText
                page="/"
                id="publish"
                field="title"
                fallback="Tu propiedad merece una estrategia a su altura."
              />
            </h2>
            <span className="glass-action mt-8 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-ink-foreground">
              {publish?.button?.label ?? "Publicá tu propiedad"}{" "}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </Link>
      </section>

      {/* 9. Team */}
      <section hidden={!visible("team")} className="py-12 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
          <div data-reveal="image" className="overflow-hidden rounded-lg">
            <EditableImage
              page="/"
              id="team"
              fallback={team.image.src}
              alt={team.image.alt}
              width={1280}
              height={960}
              className="parallax-image aspect-[4/3] w-full object-cover"
            />
          </div>
          <div data-reveal="rise">
            <p className="label-caps mb-3 text-muted-foreground">
              <EditableText page="/" id="team" field="subtitle" fallback="Nosotros" />
            </p>
            <h2 className="text-4xl lg:text-5xl">
              <EditableText page="/" id="team" field="title" fallback={team.title} />
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              <EditableText page="/" id="team" field="body" fallback={team.body} />
            </p>
            <Link
              to={teamElement?.button?.href ?? "/nosotros"}
              className="mt-6 inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-semibold"
            >
              {teamElement?.button?.label ?? "Conocé nuestra historia"}{" "}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </ScrollEffects>
  );
}

function SectionHead({
  eyebrow,
  title,
  link,
  action,
}: {
  eyebrow: import("react").ReactNode;
  title: import("react").ReactNode;
  link?: boolean;
  action?: { label: string; href: string } | undefined;
}) {
  return (
    <div
      data-reveal="rise"
      className="mx-auto mb-6 flex max-w-7xl items-end justify-between gap-4 px-5 lg:px-8"
    >
      <div>
        <p className="label-caps mb-2 text-muted-foreground">{eyebrow}</p>
        <h2 className="text-3xl lg:text-5xl">{title}</h2>
      </div>
      {link && (
        <Link
          to={action?.href ?? "/propiedades"}
          className="shrink-0 text-sm font-medium underline underline-offset-4"
        >
          {action?.label ?? "Ver todas"}
        </Link>
      )}
    </div>
  );
}
