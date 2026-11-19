import { createHmac, timingSafeEqual } from "node:crypto";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { requireMember } from "./client";
const name = "rivton-preview";
function secret() {
  const value = process.env["PREVIEW_SECRET"];
  if (!value || value.length < 32)
    throw new Error("La previsualización todavía no está configurada.");
  return value;
}
function signature(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}
export async function startPreview(id: string) {
  const { client } = await requireMember();
  const { data } = await client.from("content_drafts").select("id,kind,slug").eq("id", id).single();
  if (!data || !["property", "page", "settings"].includes(data.kind))
    throw new Error("Contenido no disponible.");
  const value = `${id}.${Math.floor(Date.now() / 1000) + 600}`;
  setCookie(name, `${value}.${signature(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge: 600,
  });
  return data.kind === "property"
    ? `/propiedades/${data.slug}`
    : data.kind === "page"
      ? data.slug === "/"
        ? "/"
        : `/${data.slug}`
      : "/";
}
export async function previewDocument() {
  const cookie = getCookie(name);
  if (!cookie) return null;
  const [id, expiry, sig] = cookie.split(".");
  if (
    !id ||
    !/^\d+$/.test(expiry ?? "") ||
    Number(expiry) < Date.now() / 1000 ||
    Number(expiry) > Date.now() / 1000 + 610 ||
    !sig ||
    !/^[a-f0-9]{64}$/.test(sig)
  )
    return null;
  const wanted = signature(`${id}.${expiry}`);
  if (!timingSafeEqual(Buffer.from(wanted, "hex"), Buffer.from(sig, "hex"))) return null;
  const { client } = await requireMember();
  const { data, error } = await client.from("content_drafts").select("*").eq("id", id).single();
  if (error || !data) throw new Error("La previsualización no está disponible.");
  return data;
}
