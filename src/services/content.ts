import type { PublicSnapshot } from "@/platform/public-content";
import { readPublic } from "@/platform/public-content";
// Every public read passes through server functions; the database enforces published-only access.
export const getContent = async (): Promise<PublicSnapshot> => JSON.parse(await readPublic());
export const invalidateContent = () => {}; // Reads are no-store; publication is visible on the next request.
export async function getProperties() {
  return (await getContent()).properties;
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
  return [...(await getProperties())]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit);
}
export async function getSettings() {
  return (await getContent()).settings;
}
export async function getTeam() {
  return (await getContent()).team;
}
export async function getTheme() {
  return (await getContent()).theme;
}
export async function getFilterDefinitions() {
  return (await getContent()).filters;
}
export async function getPublicConfiguration() {
  const snapshot = await getContent();
  return { theme: snapshot.theme!, filters: snapshot.filters!, cms: snapshot };
}
