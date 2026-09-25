import { createMemoryAdapter, useAdapterValue } from "@querycn/filter-react"
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
  type SortingState,
} from "@tanstack/react-table"
import { render, renderHook, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

interface Order {
  id: string
  customer: string
  amount: number
}

const ORDERS: Order[] = [
  { id: "1", customer: "An", amount: 30 },
  { id: "2", customer: "Bình", amount: 10 },
  { id: "3", customer: "Châu", amount: 20 },
]

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
})
const helper = createColumnHelper<typeof features, Order>()
const columns = helper.columns([
  helper.accessor("customer", { header: "Customer" }),
  helper.accessor("amount", { header: "Amount" }),
])

function OrdersTable({ sorting }: { sorting: SortingState }) {
  const table = useTable({
    features,
    columns,
    data: ORDERS,
    getRowId: (row) => row.id,
    state: { sorting },
  })
  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((group) => (
          <tr key={group.id}>
            {group.headers.map((header) => (
              <th key={header.id}>
                <table.FlexRender header={header} />
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} data-testid="row">
            {row.getAllCells().map((cell) => (
              <td key={cell.id}>
                <table.FlexRender cell={cell} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Pins the v9 API this package builds on: tableFeatures, row models on the features object, controlled state.
describe("TanStack Table v9", () => {
  it("renders headers and rows, sorted by controlled state", () => {
    render(<OrdersTable sorting={[{ id: "amount", desc: true }]} />)
    expect(
      screen.getAllByRole("columnheader").map((th) => th.textContent)
    ).toEqual(["Customer", "Amount"])
    expect(
      screen.getAllByTestId("row").map((tr) => tr.firstChild?.textContent)
    ).toEqual(["An", "Châu", "Bình"])
  })

  it("can read the shared filter adapter", () => {
    const adapter = createMemoryAdapter("sort=-amount")
    const { result } = renderHook(() => useAdapterValue(adapter))
    expect(result.current[0]).toBe("sort=-amount")
  })
})
