/* WordPress-only visual studio. Public React application is intentionally independent. */
(() => {
  "use strict";
  const cfg = window.EstateCoreAdmin,
    root = document.getElementById("estate-core-admin");
  if (!cfg || !root) return;
  const defaults = cfg.defaults,
    schemas = cfg.schemas,
    clone = (v) => structuredClone(v);
  const names = {
    property: "Propiedades",
    page: "Páginas",
    location: "Geografía",
    feature: "Características y amenities",
    team: "Equipo",
    category: "Tipos y operaciones",
    lead: "Consultas",
  };
  const types = {
    story: "Escenas de scroll",
    hero: "Hero",
    search: "Buscador",
    featured: "Propiedades destacadas",
    latest: "Últimas propiedades",
    categories: "Tipos de inmuebles",
    carousel: "Carrusel",
    banner: "Banner",
    cta: "Llamado a la acción",
    team: "Equipo",
    text: "Texto editorial",
    faq: "Preguntas frecuentes",
    "lead-form": "Publicá tu propiedad",
    services: "Beneficios y servicios",
    map: "Mapa y ubicación",
    contact: "Contacto",
    heading: "Encabezado interior",
    footer: "Footer",
  };
  const plural = {
    property: "properties",
    page: "pages",
    location: "locations",
    feature: "features",
    team: "team",
    category: "categories",
    lead: "leads",
  };
  let dirty = false,
    busy = false,
    active = "dashboard",
    model = null,
    record = null,
    draftRevision = 0,
    sectionIndex = 0,
    device = "desktop",
    propertyTab = 0;
  let pageChoices = [],
    sectionChoices = [];
  let references = { locations: [], features: [], categories: [], team: [] },
    content,
    notice;
  const safeUrl = (v) => {
    try {
      const u = new URL(v, location.origin);
      return u.origin === location.origin || u.protocol === "https:" ? u.href : "";
    } catch {
      return "";
    }
  };
  function el(tag, text, attrs = {}) {
    const n = document.createElement(tag);
    if (text !== undefined && text !== null) n.textContent = String(text);
    for (const [k, v] of Object.entries(attrs)) if (v !== undefined) n.setAttribute(k, String(v));
    return n;
  }
  function btn(text, action, style = "") {
    const b = el("button", text, { type: "button", class: "ec-button " + style });
    b.addEventListener("click", () => run(action));
    return b;
  }
  function message(text, error = false) {
    notice.replaceChildren(el("p", text));
    notice.className = "ec-notice " + (error ? "ec-error" : "");
  }
  async function run(action) {
    if (busy) return;
    try {
      await action();
    } catch (e) {
      message(
        e.message || "No se pudo completar la acción. Tus cambios permanecen en pantalla.",
        true,
      );
    }
  }
  async function api(path, method = "GET", body, headers = {}) {
    const response = await fetch(cfg.api + path, {
      method,
      credentials: "same-origin",
      headers: {
        "X-WP-Nonce": cfg.nonce,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response
      .json()
      .catch(() => ({ message: "Respuesta inválida o conexión interrumpida" }));
    if (!response.ok) throw new Error(`${response.status}: ${data.message || "Error al guardar"}`);
    return { data, etag: response.headers.get("etag") };
  }
  function changed() {
    dirty = true;
    const n = document.getElementById("ec-dirty");
    if (n) n.textContent = "Cambios sin guardar";
  }
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  function leave() {
    return !dirty || confirm("Hay cambios sin guardar. ¿Querés salir y descartarlos?");
  }
  function field(label, value, set, type = "text", options) {
    const wrap = el("label", null, { class: "ec-field" });
    wrap.append(el("span", label));
    let input;
    if (options) {
      input = el("select", null, { "aria-label": label });
      for (const option of options) {
        const [v, t] = Array.isArray(option) ? option : [option, option];
        input.append(el("option", t, { value: v }));
      }
      input.value = value ?? "";
    } else if (type === "textarea") {
      input = el("textarea", null, { "aria-label": label, rows: 4 });
      input.value = value ?? "";
    } else {
      input = el("input", null, {
        "aria-label": label,
        type: type === "checkbox" ? "checkbox" : type,
      });
      if (type === "checkbox") input.checked = !!value;
      else input.value = value ?? "";
      if (type === "number") {
        input.min = "0";
        input.step = "any";
      }
    }
    input.addEventListener(options || type === "checkbox" ? "change" : "input", () => {
      set(
        type === "checkbox"
          ? input.checked
          : type === "number"
            ? input.value === ""
              ? undefined
              : Number(input.value)
            : input.value,
      );
      changed();
    });
    wrap.append(input);
    return wrap;
  }
  function grid(...children) {
    const g = el("div", null, { class: "ec-grid" });
    g.append(...children);
    return g;
  }
  function heading(title, body) {
    const h = el("header", null, { class: "ec-heading" });
    h.append(el("h2", title));
    if (body) h.append(el("p", body));
    return h;
  }
  function card(title, ...children) {
    const c = el("section", null, { class: "ec-card" });
    if (title) c.append(el("h3", title));
    c.append(...children);
    return c;
  }
  function entityOptions(key, label = "Sin asignar") {
    return [
      ["", label],
      ...(references[key] || []).map((x) => [
        x.id,
        x.document.name || x.document.label || x.document.title,
      ]),
    ];
  }
  async function loadReferences() {
    for (const key of ["locations", "features", "categories", "team"]) {
      const cap = key === "team" ? "estate_edit_content" : "estate_manage_settings";
      if (!cfg.caps[cap]) {
        if (key === "team") {
          const publicTeam = await api("team");
          references.team = publicTeam.data.items.map((document) => ({
            id: document.id,
            document,
            recordStatus: "published",
          }));
        } else {
          const publicTerms = await api("taxonomies");
          references[key] = (publicTerms.data[key] || []).map((document) => ({
            id: document.id,
            document,
            recordStatus: "published",
          }));
        }
        continue;
      }
      let cursor = "",
        all = [];
      do {
        const result = await api("admin/catalog/" + key + "?after=" + cursor);
        all.push(...result.data.items);
        cursor = result.data.nextCursor || "";
      } while (cursor && all.length < 1000);
      references[key] = all;
    }
  }
  function mediaAsset(item) {
    const raw = item.toJSON ? item.toJSON() : item;
    return {
      id: "wp-media-" + raw.id,
      schemaVersion: 1,
      revision: 0,
      extensions: {},
      src: raw.url,
      alt: raw.alt || "",
      width: raw.width || 1,
      height: raw.height || 1,
      kind: raw.type === "video" ? "video" : "image",
      illustrative: false,
    };
  }
  function pickMedia(multiple, onSelect, kind = "image") {
    const frame = wp.media({
      title: multiple ? "Seleccionar fotografías" : "Seleccionar recurso",
      button: { text: "Usar selección" },
      multiple,
      library: { type: kind },
    });
    frame.on("select", () => {
      const items = frame.state().get("selection").models.map(mediaAsset);
      onSelect(multiple ? items : items[0]);
      changed();
    });
    frame.open();
  }
  function mediaControl(label, value, set) {
    const box = el("div", null, { class: "ec-media" });
    box.append(el("strong", label));
    if (value) {
      if (value.kind === "image")
        box.append(el("img", null, { src: safeUrl(value.src), alt: value.alt || "" }));
      else box.append(el("p", "Video seleccionado"));
      box.append(
        el("small", `${value.width} × ${value.height}`),
        field("Texto alternativo", value.alt, (v) => {
          value.alt = v;
          set(value);
        }),
        btn("Quitar recurso", () => {
          set(undefined);
          changed();
        }),
      );
    }
    box.append(
      btn(value ? "Cambiar recurso" : "Elegir de la biblioteca", () =>
        pickMedia(false, (m) => {
          set(m);
          changed();
        }),
      ),
      btn("Elegir video", () =>
        pickMedia(
          false,
          (m) => {
            set(m);
            changed();
          },
          "video",
        ),
      ),
    );
    return box;
  }
  function gallery(label, items, set) {
    const panel = card(label);
    panel.append(
      btn("Agregar fotografías", () =>
        pickMedia(true, (selected) => {
          set([...items, ...selected]);
          changed();
        }),
      ),
    );
    const list = el("div", null, { class: "ec-gallery" });
    items.forEach((item, i) => {
      const tile = el("div", null, { class: "ec-photo" });
      tile.append(
        el("img", null, { src: safeUrl(item.src), alt: item.alt || "" }),
        el("strong", i === 0 ? "Imagen principal" : `Fotografía ${i + 1}`),
        el("small", `${item.width} × ${item.height}`),
        field("ALT de fotografía " + (i + 1), item.alt, (v) => (item.alt = v)),
        btn("Principal", () => {
          const a = [...items];
          a.unshift(...a.splice(i, 1));
          set(a);
          changed();
        }),
        btn("Anterior", () => {
          if (i) {
            const a = [...items];
            [a[i - 1], a[i]] = [a[i], a[i - 1]];
            set(a);
            changed();
          }
        }),
        btn("Siguiente", () => {
          if (i < items.length - 1) {
            const a = [...items];
            [a[i + 1], a[i]] = [a[i], a[i + 1]];
            set(a);
            changed();
          }
        }),
        btn("Quitar foto", () => {
          set(items.filter((_, n) => n !== i));
          changed();
        }),
      );
      list.append(tile);
    });
    panel.append(list);
    return panel;
  }
  async function navigate(next) {
    if (!leave()) return;
    dirty = false;
    model = null;
    record = null;
    active = next;
    content.replaceChildren();
    message("");
    document
      .querySelectorAll(".ec-nav button")
      .forEach((b) => b.classList.toggle("is-active", b.dataset.screen === next));
    await loadReferences();
    if (next === "dashboard") return dashboard();
    if (next === "builder") return pageList();
    if (next === "media") {
      content.append(
        heading(
          "Biblioteca multimedia",
          "WordPress administra los archivos, ALT, descripción, dimensiones y peso.",
        ),
        btn("Abrir biblioteca", () => {
          location.href = cfg.mediaUrl;
        }),
        btn("Seleccionar fotografías", () =>
          pickMedia(true, () => message("Los archivos se guardan en la biblioteca WordPress.")),
        ),
      );
      return;
    }
    if (next === "import") return importScreen();
    if (next === "guide") return guide();
    if (["brand", "navigation", "integrations", "company"].includes(next))
      return configEditor(next);
    return catalog(next);
  }
  async function dashboard() {
    const { data } = await api("admin/dashboard");
    content.append(
      heading("Dashboard", "Estado real del contenido que tu usuario puede administrar."),
    );
    const labels = {
      total: "Propiedades",
      published: "Publicadas",
      draft: "Borradores",
      featured: "Destacadas",
      withdrawn: "Retiradas",
      incomplete: "Propiedades incompletas",
      newLeads: "Consultas nuevas",
      pendingLeads: "Consultas pendientes",
    };
    const tiles = el("div", null, { class: "ec-stats" });
    for (const [key, label] of Object.entries(labels))
      if (data.counts[key] !== null)
        tiles.append(card(label, el("strong", data.counts[key], { class: "ec-number" })));
    content.append(tiles);
    const quick = card("Accesos rápidos");
    if (cfg.caps.estate_edit_properties) quick.append(btn("Crear propiedad", () => editProperty()));
    if (cfg.caps.estate_edit_content)
      quick.append(btn("Editar Inicio", () => openPage("page-home")));
    quick.append(
      btn("Subir fotografías", () =>
        pickMedia(true, () => message("Fotos disponibles en la biblioteca.")),
      ),
    );
    if (cfg.caps.estate_manage_leads) quick.append(btn("Consultar leads", () => navigate("lead")));
    if (cfg.caps.estate_manage_settings) quick.append(btn("Editar marca", () => navigate("brand")));
    content.append(
      quick,
      card(
        "Servicios externos",
        el("p", "Analítica: No configurado · Emails: No configurado · Calendly: Desactivado"),
      ),
    );
    const changes = card("Últimos cambios");
    for (const c of data.latestChanges)
      changes.append(
        el("p", `${c.created_at} · ${c.action} · revisión ${c.revision} · ${c.status}`),
      );
    content.append(changes);
  }
  async function pageList() {
    const { data } = await api("admin/catalog/pages");
    content.append(
      heading(
        "Constructor visual",
        "Seleccioná una página. La vista representativa no ejecuta el frontend React.",
      ),
      btn("Crear página institucional", () => newPage()),
    );
    const list = el("div", null, { class: "ec-page-list" });
    for (const item of data.items)
      list.append(
        btn(
          `${item.document.title} · ${item.recordStatus}${item.hasDraft ? " · borrador pendiente" : ""}`,
          () => openPage(item.id),
        ),
      );
    content.append(list);
  }
  async function newPage() {
    model = clone(defaults.page);
    model.title = "Nueva página";
    model.slug = "pagina-" + Date.now();
    const result = await api("admin/pages", "POST", model);
    await openPage(result.data.document.id);
    dirty = true;
  }
  async function openWorkspace(kind, id) {
    const r = await api(`admin/workspaces/${plural[kind] || kind}/${id}`);
    model = r.data.document;
    record = { id, kind, etag: r.etag, status: r.data.recordStatus };
    draftRevision = r.data.draftRevision;
    dirty = false;
  }
  async function openPage(id) {
    if (!leave()) return;
    await openWorkspace("page", id);
    sectionIndex = 0;
    renderBuilder();
  }
  function workspaceToolbar(render) {
    const bar = el("div", null, { class: "ec-toolbar" });
    bar.append(
      el("span", record.status === "published" ? "Publicado" : "Borrador", { class: "ec-badge" }),
      el(
        "span",
        dirty
          ? "Cambios sin guardar"
          : draftRevision
            ? "Borrador guardado"
            : "Sin cambios pendientes",
        { id: "ec-dirty", role: "status" },
      ),
    );
    bar.append(btn("Guardar borrador", () => saveDraft(render), "primary"));
    if (cfg.caps.estate_publish_content)
      bar.append(
        btn(
          "Publicar",
          async () => {
            if (!confirm("¿Publicar el borrador y hacerlo visible en la API?")) return;
            await saveDraft(render);
            const r = await api(workspacePath() + "/publish", "POST", {}, workspaceHeaders());
            applyWorkspace(r);
            render();
            message("Publicado en la API. El frontend React todavía no está conectado.");
          },
          "primary",
        ),
        btn("Despublicar", async () => {
          if (!confirm("¿Retirar esta publicación de la API pública?")) return;
          await api(workspacePath() + "/unpublish", "POST", {}, workspaceHeaders());
          await openWorkspace(record.kind, record.id);
          render();
        }),
      );
    bar.append(
      btn("Historial", () => history(render)),
      btn("Previsualización protegida", async () => {
        const { data } = await api(workspacePath() + "/preview", "POST", {}, workspaceHeaders());
        message(
          `Previsualización autenticada: ${data.mode}. React no conectado. El panel muestra el borrador guardado y no crea enlaces públicos.`,
        );
      }),
    );
    if (draftRevision)
      bar.append(
        btn("Descartar borrador y recargar publicado", async () => {
          if (
            !confirm(
              "¿Descartar el borrador activo y volver a la publicación? Sus versiones guardadas seguirán en Historial.",
            )
          )
            return;
          const r = await api(workspacePath(), "DELETE", undefined, workspaceHeaders());
          applyWorkspace(r);
          render();
          message("Borrador activo descartado. Historial conservado.");
        }),
      );
    return bar;
  }
  function workspacePath() {
    return `admin/workspaces/${plural[record.kind] || record.kind}/${record.id}`;
  }
  function workspaceHeaders() {
    return { "If-Match": record.etag, "X-Draft-Revision": String(draftRevision) };
  }
  function applyWorkspace(r) {
    model = r.data.document;
    record.etag = r.etag;
    record.status = r.data.recordStatus;
    draftRevision = r.data.draftRevision;
    dirty = false;
  }
  async function saveDraft(render) {
    if (busy) return;
    busy = true;
    message("Guardando borrador…");
    root.querySelectorAll("button,input,textarea,select").forEach((n) => (n.disabled = true));
    try {
      const r = await api(workspacePath(), "PUT", model, workspaceHeaders());
      applyWorkspace(r);
      render();
      message("Borrador guardado. El contenido publicado no cambió.");
    } finally {
      busy = false;
      root.querySelectorAll("button,input,textarea,select").forEach((n) => (n.disabled = false));
    }
  }
  async function history(render) {
    const { data } = await api(workspacePath() + "/revisions");
    const dialog = el("dialog", null, { class: "ec-dialog" });
    dialog.append(
      el("h2", "Historial de publicaciones y versiones"),
      el("p", "Restaurar crea un borrador. No cambia la publicación hasta que publiques."),
    );
    for (const rev of [...data.items, ...(data.draftItems || [])])
      dialog.append(
        btn(
          `Restaurar revisión ${rev.revision} · ${rev.source === "draft" ? "borrador" : rev.status} · ${rev.created_at}`,
          async () => {
            if (!confirm("¿Recuperar esta versión como borrador?")) return;
            const r = await api(
              workspacePath() + "/restore",
              "POST",
              { revision: Number(rev.revision), source: rev.source || "live" },
              workspaceHeaders(),
            );
            applyWorkspace(r);
            dialog.close();
            dialog.remove();
            render();
            message("Versión recuperada como borrador.");
          },
        ),
      );
    dialog.append(
      btn("Cerrar", () => {
        dialog.close();
        dialog.remove();
      }),
    );
    document.body.append(dialog);
    dialog.showModal();
  }
  function newSection(type) {
    return {
      ...clone(defaults.section),
      id: crypto.randomUUID(),
      type,
      label: types[type],
      content: { title: types[type], body: "" },
      order: model.sections.length,
      layout: {},
      overrides: {},
      scenes: [],
      faqs: [],
    };
  }
  function renderBuilder() {
    content.replaceChildren(
      heading(
        "Constructor visual",
        "Vista representativa del contenido. Las escenas comparten un coordinador; la coreografía exacta se comprobará al conectar React.",
      ),
      workspaceToolbar(renderBuilder),
    );
    const top = grid(
      field(
        "Página",
        record.id,
        (v) =>
          run(async () => {
            if (leave()) await openPage(v);
          }),
        "text",
        pageChoices.length ? pageChoices : [[record.id, model.title]],
      ),
      field("Título de página", model.title, (v) => (model.title = v)),
      field("URL / slug", model.slug, (v) => (model.slug = v)),
    );
    content.append(top);
    const workspace = el("div", null, { class: "ec-builder" }),
      tree = el("aside", null, { class: "ec-tree", "aria-label": "Secciones de página" }),
      center = el("main", null, { class: "ec-preview-area" }),
      inspector = el("aside", null, { class: "ec-inspector", "aria-label": "Editar sección" });
    model.sections.forEach((s, i) => {
      const entry = el("div", null, {
        class: "ec-tree-entry " + (i === sectionIndex ? "selected" : ""),
      });
      entry.append(
        btn(s.label || types[s.type] || s.type, () => {
          sectionIndex = i;
          renderBuilder();
        }),
        field(
          "Mostrar " + (s.label || types[s.type]),
          s.visible,
          (v) => {
            s.visible = v;
            renderBuilder();
          },
          "checkbox",
        ),
        btn("Subir sección", () => moveSection(i, -1)),
        btn("Bajar sección", () => moveSection(i, 1)),
      );
      tree.append(entry);
    });
    let addType = "text";
    tree.append(
      field("Tipo de bloque", addType, (v) => (addType = v), "text", Object.entries(types)),
      btn("Agregar bloque", () => {
        model.sections.push(newSection(addType));
        sectionIndex = model.sections.length - 1;
        changed();
        renderBuilder();
      }),
    );
    const sizes = el("div", null, { class: "ec-device" });
    for (const [key, label] of [
      ["desktop", "Desktop"],
      ["tablet", "Tablet"],
      ["mobile", "Mobile"],
    ])
      sizes.append(
        btn(
          label,
          () => {
            device = key;
            renderBuilder();
          },
          device === key ? "primary" : "",
        ),
      );
    center.append(
      sizes,
      el("p", "Previsualización representativa · React no conectado", { class: "ec-preview-note" }),
    );
    const preview = el("div", null, { class: "ec-preview " + device, id: "ec-page-preview" });
    center.append(preview);
    model.sections.forEach((s, i) => preview.append(previewSection(s, i)));
    const s = model.sections[sectionIndex];
    if (s) {
      inspector.append(
        el("h3", s.label || types[s.type]),
        field("Nombre de sección", s.label || types[s.type], (v) => {
          s.label = v;
        }),
        btn("Duplicar bloque", () => {
          const copy = clone(s);
          copy.id = crypto.randomUUID();
          for (const a of copy.scenes || []) a.id = crypto.randomUUID();
          for (const a of copy.actions || []) a.id = crypto.randomUUID();
          copy.label = (copy.label || types[s.type]) + " (copia)";
          model.sections.splice(sectionIndex + 1, 0, copy);
          sectionIndex++;
          normalizeSections();
          changed();
          renderBuilder();
        }),
        btn("Eliminar bloque", () => {
          if (confirm("¿Eliminar este bloque del borrador?")) {
            model.sections.splice(sectionIndex, 1);
            sectionIndex = Math.max(0, sectionIndex - 1);
            normalizeSections();
            changed();
            renderBuilder();
          }
        }),
      );
      sectionInspector(inspector, s);
    } else inspector.append(el("p", "Agregá un bloque para comenzar."));
    const seo = el("details");
    seo.append(el("summary", "SEO de la página"), seoFields(model.seo));
    tree.append(seo);
    workspace.append(tree, center, inspector);
    content.append(workspace);
    api("admin/catalog/pages")
      .then(({ data }) => {
        pageChoices = data.items.map((x) => [x.id, x.document.title]);
        sectionChoices = data.items.flatMap((x) =>
          (x.document.sections || []).map((s) => [
            s.id,
            x.document.title + " · " + (s.label || types[s.type]),
          ]),
        );
      })
      .catch(() => {});
  }
  function normalizeSections() {
    model.sections.forEach((s, i) => (s.order = i));
  }
  function moveSection(i, delta) {
    const j = i + delta;
    if (j < 0 || j >= model.sections.length) return;
    [model.sections[i], model.sections[j]] = [model.sections[j], model.sections[i]];
    sectionIndex = j;
    normalizeSections();
    changed();
    renderBuilder();
  }
  function effective(item) {
    return { ...(item.layout || {}), ...(item.overrides?.[device] || {}) };
  }
  function previewSection(s, i) {
    const p = el("article", null, {
      class: "ec-preview-block " + (i === sectionIndex ? "selected" : ""),
      tabindex: 0,
      role: "button",
      "aria-label": "Seleccionar " + (s.label || types[s.type]),
    });
    p.addEventListener("click", () => {
      sectionIndex = i;
      renderBuilder();
    });
    p.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        sectionIndex = i;
        renderBuilder();
      }
    });
    const layout = effective(s);
    if (!s.visible || layout.visible === false) p.classList.add("ec-hidden-block");
    p.style.textAlign = layout.align || "left";
    p.style.padding = (Number(layout.spacing) || 24) + "px";
    if (layout.height) p.style.minHeight = Math.min(700, layout.height) + "px";
    const scenes = s.type === "story" ? s.scenes || [] : [s];
    for (const item of scenes) {
      const l = effective(item),
        media = l.media || l.background || item.media?.[0] || (item.media?.src ? item.media : null);
      const area = el("div", null, { class: "ec-preview-scene" });
      if (item.visible === false || l.visible === false) area.classList.add("ec-hidden-block");
      if (l.height) area.style.minHeight = Math.min(700, Number(l.height)) + "px";
      if (l.align) area.style.textAlign = l.align;
      if (media?.kind === "image")
        area.append(
          el("img", null, {
            src: safeUrl(media.src),
            alt: media.alt || "",
            style: `object-position:${Number(l.focalX ?? 50)}% ${Number(l.focalY ?? 50)}%`,
          }),
        );
      else if (media) area.append(el("p", "Video configurado"));
      area.append(
        el("small", types[s.type]),
        el("h3", l.title ?? item.title ?? s.content?.title ?? s.label),
        el("p", l.subtitle ?? item.subtitle ?? s.content?.subtitle ?? s.content?.body ?? ""),
      );
      if (l.fontSize) area.querySelector("h3").style.fontSize = Math.min(60, l.fontSize) + "px";
      p.append(area);
    }
    for (const f of s.faqs || []) p.append(el("h4", f.question), el("p", f.answer));
    for (const a of s.actions || []) p.append(el("span", a.label, { class: "ec-preview-cta" }));
    if (["featured", "latest", "categories", "search", "map"].includes(s.type))
      p.append(el("p", "Componente dinámico: se alimentará de la API al conectar React."));
    return p;
  }
  function refreshPreview() {
    const p = document.getElementById("ec-page-preview");
    if (p) {
      p.replaceChildren(...model.sections.map(previewSection));
    }
  }
  function sectionInspector(panel, s) {
    s.content ??= {};
    s.layout ??= {};
    s.overrides ??= {};
    for (const [key, label] of [
      ["title", "Título"],
      ["subtitle", "Subtítulo"],
      ["body", "Texto"],
      ["eyebrow", "Antetítulo"],
    ])
      panel.append(
        field(
          label,
          s.content[key] || "",
          (v) => {
            s.content[key] = v;
            refreshPreview();
          },
          key === "body" ? "textarea" : "text",
        ),
      );
    if (s.type === "story") {
      panel.append(el("h4", "Escenas coordinadas (máximo tres)"));
      s.scenes ??= [];
      s.scenes.forEach((scene, i) => {
        const box = card("Escena " + (i + 1));
        box.append(
          field(
            "Título escena " + (i + 1),
            scene.title,
            (v) => {
              scene.title = v;
              refreshPreview();
            },
            "textarea",
          ),
          field(
            "Subtítulo escena " + (i + 1),
            scene.subtitle,
            (v) => {
              scene.subtitle = v;
              refreshPreview();
            },
            "textarea",
          ),
          mediaControl("Imagen compartida escena " + (i + 1), scene.media, (m) => {
            if (m) scene.media = m;
            else delete scene.media;
            renderBuilder();
          }),
        );
        box.append(
          field(
            "Escena visible",
            scene.visible,
            (v) => {
              scene.visible = v;
              refreshPreview();
            },
            "checkbox",
          ),
        );
        scene.actions ??= [];
        for (const action of scene.actions)
          box.append(
            field("CTA de escena", action.label, (v) => (action.label = v)),
            field("Enlace de escena", action.href, (v) => (action.href = v)),
          );
        box.append(
          btn("Agregar CTA de escena", () => {
            scene.actions.push({
              id: crypto.randomUUID(),
              label: "Explorar propiedades",
              href: "/propiedades",
              newWindow: false,
            });
            changed();
            renderBuilder();
          }),
        );
        responsiveControls(box, scene);
        box.append(
          btn("Subir escena", () => {
            if (i) {
              [s.scenes[i - 1], s.scenes[i]] = [s.scenes[i], s.scenes[i - 1]];
              changed();
              renderBuilder();
            }
          }),
          btn("Eliminar escena", () => {
            if (confirm("¿Quitar la escena del bloque coordinador?")) {
              s.scenes.splice(i, 1);
              changed();
              renderBuilder();
            }
          }),
        );
        panel.append(box);
      });
      if (s.scenes.length < 3)
        panel.append(
          btn("Agregar escena", () => {
            s.scenes.push({
              id: crypto.randomUUID(),
              schemaVersion: 1,
              revision: 0,
              extensions: {},
              title: "Nueva escena",
              subtitle: "",
              layout: {},
              overrides: {},
              visible: true,
            });
            changed();
            renderBuilder();
          }),
        );
    } else {
      panel.append(
        mediaControl("Imagen o video compartido", s.media?.[0], (m) => {
          s.media = m ? [m] : [];
          renderBuilder();
        }),
      );
      responsiveControls(panel, s);
    }
    if (s.type === "faq") {
      s.faqs ??= [];
      for (const [i, f] of s.faqs.entries()) {
        panel.append(
          card(
            "Pregunta " + (i + 1),
            field("Grupo", f.group, (v) => (f.group = v), "text", [
              "Compra",
              "Venta",
              "Alquiler",
              "Publicación",
              "Tasaciones",
              "Visitas",
              "Contacto",
            ]),
            field("Pregunta", f.question, (v) => {
              f.question = v;
              refreshPreview();
            }),
            field(
              "Respuesta",
              f.answer,
              (v) => {
                f.answer = v;
                refreshPreview();
              },
              "textarea",
            ),
            btn("Quitar pregunta", () => {
              s.faqs.splice(i, 1);
              changed();
              renderBuilder();
            }),
          ),
        );
      }
      panel.append(
        btn("Agregar pregunta", () => {
          s.faqs.push({ id: crypto.randomUUID(), group: "Compra", question: "", answer: "" });
          changed();
          renderBuilder();
        }),
      );
    }
    s.actions ??= [];
    for (const [i, a] of s.actions.entries())
      panel.append(
        card(
          "Botón " + (i + 1),
          field("Texto del botón", a.label, (v) => (a.label = v)),
          field("Destino del botón", a.href, (v) => (a.href = v)),
          field("Abrir en otra pestaña", a.newWindow, (v) => (a.newWindow = v), "checkbox"),
          btn("Quitar botón", () => {
            s.actions.splice(i, 1);
            changed();
            renderBuilder();
          }),
        ),
      );
    panel.append(
      btn("Agregar botón", () => {
        s.actions.push({
          id: crypto.randomUUID(),
          label: "Consultar",
          href: "/contacto",
          newWindow: false,
        });
        changed();
        renderBuilder();
      }),
    );
  }
  function responsiveControls(panel, item) {
    item.layout ??= {};
    item.overrides ??= {};
    const shared = el("details");
    shared.append(el("summary", "Diseño compartido"));
    layoutFields(shared, item.layout, () => refreshPreview());
    panel.append(shared);
    const own = el("details", null, { open: "" });
    own.append(el("summary", "Ajustes " + device + " (hereda si está vacío)"));
    const override = item.overrides[device] || {};
    for (const [key, label, type, options] of layoutDefinitions) {
      const row = el("div", null, { class: "ec-override" });
      const exists = Object.hasOwn(override, key);
      row.append(
        field(
          label + " " + device,
          exists ? override[key] : undefined,
          (v) => {
            item.overrides[device] ??= {};
            if (v === undefined || v === "") delete item.overrides[device][key];
            else item.overrides[device][key] = v;
            refreshPreview();
          },
          type,
          options,
        ),
      );
      row.append(
        btn(exists ? "Restablecer compartido" : "Usar valor compartido", () => {
          if (item.overrides[device]) delete item.overrides[device][key];
          changed();
          renderBuilder();
        }),
      );
      own.append(row);
    }
    own.append(
      mediaControl("Recurso específico " + device, override.media, (m) => {
        item.overrides[device] ??= {};
        if (m) item.overrides[device].media = m;
        else delete item.overrides[device].media;
        renderBuilder();
      }),
    );
    panel.append(own);
  }
  const layoutDefinitions = [
    ["title", "Título por dispositivo", "text"],
    ["subtitle", "Subtítulo por dispositivo", "text"],
    [
      "align",
      "Alineación",
      "text",
      [
        ["", "Compartida"],
        ["left", "Izquierda"],
        ["center", "Centro"],
        ["right", "Derecha"],
      ],
    ],
    ["visible", "Visible", "checkbox"],
    ["focalX", "Foco horizontal %", "number"],
    ["focalY", "Foco vertical %", "number"],
    ["height", "Altura del hero px", "number"],
    ["fontSize", "Tamaño de título px", "number"],
    ["spacing", "Espaciado px", "number"],
    ["columns", "Tarjetas por fila", "number"],
    ["overlay", "Superposición (0 a 1)", "number"],
    ["overlayColor", "Color de superposición", "color"],
    ["transition", "Intensidad de transición (0 a 1)", "number"],
    [
      "buttonLayout",
      "Disposición de botones",
      "text",
      [
        ["", "Compartida"],
        ["row", "En fila"],
        ["stack", "Apilados"],
      ],
    ],
    [
      "carousel",
      "Carrusel",
      "text",
      [
        ["", "Compartido"],
        ["manual", "Manual"],
        ["auto", "Automático"],
      ],
    ],
    ["interval", "Intervalo de carrusel ms", "number"],
  ];
  function layoutFields(panel, obj, update) {
    for (const [key, label, type, options] of layoutDefinitions)
      panel.append(
        field(
          label,
          obj[key],
          (v) => {
            if (v === undefined || v === "") delete obj[key];
            else obj[key] = v;
            update();
          },
          type,
          options,
        ),
      );
  }
  function seoFields(seo, redraw = refreshSEO) {
    const box = grid(
      field("Meta title", seo.title, (v) => (seo.title = v)),
      field("Meta description", seo.description, (v) => (seo.description = v), "textarea"),
      field("Canonical", seo.canonical || "", (v) => {
        if (v) seo.canonical = v;
        else delete seo.canonical;
      }),
      field("Permitir indexación", seo.index, (v) => (seo.index = v), "checkbox"),
      field("Seguir enlaces", seo.follow, (v) => (seo.follow = v), "checkbox"),
    );
    const og = el("details");
    og.append(el("summary", "Open Graph (compartir)"));
    if (seo.openGraph) {
      og.append(
        field("Título Open Graph", seo.openGraph.title, (v) => (seo.openGraph.title = v)),
        field(
          "Descripción Open Graph",
          seo.openGraph.description,
          (v) => (seo.openGraph.description = v),
          "textarea",
        ),
        mediaControl("Imagen Open Graph", seo.openGraph.image, (m) => {
          if (m) seo.openGraph.image = m;
          else delete seo.openGraph.image;
          redraw();
        }),
      );
    } else
      og.append(
        btn("Personalizar Open Graph", () => {
          seo.openGraph = { title: seo.title, description: seo.description };
          changed();
          redraw();
        }),
      );
    box.append(og);
    return box;
  }
  function refreshSEO() {
    if (record?.kind === "page") renderBuilder();
    else if (record?.kind === "property") renderProperty();
  }

  async function catalog(kind, cursor = "", filters = {}) {
    active = kind;
    const params = new URLSearchParams({ after: cursor, ...filters });
    const { data } = await api("admin/catalog/" + plural[kind] + "?" + params);
    content.replaceChildren(
      heading(
        names[kind],
        kind === "lead"
          ? "Consultas guardadas. SMTP no configurado."
          : "Datos persistidos en WordPress.",
      ),
    );
    if (kind !== "lead")
      content.append(
        btn("Crear " + (kind === "property" ? "propiedad" : "registro"), () =>
          kind === "property" ? editProperty() : simpleEditor(kind),
        ),
      );
    let search = filters.search || "",
      status = filters.status || "";
    const extraFilters = { ...filters };
    delete extraFilters.search;
    delete extraFilters.status;
    const filterbar = grid(
      field("Buscar", search, (v) => (search = v)),
      field("Estado editorial", status, (v) => (status = v), "text", [
        ["", "Todos"],
        ["published", "Publicadas"],
        ["draft", "Borradores"],
        ["archived", "Archivadas"],
      ]),
      btn("Aplicar filtros", () => catalog(kind, "", { ...extraFilters, search, status })),
    );
    filterbar.append(
      field("Orden", filters.sort || "updated-desc", (v) => (extraFilters.sort = v), "text", [
        ["updated-desc", "Última actualización"],
        ["title-asc", "Título / nombre"],
        ["price-asc", "Precio ascendente por moneda"],
        ["price-desc", "Precio descendente por moneda"],
      ]),
    );
    if (kind === "property")
      for (const [key, label, opts] of [
        [
          "operation",
          "Operación",
          [
            ["", "Todas"],
            ["venta", "Venta"],
            ["alquiler", "Alquiler"],
          ],
        ],
        [
          "propertyTypeId",
          "Tipo de inmueble",
          entityOptions("categories").filter(
            ([id]) =>
              !id || references.categories.find((x) => x.id === id)?.document.kind === "type",
          ),
        ],
        [
          "cityId",
          "Localidad",
          entityOptions("locations").filter(
            ([id]) =>
              !id || references.locations.find((x) => x.id === id)?.document.level === "city",
          ),
        ],
        ["agentId", "Agente", entityOptions("team")],
      ])
        filterbar.append(
          field(label, filters[key] || "", (v) => (extraFilters[key] = v), "text", opts),
        );
    content.append(filterbar);
    const table = el("table", null, { class: "ec-table" });
    const head = el("tr");
    for (const label of kind === "property"
      ? [
          "Fotografía",
          "Código / título",
          "Operación / tipo",
          "Localidad / barrio",
          "Precio",
          "Comercial / editorial",
          "Destacada / agente",
          "Actualización",
          "Acciones",
        ]
      : ["Nombre", "Estado", "Actualización", "Acciones"])
      head.append(el("th", label));
    table.append(head);
    for (const item of data.items) {
      const d = item.document,
        row = el("tr");
      if (kind === "property") {
        const img = el("td");
        if (d.images?.[0])
          img.append(
            el("img", null, { src: safeUrl(d.images[0].src), alt: d.images[0].alt || "" }),
          );
        row.append(
          img,
          el("td", (d.code ? d.code + " · " : "") + d.title),
          el(
            "td",
            d.operation +
              " / " +
              (references.categories.find((x) => x.id === d.propertyTypeId)?.document.label ||
                d.type),
          ),
          el("td", d.location),
          el(
            "td",
            d.price
              ? `${d.price.currency} ${d.price.amount.toLocaleString("es-AR")}`
              : "A consultar",
          ),
          el(
            "td",
            d.status + " / " + item.recordStatus + (item.hasDraft ? " · cambios en borrador" : ""),
          ),
          el(
            "td",
            (d.featured ? "Sí" : "No") +
              " / " +
              (references.team.find((x) => x.id === d.agentId)?.document.name || "Sin asignar"),
          ),
          el("td", item.updatedAt),
        );
      } else
        row.append(
          el("td", d.title || d.name || d.label || d.form || "Consulta"),
          el("td", item.recordStatus),
          el("td", item.updatedAt),
        );
      const actions = el("td");
      actions.append(
        btn("Editar", () =>
          kind === "property"
            ? editProperty(item.id)
            : kind === "lead"
              ? leadEditor(item.id)
              : simpleEditor(kind, item.id),
        ),
      );
      row.append(actions);
      table.append(row);
    }
    content.append(table);
    if (data.nextCursor)
      content.append(
        btn("Siguiente página", () => catalog(kind, String(data.nextCursor), filters)),
      );
  }
  async function editProperty(id) {
    if (id) await openWorkspace("property", id);
    else {
      model = clone(defaults.property);
      model.publishedAt = new Date().toISOString().slice(0, 10);
      model.slug = "propiedad-" + Date.now();
      model.title = "Nueva propiedad";
      const r = await api("admin/properties", "POST", model);
      await openWorkspace("property", r.data.document.id);
    }
    propertyTab = 0;
    renderProperty();
  }
  const propertyTabs = [
    "Información general",
    "Ubicación",
    "Precio y operación",
    "Superficies y ambientes",
    "Características y amenities",
    "Fotografías y videos",
    "Contacto y visitas",
    "Destacados y visibilidad",
    "SEO",
    "Publicación",
  ];
  function renderProperty() {
    content.replaceChildren(heading(model.title || "Propiedad"), workspaceToolbar(renderProperty));
    const tabs = el("nav", null, { "aria-label": "Pestañas de propiedad", class: "ec-tabs" });
    propertyTabs.forEach((label, i) =>
      tabs.append(
        btn(
          label,
          () => {
            propertyTab = i;
            renderProperty();
          },
          propertyTab === i ? "primary" : "",
        ),
      ),
    );
    content.append(tabs);
    const panel = card(propertyTabs[propertyTab]);
    const f = (key, label, type = "text", options) =>
      field(
        label,
        model[key],
        (v) => {
          if (v === undefined) delete model[key];
          else model[key] = v;
        },
        type,
        options,
      );
    if (propertyTab === 0)
      panel.append(
        f("title", "Título"),
        f("code", "Código"),
        f("slug", "URL / slug"),
        f("description", "Descripción", "textarea"),
      );
    if (propertyTab === 1) {
      for (const [key, level, label, parentKey] of [
        ["provinceId", "province", "Provincia", null],
        ["cityId", "city", "Localidad", "provinceId"],
        ["neighborhoodId", "neighborhood", "Barrio / zona", "cityId"],
      ]) {
        const opts = [
          ["", "Seleccionar"],
          ...references.locations
            .filter(
              (x) =>
                x.document.level === level &&
                x.document.active &&
                (!parentKey || x.document.parentId === model[parentKey]),
            )
            .map((x) => [x.id, x.document.name]),
        ];
        panel.append(
          field(
            label,
            model[key] || "",
            (v) => {
              if (v) model[key] = v;
              else delete model[key];
              if (key === "provinceId") {
                delete model.cityId;
                delete model.neighborhoodId;
              }
              if (key === "cityId") delete model.neighborhoodId;
              renderProperty();
            },
            "text",
            opts,
          ),
        );
      }
      panel.append(
        el(
          "p",
          "La ubicación pública se deriva de las entidades seleccionadas. Podés crear localidades y barrios en Geografía.",
        ),
      );
      if (model.location) panel.append(el("p", "Ubicación anterior / derivada: " + model.location));
    }
    if (propertyTab === 2) {
      panel.append(
        f("operation", "Operación", "text", [
          ["venta", "Venta"],
          ["alquiler", "Alquiler"],
        ]),
        f(
          "propertyTypeId",
          "Tipo de inmueble",
          "text",
          entityOptions("categories").filter(
            ([id]) =>
              !id || references.categories.find((x) => x.id === id)?.document.kind === "type",
          ),
        ),
        field(
          "Precio a consultar",
          model.price === null,
          (v) => {
            model.price = v ? null : { amount: 0, currency: "USD" };
            renderProperty();
          },
          "checkbox",
        ),
      );
      if (model.price)
        panel.append(
          field("Precio", model.price.amount, (v) => (model.price.amount = v), "number"),
          field("Moneda", model.price.currency, (v) => (model.price.currency = v), "text", [
            "USD",
            "ARS",
          ]),
        );
      panel.append(
        f("status", "Estado comercial", "text", [
          ["published", "Disponible"],
          ["reserved", "Reservada"],
          ["sold", "Vendida"],
          ["rented", "Alquilada"],
          ["withdrawn", "Retirada"],
        ]),
      );
    }
    if (propertyTab === 3)
      for (const [key, label] of [
        ["bedrooms", "Dormitorios"],
        ["bathrooms", "Baños"],
        ["lotArea", "Superficie terreno m²"],
        ["coveredArea", "Superficie cubierta m²"],
      ])
        panel.append(f(key, label, "number"));
    if (propertyTab === 4) {
      model.attributes ??= {};
      for (const group of ["structural", "amenity"]) {
        const box = card(group === "amenity" ? "Amenities" : "Características");
        for (const item of references.features.filter(
          (x) => (x.document.group || "amenity") === group && x.recordStatus === "published",
        )) {
          const f = item.document;
          const type =
            f.valueType === "boolean" ? "checkbox" : f.valueType === "number" ? "number" : "text";
          box.append(
            field(
              f.label,
              model.attributes[item.id],
              (v) => {
                if (v === undefined) delete model.attributes[item.id];
                else model.attributes[item.id] = v;
                if (v && !model.featureIds.includes(item.id)) model.featureIds.push(item.id);
                if (!v) model.featureIds = model.featureIds.filter((id) => id !== item.id);
              },
              type,
              f.valueType === "select"
                ? [["", "Sin especificar"], ...(f.options || [])]
                : undefined,
            ),
          );
        }
        panel.append(box);
      }
    }
    if (propertyTab === 5) {
      panel.append(
        gallery("Galería", model.images, (items) => {
          model.images = items;
          renderProperty();
        }),
      );
      model.videos ??= [];
      panel.append(
        btn("Agregar video", () =>
          pickMedia(
            false,
            (m) => {
              model.videos.push(m);
              renderProperty();
            },
            "video",
          ),
        ),
      );
      for (const [i, v] of model.videos.entries())
        panel.append(
          el("p", v.alt || "Video"),
          btn("Quitar video " + (i + 1), () => {
            model.videos.splice(i, 1);
            changed();
            renderProperty();
          }),
        );
    }
    if (propertyTab === 6)
      panel.append(
        f("agentId", "Agente asignado", "text", entityOptions("team")),
        f("whatsapp", "WhatsApp de la propiedad (opcional)"),
        el(
          "p",
          "Calendly permanece desactivado. Las visitas se coordinan por WhatsApp y requieren confirmación real.",
        ),
      );
    if (propertyTab === 7)
      panel.append(
        f("featured", "Propiedad destacada", "checkbox"),
        f("featuredOrder", "Orden de destacada", "number"),
        f("publishedAt", "Fecha de publicación", "date"),
      );
    if (propertyTab === 8) panel.append(seoFields(model.seo));
    if (propertyTab === 9)
      panel.append(
        el("p", "Los borradores y la publicación tienen revisiones independientes."),
        btn("Duplicar propiedad", async () => {
          if (!confirm("¿Crear una copia independiente en borrador?")) return;
          if (dirty) await saveDraft(renderProperty);
          const r = await api(
            "admin/properties/" + record.id + "/duplicate",
            "POST",
            {},
            workspaceHeaders(),
          );
          await editProperty(r.data.document.id);
        }),
        btn("Archivar propiedad", async () => {
          if (!confirm("¿Archivar la propiedad y retirarla de la API pública?")) return;
          await api(
            "admin/properties/" + record.id + "/archive",
            "POST",
            {},
            { "If-Match": record.etag },
          );
          dirty = false;
          await catalog("property");
        }),
      );
    content.append(panel);
  }
  async function simpleEditor(kind, id) {
    let row = null,
      doc = clone(defaults[kind]);
    if (localSimpleOverride && localSimpleOverride.kind === kind && localSimpleOverride.id === id) {
      doc = localSimpleOverride.doc;
      row = localSimpleOverride.row;
      localSimpleOverride = null;
    } else if (id) {
      const r = await api("admin/" + plural[kind] + "/" + id);
      doc = r.data.document;
      row = { etag: r.etag, status: r.data.recordStatus };
    }
    content.replaceChildren(heading((id ? "Editar " : "Crear ") + names[kind]));
    const panel = card("Datos del registro");
    const f = (key, label, type = "text", options) =>
      field(
        label,
        doc[key],
        (v) => {
          if (v === undefined || v === "") {
            delete doc[key];
          } else doc[key] = v;
        },
        type,
        options,
      );
    if (kind === "location") {
      panel.append(
        f("name", "Nombre"),
        f("slug", "URL / slug"),
        field(
          "Nivel geográfico",
          doc.level,
          (v) => {
            doc.level = v;
            delete doc.parentId;
            render();
          },
          "text",
          [
            ["province", "Provincia"],
            ["city", "Localidad / ciudad"],
            ["neighborhood", "Barrio / zona"],
          ],
        ),
      );
      if (doc.level !== "province")
        panel.append(
          f(
            "parentId",
            doc.level === "city" ? "Provincia" : "Localidad",
            "text",
            entityOptions("locations").filter(
              ([key]) =>
                !key ||
                references.locations.find((x) => x.id === key)?.document.level ===
                  (doc.level === "city" ? "province" : "city"),
            ),
          ),
        );
      panel.append(
        f("description", "Descripción", "textarea"),
        f("order", "Orden", "number"),
        f("active", "Activo", "checkbox"),
        f("latitude", "Latitud", "number"),
        f("longitude", "Longitud", "number"),
        mediaControl("Imagen opcional", doc.image, (m) => {
          if (m) doc.image = m;
          else delete doc.image;
          render();
        }),
        seoFields(doc.seo, render),
      );
    }
    if (kind === "team")
      panel.append(
        f("name", "Nombre y apellido"),
        f("role", "Cargo (completar sólo si está confirmado)"),
        f("biography", "Presentación confirmada", "textarea"),
        f("order", "Orden", "number"),
        f("visible", "Visible", "checkbox"),
        mediaControl("Fotografía real", doc.photo, (m) => {
          if (m) doc.photo = m;
          else delete doc.photo;
          render();
        }),
      );
    if (kind === "category")
      panel.append(
        f("label", "Nombre"),
        f("slug", "Clave URL estable"),
        f("kind", "Catálogo", "text", [
          ["type", "Tipo de inmueble"],
          ["operation", "Operación"],
        ]),
        f("legacyType", "Familia compatible con el buscador actual", "text", [
          ["", "Sin asignar"],
          ["casa", "Casa"],
          ["departamento", "Departamento"],
          ["terreno", "Terreno"],
          ["local", "Local comercial"],
          ["oficina", "Oficina"],
        ]),
        f("visible", "Visible", "checkbox"),
        f("order", "Orden", "number"),
      );
    if (kind === "feature") {
      panel.append(
        f("label", "Nombre"),
        f("group", "Grupo", "text", [
          ["structural", "Característica estructural"],
          ["amenity", "Amenity"],
        ]),
        field(
          "Tipo de valor",
          doc.valueType,
          (v) => {
            doc.valueType = v;
            render();
          },
          "text",
          [
            ["boolean", "Sí / no"],
            ["number", "Número"],
            ["select", "Selección"],
            ["text", "Texto breve"],
          ],
        ),
        f("icon", "Icono", "text", [
          "home",
          "bed",
          "bath",
          "area",
          "car",
          "pool",
          "garden",
          "security",
          "gym",
          "balcony",
          "sun",
          "building",
          "check",
        ]),
        f("order", "Orden", "number"),
        f("visible", "Visible", "checkbox"),
        f("filterVisible", "Disponible en filtros", "checkbox"),
        f("unit", "Unidad", "text", ["ninguna", "m²", "años", "unidades"]),
      );
      if (doc.valueType === "select") {
        doc.options ??= [];
        panel.append(stringList("Opciones disponibles", doc.options, () => render()));
      }
    }
    const actions = card("Guardado y publicación");
    actions.append(
      btn(
        id ? "Guardar cambios" : "Crear registro",
        async () => {
          const r = await api(
            "admin/" + plural[kind] + (id ? "/" + id : ""),
            id ? "PATCH" : "POST",
            doc,
            id ? { "If-Match": row.etag } : {},
          );
          dirty = false;
          await loadReferences();
          await simpleEditor(kind, r.data.document.id);
          message("Registro guardado.");
        },
        "primary",
      ),
    );
    if (id && cfg.caps.estate_publish_content)
      actions.append(
        btn("Publicar / activar", async () => {
          if (dirty) throw new Error("Guardá primero los cambios del registro.");
          if (!confirm("¿Publicar este registro?")) return;
          await api(
            "admin/" + plural[kind] + "/" + id + "/publish",
            "POST",
            {},
            { "If-Match": row.etag },
          );
          await loadReferences();
          await simpleEditor(kind, id);
          message("Registro publicado.");
        }),
        btn("Archivar", async () => {
          if (!confirm("¿Archivar? Se comprobarán las referencias existentes.")) return;
          await api(
            "admin/" + plural[kind] + "/" + id + "/archive",
            "POST",
            {},
            { "If-Match": row.etag },
          );
          dirty = false;
          await catalog(kind);
        }),
      );
    content.append(panel, actions);
    function render() {
      const snapshot = clone(doc);
      const savedDirty = dirty;
      simpleEditorLocal(snapshot);
      dirty = savedDirty;
    }
    // Re-render dependent fields without fetching or losing the edited document.
    function simpleEditorLocal(snapshot) {
      pendingSimple = { kind, id, doc: snapshot, row };
      renderSimplePending();
    }
  }
  let pendingSimple = null;
  function renderSimplePending() {
    const { kind, id, doc, row } = pendingSimple; // Reuse the editor with a local document snapshot.
    // Dispatching a temporary local response keeps the single editor rendering path and never writes network data.
    localSimpleOverride = { kind, id, doc, row };
    simpleEditor(kind, id).catch((e) => message(e.message, true));
  }
  let localSimpleOverride = null;
  function stringList(label, array, render) {
    const p = card(label);
    array.forEach((v, i) =>
      p.append(
        field(label + " " + (i + 1), v, (value) => (array[i] = value)),
        btn("Quitar " + (i + 1), () => {
          array.splice(i, 1);
          changed();
          render();
        }),
      ),
    );
    p.append(
      btn("Agregar " + label, () => {
        array.push("");
        changed();
        render();
      }),
    );
    return p;
  }
  async function leadEditor(id) {
    const r = await api("admin/leads/" + id),
      data = r.data.document;
    content.replaceChildren(heading("Consulta privada", "Notificación por email: no configurada."));
    const box = card("Datos recibidos");
    for (const [key, value] of Object.entries(data.fields || data))
      if (
        !key.startsWith("_") &&
        !["id", "schemaVersion", "revision", "extensions", "notificationStatus"].includes(key) &&
        ["string", "number", "boolean"].includes(typeof value)
      )
        box.append(el("p", (labelMap[key] || key) + ": " + value));
    let state = r.data.recordStatus;
    box.append(
      field("Estado de consulta", state, (v) => (state = v), "text", [
        ["new", "Nueva"],
        ["assigned", "Asignada"],
        ["contacted", "Contactada"],
        ["closed", "Cerrada"],
      ]),
      btn("Guardar estado", async () => {
        await api("admin/leads/" + id, "PATCH", { state }, { "If-Match": r.etag });
        dirty = false;
        await leadEditor(id);
        message("Estado actualizado.");
      }),
    );
    content.append(box);
  }
  const labelMap = {
    site: "Identidad y contacto",
    team: "Presentación institucional del equipo",
    name: "Nombre",
    email: "Email",
    phone: "Teléfono",
    whatsapp: "WhatsApp",
    address: "Dirección",
    domain: "Dominio",
    locale: "Idioma",
    currencies: "Monedas",
    logo: "Logo principal",
    alternateLogo: "Logo alternativo",
    favicon: "Favicon",
    socials: "Redes sociales",
    label: "Nombre visible",
    url: "Enlace",
    footerText: "Texto del footer",
    legalPageIds: "Páginas legales",
    company: "Empresa",
    presentation: "Presentación",
    history: "Historia",
    tone: "Tono",
    pillars: "Pilares",
    values: "Valores",
    services: "Servicios",
    coverage: "Cobertura",
    hours: "Horarios",
    theme: "Identidad visual",
    colors: "Colores globales",
    sectionColors: "Colores de sección",
    fonts: "Tipografías aprobadas",
    display: "Títulos",
    body: "Texto",
    radius: "Bordes",
    spacing: "Espaciados",
    contentWidth: "Ancho de contenido",
    buttons: "Botones",
    header: "Header",
    footer: "Footer",
    glass: "Transparencias",
    opacity: "Opacidad",
    blur: "Desenfoque",
    menus: "Menús",
    location: "Ubicación de menú",
    items: "Enlaces",
    href: "Destino",
    newWindow: "Abrir en otra pestaña",
    icon: "Icono",
    visible: "Visible",
    order: "Orden",
    filters: "Filtros del buscador",
    key: "Parámetro URL",
    options: "Opciones",
    value: "Valor",
    presentation: "Presentación",
    min: "Mínimo",
    max: "Máximo",
    step: "Paso",
    enabled: "Activado",
    forms: "Formularios y consentimiento",
    leadStorageApproved: "Autorizar almacenamiento de consultas (requiere política aprobada)",
    privacyReviewed: "Política de privacidad revisada",
    propertyMessage: "Mensaje WhatsApp de consulta",
    ownerMessage: "Mensaje WhatsApp de publicación",
    successMessage: "Mensaje previo a abrir WhatsApp",
    preferredChannel: "Canal prioritario",
    propertyFields: "Campos de consulta",
    ownerFields: "Campos de publicación",
    preferredTime: "Horario preferido",
    source: "Origen de opciones (catálogo o manual)",
    propertyId: "Propiedad de interés",
    message: "Mensaje",
    description: "Descripción",
    propertyType: "Tipo de inmueble",
    operation: "Operación",
    chrome: "Header y footer",
    integration: "Integración",
    containerId: "ID de contenedor",
    measurementId: "ID de medición",
    pixelId: "ID de píxel",
    accountId: "ID de cuenta",
    verification: "Verificación",
    utmDefaults: "UTM predeterminados",
  };
  function schemaForm(schema, obj, path, rerender) {
    const frag = el("div", null, { class: "ec-schema" });
    const hidden = ["id", "schemaVersion", "revision", "extensions", "structuredData", "sourceIds"];
    for (const [key, sub] of Object.entries(schema.properties || {})) {
      if (hidden.includes(key)) continue;
      const label = labelMap[key] || key;
      const value = obj[key];
      const set = (v) => {
        if (v === undefined) delete obj[key];
        else obj[key] = v;
      };
      if (sub.properties?.src) {
        frag.append(
          mediaControl(label, value, (m) => {
            set(m);
            rerender();
          }),
        );
      } else if (sub.type === "object" && sub.properties) {
        if (value === undefined) {
          frag.append(
            btn("Configurar " + label, () => {
              obj[key] = seed(sub);
              changed();
              rerender();
            }),
          );
          continue;
        }
        const details = el("details");
        details.append(el("summary", label), schemaForm(sub, value, path + "." + key, rerender));
        frag.append(details);
      } else if (sub.type === "object" && sub.additionalProperties) {
        obj[key] ??= {};
        const box = card(label);
        const allowed = sub.propertyNames?.enum || [];
        for (const token of Object.keys(obj[key])) {
          if (sub.additionalProperties.type === "object")
            box.append(
              card(
                sectionChoices.find((x) => x[0] === token)?.[1] || "Colores de sección",
                schemaForm(
                  { properties: { colors: sub.additionalProperties } },
                  { colors: obj[key][token] },
                  path + "." + key + "." + token,
                  rerender,
                ),
              ),
            );
          else
            box.append(
              field(labelMap[token] || token, obj[key][token], (v) => (obj[key][token] = v)),
            );
          box.append(
            btn(
              "Restablecer " +
                (sectionChoices.find((x) => x[0] === token)?.[1] || labelMap[token] || token),
              () => {
                delete obj[key][token];
                changed();
                rerender();
              },
            ),
          );
        }
        if (allowed.length) {
          let selected = allowed.find((k) => !Object.hasOwn(obj[key], k)) || "";
          box.append(
            field(
              "Agregar " + label,
              selected,
              (v) => (selected = v),
              "text",
              allowed.filter((k) => !Object.hasOwn(obj[key], k)),
            ),
            btn("Agregar token", () => {
              if (selected) {
                obj[key][selected] = "#000000";
                changed();
                rerender();
              }
            }),
          );
        } else if (key === "sectionColors") {
          let selected = sectionChoices[0]?.[0] || "";
          box.append(
            field(
              "Sección a personalizar",
              selected,
              (v) => (selected = v),
              "text",
              sectionChoices,
            ),
            btn("Personalizar colores de sección", () => {
              if (selected) {
                obj[key][selected] ??= {};
                changed();
                rerender();
              }
            }),
          );
        }
        frag.append(box);
      } else if (sub.type === "array") {
        obj[key] ??= [];
        if (sub.items?.type === "string" && !sub.items.enum) {
          frag.append(stringList(label, obj[key], rerender));
          continue;
        }
        const box = card(label);
        obj[key].forEach((entry, i) => {
          const section = card(label + " " + (i + 1));
          if (sub.items?.properties)
            section.append(schemaForm(sub.items, entry, path + "." + key + "." + i, rerender));
          else
            section.append(
              field(
                label + " " + (i + 1),
                entry,
                (v) => (obj[key][i] = v),
                "text",
                sub.items?.enum,
              ),
            );
          section.append(
            btn("Subir elemento", () => {
              if (i) {
                [obj[key][i - 1], obj[key][i]] = [obj[key][i], obj[key][i - 1]];
                obj[key].forEach((e, n) => {
                  if (typeof e === "object" && "order" in e) e.order = n;
                });
                changed();
                rerender();
              }
            }),
            btn("Eliminar elemento", () => {
              obj[key].splice(i, 1);
              changed();
              rerender();
            }),
          );
          box.append(section);
        });
        box.append(
          btn("Agregar " + label, () => {
            const entry = seed(sub.items);
            if (
              entry &&
              typeof entry === "object" &&
              !Array.isArray(entry) &&
              sub.items.properties?.id
            )
              entry.id = crypto.randomUUID();
            obj[key].push(entry);
            changed();
            rerender();
          }),
        );
        frag.append(box);
      } else if (sub.properties?.src)
        frag.append(
          mediaControl(label, value, (m) => {
            set(m);
            rerender();
          }),
        );
      else if (
        sub.type === "string" ||
        sub.type === "number" ||
        sub.type === "integer" ||
        sub.type === "boolean"
      ) {
        frag.append(
          field(
            label,
            value,
            set,
            sub.type === "boolean"
              ? "checkbox"
              : ["number", "integer"].includes(sub.type)
                ? "number"
                : sub.maxLength > 1000
                  ? "textarea"
                  : "text",
            sub.enum,
          ),
        );
      }
    }
    return frag;
  }
  function seed(schema) {
    if (schema.default !== undefined) return clone(schema.default);
    if (schema.const !== undefined) return schema.const;
    if (schema.enum) return schema.enum[0];
    if (schema.type === "object") {
      const o = {};
      for (const k of schema.required || [])
        if (schema.properties?.[k]) o[k] = seed(schema.properties[k]);
      return o;
    }
    if (schema.type === "array") return [];
    if (schema.type === "boolean") return false;
    if (["number", "integer"].includes(schema.type)) return schema.minimum || 0;
    return "";
  }
  async function configEditor(screen) {
    const pages = await api("admin/catalog/pages");
    sectionChoices = pages.data.items.flatMap((x) =>
      (x.document.sections || []).map((s) => [
        s.id,
        x.document.title + " · " + (s.label || types[s.type]),
      ]),
    );
    await openWorkspace("configuration", "configuration");
    renderConfig(screen);
  }
  function renderConfig(screen) {
    const map = {
      brand: ["site", "theme", "chrome"],
      company: ["company", "forms"],
      navigation: ["menus", "filters"],
      integrations: ["integrations"],
    };
    content.replaceChildren(
      heading(
        {
          brand: "Identidad visual",
          company: "Empresa, contacto y formularios",
          navigation: "Navegación y buscador",
          integrations: "Integraciones",
        }[screen],
        "Cambios en borrador hasta publicar. No se ejecutan scripts arbitrarios.",
      ),
      workspaceToolbar(() => renderConfig(screen)),
    );
    const cfgSchema = schemas.configurationSchema;
    for (const key of map[screen]) {
      const sub = cfgSchema.properties[key];
      if (!sub) continue;
      if (model[key] === undefined) model[key] = seed(sub);
      const wrapperSchema = { properties: { [key]: sub } };
      content.append(schemaForm(wrapperSchema, model, "configuration", () => renderConfig(screen)));
    }
    if (screen === "company")
      content.append(
        el(
          "p",
          "Los mensajes pueden usar {name}, {propertyTitle}, {propertyCode}, {message}, {preferredTime}, {propertyType}, {location}, {operation} y {description}. Abrir WhatsApp no confirma envío ni recepción.",
        ),
      );
    if (screen === "integrations")
      content.append(
        el(
          "p",
          "Servicios externos no configurados. Guardar un identificador no carga etiquetas ni activa conversiones. Calendly está desactivado.",
        ),
      );
  }
  async function importScreen() {
    content.replaceChildren(
      heading(
        "Importación inicial de RIVTON",
        "Relevamiento real incluido. Validá el mapeo antes de aprobar. No se crean propiedades ni se publica contenido editorial.",
      ),
    );
    const reports = await api("admin/import/reports");
    const historyBox = card("Importaciones y recuperación");
    for (const report of reports.data.items) {
      historyBox.append(
        el(
          "p",
          report.createdAt +
            " · " +
            (report.rolledBack ? "Revertida" : "Registrada") +
            " · " +
            (report.counts.applied || 0) +
            " cambios",
        ),
      );
      if (!report.rolledBack)
        historyBox.append(
          btn("Revertir importación del " + report.createdAt, async () => {
            if (
              !confirm(
                "¿Restaurar el respaldo de esta importación? Se rechazarán cambios posteriores.",
              )
            )
              return;
            await api("admin/import/rollback", "POST", { reportId: report.id, approved: true });
            message("Respaldo recuperado.");
          }),
        );
    }
    content.append(historyBox);
    let intake;
    const file = el("input", null, {
      type: "file",
      accept: ".json,application/json",
      "aria-label": "Relevamiento JSON",
    });
    file.addEventListener("change", () =>
      run(async () => {
        const source = file.files[0];
        if (!source || source.size > 131072) throw new Error("El JSON debe pesar menos de 128 KB.");
        intake = JSON.parse(await source.text());
        message("Archivo leído. Falta validar y previsualizar.");
      }),
    );
    content.append(
      file,
      btn("Validar y previsualizar perfil RIVTON", async () => {
        const { data } = await api("admin/import/preview", "POST", intake ? { intake } : {});
        const preview = card("Mapeo propuesto");
        for (const item of data.items) {
          const details = el("details");
          details.append(
            el(
              "summary",
              `${item.label} · ${item.classification} · ${item.decision} · ${item.status}`,
            ),
          );
          const d = item.document;
          details.append(
            el("p", d.company?.presentation || d.description || d.name || d.label || ""),
          );
          for (const s of d.sections || [])
            details.append(
              el("h4", s.label || types[s.type]),
              el("p", s.content?.title || ""),
              el("p", s.content?.body || ""),
            );
          preview.append(details);
        }
        preview.append(el("h3", "Datos que faltan confirmar"));
        for (const missing of data.missing) preview.append(el("p", missing));
        preview.append(
          btn(
            "Aprobar y aplicar importación",
            async () => {
              if (
                !confirm(
                  "¿Aplicar los registros listos? Los conflictos se omiten y los textos quedan en borrador.",
                )
              )
                return;
              const result = await api("admin/import/apply", "POST", {
                token: data.token,
                approved: true,
              });
              message("Importación aplicada. Informe: " + result.data.reportId);
              const recovery = card(
                "Recuperación",
                el(
                  "p",
                  "El respaldo de cada registro y su revisión se conservan en WordPress. La reversión rechaza modificaciones posteriores.",
                ),
              );
              recovery.append(
                btn("Revertir esta importación", async () => {
                  if (!confirm("¿Restaurar los registros de esta importación?")) return;
                  await api("admin/import/rollback", "POST", {
                    reportId: result.data.reportId,
                    approved: true,
                  });
                  message("Importación revertida. Los medios permanecen reutilizables.");
                }),
              );
              content.append(recovery);
              await loadReferences();
            },
            "primary",
          ),
        );
        content.append(preview);
      }),
    );
  }
  function guide() {
    content.append(
      heading("Guía de uso"),
      card(
        "1. Configurar RIVTON",
        el(
          "p",
          "Abrí Importación, validá el perfil incluido y revisá los datos confirmados, propuestos y pendientes antes de aprobar. Los textos institucionales y legales quedan como borradores.",
        ),
      ),
      card(
        "2. Editar una página",
        el(
          "p",
          "Elegí una página en Constructor visual. Seleccioná una sección del árbol o la vista representativa. Cambiá texto o imágenes a la derecha. Los ajustes mobile/tablet heredan del compartido; Restablecer compartido elimina la sobrescritura.",
        ),
      ),
      card(
        "3. Guardar y publicar",
        el(
          "p",
          "Guardar borrador no cambia el contenido publicado. Publicar valida el borrador y lo expone en la API. Historial permite recuperar una versión como borrador. Ante un conflicto, conservá una copia de tus textos, recargá y conciliá los cambios.",
        ),
      ),
      card(
        "4. Administrar propiedades",
        el(
          "p",
          "Creá provincia, localidad y barrio en Geografía. Cargá la propiedad por pestañas. Elegí fotografías reales; la primera es la principal. Los atributos mantienen tipos numéricos, booleanos y de selección.",
        ),
      ),
      card(
        "5. Límites actuales",
        el(
          "p",
          "React no está conectado. La vista previa representa documentos, no simula scroll ni SSR. SMTP, analítica y Calendly no están configurados. Las revisiones legales y la política de almacenamiento deben aprobarse antes de recibir datos reales.",
        ),
      ),
    );
  }
  const shell = el("div", null, { class: "ec-shell" }),
    sidebar = el("aside", null, { class: "ec-sidebar" });
  sidebar.append(
    el("div", "RIVTON Core", { class: "ec-brand" }),
    el("small", "Contenido y administración"),
  );
  const nav = el("nav", null, { class: "ec-nav", "aria-label": "Administración RIVTON" });
  const entries = [
    ["dashboard", "Dashboard", "read"],
    ["builder", "Constructor visual", "estate_edit_content"],
    ["property", "Propiedades", "estate_edit_properties"],
    ["location", "Geografía", "estate_manage_settings"],
    ["category", "Tipos y operaciones", "estate_manage_settings"],
    ["feature", "Características y amenities", "estate_manage_settings"],
    ["team", "Equipo", "estate_edit_content"],
    ["media", "Fotos y videos", "upload_files"],
    ["lead", "Consultas", "estate_manage_leads"],
    ["company", "Empresa y formularios", "estate_manage_settings"],
    ["brand", "Marca", "estate_manage_settings"],
    ["navigation", "Navegación y filtros", "estate_manage_settings"],
    ["integrations", "Integraciones", "estate_manage_integrations"],
    ["import", "Importación inicial", "estate_manage_settings"],
    ["guide", "Guía de uso", "read"],
  ];
  for (const [key, label, cap] of entries)
    if (cap === "read" || cap === "upload_files" || cfg.caps[cap]) {
      const b = btn(label, () => navigate(key));
      b.dataset.screen = key;
      nav.append(b);
    }
  sidebar.append(nav);
  const body = el("div", null, { class: "ec-body" });
  notice = el("div", null, { role: "status", "aria-live": "polite", class: "ec-notice" });
  content = el("div", null, { class: "ec-content" });
  body.append(notice, content);
  shell.append(sidebar, body);
  root.replaceChildren(shell);
  run(() => navigate("dashboard"));
})();
