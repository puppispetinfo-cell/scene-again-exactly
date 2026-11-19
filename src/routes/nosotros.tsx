import { EditableImage, EditableText } from "@/platform/editable";
import { useElement, usePublished } from "@/platform/content-context";
import { pageSEO } from "@/platform/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";
import { getSettings, getTeam } from "@/services/content";

export const Route = createFileRoute("/nosotros")({
  head: ({ matches }) =>
    pageSEO(matches, "nosotros") ?? {
      meta: [
        { title: "Nosotros — RIVTON Group" },
        {
          name: "description",
          content: "Conocé al equipo de RIVTON Group, inmobiliaria en Córdoba.",
        },
        { property: "og:title", content: "Nosotros — RIVTON Group" },
        {
          property: "og:description",
          content: "Un equipo dedicado a la comercialización de propiedades en Córdoba.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    },
  loader: async () => ({ team: await getTeam(), settings: await getSettings() }),
  component: About,
});

function About() {
  const { team, settings } = Route.useLoaderData();
  const cms = usePublished();
  const about = useElement("nosotros", "about");
  return (
    <>
      <section className="relative bg-ink text-ink-foreground">
        <EditableImage
          page="nosotros"
          id="about"
          fallback={team.image.src}
          alt={team.image.alt}
          width={1280}
          height={960}
          className="h-[62vh] max-h-[680px] w-full object-cover opacity-90"
        />
        <div className="hero-scrim absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-5 pb-8 lg:px-8 lg:pb-14">
          <h1 className="max-w-2xl text-5xl leading-[0.98] lg:text-7xl">
            <EditableText page="nosotros" id="about" field="title" fallback={team.title} />
          </h1>
        </div>
      </section>
      <section className="bg-ink text-ink-foreground">
        <div className="mx-auto max-w-7xl px-5 pb-14 pt-6 lg:px-8">
          <p className="max-w-2xl text-[15px] leading-relaxed text-ink-foreground/80 lg:text-lg">
            <EditableText page="nosotros" id="about" field="body" fallback={team.body} />
          </p>
          <Link
            to={about?.button?.href ?? "/contacto"}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-foreground"
          >
            {about?.button?.label ?? "Hablemos"} <ArrowRight className="h-4 w-4" />
          </Link>
          {settings.address && (
            <p className="mt-10 flex items-center gap-2 border-t border-ink-foreground/15 pt-6 text-sm text-ink-foreground/75">
              <MapPin className="h-4 w-4" />
              {settings.address}
            </p>
          )}
        </div>
      </section>
      {cms?.members.length ? (
        <section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-4 lg:px-8">
          {cms.members.map((m) => (
            <article key={m.name}>
              {m.photo && (
                <img
                  src={m.photo.src}
                  alt={m.photo.alt}
                  width={m.photo.width}
                  height={m.photo.height}
                  className="aspect-square w-full rounded-xl object-cover"
                  loading="lazy"
                />
              )}
              <h2 className="mt-4 text-3xl">{m.name}</h2>
              {m.role && <p className="mt-1 text-sm">{m.role}</p>}
              {m.biography && <p className="mt-3 text-sm text-muted-foreground">{m.biography}</p>}
            </article>
          ))}
        </section>
      ) : null}
    </>
  );
}
