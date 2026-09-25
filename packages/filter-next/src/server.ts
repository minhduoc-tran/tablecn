import {
  decodeFilters,
  type FilterContext,
  type FilterState,
} from "@querycn/filter-core"

/** A page's awaited `searchParams`, or `request.nextUrl.searchParams` in a route handler. */
export type SearchParamsInput =
  URLSearchParams | Record<string, string | string[] | undefined>

export interface ParseFiltersOptions extends FilterContext {
  param?: string
}

/**
 * The applied filter from the request URL, decoded exactly as the client
 * does. Never throws: a malformed value gives an empty filter.
 */
export function parseFilters(
  searchParams: SearchParamsInput,
  { param = "filters", ...context }: ParseFiltersOptions
): FilterState {
  const raw =
    searchParams instanceof URLSearchParams
      ? searchParams.get(param)
      : [searchParams[param]].flat()[0]
  return decodeFilters(raw ?? null, context)
}
