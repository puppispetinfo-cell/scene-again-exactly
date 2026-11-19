import { EditableText } from "@/platform/editable";
import { pageSEO } from "@/platform/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { getProperties } from "@/services/content";
import { useFavorites } from "@/hooks/use-favorites";
import { PropertyCard } from "@/components/property";
import { PageTitle } from "@/components/site";

export const Route = createFileRoute("/favoritos")({
  head: ({ matches }) =>
    pageSEO(matches, "favoritos") ?? {
      meta: [
        { title: "Favoritos — RIVTON Group" },
        { name: "description", content: "Las propiedades que guardaste en RIVTON Group." },
        { property: "og:title", content: "Favoritos — RIVTON Group" },
        { property: "og:description", content: "Tus propiedades guardadas." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    },
  loader: () => getProperties(),
  component: Favorites,
});

function Favorites() {
  const all = Route.useLoaderData();
  const { ids, ready } = useFavorites();
  const list = all.filter((p) => ids.includes(p.id));
  return (
    <>
      <PageTitle
        eyebrow={
          <EditableText page="favoritos" id="heading" field="subtitle" fallback="Tu selección" />
        }
        title={<EditableText page="favoritos" id="heading" field="title" fallback="Favoritos" />}
      >
        <EditableText
          page="favoritos"
          id="heading"
          field="body"
          fallback="Guardadas en este dispositivo."
        />
      </PageTitle>
      <div className="mx-auto max-w-7xl px-5 pb-16 lg:px-8">
        {ready && list.length === 0 ? (
          <div className="rounded-2xl border bg-muted px-6 py-16 text-center">
            <Heart className="mx-auto h-8 w-8" strokeWidth={1.4} />
            <h2 className="mt-3 text-3xl">Todavía no guardaste propiedades</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tocá el corazón en cualquier propiedad para guardarla acá.
            </p>
            <Link
              to="/propiedades"
              className="mt-6 inline-block rounded-full bg-ink px-5 py-3 text-sm font-semibold text-ink-foreground"
            >
              Explorar propiedades
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <PropertyCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
