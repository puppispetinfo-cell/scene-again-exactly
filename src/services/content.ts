import { localProperties, localSettings, localTeam } from "@/data/properties";
import { createContentRepository } from "@/core/repository";
import { defaultTheme } from "@/core/theme";
import { defaultFilters } from "@/core/filter-definitions";
// Only public configuration may use VITE_ prefixes. Never add admin tokens.
const repository = createContentRepository(
  {
    provider: import.meta.env["VITE_CONTENT_PROVIDER"] ?? "mock",
    publicEndpoint: import.meta.env["VITE_WP_PUBLIC_SNAPSHOT_URL"],
  },
  {
    schemaVersion: 1,
    revision: "local-v1",
    properties: localProperties,
    settings: localSettings,
    team: localTeam,
  },
);
export const invalidateContent = () => repository.invalidate();
export async function getProperties() {
  return (await repository.read()).properties;
}
export async function getPropertyBySlug(slug: string) {
  return (await getProperties()).find((p) => p.slug === slug) ?? null;
}
export async function getFeatured() {
  return (await getProperties())
    .filter((p) => p.featured)
    .sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99));
}
export async function getLatest(limit = 4) {
  return (await getProperties())
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit);
}
export async function getSettings() {
  return (await repository.read()).settings;
}
export async function getTeam() {
  return (await repository.read()).team;
}
export async function getTheme() {
  return (await repository.read()).theme ?? defaultTheme;
}
export async function getFilterDefinitions() {
  return (await repository.read()).filters ?? defaultFilters;
}

export async function getPublicConfiguration() {
  const snapshot = await repository.read();
  return { theme: snapshot.theme ?? defaultTheme, filters: snapshot.filters ?? defaultFilters };
}
