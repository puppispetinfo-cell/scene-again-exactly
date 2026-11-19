import { createServerFn } from "@tanstack/react-start";
import { z } from "@/lib/validation";
import { kindSchema, schemas, propertyPublishSchema, catalogSchema } from "./contracts";
export const adminSession = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { requireMember } = await import("./server/client");
    const { user, role } = await requireMember();
    return { authenticated: true as const, email: user.email ?? "", role, configured: true };
  } catch {
    let configured = false;
    try {
      const { publicClient } = await import("./server/client");
      const { data, error } = await publicClient()
        .from("published_content")
        .select("id")
        .eq("kind", "settings")
        .eq("slug", "global")
        .maybeSingle();
      configured = Boolean(data && !error);
    } catch {}
    return { authenticated: false as const, email: "", role: "", configured };
  }
});
export const login = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email().max(254), password: z.string().min(8).max(200) }))
  .handler(async ({ data }) => {
    const { sessionClient, sameOrigin } = await import("./server/client");
    sameOrigin();
    const client = sessionClient();
    const { error } = await client.auth.signInWithPassword(data);
    if (error) throw new Error("No pudimos iniciar sesión. Revisá tus datos e intentá nuevamente.");
    return { ok: true };
  });
export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { sessionClient, sameOrigin } = await import("./server/client");
  sameOrigin();
  await sessionClient().auth.signOut();
  return { ok: true };
});
export const recover = createServerFn({ method: "POST" })
  .validator(z.string().email().max(254))
  .handler(async ({ data }) => {
    const { sessionClient, sameOrigin } = await import("./server/client");
    sameOrigin();
    await sessionClient().auth.resetPasswordForEmail(data, {
      redirectTo: `${process.env["APP_ORIGIN"]}/auth/callback`,
    });
    return {
      message: "Si la cuenta existe, recibirás las instrucciones para recuperar el acceso.",
    };
  });
export const adminList = createServerFn({ method: "GET" })
  .validator(
    z.object({
      kind: kindSchema,
      offset: z.number().int().min(0).max(100000).default(0),
      query: z.string().max(100).default(""),
    }),
  )
  .handler(async ({ data }) => {
    const { requireMember, databaseError } = await import("./server/client");
    const { client } = await requireMember();
    let query = client
      .from("content_drafts")
      .select("*", { count: "exact" })
      .eq("kind", data.kind)
      .order("updated_at", { ascending: false })
      .range(data.offset, data.offset + 24);
    if (data.query) query = query.ilike("document->>title", `%${data.query.replace(/[%_]/g, "")}%`);
    const { data: rows, error, count } = await query;
    databaseError(error);
    return { rows: rows ?? [], count: count ?? 0 };
  });
export const adminRead = createServerFn({ method: "GET" })
  .validator(z.string().uuid())
  .handler(async ({ data }) => {
    const { requireMember, databaseError } = await import("./server/client");
    const { client } = await requireMember();
    const { data: row, error } = await client
      .from("content_drafts")
      .select("*")
      .eq("id", data)
      .single();
    databaseError(error);
    return row;
  });
export const adminSave = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      kind: kindSchema,
      slug: z.string().max(160),
      document: z.unknown(),
      expected: z.number().int().min(0),
    }),
  )
  .handler(async ({ data }) => {
    const { requireMember, databaseError, sameOrigin } = await import("./server/client");
    sameOrigin();
    const { client } = await requireMember();
    const result = schemas[data.kind].safeParse(data.document);
    if (!result.success) {
      const names: Record<string, string> = {
        title: "título",
        name: "nombre",
        slug: "URL",
        price: "precio",
        images: "fotografías",
        seo: "información para buscadores",
        fields: "campos del formulario",
        whatsapp: "WhatsApp",
        email: "email",
        menu: "enlaces",
        theme: "colores",
        elements: "contenido de la página",
      };
      const fields = [
        ...new Set(
          result.error.issues.map((i) => names[String(i.path[0])] ?? "información ingresada"),
        ),
      ];
      throw new Error("Revisá " + fields.slice(0, 4).join(", ") + ". No se guardaron los cambios.");
    }
    const doc = result.data;
    const { data: row, error } = await client.rpc("save_content", {
      p_id: data.id,
      p_kind: data.kind,
      p_slug: data.slug,
      p_document: doc,
      p_expected: data.expected,
    });
    databaseError(error);
    return row;
  });
export const adminPublish = createServerFn({ method: "POST" })
  .validator(
    z.object({ id: z.string().uuid(), expected: z.number().int().min(1), publish: z.boolean() }),
  )
  .handler(async ({ data }) => {
    const { requireMember, databaseError, sameOrigin } = await import("./server/client");
    sameOrigin();
    const { client } = await requireMember();
    const { data: row, error: readError } = await client
      .from("content_drafts")
      .select("*")
      .eq("id", data.id)
      .single();
    databaseError(readError);
    if (data.publish) {
      if (row.kind === "property") {
        const result = propertyPublishSchema.safeParse(row.document);
        if (!result.success)
          throw new Error(
            "Para publicar, completá título, URL, tipo, operación, provincia, localidad, descripción y al menos una foto. Si informás un precio, debe ser mayor que cero.",
          );
      } else schemas[row.kind as keyof typeof schemas].parse(row.document);
    }
    const { error } = await client.rpc("publish_content", {
      p_id: data.id,
      p_expected: data.expected,
      p_publish: data.publish,
    });
    databaseError(error);
    return { ok: true };
  });
export const adminHistory = createServerFn({ method: "GET" })
  .validator(z.string().uuid())
  .handler(async ({ data }) => {
    const { requireMember, databaseError } = await import("./server/client");
    const { client } = await requireMember();
    const { data: rows, error } = await client
      .from("content_revisions")
      .select("*")
      .eq("resource_id", data)
      .order("revision", { ascending: false })
      .limit(30);
    databaseError(error);
    return rows ?? [];
  });
export const adminCatalogs = createServerFn({ method: "GET" }).handler(async () => {
  const { requireMember, databaseError } = await import("./server/client");
  const { client } = await requireMember();
  const { data, error } = await client
    .from("catalog_entries")
    .select("*")
    .order("sort_order")
    .limit(500);
  databaseError(error);
  return data ?? [];
});
export const adminSaveCatalog = createServerFn({ method: "POST" })
  .validator(
    z.object({ id: z.string().uuid(), document: catalogSchema, expected: z.number().int().min(0) }),
  )
  .handler(async ({ data }) => {
    const { requireMember, databaseError, sameOrigin } = await import("./server/client");
    sameOrigin();
    const { client } = await requireMember();
    const { error } = await client.rpc("save_catalog", {
      p_id: data.id,
      p_document: data.document,
      p_expected: data.expected,
    });
    databaseError(error);
    return { ok: true };
  });
export const adminLeads = createServerFn({ method: "GET" })
  .validator(z.number().int().min(0).max(100000).default(0))
  .handler(async ({ data: offset }) => {
    const { requireMember, databaseError } = await import("./server/client");
    const { client } = await requireMember();
    const { data, error, count } = await client
      .from("leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + 24);
    databaseError(error);
    return { rows: data ?? [], count: count ?? 0 };
  });
export const adminLeadStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["new", "contacted", "following", "closed", "discarded"]),
      notes: z.string().max(10000),
    }),
  )
  .handler(async ({ data }) => {
    const { requireMember, databaseError, sameOrigin } = await import("./server/client");
    sameOrigin();
    const { client } = await requireMember();
    const { error } = await client.rpc("update_lead", {
      p_id: data.id,
      p_status: data.status,
      p_notes: data.notes,
    });
    databaseError(error);
    return { ok: true };
  });
export const adminDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const { requireMember, databaseError } = await import("./server/client");
  const { client, role } = await requireMember();
  const count = async (table: string, kind?: string, status?: string) => {
    let q = client.from(table).select("id", { count: "exact", head: true });
    if (kind) q = q.eq("kind", kind);
    if (status) q = q.eq("status", status);
    const { count, error } = await q;
    databaseError(error);
    return count ?? 0;
  };
  const [total, published, drafts, archived, leads] = await Promise.all([
    count("content_drafts", "property"),
    count("content_drafts", "property", "published"),
    count("content_drafts", "property", "draft"),
    count("content_drafts", "property", "archived"),
    ["owner", "editor", "agent"].includes(role)
      ? count("leads", undefined, "new")
      : Promise.resolve(null),
  ]);
  const recentProperties = await client
    .from("content_drafts")
    .select("id,document,updated_at")
    .eq("kind", "property")
    .order("updated_at", { ascending: false })
    .limit(5);
  databaseError(recentProperties.error);
  const recentLeads = ["owner", "editor", "agent"].includes(role)
    ? await client
        .from("leads")
        .select("id,answers,status,created_at")
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [], error: null };
  databaseError(recentLeads.error);
  return {
    total,
    published,
    drafts,
    archived,
    leads,
    recentProperties: (recentProperties.data ?? []).map((r) => ({
      id: r.id,
      title: String(r.document.title ?? "Sin título"),
      updatedAt: r.updated_at,
    })),
    recentLeads: (recentLeads.data ?? []).map((r) => ({
      id: r.id,
      name: String(r.answers.name ?? "Consulta"),
      status: r.status,
      createdAt: r.created_at,
    })),
  };
});

export const updatePassword = createServerFn({ method: "POST" })
  .validator(z.string().min(12).max(200))
  .handler(async ({ data }) => {
    const { requireMember, sameOrigin } = await import("./server/client");
    sameOrigin();
    const { client } = await requireMember();
    const { error } = await client.auth.updateUser({ password: data });
    if (error) throw new Error("No se pudo actualizar la contraseña.");
    return { ok: true };
  });
export const adminMedia = createServerFn({ method: "GET" })
  .validator(z.number().int().min(0).max(10000))
  .handler(async ({ data: offset }) => {
    const { requireMember, databaseError } = await import("./server/client");
    const { client } = await requireMember();
    const { data, error } = await client
      .from("media_assets")
      .select("id,alt,width,height,object_path,bytes")
      .order("created_at", { ascending: false })
      .range(offset, offset + 23);
    databaseError(error);
    return (data ?? []).map((m) => ({
      id: m.id,
      alt: m.alt,
      width: m.width,
      height: m.height,
      src: m.object_path.startsWith("approved/")
        ? "/media/" + m.object_path.slice(9)
        : "/api/media/" + m.id,
    }));
  });
export const adminPrivacyPolicies = createServerFn({ method: "GET" }).handler(async () => {
  const { requireMember, publicClient, databaseError } = await import("./server/client");
  await requireMember();
  const { data, error } = await publicClient()
    .from("published_content")
    .select("id,revision,document")
    .eq("kind", "page")
    .eq("slug", "privacidad");
  databaseError(error);
  return (data ?? [])
    .filter((p) => p.document.reviewApproved)
    .map((p) => ({
      value: `${p.id}:${p.revision}`,
      label: `${p.document.title} · versión ${p.revision}`,
    }));
});

export const exportLeads = createServerFn({ method: "POST" }).handler(async () => {
  const { requireMember, sameOrigin, databaseError } = await import("./server/client");
  sameOrigin();
  const { client, role } = await requireMember();
  if (role !== "owner") throw new Error("La exportación requiere permiso de propietario.");
  const { data, error } = await client
    .from("leads")
    .select("created_at,status,answers")
    .order("created_at", { ascending: false })
    .limit(501);
  databaseError(error);
  if ((data?.length ?? 0) > 500)
    throw new Error(
      "La exportación supera 500 consultas. Solicitá una exportación operativa por rango de fechas.",
    );
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const rows = (data ?? []).map((r) =>
    [r.created_at, r.status, r.answers.name, r.answers.phone, r.answers.email, r.answers.message]
      .map(cell)
      .join(","),
  );
  return "\ufeff" + ["Fecha,Estado,Nombre,Teléfono,Email,Mensaje", ...rows].join("\r\n");
});
