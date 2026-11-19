import { createServerFn } from "@tanstack/react-start";
import { z } from "@/lib/validation";
const location = z.object({
  id: z.string().max(30),
  nombre: z.string().max(300),
  provincia: z.object({ id: z.string(), nombre: z.string() }).optional(),
});
export const georefSearch = createServerFn({ method: "GET" })
  .validator(
    z.object({
      province: z
        .string()
        .regex(/^\d{2}$/)
        .optional(),
      query: z.string().max(100).default(""),
    }),
  )
  .handler(async ({ data }) => {
    const { requireMember } = await import("./server/client");
    const { client } = await requireMember();
    const kind = data.province ? "city" : "province";
    const normalize = (v: string) =>
      v
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    try {
      const url = new URL(
        `https://apis.datos.gob.ar/georef/api/v2.0/${data.province ? "localidades" : "provincias"}`,
      );
      url.searchParams.set("max", data.province ? "50" : "100");
      url.searchParams.set("orden", "nombre");
      if (data.province) url.searchParams.set("provincia", data.province);
      if (data.query) url.searchParams.set("nombre", data.query);
      const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error();
      const body = await res.json();
      const rows = z
        .array(location)
        .max(100)
        .parse(body[data.province ? "localidades" : "provincias"]);
      const mapped = rows.map((r) => ({ id: r.id, name: r.nombre }));
      await client.rpc("cache_locations", { p_province: data.province ?? null, p_rows: mapped });
      return { rows: mapped, cached: false, unavailable: false };
    } catch {
      let q = client
        .from("georef_cache")
        .select("id,name")
        .eq("kind", kind)
        .order("name")
        .limit(100);
      if (data.province) q = q.eq("parent_id", data.province);
      if (data.query)
        q = q.ilike("normalized_name", `%${normalize(data.query).replace(/[%_]/g, "")}%`);
      const { data: rows } = await q;
      return { rows: rows ?? [], cached: true, unavailable: !rows?.length };
    }
  });
