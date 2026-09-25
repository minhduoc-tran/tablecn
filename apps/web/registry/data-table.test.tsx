import { createMemoryAdapter } from "@querycn/filter-react"
import {
  createDataTableColumnHelper,
  useDataTable,
  type DataTableColumnDef,
} from "@querycn/table-react"
import { viTableMessages } from "@querycn/table-react/locales/vi"
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useMemo, useState, type ComponentType } from "react"
import { createPortal } from "react-dom"
import { describe, expect, it, vi } from "vitest"

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
  amount: number
}

const ORDERS: Order[] = [
  { id: "1", customer: "An", amount: 30 },
  { id: "2", customer: "Bình", amount: 10 },
  { id: "3", customer: "Châu", amount: 20 },
]
const NO_ORDERS: Order[] = []
const helper = createDataTableColumnHelper<Order>()

type Selection = (
  messages?: typeof viTableMessages
) => DataTableColumnDef<Order>
type Props = Omit<DataTableProps<Order>, "table"> & {
  data?: Order[]
  search?: string
}

const BASES: [string, ComponentType<DataTableProps<Order>>, Selection][] = [
  ["radix", RadixDataTable, radixSelection],
  ["base", BaseDataTable, baseSelection],
  ["aria", AriaDataTable, ariaSelection],
]

describe.each(BASES)("%s DataTable", (_, DataTable, createSelectionColumn) => {
  function Orders({ data = ORDERS, search = "", ...props }: Props) {
    const [adapter] = useState(() => createMemoryAdapter(search))
    const columns = useMemo(
      () => [
        helper.accessor("customer", { header: "Customer", size: 160 }),
        helper.accessor("amount", {
          header: "Amount",
          size: 100,
          meta: { defaultPinned: "end" },
        }),
        createSelectionColumn(),
      ],
      []
    )
    const table = useDataTable({
      data,
      columns,
      getRowId: (row) => row.id,
      adapter,
    })
    return <DataTable table={table} {...props} />
  }

  const headers = () =>
    screen.getAllByRole("columnheader").map((th) => th.textContent)
  const bodyRows = () => screen.getAllByRole("row").slice(1)

  it("renders pinned columns at their edges, sticky at TanStack's offsets", () => {
    render(<Orders />)
    expect(headers()).toEqual(["", "Customer", "Amount"])
    const [select, , amount] = screen.getAllByRole("columnheader")
    expect(select!.style.position).toBe("sticky")
    expect(parseFloat(select!.style.insetInlineStart)).toBe(0)
    expect(parseFloat(amount!.style.insetInlineEnd)).toBe(0)
    expect(amount!.dataset.pinnedEdge).toBe("end")
    expect(
      within(bodyRows()[0]!)
        .getAllByRole("cell")
        .map((td) => td.dataset.columnId)
    ).toEqual(["select", "customer", "amount"])
    expect(screen.getByRole("table").style.width).toBe("300px")
  })

  it("marks the sorted column with aria-sort", () => {
    render(<Orders search="?sort=-amount" />)
    const [select, customer, amount] = screen.getAllByRole("columnheader")
    expect(select!.getAttribute("aria-sort")).toBeNull()
    expect(customer!.getAttribute("aria-sort")).toBe("none")
    expect(amount!.getAttribute("aria-sort")).toBe("descending")
    expect(
      bodyRows().map((row) => within(row).getAllByRole("cell")[1]!.textContent)
    ).toEqual(["An", "Châu", "Bình"])
  })

  it("selects rows without counting as a row click", async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(<Orders onRowClick={onRowClick} />)
    const [selectAll, first] = screen.getAllByRole("checkbox")
    await user.click(first!)
    expect(bodyRows()[0]!.dataset.state).toBe("selected")
    expect(onRowClick).not.toHaveBeenCalled()

    // Some rows selected: "mixed" for Radix and Base UI, data-indeterminate for React Aria.
    expect(
      selectAll!.getAttribute("aria-checked") === "mixed" ||
        selectAll!.closest("[data-indeterminate]") !== null
    ).toBe(true)

    await user.click(selectAll!)
    expect(bodyRows().every((row) => row.dataset.state === "selected")).toBe(
      true
    )
    // All selected is checked, not "some".
    expect(selectAll!.getAttribute("aria-checked") ?? "true").toBe("true")
    expect(selectAll!.closest("[data-indeterminate]")).toBeNull()

    await user.click(screen.getByText("Bình"))
    expect(onRowClick).toHaveBeenCalledTimes(1)
    expect(onRowClick.mock.calls[0]![0].id).toBe("2")
  })

  it("ignores double clicks and clicks from portals for onRowClick", async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    const onRowDoubleClick = vi.fn()
    function WithMenu() {
      const [adapter] = useState(() => createMemoryAdapter())
      const columns = useMemo(
        () => [
          helper.accessor("customer", { header: "Customer" }),
          helper.display({
            id: "actions",
            cell: ({ row }) =>
              row.id === "1" &&
              createPortal(
                <button type="button">Delete</button>,
                document.body
              ),
          }),
        ],
        []
      )
      const table = useDataTable({
        data: ORDERS,
        columns,
        getRowId: (row) => row.id,
        adapter,
      })
      return (
        <DataTable
          table={table}
          onRowClick={onRowClick}
          onRowDoubleClick={onRowDoubleClick}
        />
      )
    }
    render(<WithMenu />)
    await user.click(screen.getByRole("button", { name: "Delete" }))
    fireEvent.click(screen.getByText("An"), { detail: 2 })
    expect(onRowClick).not.toHaveBeenCalled()
    await user.dblClick(screen.getByText("Châu"))
    expect(onRowDoubleClick).toHaveBeenCalledTimes(1)
  })

  it("keeps group and placeholder headers above pinned columns sticky", () => {
    function Grouped() {
      const [adapter] = useState(() => createMemoryAdapter("?sort=amount"))
      const columns = useMemo(
        () => [
          helper.group({
            id: "pick",
            header: "Pick",
            columns: [createSelectionColumn()],
          }),
          helper.accessor("customer", { header: "Customer", size: 160 }),
          helper.accessor("amount", {
            header: "Amount",
            size: 100,
            meta: { defaultPinned: "end" },
          }),
        ],
        []
      )
      const table = useDataTable({
        data: ORDERS,
        columns,
        getRowId: (row) => row.id,
        adapter,
      })
      return <DataTable table={table} />
    }
    render(<Grouped />)
    const [top, leaves] = screen.getAllByRole("row")
    const [pick, customerSpace, amountSpace] = within(top!).getAllByRole(
      "columnheader"
    )
    expect(pick!.textContent).toBe("Pick")
    expect(pick!.dataset.pinned).toBe("start")
    expect(pick!.style.position).toBe("sticky")
    expect(customerSpace!.dataset.pinned).toBeUndefined()
    expect(amountSpace!.dataset.pinned).toBe("end")
    expect(amountSpace!.style.position).toBe("sticky")
    expect(amountSpace!.getAttribute("aria-sort")).toBeNull()
    expect(
      within(leaves!)
        .getAllByRole("columnheader")
        .at(-1)!
        .getAttribute("aria-sort")
    ).toBe("ascending")
  })

  it("shows skeleton rows on the first load and dims rows on reload", () => {
    const { rerender } = render(<Orders data={NO_ORDERS} isLoading />)
    expect(screen.getByRole("table").getAttribute("aria-busy")).toBe("true")
    expect(bodyRows()).toHaveLength(5)
    expect(
      document.querySelectorAll("[data-slot=skeleton]").length
    ).toBeGreaterThan(0)

    rerender(<Orders isLoading />)
    expect(bodyRows()).toHaveLength(3)
    expect(document.querySelector("tbody")!.className).toContain("opacity-60")
  })

  it("shows the empty and error states", async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    const { rerender } = render(<Orders data={NO_ORDERS} />)
    expect(screen.getByText("No results.")).toBeDefined()

    rerender(<Orders data={NO_ORDERS} messages={viTableMessages} />)
    expect(screen.getByText("Không có dữ liệu.")).toBeDefined()

    rerender(<Orders isError onRetry={onRetry} />)
    expect(screen.getByText("Something went wrong.")).toBeDefined()
    await user.click(screen.getByRole("button", { name: "Retry" }))
    expect(onRetry).toHaveBeenCalledTimes(1)

    rerender(<Orders data={NO_ORDERS} emptyState="Nothing yet" />)
    expect(screen.getByText("Nothing yet")).toBeDefined()
  })
})
