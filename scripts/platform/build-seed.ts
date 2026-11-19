import { defaultFilters } from "../../src/core/filter-definitions";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  catalogSchema,
  pageSchema,
  settingsSchema,
  formSchema,
  marketingSchema,
  teamSchema,
  elementSchema,
} from "../../src/platform/contracts";
const source = JSON.parse(readFileSync(process.argv[2] ?? "config/clients/rivton.json", "utf8"));
const approved = source.approved_business_data;
if (
  !approved ||
  approved.commercial_name !== "RIVTON Group" ||
  approved.contact.whatsapp_e164_digits !== "5493513437509"
)
  throw new Error("El relevamiento no coincide con los datos confirmados.");
const id = (value: string) => {
  const h = createHash("sha256").update(`rivton-v1:${value}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const sql = (v: unknown) => `'${JSON.stringify(v).replaceAll("'", "''")}'::jsonb`;
const quote = (v: string) => `'${v.replaceAll("'", "''")}'`;
const statements = [
  "-- Generated from confirmed intake. Idempotent: existing documents are never overwritten.",
];
const report: { confirmed: string[]; proposed: string[]; pending: string[]; properties: number } = {
  confirmed: [],
  proposed: [],
  pending: source.pending_or_not_confirmed,
  properties: 0,
};
const media: Record<string, any> = {};
mkdirSync("public/media", { recursive: true });
for (const name of [
  "hero-house",
  "interior-living",
  "terrace-garden",
  "architecture-strip",
  "team",
]) {
  const file = `${name}.jpg`,
    input = readFileSync(`src/assets/${file}`),
    info = await sharp(input).metadata(),
    assetId = id(`media-${name}`);
  copyFileSync(`src/assets/${file}`, `public/media/${file}`);
  media[name] = {
    id: assetId,
    src: `/media/${file}`,
    alt: (
      {
        "hero-house": "Casa contemporánea con grandes ventanales",
        "interior-living": "Interior residencial luminoso",
        "terrace-garden": "Terraza residencial abierta al jardín y la piscina",
        "architecture-strip": "Arquitectura contemporánea",
        team: "Imagen institucional de RIVTON Group",
      } as Record<string, string>
    )[name],
    width: info.width!,
    height: info.height!,
  };
  statements.push(
    `insert into public.media_assets(id,object_path,hash,alt,width,height,bytes)values(${quote(assetId)},${quote("approved/" + file)},${quote(createHash("sha256").update(input).digest("hex"))},${quote(media[name].alt)},${info.width},${info.height},${input.length})on conflict(id)do nothing;`,
  );
}
const document = (
  kind: string,
  slug: string,
  value: unknown,
  publish = false,
  confirmed = false,
) => {
  const resource = id(`${kind}-${slug}`);
  statements.push(
    `insert into public.content_drafts(id,kind,slug,document)values(${quote(resource)},${quote(kind)},${quote(slug)},${sql(value)})on conflict(id)do nothing;`,
  );
  statements.push(
    `insert into public.content_revisions(resource_id,revision,document,status)select id,revision,document,status from public.content_drafts where id=${quote(resource)} and revision=1 on conflict(resource_id,revision)do nothing;`,
  );
  if (publish) {
    statements.push(
      `insert into public.published_content(id,kind,slug,document,revision)select id,kind,slug,document,revision from public.content_drafts where id=${quote(resource)} and revision=1 and status='draft' on conflict(id)do nothing;`,
    );
    statements.push(
      `update public.content_drafts set status='published' where id=${quote(resource)} and revision=1 and exists(select 1 from public.published_content where id=${quote(resource)});`,
    );
  }
  report[confirmed ? "confirmed" : "proposed"].push(`${kind}:${slug}`);
};
const catalog = (
  kind: "type" | "operation" | "attribute",
  label: string,
  slug: string,
  valueType: any = "boolean",
  order = 0,
) => {
  const definition = catalogSchema.parse({
    kind,
    label,
    slug,
    active: true,
    order,
    valueType,
    options: [],
    filterVisible: true,
    cardVisible: true,
  });
  statements.push(
    `insert into public.catalog_entries(id,kind,slug,label,sort_order,definition)values(${quote(id("catalog-" + kind + "-" + slug))},${quote(kind)},${quote(slug)},${quote(label)},${order},${sql(definition)})on conflict(kind,slug)do nothing;`,
  );
};
[
  ["Casa", "casa"],
  ["Departamento", "departamento"],
  ["Chalet", "chalet"],
  ["PH", "ph"],
  ["Dúplex", "duplex"],
  ["Terreno", "terreno"],
  ["Lote", "lote"],
  ["Galpón", "galpon"],
  ["Local comercial", "local"],
  ["Oficina", "oficina"],
  ["Fondo de comercio", "fondo-de-comercio"],
  ["Cochera", "cochera"],
  ["Complejo", "complejo"],
  ["Desarrollo inmobiliario", "desarrollo"],
].forEach(([label, slug], i) => catalog("type", label!, slug!, "boolean", i));
catalog("operation", "Venta", "venta");
catalog("operation", "Alquiler", "alquiler", "boolean", 1);
const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
[
  "Dormitorios",
  "Baños",
  "Ambientes",
  "Cocheras",
  "Superficie cubierta",
  "Superficie total",
  "Superficie del terreno",
  "Antigüedad",
].forEach((label, i) => catalog("attribute", label, slugify(label), "number", i));
[
  "Pileta",
  "Quincho",
  "Parrilla",
  "Jardín",
  "Patio",
  "Terraza",
  "Balcón",
  "SUM",
  "Gimnasio",
  "Seguridad",
  "Portería",
  "Ascensor",
  "Aire acondicionado",
  "Calefacción",
  "Amoblado",
  "Apto profesional",
  "Apto mascotas",
  "Accesibilidad",
  "Escritura",
  "Servicios básicos",
].forEach((label, i) => catalog("attribute", label, slugify(label), "boolean", i + 10));
const config = settingsSchema.parse({
  name: approved.commercial_name,
  whatsapp: approved.contact.whatsapp_e164_digits,
  email: approved.contact.public_email,
  address: "Luis José de Tejeda 3883, local A, Córdoba Capital, Argentina.",
  hours: approved.contact.hours,
  instagram: approved.contact.instagram,
  temporariesUrl: "https://www.tempohogar.com.ar/",
  footerText: "Propiedades con criterio, en Córdoba.",
  presentation:
    "Conectamos personas con oportunidades inmobiliarias, ofreciendo confianza, compromiso y soluciones a medida en cada operación.",
  history: "RIVTON Group nace de la fusión de dos empresas amigas, el 03/11/2025.",
  services: approved.services,
  values: approved.values,
  coverage: approved.coverage,
  whatsappTemplate: "Hola, quisiera consultar por la propiedad {title} (código {code}). {url}",
  menu: [
    { label: "Explorar propiedades", href: "/propiedades" },
    { label: "Favoritos", href: "/favoritos" },
    { label: "Publicá tu propiedad", href: "/publicar" },
    { label: "Nosotros", href: "/nosotros" },
    { label: "Contacto", href: "/contacto" },
    { label: "Temporarios", href: "https://www.tempohogar.com.ar/" },
  ],
  filters: defaultFilters.map((f) => ({
    key: f.key,
    label: f.label,
    visible: f.visible,
    order: f.order,
  })),
  theme: { colors: {} },
});
document("settings", "global", config, true, true);
const element = (
  key: string,
  label: string,
  title: string,
  subtitle = "",
  body = "",
  image?: any,
  button?: any,
) =>
  elementSchema.parse({
    id: key,
    label,
    title,
    subtitle,
    body,
    ...(image ? { image } : {}),
    ...(button ? { button } : {}),
  });
const seo = (title: string, description: string) => ({
  title,
  description,
  index: true,
  manual: false,
});
function approvedSlots(slug: string, elements: any[]) {
  return elements.map((e) => {
    if (slug === "/") {
      const labels: Record<string, string> = {
        "scene-1": "RIVTON Group · Córdoba",
        "scene-2": "RIVTON · Espacios para vivir",
        "scene-3": "RIVTON · Vivir al aire libre",
      };
      const subtitles: Record<string, string> = {
        featured: "Selección",
        categories: "Explorar",
        latest: "Novedades",
        publish: "Publicá con nosotros",
        team: "Nosotros",
      };
      return {
        ...e,
        ...(labels[e.id] ? { body: labels[e.id] } : {}),
        ...(subtitles[e.id] ? { subtitle: subtitles[e.id] } : {}),
        ...(e.id === "categories"
          ? { categoryIds: ["casa", "departamento", "terreno"].map((s) => id("catalog-type-" + s)) }
          : {}),
        ...(e.id === "latest" ? { button: { label: "Ver todas", href: "/propiedades" } } : {}),
      };
    }
    if (slug === "propiedades" && e.id === "heading") return { ...e, subtitle: "Explorar" };
    if (slug === "favoritos" && e.id === "heading") return { ...e, subtitle: "Tu selección" };
    if (slug === "ficha" && e.id === "contact")
      return { ...e, button: { label: "Consultar", href: "/contacto" } };
    return e;
  });
}
const page = (slug: string, title: string, elements: any[], publish = true) =>
  document(
    "page",
    slug,
    pageSchema.parse({
      slug,
      title,
      elements: approvedSlots(slug, elements),
      seo: seo(
        `${title} — RIVTON Group`,
        slug === "/"
          ? "Comprá o alquilá casas y departamentos en Córdoba con RIVTON Group. Propiedades seleccionadas y asesoramiento profesional."
          : `${title} de RIVTON Group, inmobiliaria en Córdoba.`,
      ),
    }),
    publish,
    publish,
  );
page("/", "Inicio", [
  element(
    "scene-1",
    "Escena de scroll 1",
    "Encontrá\ntu propiedad.",
    "Propiedades seleccionadas para cada etapa de tu vida.",
    "",
    media["hero-house"],
  ),
  element(
    "scene-2",
    "Escena de scroll 2",
    "Otra forma\nde habitar.",
    "Espacios que se sienten propios.\nDesde el primer momento.",
    "",
    media["interior-living"],
    { label: "Encontrá tu lugar", href: "/propiedades" },
  ),
  element(
    "scene-3",
    "Escena de scroll 3",
    "Tu espacio.\nTu próxima etapa.",
    "Un lugar para disfrutar.\nUna nueva forma de vivir.",
    "",
    media["terrace-garden"],
    { label: "Explorar propiedades", href: "/propiedades" },
  ),
  element("featured", "Propiedades destacadas", "Propiedades destacadas"),
  element("categories", "Categorías de inmuebles", "¿Qué estás buscando?"),
  element("latest", "Novedades", "Últimas incorporadas"),
  element(
    "publish",
    "Publicá tu propiedad",
    "Tu propiedad merece una estrategia a su altura.",
    "",
    "",
    media["architecture-strip"],
    { label: "Publicá tu propiedad", href: "/publicar" },
  ),
  element(
    "team",
    "Nosotros",
    "Conocé RIVTON Group.",
    "",
    "Somos un equipo de profesionales dedicados a la comercialización de propiedades en Córdoba, con una mirada cercana y estratégica en cada operación.",
    media.team,
    { label: "Conocé nuestra historia", href: "/nosotros" },
  ),
]);
page("nosotros", "Nosotros", [
  element(
    "about",
    "Presentación institucional",
    "Conocé RIVTON Group.",
    "",
    "Somos un equipo de profesionales dedicados a la comercialización de propiedades en Córdoba, con una mirada cercana y estratégica en cada operación.",
    media.team,
    { label: "Hablemos", href: "/contacto" },
  ),
]);
page("contacto", "Contacto", [
  element(
    "heading",
    "Encabezado",
    "Hablemos.",
    "",
    "Contanos qué estás buscando y te respondemos a la brevedad.",
  ),
]);
page("publicar", "Publicá tu propiedad", [
  element(
    "heading",
    "Encabezado",
    "Publicá tu propiedad.",
    "",
    "Te acompañamos para que tu inmueble llegue a las personas indicadas, con la experiencia y el respaldo de RIVTON Group.",
    media["architecture-strip"],
  ),
]);
page("propiedades", "Propiedades", [element("heading", "Encabezado", "Propiedades")]);
page("ficha", "Ficha de propiedad", [
  element("contact", "Consulta", "Consultá por esta propiedad"),
]);
page("favoritos", "Favoritos", [
  element("heading", "Encabezado", "Favoritos", "", "Guardadas en este dispositivo."),
]);
const faqs = [
  [
    "Cómo consultar una propiedad",
    "Usá el botón de consulta de la ficha o escribinos por WhatsApp al +54 9 351 3437509. Indicá el nombre o código de la propiedad para que podamos identificarla.",
  ],
  [
    "Cómo coordinar una visita",
    "Contactá a RIVTON por WhatsApp. El equipo confirmará la disponibilidad del inmueble y acordará el día y horario. Abrir el enlace de contacto no confirma una visita.",
  ],
  [
    "Cómo publicar una propiedad",
    "Completá el formulario Publicá tu propiedad con la información del inmueble. El equipo te orientará sobre los próximos pasos y la documentación necesaria.",
  ],
  [
    "Cómo solicitar una tasación",
    "Escribinos con la ubicación y las características del inmueble. Los alcances del servicio y cualquier condición comercial se acuerdan directamente con el equipo.",
  ],
  [
    "Cómo consultar por alquileres",
    "Buscá la operación Alquiler y consultá por el inmueble que te interese. La disponibilidad y los requisitos se confirman para cada caso.",
  ],
  [
    "Cómo consultar por una compra",
    "Elegí una propiedad y envianos tu consulta. Podés indicar la zona, el tipo de inmueble y tus necesidades para recibir orientación.",
  ],
  [
    "Qué documentación se solicita",
    "La documentación depende de la operación y de las circunstancias del inmueble y de las partes. Solicitá al equipo el detalle aplicable antes de avanzar.",
  ],
  [
    "Cómo contactar a RIVTON",
    "Podés escribir a rivtongroup@gmail.com o por WhatsApp al +54 9 351 3437509. Atendemos de lunes a viernes de 8:30 a 18:00.",
  ],
];
page(
  "preguntas-frecuentes",
  "Preguntas frecuentes",
  faqs.map(([q, a], i) => element(`faq-${i + 1}`, q!, q!, "", a!)),
  false,
);
for (const name of approved.team_names)
  document("team", slugify(name), teamSchema.parse({ name }), false, true);
const field = (id: string, label: string, type: string, required = true) => ({
  id,
  label,
  type,
  required,
  help: "",
  options: [],
});
const baseFields = [
  field("name", "Nombre y apellido", "name"),
  field("email", "Email", "email"),
  field("phone", "Teléfono", "phone", false),
  field("message", "Mensaje", "textarea"),
  field("consent", "Acepto el tratamiento de mis datos según la política de privacidad", "consent"),
];
for (const [slug, name] of [
  ["contacto", "Contacto"],
  ["consulta-propiedad", "Consulta de propiedad"],
  ["publicar", "Solicitud de publicación"],
]) {
  let fields = [...baseFields];
  if (slug === "publicar")
    fields = [
      field("name", "Nombre y apellido", "name"),
      field("phone", "WhatsApp", "phone"),
      field("email", "Email", "email"),
      field("property_type", "Tipo de inmueble", "select"),
      field("location", "Ubicación", "text"),
      field("operation", "Operación", "select"),
      field("description", "Descripción", "textarea"),
      field(
        "consent",
        "Acepto el tratamiento de mis datos según la política de privacidad",
        "consent",
      ),
    ];
  document(
    "form",
    slug!,
    formSchema.parse({
      name,
      active: false,
      fields,
      storeLead: false,
      whatsapp: true,
      emailEnabled: false,
      recipient: "rivtongroup@gmail.com",
      privacyApproved: false,
      privacyRevision: "",
      successMessage:
        "Se abrirá WhatsApp con tu consulta preparada. Revisá el mensaje y envialo para contactar a RIVTON.",
    }),
    false,
    true,
  );
}
document(
  "marketing",
  "global",
  marketingSchema.parse({
    mode: "gtm",
    gtm: { enabled: false, id: "" },
    ga4: { enabled: false, id: "" },
    meta: { enabled: false, id: "" },
    ads: { enabled: false, id: "" },
    adsLabels: {},
    consentRequired: true,
  }),
  false,
  true,
);
const legal: Record<string, [string, string]> = {
  privacidad: [
    "Política de privacidad",
    `BORRADOR PARA REVISIÓN. Pendientes: identidad y domicilio legal del responsable, CUIT si corresponde, plazos de conservación, proveedores efectivos, transferencias internacionales, inscripción de bases cuando corresponda y procedimiento interno de derechos.\n\nRIVTON Group informa sobre el tratamiento de datos que se realice mediante este sitio. El canal de consulta es rivtongroup@gmail.com; la oficina comercial informada se encuentra en Luis José de Tejeda 3883, local A, Córdoba Capital, Argentina. La identificación jurídica del responsable debe confirmarse antes de publicar.\n\nLos formularios pueden solicitar nombre, teléfono, email, mensaje y datos del inmueble para responder consultas, coordinar conversaciones y evaluar solicitudes de comercialización. No se solicitan datos sensibles ni documentación personal en los campos generales. Los campos obligatorios deben identificarse; los opcionales pueden omitirse.\n\nEl almacenamiento de consultas permanece desactivado hasta aprobar la finalidad, la base jurídica y la información al titular. Cuando se habilite, el acceso estará limitado al personal autorizado. Deben establecerse plazos concretos de conservación y eliminación, incluyendo copias de seguridad. No se utilizarán consultas para publicidad distinta de la finalidad informada sin la autorización que corresponda.\n\nSi el visitante elige continuar por WhatsApp, se abrirá un servicio externo con un mensaje que podrá revisar antes de enviarlo. Esta acción se rige también por las condiciones y prácticas del proveedor elegido. Abrir el enlace no acredita recepción de un mensaje por RIVTON.\n\nLas personas titulares pueden solicitar información, acceso, rectificación, actualización o supresión de sus datos y presentar reclamos ante la Agencia de Acceso a la Información Pública. RIVTON deberá verificar la identidad de manera proporcionada y responder conforme a los plazos legales aplicables.\n\nLas medidas de seguridad reducen riesgos, sin garantizar inmunidad absoluta. Cualquier cambio relevante de finalidad o proveedores exige revisar este documento y los consentimientos. La fecha de entrada en vigencia se completará tras la aprobación.`,
  ],
  cookies: [
    "Política de cookies",
    `BORRADOR PARA REVISIÓN. Pendientes: inventario real de cookies, duraciones, proveedores, base jurídica y transferencias.\n\nEste sitio distingue tecnologías necesarias para iniciar sesión, proteger formularios y conservar preferencias, de tecnologías de analítica o publicidad. Estas últimas se mantienen bloqueadas hasta contar con la autorización o fundamento aplicable.\n\nEl visitante podrá aceptar o rechazar categorías no esenciales y modificar posteriormente su preferencia. El rechazo no debe impedir consultar el catálogo público. La elección se conservará en el dispositivo por un plazo que debe definirse y comunicarse.\n\nLos identificadores de medición no activan por sí solos una integración. Antes de habilitarla se verificará qué información se transmite, con qué finalidad y a qué destinatarios. No se incluirán mensajes de formularios, teléfonos ni emails en eventos o URLs de medición.\n\nLos favoritos se conservan localmente en el dispositivo. Los enlaces externos, incluidos WhatsApp y alojamientos temporarios, tienen políticas propias. El navegador permite borrar o restringir cookies, aunque algunas funciones necesarias pueden dejar de operar.\n\nLas consultas pueden dirigirse a rivtongroup@gmail.com. El inventario definitivo deberá reflejar las tecnologías realmente configuradas y su revisión deberá acompañar cada cambio relevante.`,
  ],
  terminos: [
    "Términos y condiciones",
    `BORRADOR PARA REVISIÓN. Pendientes: razón social o responsable legal, CUIT, matrícula profesional, domicilio legal y condiciones comerciales aplicables.\n\nEl sitio de RIVTON Group ofrece información sobre inmuebles y canales de contacto en la provincia de Córdoba. La información no constituye por sí sola una reserva, aceptación contractual, garantía de disponibilidad ni asesoramiento jurídico individual.\n\nLos precios, superficies, características, fotografías y estados deberán verificarse con el equipo para cada operación. La moneda se identifica en cada publicación y no se convierte automáticamente. Si la ficha indica precio a consultar, el importe debe solicitarse al equipo.\n\nUna consulta por formulario o WhatsApp no perfecciona una compraventa, alquiler ni encargo de comercialización. Las visitas requieren confirmación expresa. Los honorarios, gastos, documentación y demás condiciones se informan y acuerdan en la instancia correspondiente; este documento no fija valores no confirmados.\n\nQuien solicita publicar un inmueble debe estar autorizado para aportar su información y materiales. El equipo podrá revisar datos y requerir documentación por canales adecuados antes de comercializarlo. No deben enviarse archivos ilícitos, datos sensibles innecesarios ni contenidos que infrinjan derechos de terceros.\n\nNo se autoriza interferir con el sitio, extraer datos personales, intentar accesos privados ni utilizar formularios para spam. Los enlaces a terceros se identifican como externos y no implican que RIVTON controle sus servicios.\n\nSe procurará mantener el sitio disponible y actualizado, sin garantizar ausencia absoluta de errores o interrupciones. La revisión jurídica deberá determinar las condiciones de responsabilidad y solución de controversias que correspondan sin limitar derechos obligatorios. Contacto: rivtongroup@gmail.com.`,
  ],
};
for (const [slug, [title, body]] of Object.entries(legal))
  page(slug, title, [element("legal", "Texto legal", title, "", body)], false);
mkdirSync("docs/platform/evidence", { recursive: true });
writeFileSync(
  "docs/platform/intake-report.json",
  JSON.stringify(
    {
      ...report,
      source: source.source,
      discrepancies: [
        "La dirección se amplía con localidad, provincia y país confirmados en las instrucciones.",
        "El catálogo inicial incorpora tipos adicionales requeridos por la nueva plataforma; son editables.",
        "No se migraron cambios posteriores de WordPress ni se consultaron borradores privados.",
      ],
    },
    null,
    2,
  ) + "\n",
);
writeFileSync(
  "supabase/migrations/20261119134210_rivton_initial_profile.sql",
  statements.join("\n") + "\n",
);
console.log(
  `Prepared ${report.confirmed.length} confirmed and ${report.proposed.length} proposed records; 0 properties.`,
);
