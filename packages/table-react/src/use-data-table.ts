import { applyFilter, type FieldDefinition } from "@querycn/filter-core"
import {
  createMemoryAdapter,
  useAdapterValue,
  useAppliedFilter,
  useFilterAdapter,
  type UrlStateAdapter,
} from "@querycn/filter-react"
import {
  useTable,
  type RowData,
  type RowSelectionState,
} from "@tanstack/react-table"
import { useEffect, useMemo, useState } from "react"

import {
  dataTableFeatures,
  type DataTableColumnDef,
} from "./data-table-features"
import {
  decodeTableParams,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_SIZES,
  type TableUrlOptions,
} from "./table-url-codec"
import { getSearchAccessors, searchRows } from "./table-search"
import { getDefaultLayout, getLayoutColumns } from "./table-layout-state"
import type { LayoutStorage } from "./layout-storage"
import { useTableLayout } from "./use-table-layout"
import { tableUrlOptions } from "./table-url-options"
import { useTableUrlStateFrom } from "./use-table-url-state"

interface DataTableBaseOptions<TData extends RowData> {
  /** Keep the reference stable (state or memo), as for any TanStack table. */
  data: readonly TData[]
  columns: readonly DataTableColumnDef<TData>[]
  /** Row ids keep the selection across refetches. */
  getRowId: (row: TData, index: number) => string
  /** Defaults to the nearest `FilterProvider`'s adapter, else memory. */
  adapter?: UrlStateAdapter
  url?: TableUrlOptions
  /** Saves the column layout to `localStorage` under this key. */
  storageKey?: string
  layoutStorage?: LayoutStorage
  layoutVersion?: number
  enableRowSelection?: boolean | ((row: { original: TData }) => boolean)
  /** Reading direction, so resizing follows the pointer in right-to-left layouts. */
  dir?: "ltr" | "rtl"
}

/** `data` is one page, already filtered and sorted by the backend. */
export interface ServerDataTableOptions<
  TData extends RowData,
> extends DataTableBaseOptions<TData> {
  mode: "server"
  /** Total rows across pages; `undefined` while unknown. */
  rowCount: number | undefined
}

/** `data` is every row; the applied filter, sort and pages run here. */
export interface ClientDataTableOptions<
  TData extends RowData,
> extends DataTableBaseOptions<TData> {
  mode?: "client"
  /**
   * A filter field's value in a row; defaults to `row[field.name]`. Needed when
   * field names aren't row keys (`customer.name`). Keep it stable, like `data`.
   */
  getFilterValue?: (row: TData, field: FieldDefinition) => unknown
  /**
   * Column ids the search (`?q=`) looks in. Defaults to every column with an
   * accessor. Keep it stable, like `columns`.
   */
  searchColumns?: readonly string[]
}

export type UseDataTableOptions<TData extends RowData> =
  ServerDataTableOptions<TData> | ClientDataTableOptions<TData>

/**
 * A TanStack table with sort, pages and search in the URL, a saved column
 * layout and row selection. The selection holds within one page: it clears
 * when the page, sort, search or filter changes.
 */
export function useDataTable<TData extends RowData>(
  options: UseDataTableOptions<TData>
) {
  const { data, columns, url, enableRowSelection } = options
  const isServer = options.mode === "server"
  const applied = useAppliedFilter()
  const filterAdapter = useFilterAdapter()

  const [memoryAdapter] = useState(() => createMemoryAdapter())
  const adapter = options.adapter ?? filterAdapter ?? memoryAdapter
  const urlOptions = tableUrlOptions(columns, url)
  // Read once for the search and the URL state, so a pending write shows in both;
  // the search comes first because the URL state counts the searched rows.
  const adapterValue = useAdapterValue(adapter)
  const search = decodeTableParams(adapterValue[0], urlOptions).search

  const getFilterValue = isServer ? undefined : options.getFilterValue
  const filtered = useMemo(
    () =>
      isServer || applied.activeCount === 0
        ? data
        : applyFilter(data, applied.state, {
            ...applied.context,
            getValue: getFilterValue,
          }),
    [
      isServer,
      data,
      applied.activeCount,
      applied.state,
      applied.context,
      getFilterValue,
    ]
  )
  const searchColumns = isServer ? undefined : options.searchColumns
  const searchAccessors = useMemo(
    () => getSearchAccessors<TData>(columns, searchColumns),
    [columns, searchColumns]
  )
  const rows = useMemo(
    () => (isServer ? filtered : searchRows(filtered, search, searchAccessors)),
    [isServer, filtered, search, searchAccessors]
  )

  // A refetch leaves rowCount undefined for a moment; clamping against the last
  // known total keeps the page from jumping back and forth meanwhile. The filter
  // and search it came with tell whether it still describes the rows the URL
  // asks for: a new total, or new rows (the backend answered, even with the
  // same total), belong to the current ones; the rows and total
  // `keepPreviousData` hands over while fetching don't.
  const [known, setKnown] = useState<{
    rowCount: number
    filterKey: string
    data: readonly TData[]
  }>()
  const latestRowCount = isServer ? options.rowCount : rows.length
  const filterKey = JSON.stringify([applied.queryKey, search])
  if (
    latestRowCount !== undefined &&
    (latestRowCount !== known?.rowCount ||
      (filterKey !== known.filterKey && data !== known.data))
  ) {
    setKnown({ rowCount: latestRowCount, filterKey, data })
  }
  const rowCount = latestRowCount ?? known?.rowCount

  const layoutColumns = useMemo(() => getLayoutColumns(columns), [columns])
  const urlState = useTableUrlStateFrom(adapterValue, {
    // Unsortable ids in `sort` are dropped, so the backend never gets them.
    ...urlOptions,
    rowCount,
  })
  // The backend's total says the URL's page doesn't exist: point the URL, and so
  // the next fetch, at the last page. Not with a total kept from another filter
  // (`keepPreviousData` after back/forward), nor in client mode, where rows may
  // still be loading.
  const { isPageClamped, onPaginationChange } = urlState
  const fixPage =
    isServer &&
    isPageClamped &&
    options.rowCount !== undefined &&
    known?.filterKey === filterKey
  useEffect(() => {
    if (fixPage) onPaginationChange((pagination) => pagination)
  }, [fixPage, onPaginationChange])
  const layout = useTableLayout({
    columns,
    storageKey: options.storageKey,
    storage: options.layoutStorage,
    version: options.layoutVersion,
  })
  // What `table.resetSorting()`, `resetPageSize()`, `resetColumnOrder()`… go back to.
  // TanStack reads it once, so later column changes aren't in it.
  const initialState = useMemo(
    () => ({
      ...getDefaultLayout(layoutColumns),
      sorting: url?.defaultSorting ?? [],
      pagination: {
        pageIndex: 0,
        pageSize: url?.defaultPageSize ?? DEFAULT_PAGE_SIZE,
      },
    }),
    [layoutColumns, url?.defaultSorting, url?.defaultPageSize]
  )

  // The URL takes the default size too, even when it isn't in `pageSizes`.
  const pageSizes = useMemo(
    () =>
      [
        ...new Set([
          ...(url?.pageSizes ?? DEFAULT_PAGE_SIZES),
          url?.defaultPageSize ?? DEFAULT_PAGE_SIZE,
        ]),
      ].sort((a, b) => a - b),
    [url?.pageSizes, url?.defaultPageSize]
  )

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const selectionScope = JSON.stringify([
    urlState.sorting,
    urlState.pagination,
    filterKey,
  ])
  const [scope, setScope] = useState(selectionScope)
  if (scope !== selectionScope) {
    setScope(selectionScope)
    setRowSelection({})
  }

  return useTable({
    features: dataTableFeatures,
    data: rows as TData[],
    columns: columns as DataTableColumnDef<TData>[],
    getRowId: options.getRowId,
    initialState,
    state: {
      sorting: urlState.sorting,
      pagination: urlState.pagination,
      rowSelection,
      ...layout.state,
    },
    onSortingChange: urlState.onSortingChange,
    onPaginationChange: urlState.onPaginationChange,
    onRowSelectionChange: setRowSelection,
    ...layout.handlers,
    manualSorting: isServer,
    manualPagination: isServer,
    rowCount: isServer ? rowCount : undefined,
    // The URL keeps the page; an out-of-range page is clamped, not rewritten.
    autoResetPageIndex: false,
    maxMultiSortColCount: url?.maxSortColumns ?? 3,
    // Ascending first for every type; a column opts out with `sortDescFirst: true`.
    sortDescFirst: false,
    enableRowSelection,
    // Saves the layout once per drag instead of on every pointer move.
    columnResizeMode: "onEnd",
    columnResizeDirection: options.dir ?? "ltr",
    meta: {
      pageSizes,
      resetLayout: layout.reset,
      search: urlState.search,
      setSearch: urlState.onSearchChange,
    },
  })
}

/** What `useDataTable` returns: the TanStack table the UI renders. */
export type DataTableInstance<TData extends RowData> = ReturnType<
  typeof useDataTable<TData>
>

export type DataTableRow<TData extends RowData> = ReturnType<
  DataTableInstance<TData>["getRow"]
>
