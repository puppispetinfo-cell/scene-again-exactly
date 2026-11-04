(() => {
  "use strict";
  const cfg = window.EstateCoreAdmin,
    root = document.getElementById("estate-core-admin");
  if (!cfg || !root) return;
  const labels = {
    property: "Propiedades",
    page: "Páginas",
    category: "Categorías y zonas",
    feature: "Características",
    configuration: "Configuración global",
    lead: "Consultas",
    title: "Título",
    description: "Descripción",
    slug: "Slug",
    code: "Código",
    operation: "Operación",
    type: "Tipo / familia compatible",
    price: "Precio (desactivar: a consultar)",
    amount: "Importe",
    currency: "Moneda",
    bedrooms: "Dormitorios",
    bathrooms: "Baños",
    lotArea: "Terreno m²",
    coveredArea: "Cubiertos m²",
    images: "Galería (primera: principal)",
    featured: "Destacada",
    featuredOrder: "Orden de destacada",
    location: "Dirección y ubicación",
    categoryIds: "Categorías: IDs estables",
    featureIds: "Características: IDs estables",
    seo: "SEO",
    sections: "Secciones",
    visible: "Visible",
    order: "Orden",
    responsive: "Responsive",
    mobile: "Mobile",
    desktop: "Desktop",
    content: "Contenido",
    actions: "Enlaces y CTA",
    media: "Multimedia",
    site: "Identidad y contacto",
    theme: "Tokens visuales",
    menus: "Navegación",
    filters: "Buscador y filtros",
    integrations: "Integraciones (solo identificadores públicos)",
    chrome: "Header / navegación mobile / footer",
    src: "URL multimedia",
    alt: "Texto alternativo",
    name: "Nombre",
    label: "Texto",
    href: "Destino",
    newWindow: "Abrir en otra pestaña",
    icon: "Icono permitido",
    logo: "Logo principal",
    alternateLogo: "Logo alternativo",
    favicon: "Favicon",
    calendly: "Calendly",
    status: "Estado comercial",
    legalPageIds: "IDs de páginas legales aprobadas",
  };
  Object.assign(labels, {
    propertyTypeId: "Tipo de inmueble",
    legacyType: "Familia compatible para URLs existentes",
    colors: "Colores",
    fonts: "Tipografías",
    sans: "Fuente de texto",
    display: "Fuente de títulos",
    weights: "Pesos disponibles",
    radius: "Radio",
    contentWidth: "Ancho máximo",
    spacingScale: "Escala de espacios",
    headingScale: "Escala de títulos",
    bodyScale: "Escala de textos",
    glassBlur: "Desenfoque glass",
    buttons: "Botones",
    height: "Altura",
    width: "Ancho",
    sectionColors: "Colores por sección",
    canonical: "Canonical",
    index: "Indexar",
    follow: "Seguir enlaces",
    structuredData: "Datos estructurados por referencia",
    sourceIds: "IDs de fuentes verificadas",
    openGraph: "Open Graph",
    footerText: "Texto del footer",
    headerHeight: "Altura del header",
    headerRadius: "Radio del header",
    dockRadius: "Radio de navegación inferior",
    menuRadius: "Radio del menú mobile",
    footerColumns: "Columnas del footer",
    phone: "Teléfono",
    email: "Email",
    address: "Dirección",
    team: "Contenido institucional",
    body: "Texto",
    placeholder: "Texto de ayuda",
    presentation: "Presentación",
    options: "Opciones",
    value: "Valor",
    kind: "Clase de categoría",
  });
  const plural = {
    property: "properties",
    page: "pages",
    category: "categories",
    feature: "features",
    lead: "leads",
  };
  let model, kind, etag, currentId, recordStatus, notice;
  let references = { categories: [], features: [] };
  const normalizeOrder = (list) =>
    list.forEach((item, i) => {
      if (item && typeof item === "object" && Object.hasOwn(item, "order")) item.order = i;
    });
  const el = (tag, text, attrs = {}) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  };
  const button = (text, action) => {
    const b = el("button", text, { type: "button", class: "button" });
    b.addEventListener("click", () =>
      Promise.resolve()
        .then(action)
        .catch((error) => message(error.message, true)),
    );
    return b;
  };
  function message(text, error = false) {
    notice.textContent = text;
    notice.className = error ? "notice notice-error" : "notice notice-success";
    notice.setAttribute("role", error ? "alert" : "status");
  }
  async function request(path, method = "GET", body, match) {
    const headers = { "X-WP-Nonce": cfg.nonce };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (match) headers["If-Match"] = match;
    const r = await fetch(cfg.api + path, {
      method,
      credentials: "same-origin",
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || "Error de API");
    return { data, etag: r.headers.get("ETag") };
  }
  const schemas = {
    property: "propertySchema",
    page: "pageDefinitionSchema",
    category: "propertyCategorySchema",
    feature: "propertyFeatureSchema",
    configuration: "configurationSchema",
  };
  function initial(s, key = "") {
    if (s.default !== undefined) return structuredClone(s.default);
    if (s.const !== undefined) return s.const;
    if (s.anyOf) {
      const candidate =
        s.anyOf.find((v) => v.type === "object") ||
        s.anyOf.find((v) => v.type !== "null") ||
        s.anyOf[0];
      return initial(candidate, key);
    }
    if (s.enum) return s.enum[0];
    if (s.type === "object") {
      const out = {};
      for (const k of s.required || []) out[k] = initial(s.properties?.[k] || {}, k);
      return out;
    }
    if (s.type === "array") return [];
    if (s.type === "boolean") return true;
    if (s.type === "number" || s.type === "integer") return s.minimum || 0;
    if (key === "id") return crypto.randomUUID();
    if (key === "schemaVersion") return 1;
    if (key === "publishedAt") return new Date().toISOString().slice(0, 10);
    if (key === "updatedAt") return new Date().toISOString();
    return "";
  }
  function field(s, value, assign, key, path, required = true) {
    const wrap = el("div", undefined, { class: "estate-field" });
    const title = labels[key] || key;
    if (["id", "schemaVersion", "revision", "extensions"].includes(key)) {
      if (key === "id") wrap.append(el("small", `ID: ${value || "se generará al guardar"}`));
      return wrap;
    }
    if (s.anyOf) {
      const nullable = s.anyOf.some((v) => v.type === "null"),
        actual = s.anyOf.find((v) => v.type !== "null");
      if (nullable) {
        const toggle = el("input", undefined, { type: "checkbox", "aria-label": title });
        toggle.checked = value !== null;
        const line = el("label", title);
        line.prepend(toggle);
        wrap.append(line);
        toggle.onchange = () => {
          assign(toggle.checked ? initial(actual, key) : null);
          renderEditor();
        };
        if (value === null) return wrap;
        return append(wrap, field(actual, value, assign, key, path));
      }
      return field(actual, value, assign, key, path, required);
    }
    if (!required && value === undefined) {
      wrap.append(
        button(`Agregar ${title}`, () => {
          assign(initial(s, key));
          renderEditor();
        }),
      );
      return wrap;
    }
    if (s.type === "object") {
      const details = el("details");
      details.dataset.estatePath = path;
      details.open = ["property", "page", "configuration"].includes(key);
      details.append(el("summary", title));
      const object = value || {};
      for (const [child, definition] of Object.entries(s.properties || {})) {
        const row = field(
          definition,
          object[child],
          (v) => {
            if (v === undefined) delete object[child];
            else object[child] = v;
            assign(object);
          },
          child,
          `${path}.${child}`,
          (s.required || []).includes(child),
        );
        details.append(row);
      }
      if (!Object.keys(s.properties || {}).length && s.additionalProperties !== false) {
        for (const name of Object.keys(object)) {
          details.append(
            field(
              typeof s.additionalProperties === "object"
                ? s.additionalProperties
                : { type: "string" },
              object[name],
              (v) => {
                object[name] = v;
                assign(object);
              },
              name,
              `${path}.${name}`,
            ),
          );
          details.append(
            button(`Quitar ${name}`, () => {
              delete object[name];
              assign(object);
              renderEditor();
            }),
          );
        }
        const keyInput = el(s.propertyNames?.enum ? "select" : "input", undefined, {
          placeholder: "Clave de contenido o token",
          "aria-label": `Nueva clave ${title}`,
        });
        for (const allowed of s.propertyNames?.enum || []) {
          if (!Object.hasOwn(object, allowed))
            keyInput.append(el("option", allowed, { value: allowed }));
        }
        details.append(
          keyInput,
          button("Agregar campo", () => {
            const name = keyInput.value;
            if (
              !/^[a-zA-Z0-9_-]+$/.test(name) ||
              ["constructor", "__proto__", "prototype"].includes(name)
            )
              throw new Error("Clave no permitida");
            object[name] = initial(
              typeof s.additionalProperties === "object"
                ? s.additionalProperties
                : { type: "string" },
              name,
            );
            assign(object);
            renderEditor();
          }),
        );
      }
      if (s.properties?.src) {
        details.append(
          button("Elegir de la biblioteca multimedia", () => {
            const picker = wp.media({
              title: "Multimedia",
              multiple: false,
              library: { type: "image" },
            });
            picker.on("select", () => {
              const media = picker.state().get("selection").first().toJSON();
              const u = new URL(media.url);
              object.src = u.protocol === "https:" ? media.url : u.pathname;
              object.id = `media-${media.id}`;
              object.alt = media.alt || "";
              object.width = media.width;
              object.height = media.height;
              object.kind = "image";
              object.illustrative = false;
              object.schemaVersion = 1;
              object.revision = 0;
              object.extensions = {};
              assign(object);
              renderEditor();
            });
            picker.open();
          }),
        );
      }
      wrap.append(details);
    } else if (s.type === "array") {
      wrap.append(el("h3", title));
      const list = value || [];
      list.forEach((item, i) => {
        const row = el("div", undefined, { class: "estate-array-item" });
        row.append(
          field(
            s.items,
            item,
            (v) => {
              list[i] = v;
              assign(list);
            },
            `${key} ${i + 1}`,
            `${path}.${i}`,
          ),
        );
        row.append(
          button("Subir", () => {
            if (i > 0) {
              [list[i - 1], list[i]] = [list[i], list[i - 1]];
              normalizeOrder(list);
              assign(list);
              renderEditor();
            }
          }),
          button("Bajar", () => {
            if (i < list.length - 1) {
              [list[i + 1], list[i]] = [list[i], list[i + 1]];
              normalizeOrder(list);
              assign(list);
              renderEditor();
            }
          }),
          button("Quitar", () => {
            list.splice(i, 1);
            normalizeOrder(list);
            assign(list);
            renderEditor();
          }),
        );
        wrap.append(row);
      });
      wrap.append(
        button(`Agregar ${title}`, () => {
          if (list.length >= (s.maxItems || 100)) throw new Error("Límite de elementos alcanzado");
          list.push(
            key === "sections"
              ? { ...structuredClone(cfg.defaults.section), id: crypto.randomUUID() }
              : initial(s.items),
          );
          normalizeOrder(list);
          assign(list);
          renderEditor();
        }),
      );
    } else {
      const refOptions =
        key === "propertyTypeId"
          ? references.categories.filter((item) => item.kind === "type")
          : path.includes(".categoryIds.")
            ? references.categories
            : path.includes(".featureIds.")
              ? references.features
              : null;
      const label = el("label", title),
        input =
          s.enum || refOptions
            ? el("select")
            : el(s.type === "string" && !s.pattern && !s.format ? "textarea" : "input");
      if (refOptions) {
        input.append(el("option", "Seleccionar", { value: "" }));
        for (const item of refOptions)
          input.append(el("option", `${item.label} (${item.id})`, { value: item.id }));
        input.value = value || "";
      }
      if (s.enum) {
        for (const option of s.enum)
          input.append(el("option", String(option), { value: String(option) }));
        input.value = String(value);
      } else if (refOptions) {
      } else if (s.type === "boolean") {
        input.type = "checkbox";
        input.checked = Boolean(value);
      } else {
        input.value = value ?? "";
        if (input.tagName === "INPUT")
          input.type = s.type === "integer" || s.type === "number" ? "number" : "text";
        if (s.minimum !== undefined) input.min = s.minimum;
        if (s.maximum !== undefined) input.max = s.maximum;
        if (s.type === "number") input.step = "any";
      }
      input.setAttribute("aria-label", title);
      input.onchange = () =>
        assign(
          s.type === "boolean"
            ? input.checked
            : s.type === "integer" || s.type === "number"
              ? Number(input.value)
              : s.enum && typeof s.enum[0] === "number"
                ? Number(input.value)
                : input.value,
        );
      label.append(input);
      wrap.append(label);
      if (s.pattern?.includes("oklch")) {
        const swatch = el("span", "Vista previa de color", { class: "estate-swatch" });
        const preview = () => {
          if (/^#[a-f0-9]{6}$/i.test(input.value)) swatch.style.backgroundColor = input.value;
        };
        input.addEventListener("input", preview);
        preview();
        wrap.append(swatch);
      }
    }
    if (!required)
      wrap.append(
        button(`Desactivar ${title}`, () => {
          assign(undefined);
          renderEditor();
        }),
      );
    return wrap;
  }
  const append = (parent, child) => {
    parent.append(child);
    return parent;
  };
  function renderEditor() {
    const panel = document.getElementById("estate-editor");
    const expanded = new Map(
      [...panel.querySelectorAll("details")].map((node) => [node.dataset.estatePath, node.open]),
    );
    panel.replaceChildren();
    panel.append(el("h2", `${labels[kind]} — ${recordStatus || "nuevo borrador"}`));
    if (kind === "lead") {
      for (const [key, val] of Object.entries(model))
        if (key !== "_requestHash")
          panel.append(el("p", `${key}: ${typeof val === "object" ? JSON.stringify(val) : val}`));
      for (const state of ["new", "assigned", "contacted", "closed"])
        panel.append(
          button(state, async () => {
            const result = await request(`admin/leads/${currentId}`, "PATCH", { state }, etag);
            etag = result.etag;
            message("Estado actualizado. Notificación no configurada.");
          }),
        );
      return;
    }
    panel.append(field(cfg.schemas[schemas[kind]], model, (v) => (model = v), kind, kind));
    panel.append(
      button(
        kind === "configuration" ? "Guardar configuración" : "Guardar borrador / cambios",
        async () => {
          const path =
            kind === "configuration"
              ? "admin/configuration"
              : `admin/${plural[kind]}${currentId ? "/" + currentId : ""}`;
          const result = await request(
            path,
            kind === "configuration" ? "PUT" : currentId ? "PATCH" : "POST",
            model,
            etag,
          );
          model = result.data.document;
          currentId = model.id;
          etag = result.etag;
          recordStatus = result.data.recordStatus;
          renderEditor();
          message("Guardado. Los cambios todavía no conectan el frontend React.");
        },
      ),
    );
    if (currentId && kind !== "configuration")
      for (const [action, text] of [
        ["publish", "Publicar"],
        ["archive", "Archivar"],
        ["trash", "Papelera"],
        ["duplicate", "Duplicar como borrador"],
      ])
        panel.append(
          button(text, async () => {
            const result = await request(
              `admin/${plural[kind]}/${currentId}/${action}`,
              "POST",
              {},
              etag,
            );
            model = result.data.document;
            currentId = model.id;
            etag = result.etag;
            recordStatus = result.data.recordStatus;
            renderEditor();
            message("Acción completada.");
          }),
        );
    for (const node of panel.querySelectorAll("details")) {
      if (expanded.has(node.dataset.estatePath)) node.open = expanded.get(node.dataset.estatePath);
    }
  }
  async function openKind(next) {
    const taxonomy = await request("taxonomies");
    references = taxonomy.data;
    kind = next;
    currentId = null;
    etag = null;
    root.querySelector("#estate-editor")?.remove();
    root.querySelector("#estate-list")?.remove();
    const list = el("div", undefined, { id: "estate-list" }),
      panel = el("div", undefined, { id: "estate-editor" });
    root.append(list, panel);
    if (kind === "configuration") {
      const result = await request("admin/configuration");
      model = result.data.document;
      etag = result.etag;
      currentId = model.id;
      recordStatus = "published";
      renderEditor();
      return;
    }
    const result = await request(`admin/${plural[kind]}`);
    if (kind !== "lead")
      list.append(
        button(`Nueva ${labels[kind]}`, () => {
          model = structuredClone(cfg.defaults[kind]);
          if (kind === "property") model.publishedAt = new Date().toISOString().slice(0, 10);
          currentId = null;
          etag = null;
          recordStatus = "draft";
          renderEditor();
        }),
      );
    for (const item of result.data.items)
      list.append(
        button(`${item.title} [${item.recordStatus}]`, async () => {
          const result = await request(`admin/${plural[kind]}/${item.id}`);
          model = result.data.document;
          currentId = model.id;
          etag = result.etag;
          recordStatus = result.data.recordStatus;
          renderEditor();
        }),
      );
    if (result.data.nextCursor)
      list.append(
        button("Cargar siguientes registros", async () => {
          const next = await request(
            `admin/${plural[kind]}?after=${encodeURIComponent(result.data.nextCursor)}`,
          );
          for (const item of next.data.items)
            list.append(
              button(`${item.title} [${item.recordStatus}]`, async () => {
                const detail = await request(`admin/${plural[kind]}/${item.id}`);
                model = detail.data.document;
                currentId = model.id;
                etag = detail.etag;
                recordStatus = detail.data.recordStatus;
                renderEditor();
              }),
            );
          result.data.nextCursor = next.data.nextCursor;
          if (!next.data.nextCursor) message("Todos los registros cargados.");
        }),
      );
  }
  notice = el("div");
  root.append(notice);
  const nav = el("nav", undefined, { "aria-label": "Administración inmobiliaria" });
  root.append(nav);
  const caps = {
    property: "estate_edit_properties",
    page: "estate_edit_content",
    category: "estate_manage_settings",
    feature: "estate_manage_settings",
    configuration: "estate_manage_settings",
    lead: "estate_manage_leads",
  };
  for (const [key, cap] of Object.entries(caps))
    if (cfg.caps[cap]) nav.append(button(labels[key], () => openKind(key)));
  if (!nav.children.length)
    message("Tu usuario no tiene permisos administrativos de la plataforma.", true);
})();
