import type { QueryParams } from "@querycn/filter-core"
import type { SortingState } from "@tanstack/react-table"

import type { TableUrlState } from "./table-url-codec"

/** Sort and page as the backend reads them; merged with the filter's params by `useTableQuery`. */
export type TableParamsSerializer = (state: TableUrlState) => QueryParams

interface SortFieldOption {
  /** Backend field for a column id, e.g. `customer_name` → `customer__name`. */
  sortField?: (columnId: string) => string
}

const sortTokens = (
  sorting: SortingState,
  sortField: (columnId: string) => string = (id) => id,
  format: (field: string, desc: boolean) => string
) => sorting.map(({ id, desc }) => format(sortField(id), desc))

const withSort = (params: QueryParams, key: string, tokens: string[]) =>
  tokens.length ? { [key]: tokens.join(","), ...params } : params

const withSearch = (params: QueryParams, key: string, search: string) =>
  search ? { ...params, [key]: search } : params

export interface JsonApiTableParamsOptions extends SortFieldOption {
  /** Where the search text goes. Defaults to `filter[search]`. */
  searchParam?: string
}

/** `sort=-amount,name&page[number]=2&page[size]=20&filter[search]=ann` */
export function jsonApiTableParams({
  sortField,
  searchParam = "filter[search]",
}: JsonApiTableParamsOptions = {}): TableParamsSerializer {
  return ({ sorting, pagination, search }) =>
    withSearch(
      withSort(
        {
          "page[number]": String(pagination.pageIndex + 1),
          "page[size]": String(pagination.pageSize),
        },
        "sort",
        sortTokens(sorting, sortField, (field, desc) =>
          desc ? `-${field}` : field
        )
      ),
      searchParam,
      search
    )
}

export interface DjangoTableParamsOptions extends SortFieldOption {
  /** DRF `OrderingFilter.ordering_param`. Defaults to `ordering`. */
  orderingParam?: string
  /** Defaults to `page`. */
  pageParam?: string
  /** DRF `PageNumberPagination.page_size_query_param`. Defaults to `page_size`. */
  pageSizeParam?: string
  /** DRF `SearchFilter.search_param`. Defaults to `search`. */
  searchParam?: string
}

/** Django REST framework: `ordering=-amount,name&page=2&page_size=20&search=ann` */
export function djangoTableParams({
  sortField,
  orderingParam = "ordering",
  pageParam = "page",
  pageSizeParam = "page_size",
  searchParam = "search",
}: DjangoTableParamsOptions = {}): TableParamsSerializer {
  return ({ sorting, pagination, search }) =>
    withSearch(
      withSort(
        {
          [pageParam]: String(pagination.pageIndex + 1),
          [pageSizeParam]: String(pagination.pageSize),
        },
        orderingParam,
        sortTokens(sorting, sortField, (field, desc) =>
          desc ? `-${field}` : field
        )
      ),
      searchParam,
      search
    )
}

export interface PostgrestTableParamsOptions extends SortFieldOption {
  /** Backend columns the search looks in. Without them, the search isn't sent. */
  searchColumns?: readonly string[]
}

// Inside `and=(…)` PostgREST splits on reserved characters unless the value is quoted.
const quote = (text: string) =>
  /[,.:()"\\\s]/.test(text) ? `"${text.replace(/[\\"]/g, "\\$&")}"` : text

// One `or(…)` per word, like the client search: every word, in any column.
// LIKE wildcards in the text are escaped; `*` can't be, and stays a wildcard.
const searchFilter = (columns: readonly string[], search: string) => {
  const words = search.split(/\s+/).filter(Boolean)
  const perWord = words.map((word) => {
    const pattern = quote(`*${word.replace(/[\\%_]/g, "\\$&")}*`)
    return `or(${columns.map((column) => `${column}.ilike.${pattern}`).join(",")})`
  })
  return `(${perWord.join(",")})`
}

/**
 * PostgREST: `order=amount.desc,name.asc&limit=20&offset=20`, and the search
 * as `and=(or(name.ilike.*ann*,email.ilike.*ann*))` over `searchColumns`, one
 * `or` per word: `and`, so it doesn't clash with the `or` a filter joined by OR
 * writes. `ilike` minds accents unless the backend uses `unaccent`. Ask for the
 * total with the `Prefer: count=exact` header and read it from `Content-Range`.
 */
export function postgrestTableParams({
  sortField,
  searchColumns = [],
}: PostgrestTableParamsOptions = {}): TableParamsSerializer {
  return ({ sorting, pagination, search }) =>
    withSearch(
      withSort(
        {
          limit: String(pagination.pageSize),
          offset: String(pagination.pageIndex * pagination.pageSize),
        },
        "order",
        sortTokens(
          sorting,
          sortField,
          (field, desc) => `${field}.${desc ? "desc" : "asc"}`
        )
      ),
      "and",
      search && searchColumns.length ? searchFilter(searchColumns, search) : ""
    )
}
