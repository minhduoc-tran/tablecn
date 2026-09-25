"use client"

import * as React from "react"
import type { FieldDefinition } from "@querycn/filter-core"
import { NextFilterProvider } from "@querycn/filter-next"
import {
  createDataTableColumnHelper,
  resetPagePatch,
  useDataTable,
} from "@querycn/table-react"

import { Badge } from "@/registry/radix/ui/badge"
import { Button } from "@/registry/radix/ui/button"
import { FilterBuilder } from "@/registry/radix/filter/filter-builder"
import { FilterChips } from "@/registry/radix/filter/filter-chips"
import { DataTable } from "@/registry/radix/table/data-table"
import { DataTablePagination } from "@/registry/radix/table/data-table-pagination"
import { DataTableSearch } from "@/registry/radix/table/data-table-search"
import { createSelectionColumn } from "@/registry/radix/table/data-table-selection-column"
import { DataTableToolbar } from "@/registry/radix/table/data-table-toolbar"

interface Order {
  id: string
  customer: string
  status: "paid" | "pending" | "refunded"
  amount: number
  date: string
  city: string
}

const fields: FieldDefinition[] = [
  { name: "customer", label: "Customer", type: "text" },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Paid", value: "paid" },
      { label: "Pending", value: "pending" },
      { label: "Refunded", value: "refunded" },
    ],
  },
  { name: "amount", label: "Amount", type: "number" },
  { name: "date", label: "Date", type: "date" },
]

const FIRST =
  "Nguyễn|Olivia|Trần|Jackson|Đặng|Isabella|Lê|Noah|Phạm|Emma".split("|")
const LAST =
  "Văn An|Martin|Thị Bình|Lee|Minh Châu|Nguyen|Hoàng|Smith|Quốc Huy|Brown".split(
    "|"
  )
const CITIES = ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Singapore", "Bangkok"]
const STATUSES = ["paid", "pending", "paid", "refunded", "paid"] as const

// Made-up but stable orders, so the server and the browser render the same rows.
const ORDERS: Order[] = Array.from({ length: 240 }, (_, index) => {
  const day = new Date(Date.UTC(2026, 0, 1 + ((index * 37) % 270)))
  return {
    id: `ORD-${String(1001 + index)}`,
    customer: `${FIRST[index % 10]} ${LAST[(index * 7) % 10]}`,
    status: STATUSES[(index * 3) % 5]!,
    amount: ((index * 7919) % 99000) / 100 + 5,
    date: day.toISOString().slice(0, 10),
    city: CITIES[(index * 11) % 5]!,
  }
})

const statusVariant = {
  paid: "default",
  pending: "secondary",
  refunded: "outline",
} as const

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

const helper = createDataTableColumnHelper<Order>()

const columns = [
  createSelectionColumn<Order>(),
  helper.accessor("id", {
    header: "Order",
    size: 110,
    meta: { defaultPinned: "start" },
  }),
  helper.accessor("customer", { header: "Customer", size: 200 }),
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
  helper.accessor("amount", {
    header: "Amount",
    size: 120,
    sortDescFirst: true,
    cell: ({ getValue }) => (
      <span className="tabular-nums">{money.format(getValue<number>())}</span>
    ),
  }),
  helper.accessor("date", { header: "Date", size: 120 }),
  helper.accessor("city", { header: "City", size: 150 }),
]

/** Toolbar, table and pagination over made-up orders, filtered and sorted in the browser. */
export function OrdersDemo() {
  const [orders, setOrders] = React.useState(ORDERS)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const table = useDataTable({
    data: orders,
    columns,
    getRowId: (order) => order.id,
    storageKey: "tablecn-docs-orders",
  })

  return (
    <>
      <DataTableToolbar
        table={table}
        onRefresh={() => {
          setIsRefreshing(true)
          setTimeout(() => setIsRefreshing(false), 800)
        }}
        isRefreshing={isRefreshing}
        selectionActions={(rows) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const ids = new Set(rows.map((row) => row.id))
              setOrders((all) => all.filter((order) => !ids.has(order.id)))
            }}
          >
            Delete
          </Button>
        )}
      >
        <DataTableSearch table={table} placeholder="Search orders…" />
        <FilterBuilder />
        <FilterChips />
      </DataTableToolbar>
      <DataTable
        table={table}
        isLoading={isRefreshing}
        className="max-h-[420px]"
      />
      <DataTablePagination table={table} />
    </>
  )
}

/**
 * The demo's filter, sort and page live in the page URL (shallow: no server
 * request), its column layout in `localStorage`. Needs a Suspense boundary.
 */
export function OrdersDemoProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NextFilterProvider
      fields={fields}
      shallow
      onApply={() => resetPagePatch()}
    >
      {children}
    </NextFilterProvider>
  )
}
