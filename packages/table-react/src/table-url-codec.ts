import type { ParamPatch } from "@querycn/filter-react"
import type { PaginationState, SortingState } from "@tanstack/react-table"

export interface TableUrlParams {
  sort?: string
  page?: string
  perPage?: string
  search?: string
}

export interface TableUrlOptions {
  /** Param names. Defaults to `sort`, `page`, `per_page`, `q`. */
  params?: TableUrlParams
  /** Defaults to `[10, 20, 50, 100]`. */
  pageSizes?: readonly number[]
  /** Defaults to 20. */
  defaultPageSize?: number
  /** Used when the URL has no sort param. Defaults to none. */
  defaultSorting?: SortingState
  /** Column ids the URL may sort by. Defaults to any. */
  sortableColumns?: readonly string[]
  /** Defaults to 3. */
  maxSortColumns?: number
}

export interface TableUrlState {
  sorting: SortingState
  pagination: PaginationState
  /** Free text to search the rows for; `""` when none. */
  search: string
}

export const DEFAULT_PAGE_SIZES: readonly number[] = [10, 20, 50, 100]
export const DEFAULT_PAGE_SIZE = 20
const DEFAULT_MAX_SORT_COLUMNS = 3
// Longer text from a link is cut, so it can't grow a request without limit.
const MAX_SEARCH_LENGTH = 200

function resolveOptions(options: TableUrlOptions) {
  const defaultPageSize = options.defaultPageSize ?? DEFAULT_PAGE_SIZE
  return {
    sortParam: options.params?.sort ?? "sort",
    pageParam: options.params?.page ?? "page",
    perPageParam: options.params?.perPage ?? "per_page",
    searchParam: options.params?.search ?? "q",
    pageSizes: options.pageSizes ?? DEFAULT_PAGE_SIZES,
    defaultPageSize,
    defaultSorting: options.defaultSorting ?? [],
    sortableColumns: options.sortableColumns,
    maxSortColumns: options.maxSortColumns ?? DEFAULT_MAX_SORT_COLUMNS,
  }
}

// `-amount,name`: `-` means descending.
const formatSorting = (sorting: SortingState) =>
  sorting.map(({ id, desc }) => (desc ? `-${id}` : id)).join(",")

function parsePositiveInteger(raw: string | null): number | undefined {
  if (raw === null || !/^\d+$/.test(raw)) return undefined
  const value = Number(raw)
  return Number.isSafeInteger(value) && value >= 1 ? value : undefined
}

/** Search text as the URL keeps it: trimmed, at most 200 characters. */
export const normalizeSearch = (search: string) =>
  search.trim().slice(0, MAX_SEARCH_LENGTH).trim()

/**
 * Params for `sort`, `page`, `per_page` and `q`, ready for an adapter write.
 * Defaults become `null` so the URL stays short; a cleared sort that has a
 * default is written as an empty `sort`, so it isn't read back as the default.
 */
export function encodeTableParams(
  { sorting, pagination, search }: TableUrlState,
  options: TableUrlOptions = {}
): ParamPatch {
  const resolved = resolveOptions(options)
  const sort = formatSorting(sorting.slice(0, resolved.maxSortColumns))
  const defaultSort = formatSorting(resolved.defaultSorting)
  return {
    [resolved.sortParam]: sort === defaultSort ? null : sort,
    [resolved.pageParam]:
      pagination.pageIndex > 0 ? String(pagination.pageIndex + 1) : null,
    [resolved.perPageParam]:
      pagination.pageSize === resolved.defaultPageSize
        ? null
        : String(pagination.pageSize),
    [resolved.searchParam]: normalizeSearch(search) || null,
  }
}

/**
 * Never throws: unknown or repeated sort columns are dropped, a bad page is
 * page 1 and a page size outside `pageSizes` is the default. `pageIndex` is
 * 0-based like TanStack Table; the URL's `page` is 1-based.
 */
export function decodeTableParams(
  search: string | URLSearchParams | null | undefined,
  options: TableUrlOptions = {}
): TableUrlState {
  const params =
    search instanceof URLSearchParams
      ? search
      : new URLSearchParams(search ?? "")
  const resolved = resolveOptions(options)

  const rawSort = params.get(resolved.sortParam)
  let sorting: SortingState = resolved.defaultSorting
  if (rawSort !== null) {
    sorting = []
    const seen = new Set<string>()
    for (const token of rawSort.split(",")) {
      const desc = token.startsWith("-")
      const id = desc ? token.slice(1) : token
      if (!id || seen.has(id)) continue
      if (resolved.sortableColumns && !resolved.sortableColumns.includes(id)) {
        continue
      }
      seen.add(id)
      sorting.push({ id, desc })
      if (sorting.length === resolved.maxSortColumns) break
    }
  }

  const page = parsePositiveInteger(params.get(resolved.pageParam)) ?? 1
  const perPage = parsePositiveInteger(params.get(resolved.perPageParam))
  const pageSize =
    perPage !== undefined &&
    (perPage === resolved.defaultPageSize ||
      resolved.pageSizes.includes(perPage))
      ? perPage
      : resolved.defaultPageSize

  return {
    sorting,
    pagination: { pageIndex: page - 1, pageSize },
    search: normalizeSearch(params.get(resolved.searchParam) ?? ""),
  }
}

/** For `FilterProvider`'s `onApply`: a new filter starts again at page 1. */
export const resetPagePatch = (options: TableUrlOptions = {}): ParamPatch => ({
  [options.params?.page ?? "page"]: null,
})
