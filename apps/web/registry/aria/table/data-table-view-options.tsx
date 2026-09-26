"use client"

import * as React from "react"
import {
  enTableMessages,
  type DataTableInstance,
  type TableMessages,
} from "@querycn/table-react"
import {
  GripVerticalIcon,
  MoreHorizontalIcon,
  MoveHorizontalIcon,
  PinIcon,
  RotateCcwIcon,
  Settings2Icon,
} from "lucide-react"
import { Dialog } from "react-aria-components"

import { Button } from "@/registry/aria/ui/button"
import { Checkbox } from "@/registry/aria/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
} from "@/registry/aria/ui/dropdown-menu"
import { Popover, PopoverTrigger } from "@/registry/aria/ui/popover"
import { Separator } from "@/registry/aria/ui/separator"
import { ColorSwatch } from "@/registry/aria/table/data-table-column-color-menu"
import { DataTableColumnLayoutItems } from "@/registry/aria/table/data-table-column-menu"
import { getColumnLabel } from "@/registry/shared/table/column-label"
import {
  fitColumns,
  getListedColumns,
  resetLayout,
} from "@/registry/shared/table/column-layout-actions"
import {
  canReorderColumns,
  ColumnReorder,
  useColumnDrag,
} from "@/registry/shared/table/column-reorder"
import { useColumnColorPicker } from "@/registry/shared/table/use-column-color-picker"

type Column<TData extends object> = ReturnType<
  DataTableInstance<TData>["getAllLeafColumns"]
>[number]

export interface DataTableViewOptionsProps<TData extends object> {
  table: DataTableInstance<TData>
  messages?: TableMessages
  className?: string
}

/**
 * The "Columns" button: show, hide and reorder columns, pin and color them,
 * fit them to their content, or go back to the default layout.
 */
export function DataTableViewOptions<TData extends object>({
  table,
  messages = enTableMessages,
  className,
}: DataTableViewOptionsProps<TData>) {
  const canReorder = canReorderColumns(table)
  const canFit = table
    .getVisibleLeafColumns()
    .some((column) => column.getCanResize())
  const [open, setOpen] = React.useState(false)
  // Escape or a click outside mid-move cancels the move, not the list.
  const [dragging, setDragging] = React.useState(false)
  const colorPicker = useColumnColorPicker()
  return (
    <>
      <PopoverTrigger
        isOpen={open}
        onOpenChange={(next) => {
          if (next || !dragging) setOpen(next)
        }}
      >
        <Button variant="outline" size="sm" className={className}>
          <Settings2Icon />
          {messages.columns.menu}
        </Button>
        <Popover
          placement="bottom end"
          // React Aria would stop the Escape that cancels the move.
          isKeyboardDismissDisabled={dragging}
          className="w-64 p-1"
        >
          <Dialog
            aria-label={messages.columns.menu}
            className="flex flex-col gap-1 outline-none"
          >
            <ColumnReorder
              table={table}
              messages={messages}
              axis="y"
              onDraggingChange={setDragging}
            >
              <ul
                aria-label={messages.columns.menu}
                className="flex max-h-80 flex-col overflow-y-auto"
              >
                {getListedColumns(table).map((column) => (
                  <ColumnItem
                    key={column.id}
                    table={table}
                    column={column}
                    messages={messages}
                    canReorder={canReorder}
                    onCustomColor={() => colorPicker.open(column)}
                  />
                ))}
              </ul>
            </ColumnReorder>
            <Separator />
            <Button
              variant="ghost"
              size="sm"
              className="justify-start"
              isDisabled={!canFit}
              onPress={() => fitColumns(table)}
            >
              <MoveHorizontalIcon />
              {messages.columns.fitAll}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start"
              onPress={() => resetLayout(table)}
            >
              <RotateCcwIcon />
              {messages.columns.resetLayout}
            </Button>
          </Dialog>
        </Popover>
      </PopoverTrigger>
      <input {...colorPicker.inputProps} />
    </>
  )
}

function ColumnItem<TData extends object>({
  table,
  column,
  messages,
  canReorder,
  onCustomColor,
}: {
  table: DataTableInstance<TData>
  column: Column<TData>
  messages: TableMessages
  canReorder: boolean
  onCustomColor: () => void
}) {
  const label = getColumnLabel(column)
  const {
    disabled: isFixed,
    isDragging,
    setNodeRef,
    pointerProps,
    setHandleRef,
    handleProps,
    style,
  } = useColumnDrag(column, canReorder)
  const color = column.getColor()
  const pinned = column.getIsPinned()

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-dragging={isDragging || undefined}
      className="relative flex items-center gap-1 rounded-md bg-popover py-0.5 ps-0.5 pe-1 data-dragging:z-10 data-dragging:shadow-sm"
    >
      {canReorder && (
        <button
          type="button"
          ref={setHandleRef}
          aria-label={messages.header.move(label)}
          disabled={isFixed}
          {...handleProps}
          {...pointerProps}
          className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing disabled:invisible"
        >
          <GripVerticalIcon className="size-3.5" />
        </button>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-2 py-1">
        <Checkbox
          aria-label={label}
          isSelected={column.getIsVisible()}
          isDisabled={!column.getCanHide()}
          onChange={(visible) => column.toggleVisibility(visible)}
        />
        {/* React Aria's checkbox is its own label; the name toggles it too. */}
        <span
          className="truncate"
          onClick={() => {
            if (column.getCanHide()) column.toggleVisibility()
          }}
        >
          {label}
        </span>
      </div>
      {color && <ColorSwatch color={color} />}
      {pinned && (
        <PinIcon
          aria-hidden
          className="size-3.5 shrink-0 text-muted-foreground"
        />
      )}
      <DropdownMenu>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={messages.columns.options(label)}
        >
          <MoreHorizontalIcon />
        </Button>
        <DropdownMenuContent placement="bottom end" className="min-w-44">
          <DataTableColumnLayoutItems
            table={table}
            column={column}
            messages={messages}
            onCustomColor={onCustomColor}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
