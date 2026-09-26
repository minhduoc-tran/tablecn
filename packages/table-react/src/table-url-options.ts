import type { TableUrlOptions } from "./table-url-codec"
import { getLayoutColumns, type LayoutColumnDef } from "./table-layout-state"

/**
 * URL options for these columns: unless `url.sortableColumns` says otherwise,
 * only columns that can sort are read from `sort`, and none with
 * `enableSorting: false`. `useDataTable` and
 * `useTableQuery` use it, so pass it to `parseTableParams` on the server too.
 */
export function tableUrlOptions(
  columns: readonly LayoutColumnDef[],
  url: TableUrlOptions = {},
  { enableSorting = true }: { enableSorting?: boolean } = {}
): TableUrlOptions {
  return {
    sortableColumns: getLayoutColumns(columns)
      .filter((column) => column.canSort)
      .map((column) => column.id),
    ...url,
    // Sorting off for the table: `sort` names no column, so it's ignored.
    ...(!enableSorting && { sortableColumns: [] }),
  }
}
