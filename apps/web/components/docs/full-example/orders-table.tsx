"use client"

import * as React from "react"
import { parseDateOnly } from "@querycn/filter-core"
import { NextFilterProvider } from "@querycn/filter-next"
import {
  createDataTableColumnHelper,
  resetPagePatch,
  useDataTable,
  type DataTableView,
} from "@querycn/table-react"
import { CheckIcon, Trash2Icon, TruckIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { DataTableSearch } from "@/components/data-table/data-table-search"
import { createSelectionColumn } from "@/components/data-table/data-table-selection-column"
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import { FilterBuilder } from "@/components/filter/filter-builder"
import { FilterChips } from "@/components/filter/filter-chips"

import { ORDERS, orderFields, type Order } from "./orders-data"

const statusVariant = {
  paid: "default",
  pending: "secondary",
  refunded: "outline",
} as const

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

// A fixed locale, so the server and the browser print the same text.
const dayFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

// `parseDateOnly` reads the day in local time; `new Date("2026-03-05")` would be UTC.
const formatDay = (day: string) => {
  const date = parseDateOnly(day)
  return date ? dayFormat.format(date) : day
}

const helper = createDataTableColumnHelper<Order>()

const columns = [
  createSelectionColumn<Order>(),
  helper.accessor("id", {
    header: "Order",
    size: 110,
    meta: { defaultPinned: "start", card: "subtitle" },
  }),
  helper.accessor("customer", {
    header: "Customer",
    size: 180,
    meta: { card: "title" },
  }),
  helper.accessor("email", {
    header: "Email",
    size: 230,
    meta: { defaultHidden: true },
  }),
  helper.accessor("status", {
    header: "Status",
    size: 110,
    cell: ({ getValue }) => {
      const status = getValue<Order["status"]>()
      return (
        <Badge variant={statusVariant[status]} className="capitalize">
          {status}
        </Badge>
      )
    },
  }),
  helper.accessor("city", { header: "City", size: 140 }),
  helper.accessor("shipped", {
    header: "Shipped",
    size: 100,
    cell: ({ getValue }) =>
      getValue<boolean>() ? (
        <CheckIcon aria-label="Shipped" className="size-4" />
      ) : (
        <span className="text-muted-foreground">No</span>
      ),
  }),
  helper.accessor("deliveryDate", {
    header: "Delivery",
    size: 120,
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatDay(getValue<string>())}</span>
    ),
  }),
  helper.accessor("pickup", {
    header: "Pickup",
    size: 100,
    cell: ({ getValue }) => (
      <span className="tabular-nums">{getValue<string>()}</span>
    ),
  }),
  helper.accessor("createdAt", {
    header: "Created at",
    size: 160,
    cell: ({ getValue }) => {
      const [day, time] = getValue<string>().split("T")
      return (
        <span className="tabular-nums">
          {formatDay(day!)} {time}
        </span>
      )
    },
  }),
  helper.accessor("amount", {
    header: "Amount",
    size: 120,
    sortDescFirst: true,
    meta: { defaultPinned: "end" },
    cell: ({ getValue }) => (
      <span className="tabular-nums">{money.format(getValue<number>())}</span>
    ),
  }),
]

const searchColumns = ["id", "customer", "email", "city"]

function OrdersTable({ view }: { view?: DataTableView }) {
  const [orders, setOrders] = React.useState(ORDERS)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const table = useDataTable({
    data: orders,
    columns,
    getRowId: (order) => order.id,
    storageKey: "tablecn-full-example",
    searchColumns,
    url: {
      pageSizes: [10, 20, 50, 100],
      defaultSorting: [{ id: "createdAt", desc: true }],
    },
    enableRowSelection: (row) => row.original.status !== "refunded",
    view,
  })

  const update = (ids: string[], change: (order: Order) => Order | null) => {
    const selected = new Set(ids)
    setOrders((current) =>
      current.flatMap((order) => {
        if (!selected.has(order.id)) return [order]
        const next = change(order)
        return next ? [next] : []
      })
    )
    table.resetRowSelection(true)
  }

  return (
    <>
      <DataTableToolbar
        table={table}
        // Stands in for refetching from your API.
        onRefresh={() => {
          setIsRefreshing(true)
          setTimeout(() => setIsRefreshing(false), 800)
        }}
        isRefreshing={isRefreshing}
        selectionActions={(rows) => {
          const ids = rows.map((row) => row.id)
          return (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  update(ids, (order) => ({ ...order, shipped: true }))
                }
              >
                <TruckIcon />
                Mark as shipped
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => update(ids, () => null)}
              >
                <Trash2Icon />
                Delete
              </Button>
            </>
          )
        }}
      >
        <DataTableSearch table={table} placeholder="Search orders…" />
        <FilterBuilder />
        <FilterChips />
      </DataTableToolbar>
      <DataTable
        table={table}
        isLoading={isRefreshing}
        className="max-h-[480px]"
      />
      <DataTablePagination table={table} />
    </>
  )
}

/**
 * Search, filter, sort and page in the URL; needs a Suspense boundary above it.
 * Cards on small screens, unless `view` says otherwise.
 */
export function OrdersPage({ view }: { view?: DataTableView }) {
  return (
    <NextFilterProvider
      fields={orderFields}
      shallow
      onApply={() => resetPagePatch()}
    >
      <OrdersTable view={view} />
    </NextFilterProvider>
  )
}
