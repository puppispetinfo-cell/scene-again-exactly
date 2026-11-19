import { createFileRoute, notFound } from "@tanstack/react-router";
import { getContent } from "@/services/content";
import { pageSEO } from "@/platform/seo";
export const Route = createFileRoute("/$page")({
  loader: async ({ params }) => {
    const snapshot = await getContent();
    const page = snapshot.pages[params.page];
    if (!page || params.page === "ficha") throw notFound();
    return page;
  },
  head: ({ matches, params }) => pageSEO(matches, params.page) ?? {},
  component: Editorial,
});
function Editorial() {
  const page = Route.useLoaderData();
  return (
    <article className="mx-auto max-w-4xl px-5 py-12 lg:px-8">
      <h1 className="text-4xl lg:text-6xl">{page.title}</h1>
      {page.elements
        .filter((e) => e.visible)
        .map((e) => (
          <section key={e.id} className="mt-10">
            <h2 className="text-3xl">{e.title}</h2>
            {e.subtitle && <p className="mt-3 text-muted-foreground">{e.subtitle}</p>}
            <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
              {e.body}
            </p>
            {e.button && (
              <a className="mt-4 inline-block underline" href={e.button.href}>
                {e.button.label}
              </a>
            )}
          </section>
        ))}
    </article>
  );
}
