import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getCookies, setCookie, getRequest, setResponseHeader } from "@tanstack/react-start/server";
export function configuration() {
  const url = process.env["SUPABASE_URL"],
    key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("La administración todavía no está configurada.");
  const u = new URL(url);
  if (u.protocol !== "https:" || u.username || u.password)
    throw new Error("Configuración inválida");
  return { url, key };
}
export function publicClient() {
  const { url, key } = configuration();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(10000) }),
    },
  });
}
export function sessionClient() {
  const { url, key } = configuration();
  setResponseHeader("Cache-Control", "private, no-store");
  return createServerClient(url, key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env["NODE_ENV"] === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    },
    cookies: {
      getAll: () => Object.entries(getCookies()).map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value, options } of cookies)
          setCookie(name, value, {
            ...options,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env["NODE_ENV"] === "production",
            path: "/",
            maxAge: Math.min(options.maxAge ?? 28800, 28800),
          });
      },
    },
  });
}
export function sameOrigin() {
  const request = getRequest(),
    origin = request.headers.get("origin");
  const expected = process.env["APP_ORIGIN"] ?? new URL(request.url).origin;
  if (!origin || origin !== expected) throw new Error("Solicitud no autorizada.");
  if (Number(request.headers.get("content-length") ?? 0) > 15000000)
    throw new Error("Solicitud demasiado grande.");
}
export async function requireMember() {
  const client = sessionClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new Error("Iniciá sesión para continuar.");
  const { data: member } = await client
    .from("platform_members")
    .select("role,active")
    .eq("user_id", user.id)
    .single();
  if (!member?.active) throw new Error("Tu cuenta no tiene acceso a esta administración.");
  if (process.env["ADMIN_REQUIRE_MFA"] === "true") {
    const { data } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.currentLevel !== "aal2")
      throw new Error("Verificá tu segundo factor para continuar.");
  }
  return { client, user, role: member.role as "owner" | "editor" | "agent" | "analyst" };
}
export function databaseError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === "40001")
    throw new Error(
      "Otra persona modificó este contenido. Tus cambios siguen en pantalla; recargá antes de guardar.",
    );
  if (error.code === "23505") throw new Error("La URL o el código ya están en uso.");
  if (error.code === "42501") throw new Error("No tenés permiso para esta acción.");
  throw new Error("No se pudo completar la operación. Revisá los campos e intentá nuevamente.");
}
