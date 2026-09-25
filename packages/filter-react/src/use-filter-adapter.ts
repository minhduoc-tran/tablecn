import { useContext } from "react"

import type { UrlStateAdapter } from "./adapters/url-state-adapter-types"
import { FilterAdapterContext } from "./filter-contexts"

/**
 * The nearest `FilterProvider`'s adapter, or `null` outside one. Params kept
 * next to the filter (a table's `sort`, `page`) should write through it: with
 * router adapters, a second instance could overwrite writes it doesn't know about.
 */
export function useFilterAdapter(): UrlStateAdapter | null {
  return useContext(FilterAdapterContext)
}
