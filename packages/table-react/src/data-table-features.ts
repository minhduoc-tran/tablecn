import {
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table"

import type { BulkEdit } from "./bulk-editing"
import type { CellEdit } from "./cell-editing"
import { columnColorFeature } from "./column-color-feature"
import type { DataTableColumnMeta } from "./table-layout-state"

/** `table.options.meta`: what the UI needs from `useDataTable`'s options. */
export interface DataTableMeta {
  /** `false` when `useDataTable`'s `enableColumnOrdering` turns moving columns off. */
  enableColumnOrdering?: boolean
  /** The page sizes the URL accepts, default included, for the rows-per-page picker. */
  pageSizes: readonly number[]
  /** Back to the columns' default layout, forgetting the saved one. */
  resetLayout: () => void
  /** The search text in the URL (`?q=`); `""` when none. */
  search: string
  /** Writes the search to the URL and goes back to page 1. */
  setSearch: (search: string) => void
  /** `useDataTable`'s, for the cells of columns with `meta.edit`. */
  onCellEdit?: (edit: CellEdit<unknown>) => void | Promise<void>
  canEditCell?: (row: unknown, columnId: string) => boolean
  /** `useDataTable`'s, for the Bulk edit of the selected rows. */
  onBulkEdit?: (edit: BulkEdit<unknown>) => void | Promise<void>
}

/**
 * Every feature `useDataTable` turns on. The row models only run in client
 * mode; server mode sorts and paginates manually.
 */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnResizingFeature,
  columnColorFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns,
  columnMeta: {} as DataTableColumnMeta,
  tableMeta: {} as DataTableMeta,
})

export type DataTableFeatures = typeof dataTableFeatures

export type DataTableColumnDef<TData extends RowData> = ColumnDef<
  DataTableFeatures,
  TData,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- columns hold values of any type
  any
>

/** A TanStack column helper typed for `useDataTable`. */
export const createDataTableColumnHelper = <TData extends RowData>() =>
  createColumnHelper<DataTableFeatures, TData>()
