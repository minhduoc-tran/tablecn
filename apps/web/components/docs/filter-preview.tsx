"use client"

import * as React from "react"
import {
  applyFilter,
  toSearchParams,
  type FieldDefinition,
  type QueryParams,
} from "@querycn/filter-core"
import { FilterProvider, useAppliedFilter } from "@querycn/filter-react"

import { FilterBuilder } from "@/registry/radix/filter/filter-builder"
import { FilterChips } from "@/registry/radix/filter/filter-chips"

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
  { name: "shipped", label: "Shipped", type: "boolean" },
]

const orders = [
  { id: 1, customer: "Nguyễn Văn An", status: "paid", amount: 120, date: "2026-09-01", shipped: true },
  { id: 2, customer: "Olivia Martin", status: "pending", amount: 45, date: "2026-09-03", shipped: false },
  { id: 3, customer: "Trần Thị Bình", status: "refunded", amount: 310, date: "2026-09-07", shipped: true },
  { id: 4, customer: "Jackson Lee", status: "paid", amount: 18, date: "2026-09-12", shipped: true },
  { id: 5, customer: "Đặng Minh Châu", status: "pending", amount: 89, date: "2026-09-18", shipped: false },
  { id: 6, customer: "Isabella Nguyen", status: "paid", amount: 540, date: "2026-09-21", shipped: false },
]

const statusLabel = Object.fromEntries(
  fields[1]!.options!.map((option) => [option.value, option.label])
)

function Orders() {
  const { state, context, queryKey, query } = useAppliedFilter<QueryParams>()
  const rows = React.useMemo(
    () => applyFilter(orders, state, context),
    [state, context]
  )
  const search = [...toSearchParams(query)]
    .map(([key, value]) => `${key}=${value}`)
    .join("&")

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Shipped</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">{row.customer}</td>
                <td className="px-3 py-2">{statusLabel[row.status]}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.amount}
                </td>
                <td className="px-3 py-2 tabular-nums">{row.date}</td>
                <td className="px-3 py-2">{row.shipped ? "Yes" : "No"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="border-t">
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  No orders match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <dl className="grid gap-2 font-mono text-xs">
        <div>
          <dt className="text-muted-foreground">URL</dt>
          <dd className="break-all">{queryKey ? `?${queryKey}` : "(empty)"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">jsonApiSerializer()</dt>
          <dd className="break-all">{search || "(empty)"}</dd>
        </div>
      </dl>
    </>
  )
}

/** Live filter builder for the docs: rows are filtered in the browser with `applyFilter`. */
export function FilterPreview() {
  return (
    <div className="not-prose my-6 flex flex-col gap-3 rounded-lg border p-4">
      <FilterProvider fields={fields}>
        <div className="flex flex-wrap items-center gap-2">
          <FilterBuilder />
          <FilterChips />
        </div>
        <Orders />
      </FilterProvider>
    </div>
  )
}
