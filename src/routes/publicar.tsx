import { EditableImage, EditableText } from "@/platform/editable";
import { pageSEO } from "@/platform/seo";
import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/site";
import { LeadForm } from "@/components/lead-form";
import strip from "@/assets/architecture-strip.jpg";

export const Route = createFileRoute("/publicar")({
  head: ({ matches }) =>
    pageSEO(matches, "publicar") ?? {
      meta: [
        { title: "Publicá tu propiedad — RIVTON Group" },
        {
          name: "description",
          content: "Vendé o alquilá tu inmueble con la estrategia y el respaldo de RIVTON Group.",
        },
        { property: "og:title", content: "Publicá tu propiedad — RIVTON Group" },
        {
          property: "og:description",
          content: "Te acompañamos para que tu inmueble llegue a las personas indicadas.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    },
  component: Publish,
});

function Publish() {
  return (
    <div className="lg:grid lg:grid-cols-2">
      <div>
        <PageTitle
          eyebrow="Propietarios"
          title={
            <EditableText
              page="publicar"
              id="heading"
              field="title"
              fallback="Publicá tu propiedad."
            />
          }
        >
          <EditableText
            page="publicar"
            id="heading"
            field="body"
            fallback="Te acompañamos para que tu inmueble llegue a las personas indicadas, con la experiencia y el respaldo de RIVTON Group."
          />
        </PageTitle>
        <div className="mx-auto max-w-7xl px-5 pb-16 lg:px-8">
          <LeadForm
            purpose="publicar"
            submitLabel="Enviar solicitud"
            fields={[
              { name: "nombre", label: "Nombre y apellido", required: true },
              { name: "telefono", label: "Teléfono", type: "tel", required: true },
              { name: "email", label: "Email", type: "email", required: true },
              {
                name: "tipo",
                label: "Tipo de inmueble",
                type: "select",
                options: ["Casa", "Departamento", "Terreno", "Local", "Oficina"],
                required: true,
              },
              {
                name: "operacion",
                label: "Operación",
                type: "select",
                options: ["Venta", "Alquiler"],
                required: true,
              },
              { name: "ubicacion", label: "Ubicación", required: true },
              { name: "mensaje", label: "Comentarios", type: "textarea" },
            ]}
          />
        </div>
      </div>
      <EditableImage
        page="publicar"
        id="heading"
        fallback={strip}
        alt="Arquitectura contemporánea"
        className="hidden h-full w-full object-cover lg:block"
      />
    </div>
  );
}
