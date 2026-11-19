import { createContext, useContext } from "react";
import type { PublicSnapshot } from "./public-content";
export const PublishedContext = createContext<PublicSnapshot | null>(null);
export const usePublished = () => useContext(PublishedContext);
export function useElement(page: string, id: string) {
  return usePublished()?.pages[page]?.elements.find((e) => e.id === id);
}
