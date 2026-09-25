"use client"

import * as React from "react"
import {
  enTableMessages,
  type DataTableInstance,
  type TableMessages,
} from "@querycn/table-react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  MoreHorizontalIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/radix/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/radix/ui/select"
import { getPaginationState } from "@/registry/shared/table/data-table-pagination-state"
import { pageRange } from "@/registry/shared/table/page-range"
import { useKeepFocusInPagination } from "@/registry/shared/table/use-keep-focus-in-pagination"

export interface DataTablePaginationProps<TData extends object> extends Omit<
  React.ComponentProps<"div">,
  "children"
> {
  table: DataTableInstance<TData>
  messages?: TableMessages
  /** Page buttons between the arrows, ellipses included. */
  slots?: number
}

/**
 * Row count, rows per page and page buttons for a `useDataTable` table.
 * Hidden while there are no rows.
 */
export function DataTablePagination<TData extends object>({
  table,
  messages = enTableMessages,
  slots = 7,
  className,
  ...props
}: DataTablePaginationProps<TData>) {
  const state = getPaginationState(table)
  const navProps = useKeepFocusInPagination(state.page)
  if (state.isEmpty) return null
  const { pagination: labels, counts } = messages

  return (
    <div
      data-slot="data-table-pagination"
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm",
        className
      )}
      {...props}
    >
      <p className="text-muted-foreground tabular-nums">
        {state.selectedCount > 0
          ? counts.selected(state.selectedCount, state.pageRowCount)
          : state.rowCount !== undefined && counts.rows(state.rowCount)}
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {state.showPageSizes && (
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="hidden text-muted-foreground sm:inline"
            >
              {labels.rowsPerPage}
            </span>
            <Select
              value={String(state.pageSize)}
              onValueChange={(value) => {
                const pageSize = Number(value)
                if (pageSize > 0 && pageSize !== state.pageSize)
                  table.setPagination({ pageIndex: 0, pageSize })
              }}
            >
              <SelectTrigger
                size="sm"
                aria-label={labels.rowsPerPage}
                className="tabular-nums"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                {state.pageSizes.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {counts.number(size)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {state.showPages && (
          <nav
            {...navProps}
            aria-label={labels.label}
            className="flex items-center gap-3 outline-none"
          >
            <span className="font-medium tabular-nums">
              {counts.page(state.page, state.pageCount)}
            </span>
            <ul className="flex items-center gap-1">
              {state.pageCount !== undefined && (
                <li className="hidden sm:block">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={labels.first}
                    disabled={!state.hasPrevious}
                    onClick={() => table.firstPage()}
                  >
                    <ChevronsLeftIcon className="rtl:rotate-180" />
                  </Button>
                </li>
              )}
              <li>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={labels.previous}
                  disabled={!state.hasPrevious}
                  onClick={() => table.previousPage()}
                >
                  <ChevronLeftIcon className="rtl:rotate-180" />
                </Button>
              </li>
              {state.pageCount !== undefined &&
                pageRange(state.page, state.pageCount, slots).map((item) =>
                  typeof item === "number" ? (
                    <li key={item} className="hidden sm:block">
                      <Button
                        variant={item === state.page ? "outline" : "ghost"}
                        size="icon-sm"
                        aria-label={counts.page(item, undefined)}
                        aria-current={item === state.page ? "page" : undefined}
                        onClick={() => table.setPageIndex(item - 1)}
                        className="w-auto min-w-7 px-1.5 tabular-nums"
                      >
                        {counts.number(item)}
                      </Button>
                    </li>
                  ) : (
                    <li key={item} className="hidden sm:block">
                      <span className="flex size-7 items-center justify-center text-muted-foreground">
                        <MoreHorizontalIcon aria-hidden className="size-4" />
                        <span className="sr-only">{labels.morePages}</span>
                      </span>
                    </li>
                  )
                )}
              <li>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={labels.next}
                  disabled={!state.hasNext}
                  onClick={() => table.nextPage()}
                >
                  <ChevronRightIcon className="rtl:rotate-180" />
                </Button>
              </li>
              {state.pageCount !== undefined && (
                <li className="hidden sm:block">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={labels.last}
                    disabled={!state.hasNext}
                    onClick={() => table.lastPage()}
                  >
                    <ChevronsRightIcon className="rtl:rotate-180" />
                  </Button>
                </li>
              )}
            </ul>
          </nav>
        )}
      </div>
    </div>
  )
}
