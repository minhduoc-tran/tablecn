import type { TableUrlOptions } from "./table-url-codec"
import { getLayoutColumns, type LayoutColumnDef } from "./table-layout-state"

/**
 * URL options for these columns: unless `url.sortableColumns` says otherwise,
 * only columns that can sort are read from `sort`. `useDataTable` and
 * `useTableQuery` use it, so pass it to `parseTableParams` on the server too.
 */
export function tableUrlOptions(
  columns: readonly LayoutColumnDef[],
  url: TableUrlOptions = {}
): TableUrlOptions {
  return {
    sortableColumns: getLayoutColumns(columns)
      .filter((column) => column.canSort)
      .map((column) => column.id),
    ...url,
  }
}
