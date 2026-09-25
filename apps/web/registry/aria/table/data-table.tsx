"use client"

import * as React from "react"
import {
  enTableMessages,
  type DataTableInstance,
  type DataTableRow,
  type TableMessages,
} from "@querycn/table-react"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/aria/ui/button"
import { Skeleton } from "@/registry/aria/ui/skeleton"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/registry/aria/ui/table"
import {
  getColumnCellProps,
  getHeaderCellProps,
  getPinnedEdges,
} from "@/registry/shared/table/data-table-pinning"
import { useScrollEdges } from "@/registry/shared/table/use-scroll-edges"

export interface DataTableProps<TData extends object> extends Omit<
  React.ComponentProps<"div">,
  "children"
> {
  table: DataTableInstance<TData>
  /** Skeleton rows on the first load; dims the rows while they reload. */
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  onRowClick?: (row: DataTableRow<TData>, event: React.MouseEvent) => void
  onRowDoubleClick?: (row: DataTableRow<TData>, event: React.MouseEvent) => void
  rowClassName?: (row: DataTableRow<TData>) => string | undefined
  emptyState?: React.ReactNode
  errorState?: React.ReactNode
  messages?: TableMessages
  skeletonRows?: number
}

// Opaque, so scrolled cells don't show through; the row's hover and selection
// colors are mixed in. Edge columns fade a shadow over the cells scrolled under them.
const PINNED_CELL = cn(
  "data-pinned:z-10 data-pinned:bg-background group-hover/row:data-pinned:bg-[color-mix(in_oklab,var(--color-muted)_50%,var(--color-background))] group-data-[state=selected]/row:data-pinned:bg-muted",
  "before:pointer-events-none before:absolute before:inset-y-0 before:w-3 before:from-foreground/10 before:to-transparent before:opacity-0 before:transition-opacity",
  "data-[pinned-edge=start]:before:-end-3 data-[pinned-edge=start]:before:bg-linear-to-r group-data-[scroll-start]/data-table:data-[pinned-edge=start]:before:opacity-100 rtl:data-[pinned-edge=start]:before:bg-linear-to-l",
  "data-[pinned-edge=end]:before:-start-3 data-[pinned-edge=end]:before:bg-linear-to-l group-data-[scroll-end]/data-table:data-[pinned-edge=end]:before:opacity-100 rtl:data-[pinned-edge=end]:before:bg-linear-to-r"
)

// A sticky header loses its row border to border-collapse, so each cell draws one.
const HEADER_CELL =
  "relative bg-background after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border"

// Controls inside a row (checkbox, link, menu) don't count as a click on it.
const CONTROLS =
  "a, button, input, label, select, textarea, [role=button], [role=checkbox], [role=menuitem]"

function isFromControl(event: React.MouseEvent) {
  const target = event.target as Element
  // Portalled menus and popovers bubble through React but sit outside the row.
  if (!event.currentTarget.contains(target)) return true
  const control = target.closest(CONTROLS)
  return control !== null && event.currentTarget.contains(control)
}

// The clicks of a double click, or selecting text, aren't a row click.
const isRowClick = (event: React.MouseEvent) =>
  !isFromControl(event) &&
  event.detail <= 1 &&
  (window.getSelection()?.isCollapsed ?? true)

/**
 * Renders a `useDataTable` table: sticky header, pinned columns, loading,
 * empty and error states. The container scrolls, so give it a height (e.g.
 * `className="max-h-[600px]"`) for the header to stay in view.
 */
export function DataTable<TData extends object>({
  table,
  isLoading = false,
  isError = false,
  onRetry,
  onRowClick,
  onRowDoubleClick,
  rowClassName,
  emptyState,
  errorState,
  messages = enTableMessages,
  skeletonRows = 5,
  className,
  ...props
}: DataTableProps<TData>) {
  const [scrollRef, scrolled] = useScrollEdges<HTMLDivElement>()
  const rows = table.getRowModel().rows
  const columns = [
    ...table.getStartVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getEndVisibleLeafColumns(),
  ]
  const edges = getPinnedEdges(table)
  const isReloading = isLoading && rows.length > 0

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
            className={PINNED_CELL}
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
    body = rows.map((row) => (
      <TableRow
        key={row.id}
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
            className={PINNED_CELL}
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
    <div
      ref={scrollRef}
      data-slot="data-table"
      data-scroll-start={scrolled.start || undefined}
      data-scroll-end={scrolled.end || undefined}
      className={cn(
        "group/data-table relative w-full overflow-auto rounded-md border",
        className
      )}
      {...props}
    >
      <table
        data-slot="table"
        aria-busy={isLoading || undefined}
        className="table-fixed caption-bottom text-sm"
        style={{ width: table.getTotalSize() }}
      >
        <TableHeader className="sticky top-0 z-20 bg-background">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted()
                return (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    aria-sort={
                      !header.isPlaceholder && header.column.getCanSort()
                        ? sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : "none"
                        : undefined
                    }
                    {...getHeaderCellProps(header, edges)}
                    className={cn(PINNED_CELL, HEADER_CELL)}
                  >
                    {header.isPlaceholder ? null : (
                      <div className="truncate">
                        <table.FlexRender header={header} />
                      </div>
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody
          className={cn(
            "transition-opacity",
            isReloading && "pointer-events-none opacity-60"
          )}
        >
          {body}
        </TableBody>
      </table>
    </div>
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
