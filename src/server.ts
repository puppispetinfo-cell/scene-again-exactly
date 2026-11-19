import { withCspNonce } from "./platform/server/csp";
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const { contentRedirect } = await import("./platform/server/discovery");
      const redirected = await contentRedirect(new URL(request.url).pathname);
      if (redirected) return redirected;
      const handler = await getServerEntry();
      const nonce = crypto.randomUUID().replaceAll("-", "");
      const options =
        typeof env === "object" && env !== null ? (env as Record<string, unknown>) : {};
      const response = await withCspNonce(nonce, () =>
        handler.fetch(
          request,
          { ...options, context: { ...((options["context"] as object) ?? {}), nonce } },
          ctx,
        ),
      );
      const normalized = await normalizeCatastrophicSsrResponse(response);
      const headers = new Headers(normalized.headers);
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
      headers.set("X-Frame-Options", "DENY");
      const production = process.env["NODE_ENV"] === "production";
      headers.set(
        production ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
        `default-src 'self'; script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com https://connect.facebook.net https://www.googleadservices.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' https:; connect-src 'self' https://*.supabase.co https://*.google-analytics.com https://*.analytics.google.com https://*.googleadservices.com https://*.doubleclick.net https://www.google.com https://www.facebook.com; frame-src https://www.googletagmanager.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`,
      );
      if (process.env["SITE_ENVIRONMENT"] !== "production")
        headers.set("X-Robots-Tag", "noindex, nofollow");
      if (production && new URL(request.url).protocol === "https:")
        headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      headers.set("Cache-Control", "no-store");
      if (
        request.headers.has("cookie") ||
        new URL(request.url).pathname.startsWith("/admin") ||
        new URL(request.url).pathname.startsWith("/preview")
      )
        headers.set("Cache-Control", "private, no-store");
      return new Response(normalized.body, {
        status: normalized.status,
        statusText: normalized.statusText,
        headers,
      });
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
