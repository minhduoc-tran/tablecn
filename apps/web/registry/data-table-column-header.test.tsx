import { createMemoryAdapter } from "@querycn/filter-react"
import {
  createDataTableColumnHelper,
  useDataTable,
  type DataTableColumnDef,
} from "@querycn/table-react"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useMemo, useState, type ComponentType } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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
  status: string
}

const ORDERS: Order[] = [
  { id: "1", customer: "An", amount: 30, status: "paid" },
  { id: "2", customer: "Bình", amount: 10, status: "open" },
]
const helper = createDataTableColumnHelper<Order>()

const BASES: [
  string,
  ComponentType<DataTableProps<Order>>,
  () => DataTableColumnDef<Order>,
][] = [
  ["radix", RadixDataTable, radixSelection],
  ["base", BaseDataTable, baseSelection],
  ["aria", AriaDataTable, ariaSelection],
]

// jsdom has no layout: header cells sit side by side, 100px each, in DOM order.
beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const cell = this.closest("th")
      const index = cell ? [...cell.parentElement!.children].indexOf(cell) : 0
      return DOMRect.fromRect({ x: index * 100, y: 0, width: 100, height: 40 })
    }
  )
})
afterEach(() => vi.restoreAllMocks())

describe.each(BASES)(
  "%s column header",
  (_, DataTable, createSelectionColumn) => {
    function Orders({ search = "" }: { search?: string }) {
      const [adapter] = useState(() => createMemoryAdapter(search))
      const columns = useMemo(
        () => [
          createSelectionColumn(),
          helper.accessor("customer", {
            header: "Customer",
            meta: { required: true },
          }),
          helper.accessor("amount", { header: "Amount", size: 120 }),
          helper.accessor("status", { header: "Status", enableSorting: false }),
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
        <>
          <DataTable table={table} />
          <output data-testid="url">{adapter.read()}</output>
        </>
      )
    }

    const header = (name: string) =>
      screen
        .getAllByRole("columnheader")
        .find((th) => th.textContent?.startsWith(name))!
    const url = () => screen.getByTestId("url").textContent

    it("cycles the sort, and Shift+click adds columns with their order", async () => {
      const user = userEvent.setup()
      render(<Orders />)
      const sortBy = (name: string) =>
        within(header(name)).getByRole("button", {
          name: new RegExp(`^${name}(?! options)`),
        })

      await user.click(sortBy("Amount"))
      expect(header("Amount").getAttribute("aria-sort")).toBe("ascending")
      await user.click(sortBy("Amount"))
      expect(header("Amount").getAttribute("aria-sort")).toBe("descending")
      await user.click(sortBy("Amount"))
      expect(header("Amount").getAttribute("aria-sort")).toBe("none")

      await user.click(sortBy("Amount"))
      await user.keyboard("{Shift>}")
      await user.click(sortBy("Customer"))
      await user.keyboard("{/Shift}")
      expect(url()).toBe("?sort=amount,customer")
      expect(sortBy("Amount").textContent).toMatch(/1$/)
      expect(sortBy("Customer").textContent).toMatch(/2$/)
      expect(
        within(header("Status")).queryByRole("button", {
          name: /^Status(?! options)/,
        })
      ).toBeNull()
    })

    it("marks required columns", () => {
      render(<Orders />)
      expect(header("Customer").textContent).toContain("*")
      expect(header("Amount").textContent).not.toContain("*")
    })

    it("opens the column menu from its button or a right-click", async () => {
      const user = userEvent.setup()
      render(<Orders />)
      await user.click(
        within(header("Amount")).getByRole("button", { name: "Amount options" })
      )
      await user.click(
        await screen.findByRole("menuitem", { name: "Descending" })
      )
      expect(header("Amount").getAttribute("aria-sort")).toBe("descending")

      fireEvent.contextMenu(header("Customer"))
      await user.click(
        await screen.findByRole("menuitem", { name: "Pin to end" })
      )
      expect(header("Customer").getAttribute("data-pinned")).toBe("end")

      // Status can't sort, so its menu starts at pinning.
      fireEvent.contextMenu(header("Status"))
      await screen.findByRole("menuitem", { name: "Hide column" })
      expect(screen.queryByRole("menuitem", { name: "Ascending" })).toBeNull()
      await user.click(screen.getByRole("menuitem", { name: "Hide column" }))
      expect(header("Status")).toBeUndefined()
    })

    it("resizes from the keyboard and fits the content on double-click", async () => {
      const user = userEvent.setup()
      render(<Orders />)
      const handle = screen.getByRole("separator", {
        name: "Resize column Amount",
      })
      expect(handle.getAttribute("aria-valuenow")).toBe("120")
      handle.focus()
      await user.keyboard("{ArrowRight}{Shift>}{ArrowRight}{/Shift}")
      expect(header("Amount").style.width).toBe("180px")
      await user.keyboard("{ArrowLeft}")
      expect(header("Amount").style.width).toBe("170px")

      // Every mocked cell is 100px wide.
      fireEvent.doubleClick(handle)
      expect(header("Amount").style.width).toBe("100px")
      expect(
        screen.queryByRole("separator", { name: /Resize column Select/ })
      ).toBeNull()
    })

    it("moves a column with the keyboard and announces it", async () => {
      const user = userEvent.setup()
      render(<Orders />)
      const columns = () =>
        screen.getAllByRole("columnheader").map((th) => th.dataset.columnId)
      expect(columns()).toEqual(["select", "customer", "amount", "status"])
      expect(
        screen.queryByRole("button", { name: "Move column select" })
      ).toBeNull()

      const grip = screen.getByRole("button", { name: "Move column Customer" })
      grip.focus()
      await user.keyboard(" ")
      await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
      await user.keyboard("{ArrowRight}")
      await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
      await user.keyboard(" ")

      expect(columns()).toEqual(["select", "amount", "customer", "status"])
      expect(document.body.textContent).toContain(
        "Column Customer dropped at position 2 of 3."
      )
    })

    it("moves past fixed columns and stays within its pinned group", async () => {
      const user = userEvent.setup()
      function Fixed() {
        const [adapter] = useState(() => createMemoryAdapter())
        const columns = useMemo(
          () => [
            createSelectionColumn(),
            helper.accessor("customer", { header: "Customer" }),
            helper.display({
              id: "note",
              header: "Note",
              meta: { enableOrdering: false },
            }),
            helper.accessor("amount", { header: "Amount" }),
            helper.accessor("status", {
              header: "Status",
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
      render(<Fixed />)
      const columns = () =>
        screen.getAllByRole("columnheader").map((th) => th.dataset.columnId)
      const move = async (name: string) => {
        screen.getByRole("button", { name: `Move column ${name}` }).focus()
        await user.keyboard(" ")
        await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
        await user.keyboard("{ArrowRight}")
        await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
        await user.keyboard(" ")
      }

      await move("Customer")
      expect(columns()).toEqual([
        "select",
        "amount",
        "note",
        "customer",
        "status",
      ])
      // Nothing movable to its right but the end-pinned group.
      await move("Customer")
      expect(columns()).toEqual([
        "select",
        "amount",
        "note",
        "customer",
        "status",
      ])
    })

    it("widens with the arrow pointing away from the column in RTL", async () => {
      const user = userEvent.setup()
      function Rtl() {
        const [adapter] = useState(() => createMemoryAdapter())
        const columns = useMemo(
          () => [helper.accessor("amount", { header: "Amount", size: 120 })],
          []
        )
        const table = useDataTable({
          data: ORDERS,
          columns,
          getRowId: (row) => row.id,
          adapter,
          dir: "rtl",
        })
        return <DataTable table={table} dir="rtl" />
      }
      render(<Rtl />)
      const handle = screen.getByRole("separator", {
        name: "Resize column Amount",
      })
      expect(handle.getAttribute("aria-valuemax")).not.toBeNull()
      handle.focus()
      await user.keyboard("{ArrowLeft}")
      expect(header("Amount").style.width).toBe("130px")
    })
  }
)
