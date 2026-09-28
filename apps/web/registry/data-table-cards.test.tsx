import { createMemoryAdapter } from "@querycn/filter-react"
import {
  createDataTableColumnHelper,
  useDataTable,
  type DataTableColumnDef,
  type DataTableView,
} from "@querycn/table-react"
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useMemo, useState, type ComponentType } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DataTable as AriaDataTable } from "./aria/table/data-table"
import { createSelectionColumn as ariaSelection } from "./aria/table/data-table-selection-column"
import { DataTable as BaseDataTable } from "./base/table/data-table"
import { createSelectionColumn as baseSelection } from "./base/table/data-table-selection-column"
import type { DataTableProps } from "./radix/table/data-table"
import { DataTable as RadixDataTable } from "./radix/table/data-table"
import { createSelectionColumn as radixSelection } from "./radix/table/data-table-selection-column"

interface Order {
  id: string
  customer: string
  city: string
  amount: number
  note: string
}

const ORDERS: Order[] = [
  { id: "ORD-1", customer: "An", city: "Hà Nội", amount: 30, note: "a" },
  { id: "ORD-2", customer: "Bình", city: "Huế", amount: 10, note: "b" },
]
const helper = createDataTableColumnHelper<Order>()

type Props = Omit<DataTableProps<Order>, "table"> & {
  data?: Order[]
  view?: DataTableView
}

const BASES: [
  string,
  ComponentType<DataTableProps<Order>>,
  () => DataTableColumnDef<Order>,
][] = [
  ["radix", RadixDataTable, radixSelection],
  ["base", BaseDataTable, baseSelection],
  ["aria", AriaDataTable, ariaSelection],
]

let narrow = false
const listeners = new Set<() => void>()

afterEach(() => {
  narrow = false
  listeners.clear()
  vi.unstubAllGlobals()
})

function stubMatchMedia() {
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return narrow
    },
    addEventListener: (_: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      listeners.delete(listener),
  }))
}

describe.each(BASES)("%s DataTable cards", (_, DataTable, selection) => {
  function Orders({ data = ORDERS, view = "cards", ...props }: Props) {
    const [adapter] = useState(() => createMemoryAdapter())
    const columns = useMemo(
      () => [
        selection(),
        helper.accessor("id", {
          header: "Order",
          meta: { card: "subtitle" },
        }),
        helper.accessor("customer", {
          header: "Customer",
          meta: { card: "title" },
        }),
        helper.accessor("city", { header: "City" }),
        helper.accessor("amount", {
          header: () => "Amt",
          meta: { label: "Amount" },
        }),
        helper.accessor("note", { header: "Note", meta: { card: "hidden" } }),
        helper.display({ id: "menu", cell: () => <button>Menu</button> }),
      ],
      []
    )
    const table = useDataTable({
      data,
      columns,
      getRowId: (row) => row.id,
      adapter,
      view,
    })
    return <DataTable table={table} {...props} />
  }

  const cards = () => within(screen.getByRole("list")).getAllByRole("listitem")

  it("shows each row as a card: title, subtitle, then label and value", () => {
    render(<Orders />)
    expect(screen.queryByRole("table")).toBeNull()
    const [first] = cards()
    expect(first!.textContent).toContain("An")
    expect(first!.textContent).toContain("ORD-1")
    const terms = within(first!)
      .getAllByRole("term")
      .map((term) => term.textContent)
    expect(terms).toEqual(["City", "Amount"])
    expect(first!.textContent).not.toContain("Note")
    expect(within(first!).getByRole("button", { name: "Menu" })).toBeTruthy()
  })

  it("selects a card with its checkbox without counting as a click", async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(<Orders onRowClick={onRowClick} />)
    await user.click(within(cards()[1]!).getByRole("checkbox"))
    expect(cards()[1]!.dataset.state).toBe("selected")
    expect(onRowClick).not.toHaveBeenCalled()
    await user.click(within(cards()[0]!).getByText("Hà Nội"))
    expect(onRowClick).toHaveBeenCalledOnce()
    expect(onRowClick.mock.calls[0]![0].id).toBe("ORD-1")
  })

  it("renders renderCard instead of the columns", () => {
    render(
      <Orders renderCard={(row) => <p>Custom {row.original.customer}</p>} />
    )
    expect(cards().map((card) => card.textContent)).toEqual([
      "Custom An",
      "Custom Bình",
    ])
  })

  it("shows skeleton cards, then the empty and error states", async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    const { rerender } = render(<Orders data={[]} isLoading />)
    expect(screen.getByRole("list").getAttribute("aria-busy")).toBe("true")
    rerender(<Orders data={[]} />)
    expect(screen.getByText("No results.")).toBeTruthy()
    rerender(<Orders isError onRetry={onRetry} />)
    await user.click(screen.getByRole("button", { name: "Retry" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("switches between table and cards with the viewport on auto", () => {
    stubMatchMedia()
    render(<Orders view="auto" />)
    expect(screen.getByRole("table")).toBeTruthy()
    narrow = true
    act(() => listeners.forEach((listener) => listener()))
    expect(screen.queryByRole("table")).toBeNull()
    expect(cards()).toHaveLength(2)
  })

  it("keeps the table when told so, even on a narrow viewport", () => {
    stubMatchMedia()
    narrow = true
    render(<Orders view="table" />)
    expect(screen.getByRole("table")).toBeTruthy()
  })
})
