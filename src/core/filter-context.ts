import { createContext, useContext } from "react";
import { defaultFilters } from "./filter-definitions";
import type { SearchFilterDefinition } from "./contracts";
export const FilterDefinitionsContext = createContext<SearchFilterDefinition[]>(defaultFilters);
export const useFilterDefinitions = () => useContext(FilterDefinitionsContext);
