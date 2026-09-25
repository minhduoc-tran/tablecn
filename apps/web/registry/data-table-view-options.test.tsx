import { createMemoryAdapter } from "@querycn/filter-react"
import {
  createDataTableColumnHelper,
  useDataTable,
  type DataTableColumnDef,
} from "@querycn/table-react"
import { viTableMessages } from "@querycn/table-react/locales/vi"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useMemo, useState, type ComponentType } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DataTable as AriaDataTable } from "./aria/table/data-table"
import { createSelectionColumn as ariaSelection } from "./aria/table/data-table-selection-column"
import { DataTableViewOptions as AriaViewOptions } from "./aria/table/data-table-view-options"
import { DataTable as BaseDataTable } from "./base/table/data-table"
import { createSelectionColumn as baseSelection } from "./base/table/data-table-selection-column"
import { DataTableViewOptions as BaseViewOptions } from "./base/table/data-table-view-options"
import type { DataTableProps } from "./radix/table/data-table"
import { DataTable as RadixDataTable } from "./radix/table/data-table"
import { createSelectionColumn as radixSelection } from "./radix/table/data-table-selection-column"
import type { DataTableViewOptionsProps } from "./radix/table/data-table-view-options"
import { DataTableViewOptions as RadixViewOptions } from "./radix/table/data-table-view-options"
import { COLUMN_COLOR_PRESETS } from "./shared/table/column-color-palette"

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
  ComponentType<DataTableViewOptionsProps<Order>>,
  () => DataTableColumnDef<Order>,
][] = [
  ["radix", RadixDataTable, RadixViewOptions, radixSelection],
  ["base", BaseDataTable, BaseViewOptions, baseSelection],
  ["aria", AriaDataTable, AriaViewOptions, ariaSelection],
]

// jsdom has no layout: header cells sit side by side, list items one under
// another, and every cell is 100px wide.
beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const item = this.closest("li")
      if (item) {
        const index = [...item.parentElement!.children].indexOf(item)
        return DOMRect.fromRect({ x: 0, y: index * 32, width: 240, height: 32 })
      }
      const cell = this.closest("th, td")
      const index = cell ? [...cell.parentElement!.children].indexOf(cell) : 0
      return DOMRect.fromRect({ x: index * 100, y: 0, width: 100, height: 40 })
    }
  )
})
afterEach(() => vi.restoreAllMocks())

describe.each(BASES)(
  "%s DataTableViewOptions",
  (_, DataTable, DataTableViewOptions, createSelectionColumn) => {
    function Orders({
      vi: inVietnamese = false,
      showOptions = true,
    }: {
      vi?: boolean
      showOptions?: boolean
    }) {
      const [adapter] = useState(() => createMemoryAdapter())
      const columns = useMemo(
        () => [
          createSelectionColumn(),
          helper.accessor("customer", { header: "Customer" }),
          helper.accessor("amount", { header: "Amount", size: 120 }),
          helper.accessor("status", { header: "Status" }),
        ],
        []
      )
      const table = useDataTable({
        data: ORDERS,
        columns,
        getRowId: (row) => row.id,
        adapter,
      })
      const messages = inVietnamese ? viTableMessages : undefined
      return (
        <>
          {showOptions && (
            <DataTableViewOptions table={table} messages={messages} />
          )}
          <DataTable table={table} messages={messages} />
        </>
      )
    }

    // From the DOM: React Aria's popover hides the rest of the page from roles.
    const headers = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>("thead th"),
        (th) => th.dataset.columnId
      )
    const header = (id: string) =>
      document.querySelector<HTMLElement>(`thead th[data-column-id="${id}"]`)!
    const list = () => screen.getByRole("list", { name: "Columns" })

    async function openColumns(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("button", { name: "Columns" }))
      return list()
    }

    async function columnMenu(
      user: ReturnType<typeof userEvent.setup>,
      column: string,
      item: string
    ) {
      await user.click(
        within(list()).getByRole("button", { name: `${column} options` })
      )
      await user.click(await screen.findByRole("menuitem", { name: item }))
    }

    it("lists the columns and shows or hides them", async () => {
      const user = userEvent.setup()
      render(<Orders />)
      const columns = await openColumns(user)
      // No row for the selection column: nothing to do with it.
      expect(within(columns).getAllByRole("checkbox")).toEqual(
        ["Customer", "Amount", "Status"].map((name) =>
          within(columns).getByRole("checkbox", { name })
        )
      )

      await user.click(
        within(columns).getByRole("checkbox", { name: "Status" })
      )
      expect(headers()).toEqual(["select", "customer", "amount"])
      await user.click(
        within(columns).getByRole("checkbox", { name: "Status" })
      )
      expect(headers()).toEqual(["select", "customer", "amount", "status"])
    })

    it("pins next to the scrolling columns and unpins", async () => {
      const user = userEvent.setup()
      render(<Orders />)
      await openColumns(user)
      await columnMenu(user, "Customer", "Pin to end")
      await columnMenu(user, "Status", "Pin to end")
      // The later pin sits nearer the scrolling columns.
      expect(headers()).toEqual(["select", "amount", "status", "customer"])
      expect(header("customer").dataset.pinned).toBe("end")

      await columnMenu(user, "Amount", "Pin to start")
      // After the selection column, which keeps the outer edge.
      expect(headers()).toEqual(["select", "amount", "status", "customer"])
      expect(header("amount").dataset.pinned).toBe("start")

      await columnMenu(user, "Customer", "Unpin")
      expect(header("customer").dataset.pinned).toBeUndefined()
      expect(headers()).toEqual(["select", "amount", "customer", "status"])
    })

    it("colors a column with a preset or a custom color", async () => {
      const user = userEvent.setup()
      render(<Orders />)
      await openColumns(user)
      await user.click(
        within(list()).getByRole("button", { name: "Amount options" })
      )
      await user.click(await screen.findByRole("menuitem", { name: "Color" }))
      // By keyboard: in jsdom the pointer's path to a submenu closes Radix's.
      ;(await screen.findByRole("menuitemradio", { name: "Blue" })).focus()
      await user.keyboard("{Enter}")
      const tinted = () =>
        document
          .querySelector<HTMLElement>('td[data-column-id="amount"]')!
          .style.getPropertyValue("--column-color")
      expect(tinted()).toBe(COLUMN_COLOR_PRESETS.blue)
      expect(header("amount").style.getPropertyValue("--column-color")).toBe(
        COLUMN_COLOR_PRESETS.blue
      )

      // The picker commits after the list closes, so its input sits outside it.
      const input = document.querySelector<HTMLInputElement>(
        'input[type="color"]'
      )!
      expect(list().contains(input)).toBe(false)
      const click = vi.spyOn(input, "click")
      await user.click(
        within(list()).getByRole("button", { name: "Amount options" })
      )
      ;(await screen.findByRole("menuitem", { name: "Color" })).focus()
      await user.keyboard("{ArrowRight}")
      ;(await screen.findByRole("menuitem", { name: "Custom color…" })).focus()
      await user.keyboard("{Enter}")
      expect(click).toHaveBeenCalledTimes(1)
      fireEvent.change(input, { target: { value: "#ff0000" } })
      expect(tinted()).toBe("#ff0000")
    })

    it("moves a column from the list with the keyboard", async () => {
      const user = userEvent.setup()
      render(<Orders />)
      await openColumns(user)
      within(list())
        .getByRole("button", { name: "Move column Customer" })
        .focus()
      await user.keyboard(" ")
      await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
      await user.keyboard("{ArrowDown}")
      await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
      await user.keyboard(" ")
      expect(headers()).toEqual(["select", "amount", "customer", "status"])
    })

    async function pickUp(user: ReturnType<typeof userEvent.setup>) {
      within(list())
        .getByRole("button", { name: "Move column Customer" })
        .focus()
      await user.keyboard(" ")
      await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
      await user.keyboard("{ArrowDown}")
      await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
    }

    it("cancels a move with Escape and keeps the list open", async () => {
      const user = userEvent.setup()
      render(<Orders />)
      await openColumns(user)
      await pickUp(user)
      await user.keyboard("{Escape}")
      expect(screen.queryByRole("list", { name: "Columns" })).not.toBeNull()
      await user.keyboard("{Enter}")
      expect(headers()).toEqual(["select", "customer", "amount", "status"])
    })

    it("drops nothing once the list goes away mid-move", async () => {
      const user = userEvent.setup()
      const { rerender } = render(<Orders />)
      await openColumns(user)
      await pickUp(user)
      rerender(<Orders showOptions={false} />)
      await user.keyboard("{Enter}")
      expect(headers()).toEqual(["select", "customer", "amount", "status"])
    })

    it("fits every column and resets the layout", async () => {
      const user = userEvent.setup()
      render(<Orders />)
      await openColumns(user)
      await user.click(within(list()).getByRole("checkbox", { name: "Status" }))
      await user.click(screen.getByRole("button", { name: "Fit all columns" }))
      expect(header("amount").style.width).toBe("100px")
      expect(header("select").style.width).toBe("40px")

      await user.click(screen.getByRole("button", { name: "Reset layout" }))
      expect(header("amount").style.width).toBe("120px")
      expect(headers()).toEqual(["select", "customer", "amount", "status"])
    })

    it("speaks the messages' language", async () => {
      const user = userEvent.setup()
      render(<Orders vi />)
      await user.click(screen.getByRole("button", { name: "Cột" }))
      expect(
        screen.getByRole("button", { name: "Tuỳ chọn cột Amount" })
      ).toBeDefined()
    })
  }
)
