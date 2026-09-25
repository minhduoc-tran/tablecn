import { applyFilter, type FieldDefinition } from "@querycn/filter-core"
import {
  useAppliedFilter,
  useFilterAdapter,
  type UrlStateAdapter,
} from "@querycn/filter-react"
import {
  useTable,
  type RowData,
  type RowSelectionState,
} from "@tanstack/react-table"
import { useMemo, useState } from "react"

import {
  dataTableFeatures,
  type DataTableColumnDef,
} from "./data-table-features"
import type { TableUrlOptions } from "./table-url-codec"
import { getDefaultLayout, getLayoutColumns } from "./table-layout-state"
import type { LayoutStorage } from "./layout-storage"
import { useTableLayout } from "./use-table-layout"
import { useTableUrlState } from "./use-table-url-state"

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
}

export type UseDataTableOptions<TData extends RowData> =
  ServerDataTableOptions<TData> | ClientDataTableOptions<TData>

/**
 * A TanStack table with sort and pages in the URL, a saved column layout and
 * row selection. The selection holds within one page: it clears when the
 * page, sort or filter changes.
 */
export function useDataTable<TData extends RowData>(
  options: UseDataTableOptions<TData>
) {
  const { data, columns, url, enableRowSelection } = options
  const isServer = options.mode === "server"
  const applied = useAppliedFilter()
  const filterAdapter = useFilterAdapter()

  const getFilterValue = isServer ? undefined : options.getFilterValue
  const rows = useMemo(
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

  // A refetch leaves rowCount undefined for a moment; clamping against the last
  // known total keeps the page from jumping back and forth meanwhile.
  const [knownRowCount, setKnownRowCount] = useState<number>()
  const latestRowCount = isServer ? options.rowCount : rows.length
  if (latestRowCount !== undefined && latestRowCount !== knownRowCount) {
    setKnownRowCount(latestRowCount)
  }
  const rowCount = latestRowCount ?? knownRowCount

  const layoutColumns = useMemo(() => getLayoutColumns(columns), [columns])
  const urlState = useTableUrlState({
    // Other ids in `sort` are dropped, so the backend never gets them.
    sortableColumns: layoutColumns.filter((c) => c.canSort).map((c) => c.id),
    ...url,
    adapter: options.adapter ?? filterAdapter ?? undefined,
    rowCount,
  })
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
      pagination: { pageIndex: 0, pageSize: url?.defaultPageSize ?? 20 },
    }),
    [layoutColumns, url?.defaultSorting, url?.defaultPageSize]
  )

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const selectionScope = JSON.stringify([
    urlState.sorting,
    urlState.pagination,
    applied.queryKey,
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
    enableRowSelection,
    // Saves the layout once per drag instead of on every pointer move.
    columnResizeMode: "onEnd",
  })
}
