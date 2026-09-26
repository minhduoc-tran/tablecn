"use client"

import * as React from "react"
import {
  createDataTableColumnHelper,
  useDataTable,
} from "@querycn/table-react"

import { Checkbox } from "@/registry/radix/ui/checkbox"
import { DataTable } from "@/registry/radix/table/data-table"
import { DataTablePagination } from "@/registry/radix/table/data-table-pagination"

interface Order {
  id: string
  customer: string
  status: "paid" | "pending" | "refunded"
  amount: number
  city: string
}

const NAMES =
  "Nguyễn Văn An|Olivia Martin|Trần Thị Bình|Jackson Lee|Đặng Minh Châu|Isabella Nguyen|Lê Quốc Huy|Noah Smith|Phạm Thu Hà|Emma Brown".split(
    "|"
  )
const CITIES = ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Singapore", "Bangkok"]
const STATUSES = ["paid", "pending", "paid", "refunded", "paid"] as const

// Made-up but stable, so the server and the browser render the same rows.
const ORDERS: Order[] = Array.from({ length: 10_000 }, (_, index) => ({
  id: `ORD-${String(10001 + index)}`,
  customer: NAMES[(index * 7) % 10]!,
  status: STATUSES[(index * 3) % 5]!,
  amount: ((index * 7919) % 99000) / 100 + 5,
  city: CITIES[(index * 11) % 5]!,
}))

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

const helper = createDataTableColumnHelper<Order>()

const columns = [
  helper.accessor("id", { header: "Order", size: 120 }),
  helper.accessor("customer", { header: "Customer", size: 200 }),
  helper.accessor("status", { header: "Status", size: 110 }),
  helper.accessor("amount", {
    header: "Amount",
    size: 120,
    cell: ({ getValue }) => (
      <span className="tabular-nums">{money.format(getValue<number>())}</span>
    ),
  }),
  helper.accessor("city", { header: "City", size: 150 }),
]

/** Counts the body rows actually in the DOM under `ref`, as they change. */
function useRenderedRowCount(ref: React.RefObject<HTMLElement | null>) {
  const [count, setCount] = React.useState(0)
  React.useEffect(() => {
    const element = ref.current
    if (!element) return
    const update = () =>
      setCount(element.querySelectorAll("tbody tr[data-index]").length)
    update()
    const observer = new MutationObserver(update)
    observer.observe(element, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [ref])
  return count
}

/** 10,000 orders in one table, with virtualization on or off and the rows in the DOM counted. */
export function VirtualizationPreview() {
  const [virtualize, setVirtualize] = React.useState(true)
  const tableRef = React.useRef<HTMLDivElement>(null)
  const rendered = useRenderedRowCount(tableRef)
  const table = useDataTable({
    data: ORDERS,
    columns,
    getRowId: (order) => order.id,
    url: { pageSizes: [100, 1000, 10000], defaultPageSize: 1000 },
  })
  const onPage = table.getRowModel().rows.length

  return (
    <div className="not-prose my-6 flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2 font-medium">
          <Checkbox
            checked={virtualize}
            onCheckedChange={(checked) => setVirtualize(checked === true)}
          />
          <code>virtualize</code>
        </label>
        <p className="text-muted-foreground tabular-nums">
          Rows on this page: {onPage.toLocaleString("en-US")} · in the DOM:{" "}
          <span className="font-medium text-foreground">
            {rendered.toLocaleString("en-US")}
          </span>
        </p>
      </div>
      <div ref={tableRef}>
        <DataTable table={table} virtualize={virtualize} className="h-[360px]" />
      </div>
      <DataTablePagination table={table} />
    </div>
  )
}
