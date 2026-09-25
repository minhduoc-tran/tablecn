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

/** `sort=-amount,name&page[number]=2&page[size]=20` */
export function jsonApiTableParams({
  sortField,
}: SortFieldOption = {}): TableParamsSerializer {
  return ({ sorting, pagination }) =>
    withSort(
      {
        "page[number]": String(pagination.pageIndex + 1),
        "page[size]": String(pagination.pageSize),
      },
      "sort",
      sortTokens(sorting, sortField, (field, desc) =>
        desc ? `-${field}` : field
      )
    )
}

export interface DjangoTableParamsOptions extends SortFieldOption {
  /** DRF `OrderingFilter.ordering_param`. Defaults to `ordering`. */
  orderingParam?: string
  /** Defaults to `page`. */
  pageParam?: string
  /** DRF `PageNumberPagination.page_size_query_param`. Defaults to `page_size`. */
  pageSizeParam?: string
}

/** Django REST framework: `ordering=-amount,name&page=2&page_size=20` */
export function djangoTableParams({
  sortField,
  orderingParam = "ordering",
  pageParam = "page",
  pageSizeParam = "page_size",
}: DjangoTableParamsOptions = {}): TableParamsSerializer {
  return ({ sorting, pagination }) =>
    withSort(
      {
        [pageParam]: String(pagination.pageIndex + 1),
        [pageSizeParam]: String(pagination.pageSize),
      },
      orderingParam,
      sortTokens(sorting, sortField, (field, desc) =>
        desc ? `-${field}` : field
      )
    )
}

/**
 * PostgREST: `order=amount.desc,name.asc&limit=20&offset=20`. Ask for the
 * total with the `Prefer: count=exact` header and read it from `Content-Range`.
 */
export function postgrestTableParams({
  sortField,
}: SortFieldOption = {}): TableParamsSerializer {
  return ({ sorting, pagination }) =>
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
    )
}
