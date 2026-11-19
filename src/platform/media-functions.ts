import { createServerFn } from "@tanstack/react-start";
import { z } from "@/lib/validation";
export const beginImageUpload = createServerFn({ method: "POST" })
  .validator(
    z.object({
      type: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
      size: z.number().int().positive().max(10485760),
    }),
  )
  .handler(async () => {
    const { requireMember, sameOrigin, databaseError } = await import("./server/client");
    sameOrigin();
    const { client, user } = await requireMember();
    const { data: path, error: reserveError } = await client.rpc("prepare_upload");
    databaseError(reserveError);
    if (!path) throw new Error("No se pudo preparar la carga.");
    const { data, error } = await client.storage
      .from("media-originals")
      .createSignedUploadUrl(path);
    databaseError(error);
    if (!data) throw new Error("No se pudo preparar la carga.");
    return { path, signedUrl: data.signedUrl };
  });
export const finishImageUpload = createServerFn({ method: "POST" })
  .validator(
    z.object({
      path: z.string().regex(/^[a-f0-9-]{36}\/[a-f0-9-]{36}$/),
      alt: z.string().max(1000),
    }),
  )
  .handler(async ({ data }) => {
    const { requireMember, sameOrigin, databaseError } = await import("./server/client");
    sameOrigin();
    const { client, user } = await requireMember();
    if (!data.path.startsWith(user.id + "/")) throw new Error("No tenés permiso para esta foto.");
    const { data: claimed, error: claimError } = await client.rpc("claim_upload", {
      p_path: data.path,
    });
    databaseError(claimError);
    if (!claimed) throw new Error("Esta carga venció o ya fue procesada. Volvé a subir la foto.");
    const { optimizeImage } = await import("./server/images");
    try {
      const { data: file, error } = await client.storage
        .from("media-originals")
        .download(data.path);
      databaseError(error);
      if (!file || file.size > 10485760) throw new Error("La foto supera los 10 MB.");
      const image = await optimizeImage(new Uint8Array(await file.arrayBuffer()), file.type);
      const { data: existing } = await client
        .from("media_assets")
        .select("id,alt,width,height")
        .eq("hash", image.hash)
        .eq("created_by", user.id)
        .maybeSingle();
      if (existing) return { ...existing, src: `/api/media/${existing.id}` };
      const path = `${user.id}/${image.hash}.webp`;
      const { error: uploadError } = await client.storage
        .from("property-media")
        .upload(path, image.data, { contentType: "image/webp", upsert: false });
      if (uploadError && !uploadError.message.toLowerCase().includes("already exists"))
        databaseError(uploadError);
      const { data: record, error: registerError } = await client.rpc("register_media", {
        p_id: crypto.randomUUID(),
        p_path: path,
        p_hash: image.hash,
        p_alt: data.alt,
        p_width: image.width,
        p_height: image.height,
        p_bytes: image.data.byteLength,
      });
      databaseError(registerError);
      return record;
    } finally {
      await client.storage.from("media-originals").remove([data.path]);
    }
  });
