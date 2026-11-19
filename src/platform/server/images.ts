import sharp from "sharp";
import { createHash, randomUUID } from "node:crypto";
import { requireMember, sameOrigin, databaseError } from "./client";
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export async function optimizeImage(buffer: Uint8Array, claimed: string) {
  if (buffer.byteLength > MAX_IMAGE_BYTES || !buffer.length)
    throw new Error("La foto debe pesar hasta 10 MB.");
  const image = sharp(buffer, { limitInputPixels: 40000000, failOn: "warning" });
  const meta = await image.metadata();
  const formats: Record<string, string> = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
    heif: "image/avif",
  };
  if (
    !meta.format ||
    (meta.format === "heif" && meta.compression !== "av1") ||
    !formats[meta.format] ||
    formats[meta.format] !== claimed ||
    (meta.pages && meta.pages > 1)
  )
    throw new Error("Usá fotografías JPG, PNG, WebP o AVIF sin animación.");
  const { data, info } = await image
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
  return {
    data,
    width: info.width,
    height: info.height,
    hash: createHash("sha256").update(data).digest("hex"),
  };
}
async function limitedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("No se recibió un archivo.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_IMAGE_BYTES + 65536) {
        await reader.cancel();
        throw new Error("La foto supera los 10 MB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const buffer = new Uint8Array(length);
  let offset = 0;
  for (const c of chunks) {
    buffer.set(c, offset);
    offset += c.length;
  }
  return new Response(buffer, {
    headers: { "content-type": request.headers.get("content-type") ?? "" },
  }).formData();
}
export async function upload(request: Request) {
  sameOrigin();
  const { client, user } = await requireMember();
  const form = await limitedBody(request);
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("Elegí una fotografía.");
  const image = await optimizeImage(new Uint8Array(await file.arrayBuffer()), file.type);
  const path = `${user.id}/${image.hash}.webp`;
  const { data: existing } = await client
    .from("media_assets")
    .select("id,alt,width,height")
    .eq("hash", image.hash)
    .eq("created_by", user.id)
    .maybeSingle();
  if (existing) return { ...existing, src: `/api/media/${existing.id}` };
  const { error: uploadError } = await client.storage
    .from("property-media")
    .upload(path, image.data, { contentType: "image/webp", upsert: false, cacheControl: "60" });
  if (uploadError && !uploadError.message.toLowerCase().includes("already exists"))
    databaseError(uploadError);
  const { data, error } = await client.rpc("register_media", {
    p_id: randomUUID(),
    p_path: path,
    p_hash: image.hash,
    p_alt: String(form.get("alt") ?? file.name.replace(/\.[^.]+$/, "")).slice(0, 1000),
    p_width: image.width,
    p_height: image.height,
    p_bytes: image.data.byteLength,
  });
  databaseError(error);
  return data;
}
