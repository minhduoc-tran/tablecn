// @vitest-environment node
import { createMemoryAdapter } from "@querycn/filter-react"
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { createDataTableColumnHelper } from "./data-table-features"
import { useDataTable } from "./use-data-table"

interface Order {
  id: string
  amount: number
}

const ORDERS: Order[] = [1, 2, 3, 4].map((n) => ({ id: String(n), amount: n }))
const helper = createDataTableColumnHelper<Order>()
const COLUMNS = helper.columns([helper.accessor("amount", {})])

function Amounts({ search }: { search: string }) {
  const table = useDataTable({
    data: ORDERS,
    columns: COLUMNS,
    getRowId: (row) => row.id,
    adapter: createMemoryAdapter(search),
    url: { pageSizes: [2], defaultPageSize: 2 },
    storageKey: "orders",
  })
  return (
    <>
      {table
        .getRowModel()
        .rows.map((row) => row.original.amount)
        .join(",")}
    </>
  )
}

describe("useDataTable on the server", () => {
  it("renders the page the URL asks for", () => {
    expect(renderToString(<Amounts search="?sort=-amount&page=2" />)).toBe(
      "2,1"
    )
  })
})
