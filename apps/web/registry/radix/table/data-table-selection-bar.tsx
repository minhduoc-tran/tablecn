"use client"

import * as React from "react"
import {
  enTableMessages,
  type DataTableInstance,
  type DataTableRow,
  type TableMessages,
} from "@querycn/table-react"
import { XIcon } from "lucide-react"

import { cn } from "cn"
import { Button } from "@/registry/radix/ui/button"
import { Separator } from "@/registry/radix/ui/separator"
import { onToolbarArrowKeys } from "@/registry/shared/table/toolbar-arrow-keys"
import { useFloatingSelectionBar } from "@/registry/shared/table/use-floating-selection-bar"

export interface DataTableSelectionBarProps<TData extends object> extends Omit<
  React.ComponentProps<"div">,
  "children"
> {
  table: DataTableInstance<TData>
  messages?: TableMessages
  /** What can be done with the selected rows, e.g. a delete button. */
  actions?: (rows: DataTableRow<TData>[]) => React.ReactNode
}

/**
 * Floats over the bottom of the table while rows of the page are selected:
 * their count, actions and a button that clears them.
 */
export function DataTableSelectionBar<TData extends object>({
  table,
  messages = enTableMessages,
  actions,
  className,
  ...props
}: DataTableSelectionBarProps<TData>) {
  const { ref, mounted, closing, rows } = useFloatingSelectionBar(table)
  const countId = React.useId()
  if (!mounted) return null
  return (
    <div
      ref={ref}
      role="toolbar"
      aria-labelledby={countId}
      data-slot="data-table-selection-bar"
      data-state={closing ? "closed" : "open"}
      onKeyDown={onToolbarArrowKeys}
      className={cn(
        // The theme's colors swapped: dark on a light page, light on a dark one.
        "fixed bottom-(--bar-bottom) left-(--bar-x) z-40 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full bg-foreground p-1 text-sm text-background shadow-lg",
        // Buttons inside, the app's too, hover in the pill's colors, beating `ghost`'s own.
        "[&_button:not(:disabled):hover]:bg-background/15 [&_button:not(:disabled):hover]:text-background [&_button[aria-expanded=true]]:bg-background/15 [&_button[aria-expanded=true]]:text-background",
        "duration-200 data-[state=closed]:pointer-events-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 motion-reduce:animate-none",
        className
      )}
      {...props}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-full"
        aria-label={messages.selection.clear}
        onClick={() => table.resetRowSelection(true)}
      >
        <XIcon />
      </Button>
      <Separator orientation="vertical" className="my-1 bg-background/20" />
      <span id={countId} className="px-3 whitespace-nowrap tabular-nums">
        {messages.counts.selected(rows.length, table.getRowModel().rows.length)}
      </span>
      {actions && (
        <>
          <Separator orientation="vertical" className="my-1 bg-background/20" />
          <div className="flex items-center gap-1">{actions(rows)}</div>
        </>
      )}
    </div>
  )
}
