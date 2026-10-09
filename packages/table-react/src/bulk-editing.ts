import type { RowData } from "@tanstack/react-table"

import type { CellEditorOption } from "./cell-editing"
import type { DataTableInstance, DataTableRow } from "./use-data-table"

/** What `onBulkEdit` gets when the same values are applied to the selected rows. */
export interface BulkEdit<TData> {
  rowIds: string[]
  rows: TData[]
  /** The new values, by column id. */
  changes: Record<string, unknown>
  /** The picked option of each `select` column, its label too, to show before a refetch. */
  options: Record<string, CellEditorOption>
}

/**
 * The columns a bulk edit can change in these rows: those with `meta.edit`
 * that `canEditCell` allows in every row, hidden ones included. None without
 * `onBulkEdit` or `onCellEdit`.
 */
export function getBulkEditColumns<TData extends RowData>(
  table: DataTableInstance<TData>,
  rows: readonly DataTableRow<TData>[]
) {
  const meta = table.options.meta
  if (!meta?.onBulkEdit && !meta?.onCellEdit) return []
  return table
    .getAllLeafColumns()
    .filter(
      (column) =>
        column.columnDef.meta?.edit &&
        rows.every((row) => meta.canEditCell?.(row.original, column.id) ?? true)
    )
}

/**
 * Saves `changes` in every row: one `onBulkEdit` call, else `onCellEdit` for
 * each changed cell. Rejects with the first error once every save settled.
 */
export async function applyBulkEdit<TData extends RowData>(
  table: DataTableInstance<TData>,
  rows: readonly DataTableRow<TData>[],
  changes: Record<string, unknown>,
  options: Record<string, CellEditorOption> = {}
): Promise<void> {
  const meta = table.options.meta
  if (meta?.onBulkEdit) {
    await meta.onBulkEdit({
      rowIds: rows.map((row) => row.id),
      rows: rows.map((row) => row.original),
      changes,
      options,
    })
    return
  }
  const onCellEdit = meta?.onCellEdit
  if (!onCellEdit) return
  // Rows in parallel; one row's cells in turn, so its saves never race.
  const results = await Promise.allSettled(
    rows.map(async (row) => {
      for (const [columnId, value] of Object.entries(changes)) {
        const previous = row.getValue(columnId)
        if (Object.is(previous, value)) continue
        await onCellEdit({
          row: row.original,
          rowId: row.id,
          columnId,
          value,
          previous,
          option: options[columnId],
        })
      }
    })
  )
  const failed = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected"
  )
  if (failed) throw failed.reason
}
