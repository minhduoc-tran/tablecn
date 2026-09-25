"use client"

import * as React from "react"
import { useAppliedFilter } from "@querycn/filter-react"
import {
  enTableMessages,
  type DataTableInstance,
  type TableMessages,
} from "@querycn/table-react"

import { cn } from "@/lib/utils"
import { TableHead, TableHeader, TableRow } from "@/registry/aria/ui/table"
import {
  headerCellClassName,
  pinnedCellClassName,
} from "@/registry/shared/table/data-table-cell-classes"
import {
  getHeaderCellProps,
  getPinnedEdges,
} from "@/registry/shared/table/data-table-pinning"
import { ColumnReorder } from "@/registry/shared/table/column-reorder"
import { useTableContainer } from "@/registry/shared/table/column-layout-actions"
import { useScrollEdges } from "@/registry/shared/table/use-scroll-edges"
import { useScrollToTopOnChange } from "@/registry/shared/table/use-scroll-to-top-on-change"
import { useVirtualRows } from "@/registry/shared/table/use-virtual-rows"
import {
  DataTableBody,
  type DataTableBodyOptions,
} from "@/registry/aria/table/data-table-body"
import { DataTableColumnHeader } from "@/registry/aria/table/data-table-column-header"

export interface DataTableProps<TData extends object>
  extends
    Omit<React.ComponentProps<"div">, "children">,
    DataTableBodyOptions<TData> {
  table: DataTableInstance<TData>
  messages?: TableMessages
  /**
   * Renders only the rows in view, for long pages (thousands of rows). Needs
   * a height on the table, e.g. `className="h-[600px]"`. Fitting a column to
   * its content then measures the rendered rows only.
   */
  virtualize?: boolean
  /** A row's height before it's measured, in pixels. */
  estimateRowHeight?: number
}

/**
 * Renders a `useDataTable` table: sticky header, pinned columns, loading,
 * empty and error states. The container scrolls, so give it a height (e.g.
 * `className="max-h-[600px]"`) for the header to stay in view. Scrolls back
 * to the top when the sort, page, search or filter changes.
 */
export function DataTable<TData extends object>({
  table,
  messages = enTableMessages,
  virtualize = false,
  estimateRowHeight = 37,
  isLoading,
  isError,
  onRetry,
  onRowClick,
  onRowDoubleClick,
  rowClassName,
  emptyState,
  errorState,
  skeletonRows,
  className,
  ...props
}: DataTableProps<TData>) {
  const [scrollRef, scrolled] = useScrollEdges<HTMLDivElement>()
  useTableContainer(table, scrollRef)
  const columns = [
    ...table.getStartVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getEndVisibleLeafColumns(),
  ]
  const edges = getPinnedEdges(table)
  const headerGroups = table.getHeaderGroups()
  const rows = table.getRowModel().rows
  const rowCount = rows.length
  const { sorting, pagination } = table.store.state
  const { queryKey } = useAppliedFilter()
  useScrollToTopOnChange(
    scrollRef,
    JSON.stringify([sorting, pagination, queryKey, table.options.meta?.search])
  )
  const virtual = useVirtualRows({
    enabled: virtualize && !isError,
    count: rowCount,
    getRowId: React.useCallback((index: number) => rows[index]!.id, [rows]),
    scrollRef,
    estimateRowHeight,
  })

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
      <ColumnReorder table={table} messages={messages}>
        <table
          data-slot="table"
          aria-busy={isLoading || undefined}
          // Screen readers count every row, not only those rendered.
          aria-rowcount={
            virtual && rowCount > 0 ? headerGroups.length + rowCount : undefined
          }
          className="table-fixed caption-bottom text-sm"
          style={{ width: table.getTotalSize() }}
        >
          <TableHeader className="sticky top-0 z-20 bg-background">
            {headerGroups.map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) =>
                  header.subHeaders.length === 0 ? (
                    <DataTableColumnHeader
                      key={header.id}
                      table={table}
                      header={header}
                      edges={edges}
                      messages={messages}
                      // Moving a column out of its group would break the group.
                      canReorder={headerGroups.length === 1}
                    />
                  ) : (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      {...getHeaderCellProps(header, edges)}
                      className={cn(pinnedCellClassName, headerCellClassName)}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="truncate">
                          <table.FlexRender header={header} />
                        </div>
                      )}
                    </TableHead>
                  )
                )}
              </TableRow>
            ))}
          </TableHeader>
          <DataTableBody
            table={table}
            columns={columns}
            edges={edges}
            messages={messages}
            virtual={virtual}
            headerRowCount={headerGroups.length}
            isLoading={isLoading}
            isError={isError}
            onRetry={onRetry}
            onRowClick={onRowClick}
            onRowDoubleClick={onRowDoubleClick}
            rowClassName={rowClassName}
            emptyState={emptyState}
            errorState={errorState}
            skeletonRows={skeletonRows}
          />
        </table>
      </ColumnReorder>
    </div>
  )
}
