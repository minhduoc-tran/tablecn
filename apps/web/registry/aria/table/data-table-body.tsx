"use client"

import * as React from "react"
import type {
  DataTableInstance,
  DataTableRow,
  TableMessages,
} from "@querycn/table-react"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/aria/ui/button"
import { Skeleton } from "@/registry/aria/ui/skeleton"
import { TableBody, TableCell, TableRow } from "@/registry/aria/ui/table"
import { pinnedCellClassName } from "@/registry/shared/table/data-table-cell-classes"
import {
  getColumnCellProps,
  type getPinnedEdges,
} from "@/registry/shared/table/data-table-pinning"
import {
  isFromControl,
  isRowClick,
} from "@/registry/shared/table/data-table-row-clicks"
import type { VirtualRows } from "@/registry/shared/table/use-virtual-rows"

export interface DataTableBodyOptions<TData extends object> {
  /** Skeleton rows on the first load; dims the rows while they reload. */
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  onRowClick?: (row: DataTableRow<TData>, event: React.MouseEvent) => void
  onRowDoubleClick?: (row: DataTableRow<TData>, event: React.MouseEvent) => void
  rowClassName?: (row: DataTableRow<TData>) => string | undefined
  emptyState?: React.ReactNode
  errorState?: React.ReactNode
  skeletonRows?: number
}

type Column<TData extends object> = ReturnType<
  DataTableInstance<TData>["getAllLeafColumns"]
>[number]

/** The rows of a `DataTable`, or its loading, empty or error state. */
export function DataTableBody<TData extends object>({
  table,
  columns,
  edges,
  messages,
  virtual,
  headerRowCount,
  isLoading = false,
  isError = false,
  onRetry,
  onRowClick,
  onRowDoubleClick,
  rowClassName,
  emptyState,
  errorState,
  skeletonRows = 5,
}: DataTableBodyOptions<TData> & {
  table: DataTableInstance<TData>
  /** Visible leaf columns, in the order shown. */
  columns: Column<TData>[]
  edges: ReturnType<typeof getPinnedEdges>
  messages: TableMessages
  virtual: VirtualRows | null
  headerRowCount: number
}) {
  const rows = table.getRowModel().rows

  let body: React.ReactNode
  if (isError) {
    body = (
      <StateRow colSpan={columns.length}>
        {errorState ?? (
          <div className="flex flex-col items-center gap-2">
            <p>{messages.states.error}</p>
            {onRetry && (
              <Button variant="outline" size="sm" onPress={onRetry}>
                {messages.actions.retry}
              </Button>
            )}
          </div>
        )}
      </StateRow>
    )
  } else if (isLoading && rows.length === 0) {
    body = Array.from({ length: skeletonRows }, (_, index) => (
      <TableRow key={index} className="group/row hover:bg-transparent">
        {columns.map((column) => (
          <TableCell
            key={column.id}
            {...getColumnCellProps(column, edges)}
            className={pinnedCellClassName}
          >
            <Skeleton className="h-4 w-full" />
          </TableCell>
        ))}
      </TableRow>
    ))
  } else if (rows.length === 0) {
    body = (
      <StateRow colSpan={columns.length}>
        {emptyState ?? messages.states.empty}
      </StateRow>
    )
  } else {
    const shown = virtual
      ? virtual.items.map((item) => ({
          row: rows[item.index]!,
          index: item.index,
        }))
      : rows.map((row, index) => ({ row, index }))
    body = shown.map(({ row, index }) => (
      <TableRow
        key={row.id}
        ref={virtual?.measureRow}
        data-index={index}
        aria-rowindex={virtual ? headerRowCount + index + 1 : undefined}
        data-state={row.getIsSelected() ? "selected" : undefined}
        onClick={
          onRowClick &&
          ((event) => {
            if (isRowClick(event)) onRowClick(row, event)
          })
        }
        onDoubleClick={
          onRowDoubleClick &&
          ((event) => {
            if (!isFromControl(event)) onRowDoubleClick(row, event)
          })
        }
        className={cn(
          "group/row",
          onRowClick && "cursor-pointer",
          rowClassName?.(row)
        )}
      >
        {[
          ...row.getStartVisibleCells(),
          ...row.getCenterVisibleCells(),
          ...row.getEndVisibleCells(),
        ].map((cell) => (
          <TableCell
            key={cell.id}
            {...getColumnCellProps(cell.column, edges)}
            className={pinnedCellClassName}
          >
            <div className="truncate">
              <table.FlexRender cell={cell} />
            </div>
          </TableCell>
        ))}
      </TableRow>
    ))
  }

  return (
    <TableBody
      className={cn(
        "transition-opacity",
        isLoading && rows.length > 0 && "pointer-events-none opacity-60"
      )}
    >
      {virtual && (
        <SpacerRow height={virtual.before} colSpan={columns.length} />
      )}
      {body}
      {virtual && <SpacerRow height={virtual.after} colSpan={columns.length} />}
    </TableBody>
  )
}

function StateRow({
  colSpan,
  children,
}: {
  colSpan: number
  children: React.ReactNode
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={colSpan}
        className="h-24 text-center text-muted-foreground"
      >
        {children}
      </TableCell>
    </TableRow>
  )
}

// Stands in for the rows scrolled out of view.
function SpacerRow({ height, colSpan }: { height: number; colSpan: number }) {
  if (height <= 0) return null
  return (
    <tr aria-hidden>
      <td colSpan={colSpan} className="p-0" style={{ height }} />
    </tr>
  )
}
