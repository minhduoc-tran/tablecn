import {
  decodeFilters,
  type FilterContext,
  type FilterState,
  type UrlFormat,
} from "@querycn/filter-core"

/** A page's awaited `searchParams`, or `request.nextUrl.searchParams` in a route handler. */
export type SearchParamsInput =
  URLSearchParams | Record<string, string | string[] | undefined>

export interface ParseFiltersOptions extends FilterContext {
  /** Must match the client's `urlFormat`. */
  urlFormat?: UrlFormat
}

/**
 * The applied filter from the request URL, decoded exactly as the client
 * does. Never throws: malformed rules are dropped.
 */
export function parseFilters(
  searchParams: SearchParamsInput,
  { urlFormat, ...context }: ParseFiltersOptions
): FilterState {
  if (searchParams instanceof URLSearchParams) {
    return decodeFilters(searchParams, context, urlFormat)
  }
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    for (const item of [value ?? []].flat()) params.append(key, item)
  }
  return decodeFilters(params, context, urlFormat)
}
