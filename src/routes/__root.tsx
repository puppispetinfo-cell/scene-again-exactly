import { StructuredData } from "@/platform/structured-data";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { SiteShell } from "../components/site";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { defaultTheme } from "@/core/theme";
import { defaultFilters } from "@/core/filter-definitions";
import { Measurement } from "@/platform/measurement";
import { PublishedContext } from "@/platform/content-context";
import { getPublicConfiguration } from "@/services/content";
import { themeVariables } from "@/core/theme";
import { FilterDefinitionsContext } from "@/core/filter-context";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: ({ location }) =>
    location.pathname.startsWith("/admin") || location.pathname.startsWith("/preview")
      ? { theme: defaultTheme, filters: defaultFilters, cms: null }
      : getPublicConfiguration(),
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "robots",
        content:
          loaderData?.cms?.preview || loaderData?.cms?.environment !== "production"
            ? "noindex,nofollow"
            : "index,follow",
      },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RIVTON Group — Inmobiliaria en Córdoba" },
      {
        name: "description",
        content: "Propiedades en venta y alquiler en Córdoba con RIVTON Group.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: loaderData?.cms?.configuration?.favicon?.src ?? "/favicon.ico" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const data = Route.useLoaderData();
  return (
    <html
      lang="es"
      data-custom-buttons={data?.theme.buttons ? "true" : undefined}
      style={data ? themeVariables(data.theme) : undefined}
    >
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    document.documentElement.dataset["appReady"] = "true";
  }, []);
  const { queryClient } = Route.useRouteContext();
  const { filters, cms } = Route.useLoaderData();

  const isPrivate =
    useLocation().pathname.startsWith("/admin") || useLocation().pathname.startsWith("/preview");
  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <PublishedContext.Provider value={cms}>
        {cms?.preview && (
          <div className="preview-notice">
            Vista previa privada · vence en 10 minutos{" "}
            <a href="/preview/end">Salir de la vista previa</a>
          </div>
        )}
        <FilterDefinitionsContext.Provider value={filters}>
          {isPrivate ? (
            <Outlet />
          ) : (
            <SiteShell>
              <Measurement />
              <StructuredData />
              <Outlet />
            </SiteShell>
          )}
        </FilterDefinitionsContext.Provider>
      </PublishedContext.Provider>
    </QueryClientProvider>
  );
}
