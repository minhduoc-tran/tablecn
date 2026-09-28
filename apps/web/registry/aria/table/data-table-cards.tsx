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
import { getCardColumns } from "@/registry/shared/table/card-columns"
import { getColumnLabel } from "@/registry/shared/table/column-label"
import {
  isFromControl,
  isRowClick,
} from "@/registry/shared/table/data-table-row-clicks"
import type { DataTableBodyOptions } from "@/registry/aria/table/data-table-body"

export interface DataTableCardsOptions<TData extends object> {
  /** A card's content in the card view; defaults to the visible columns. */
  renderCard?: (row: DataTableRow<TData>) => React.ReactNode
}

type Column<TData extends object> = ReturnType<
  DataTableInstance<TData>["getAllLeafColumns"]
>[number]

/** The rows of a `DataTable` as cards, or its loading, empty or error state. */
export function DataTableCards<TData extends object>({
  table,
  columns,
  messages,
  isLoading = false,
  isError = false,
  onRetry,
  onRowClick,
  onRowDoubleClick,
  rowClassName,
  emptyState,
  errorState,
  skeletonRows = 5,
  renderCard,
}: DataTableBodyOptions<TData> &
  DataTableCardsOptions<TData> & {
    table: DataTableInstance<TData>
    /** Visible leaf columns, in the order shown. */
    columns: Column<TData>[]
    messages: TableMessages
  }) {
  const rows = table.getRowModel().rows
  const parts = getCardColumns(columns)

  if (isError) {
    return (
      <CardsState>
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
      </CardsState>
    )
  }
  if (isLoading && rows.length === 0) {
    return (
      <ul role="list" aria-busy className="flex flex-col gap-2">
        {Array.from({ length: skeletonRows }, (_, index) => (
          <li key={index} className="flex flex-col gap-2 rounded-md border p-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </li>
        ))}
      </ul>
    )
  }
  if (rows.length === 0) {
    return <CardsState>{emptyState ?? messages.states.empty}</CardsState>
  }

  return (
    <ul
      role="list"
      aria-busy={isLoading || undefined}
      className={cn(
        "flex flex-col gap-2 transition-opacity",
        isLoading && "pointer-events-none opacity-60"
      )}
    >
      {rows.map((row) => {
        const cells = new Map(
          row.getAllCells().map((cell) => [cell.column.id, cell])
        )
        const render = (column: Column<TData> | undefined) => {
          const cell = column && cells.get(column.id)
          return cell ? <table.FlexRender cell={cell} /> : null
        }
        return (
          <li
            key={row.id}
            data-slot="data-table-card"
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
              "group/row rounded-md border bg-card p-3 text-sm transition-colors data-[state=selected]:bg-muted",
              onRowClick && "cursor-pointer hover:bg-muted/50",
              rowClassName?.(row)
            )}
          >
            {renderCard ? (
              renderCard(row)
            ) : (
              <>
                <div className="flex items-start gap-3">
                  {parts.select && (
                    <div className="flex h-5 items-center">
                      {render(parts.select)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {render(parts.title)}
                    </div>
                    {parts.subtitle && (
                      <div className="truncate text-muted-foreground">
                        {render(parts.subtitle)}
                      </div>
                    )}
                  </div>
                  {parts.actions.map((column) => (
                    <div key={column.id} className="shrink-0">
                      {render(column)}
                    </div>
                  ))}
                </div>
                {parts.fields.length > 0 && (
                  <dl className="mt-2 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4 gap-y-1.5">
                    {parts.fields.map((column) => (
                      <React.Fragment key={column.id}>
                        <dt className="truncate text-muted-foreground">
                          {getColumnLabel(column)}
                        </dt>
                        <dd className="min-w-0 truncate">{render(column)}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                )}
              </>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function CardsState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-24 items-center justify-center rounded-md border p-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}
