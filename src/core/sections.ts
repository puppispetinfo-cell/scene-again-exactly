import type { ComponentType } from "react";
import { pageSectionSchema, type PageSection } from "./contracts";
import { z } from "zod";
// Components are explicitly registered by the application, never resolved from CMS code.
export type SectionRenderer = ComponentType<{ section: PageSection }>;
export type SectionRegistry = Partial<Record<PageSection["type"], SectionRenderer>>;
export function orderedSections(sections: PageSection[], viewport: "mobile" | "desktop") {
  const ids = new Set<string>();
  for (const s of sections) {
    if (ids.has(s.id)) throw new Error("Duplicate section ID");
    ids.add(s.id);
  }
  return sections
    .filter((s) => s.visible && s.responsive[viewport].visible)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function resolveSections(
  input: unknown,
  viewport: "mobile" | "desktop",
  registry: SectionRegistry,
) {
  const sections = orderedSections(z.array(pageSectionSchema).max(100).parse(input), viewport);
  return sections.map((section) => {
    const Renderer = registry[section.type];
    if (!Renderer) throw new Error(`Section renderer not registered: ${section.type}`);
    return { section, Renderer };
  });
}
