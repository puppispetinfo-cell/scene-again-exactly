export function editableFields(page: string, id: string): ReadonlySet<string> {
  const common = ["title", "body"];
  if (page === "/") {
    if (id.startsWith("scene-"))
      return new Set([
        "title",
        "subtitle",
        "body",
        "image",
        ...(id === "scene-1" ? [] : ["button"]),
      ]);
    if (["featured", "latest", "categories"].includes(id))
      return new Set(["title", "subtitle", ...(id === "latest" ? ["button"] : [])]);
    if (id === "publish") return new Set(["title", "subtitle", "image", "button"]);
    if (id === "team") return new Set(["title", "subtitle", "body", "image", "button"]);
  }
  if (page === "nosotros") return new Set(["title", "body", "image", "button"]);
  if (["contacto", "publicar"].includes(page)) return new Set(["title", "body", "image"]);
  if (page === "propiedades") return new Set(["title", "subtitle"]);
  if (page === "favoritos") return new Set(["title", "subtitle", "body"]);
  if (page === "ficha") return new Set(["button"]);
  return new Set(common);
}
