"use client"

import * as React from "react"
import type { DataTableInstance, TableMessages } from "@querycn/table-react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  EyeOffIcon,
  MoreHorizontalIcon,
  MoveHorizontalIcon,
  PinIcon,
  PinOffIcon,
  XIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/aria/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/registry/aria/ui/dropdown-menu"
import { DataTableColumnColorMenu } from "@/registry/aria/table/data-table-column-color-menu"
import { getColumnLabel } from "@/registry/shared/table/column-label"
import {
  fitColumns,
  pinColumn,
} from "@/registry/shared/table/column-layout-actions"

type Column<TData extends object> = ReturnType<
  DataTableInstance<TData>["getAllLeafColumns"]
>[number]

interface ColumnMenuProps<TData extends object> {
  table: DataTableInstance<TData>
  column: Column<TData>
  messages: TableMessages
  /** Opens a color picker, e.g. `useColumnColorPicker`'s `open`. */
  onCustomColor: () => void
}

/** Pin, fit and color: the layout items of a column's menu, in its header and in the Columns list. */
export function DataTableColumnLayoutItems<TData extends object>({
  table,
  column,
  messages,
  onCustomColor,
}: ColumnMenuProps<TData>) {
  const pinned = column.getIsPinned()
  const canPin = column.getCanPin()
  return (
    <>
      <DropdownMenuItem
        textValue={messages.columns.pinStart}
        isDisabled={!canPin || pinned === "start"}
        onAction={() => pinColumn(table, column, "start")}
      >
        <PinIcon />
        {messages.columns.pinStart}
      </DropdownMenuItem>
      <DropdownMenuItem
        textValue={messages.columns.pinEnd}
        isDisabled={!canPin || pinned === "end"}
        onAction={() => pinColumn(table, column, "end")}
      >
        <PinIcon />
        {messages.columns.pinEnd}
      </DropdownMenuItem>
      <DropdownMenuItem
        textValue={messages.columns.unpin}
        isDisabled={!canPin || !pinned}
        onAction={() => pinColumn(table, column, false)}
      >
        <PinOffIcon />
        {messages.columns.unpin}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        textValue={messages.columns.fitContent}
        isDisabled={!column.getIsVisible() || !column.getCanResize()}
        onAction={() => fitColumns(table, [column])}
      >
        <MoveHorizontalIcon />
        {messages.columns.fitContent}
      </DropdownMenuItem>
      <DataTableColumnColorMenu
        column={column}
        messages={messages}
        onCustomColor={onCustomColor}
      />
    </>
  )
}

/**
 * The ⋯ button in a column header and its menu: sort, pin, fit, color and
 * hide. It shows on hover or focus (always on touch screens); pass `open` to
 * open it from elsewhere, e.g. a right-click on the header.
 */
export function DataTableColumnMenu<TData extends object>({
  open,
  onOpenChange,
  className,
  ...props
}: ColumnMenuProps<TData> & {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}) {
  const { column, messages } = props
  const sorted = column.getIsSorted()
  return (
    <DropdownMenu isOpen={open} onOpenChange={onOpenChange}>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={messages.columns.options(getColumnLabel(column))}
        className={cn(
          "bg-background opacity-0 group-hover/header:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 pointer-coarse:opacity-100",
          className
        )}
      >
        <MoreHorizontalIcon />
      </Button>
      <DropdownMenuContent placement="bottom end" className="min-w-44">
        {column.getCanSort() && (
          <>
            <DropdownMenuItem
              textValue={messages.sorting.asc}
              isDisabled={sorted === "asc"}
              onAction={() => column.toggleSorting(false)}
            >
              <ArrowUpIcon />
              {messages.sorting.asc}
            </DropdownMenuItem>
            <DropdownMenuItem
              textValue={messages.sorting.desc}
              isDisabled={sorted === "desc"}
              onAction={() => column.toggleSorting(true)}
            >
              <ArrowDownIcon />
              {messages.sorting.desc}
            </DropdownMenuItem>
            <DropdownMenuItem
              textValue={messages.sorting.clear}
              isDisabled={!sorted}
              onAction={() => column.clearSorting()}
            >
              <XIcon />
              {messages.sorting.clear}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DataTableColumnLayoutItems {...props} />
        {column.getCanHide() && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              textValue={messages.columns.hide}
              onAction={() => column.toggleVisibility(false)}
            >
              <EyeOffIcon />
              {messages.columns.hide}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
