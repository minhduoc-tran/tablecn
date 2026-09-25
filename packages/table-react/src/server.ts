import {
  decodeTableParams,
  type TableUrlOptions,
  type TableUrlState,
} from "./table-url-codec"

export { decodeTableParams, encodeTableParams } from "./table-url-codec"
export {
  djangoTableParams,
  jsonApiTableParams,
  postgrestTableParams,
} from "./table-params-serializers"
export type {
  DjangoTableParamsOptions,
  TableParamsSerializer,
} from "./table-params-serializers"
export { tableUrlOptions } from "./table-url-options"
export type {
  TableUrlOptions,
  TableUrlParams,
  TableUrlState,
} from "./table-url-codec"

/** A page's awaited `searchParams`, or `request.nextUrl.searchParams` in a route handler. */
export type SearchParamsInput =
  URLSearchParams | Record<string, string | string[] | undefined>

/** Sorting and pagination from the request URL, decoded exactly as the client does. */
export function parseTableParams(
  searchParams: SearchParamsInput,
  options: TableUrlOptions = {}
): TableUrlState {
  if (searchParams instanceof URLSearchParams) {
    return decodeTableParams(searchParams, options)
  }
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    for (const item of [value ?? []].flat()) params.append(key, item)
  }
  return decodeTableParams(params, options)
}
