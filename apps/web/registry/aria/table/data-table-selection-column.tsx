"use client"

import * as React from "react"
import {
  createDataTableColumnHelper,
  enTableMessages,
  type DataTableColumnDef,
  type TableMessages,
} from "@querycn/table-react"

import { Checkbox } from "@/registry/aria/ui/checkbox"

// shadcn's checkbox draws "some selected" with its check icon; show a dash instead.
const MIXED =
  "data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground data-indeterminate:before:h-0.5 data-indeterminate:before:w-2 data-indeterminate:before:rounded-full data-indeterminate:before:bg-current data-indeterminate:[&_svg]:hidden"

/**
 * A checkbox column for row selection: the header one selects the page.
 * Pinned to the start and can't be hidden, sorted or resized.
 */
export function createSelectionColumn<TData extends object>(
  messages: Pick<TableMessages, "selection"> = enTableMessages
): DataTableColumnDef<TData> {
  return createDataTableColumnHelper<TData>().display({
    id: "select",
    size: 40,
    enableSorting: false,
    enableHiding: false,
    enablePinning: false,
    enableResizing: false,
    meta: { defaultPinned: "start" },
    header: ({ table }) => (
      <Checkbox
        aria-label={messages.selection.selectAll}
        className={MIXED}
        isSelected={table.getIsAllPageRowsSelected()}
        isIndeterminate={
          table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
        }
        onChange={(selected) => table.toggleAllPageRowsSelected(selected)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={messages.selection.selectRow}
        isSelected={row.getIsSelected()}
        isDisabled={!row.getCanSelect()}
        onChange={(selected) => row.toggleSelected(selected)}
      />
    ),
  })
}
