"use client"

import * as React from "react"
import {
  enTableMessages,
  type DataTableInstance,
  type DataTableRow,
  type TableMessages,
} from "@querycn/table-react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/radix/ui/button"
import { getSelectedPageRows } from "@/registry/shared/table/data-table-pagination-state"
import { useFocusToolbarOnUnmount } from "@/registry/shared/table/use-focus-toolbar-on-unmount"

export interface DataTableSelectionBarProps<TData extends object> extends Omit<
  React.ComponentProps<"div">,
  "children"
> {
  table: DataTableInstance<TData>
  messages?: TableMessages
  /** What can be done with the selected rows, e.g. a delete button. */
  actions?: (rows: DataTableRow<TData>[]) => React.ReactNode
}

/** The page's selected rows: their count, actions and a way to clear them. Hidden while none are selected. */
export function DataTableSelectionBar<TData extends object>(
  props: DataTableSelectionBarProps<TData>
) {
  const rows = getSelectedPageRows(props.table)
  if (rows.length === 0) return null
  return <SelectionBar {...props} rows={rows} />
}

function SelectionBar<TData extends object>({
  table,
  rows,
  messages = enTableMessages,
  actions,
  className,
  ...props
}: DataTableSelectionBarProps<TData> & { rows: DataTableRow<TData>[] }) {
  const ref = useFocusToolbarOnUnmount<HTMLDivElement>()
  return (
    <div
      ref={ref}
      data-slot="data-table-selection-bar"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-md border bg-muted/50 py-1 ps-3 pe-1 text-sm",
        className
      )}
      {...props}
    >
      <span className="tabular-nums">
        {messages.counts.selected(rows.length, table.getRowModel().rows.length)}
      </span>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions(rows)}</div>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="ms-auto"
        onClick={() => table.resetRowSelection(true)}
      >
        <XIcon />
        {messages.selection.clear}
      </Button>
    </div>
  )
}
