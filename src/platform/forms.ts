import { createServerFn } from "@tanstack/react-start";
import { z } from "@/lib/validation";
import { formSchema, settingsSchema } from "./contracts";
export const submitForm = createServerFn({ method: "POST" })
  .validator(
    z.object({
      formId: z.string().uuid(),
      answers: z.record(z.string(), z.union([z.string().max(2000), z.boolean()])),
      key: z.string().uuid(),
      propertyId: z.string().uuid().nullable(),
      path: z
        .string()
        .regex(/^\/[^?]*$/)
        .max(300),
      honeypot: z.literal(""),
    }),
  )
  .handler(async ({ data }) => {
    const { publicClient, sameOrigin } = await import("./server/client");
    sameOrigin();
    const client = publicClient();
    const { data: row } = await client
      .from("published_content")
      .select("document")
      .eq("id", data.formId)
      .eq("kind", "form")
      .single();
    if (!row) throw new Error("Este formulario no está disponible.");
    const form = formSchema.parse({ ...row.document, recipient: "" });
    if (
      !form.active ||
      !form.privacyApproved ||
      !form.privacyRevision ||
      data.answers["consent"] !== true
    )
      throw new Error("Revisá la autorización de privacidad antes de continuar.");
    for (const field of form.fields) {
      const value = data.answers[field.id];
      if (field.required && (!value || (typeof value === "string" && !value.trim())))
        throw new Error(`Completá ${field.label}.`);
      if (field.type === "email" && value && !z.string().email().safeParse(value).success)
        throw new Error("Ingresá un email válido.");
      if (
        field.type === "select" &&
        value &&
        field.options.length &&
        !field.options.includes(String(value))
      )
        throw new Error("Elegí una opción válida.");
    }
    const { data: receipt, error } = await client.rpc("submit_form", {
      p_form: data.formId,
      p_answers: data.answers,
      p_key: data.key,
      p_property: data.propertyId,
      p_path: data.path,
    });
    if (error)
      throw new Error("No pudimos completar la consulta. Verificá los campos o intentá más tarde.");
    let whatsapp: string | null = null;
    if (form.whatsapp) {
      const { data: settings } = await client
        .from("published_content")
        .select("document")
        .eq("kind", "settings")
        .eq("slug", "global")
        .single();
      if (settings) {
        const config = settingsSchema.parse(settings.document);
        const message = form.fields
          .filter((f) => !["consent", "checkbox"].includes(f.type) && data.answers[f.id])
          .map((f) => `${f.label}: ${data.answers[f.id]}`)
          .join("\n");
        whatsapp = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(message)}`;
      }
    }
    return {
      stored: receipt.stored === true,
      whatsapp,
      message: form.successMessage,
      emailSent: false,
      duplicate: receipt.duplicate === true,
    };
  });
