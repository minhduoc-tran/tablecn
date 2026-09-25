import type { FieldDefinition } from "@querycn/filter-core"
import {
  createMemoryAdapter,
  FilterProvider,
  type UrlStateAdapter,
} from "@querycn/filter-react"
import {
  createDataTableColumnHelper,
  resetPagePatch,
  useDataTable,
} from "@querycn/table-react"
import { viTableMessages } from "@querycn/table-react/locales/vi"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentType } from "react"
import { describe, expect, it, vi } from "vitest"

import { DataTable as AriaDataTable } from "./aria/table/data-table"
import { DataTableSearch as AriaSearch } from "./aria/table/data-table-search"
import { DataTableToolbar as AriaToolbar } from "./aria/table/data-table-toolbar"
import { DataTable as BaseDataTable } from "./base/table/data-table"
import { DataTableSearch as BaseSearch } from "./base/table/data-table-search"
import { DataTableToolbar as BaseToolbar } from "./base/table/data-table-toolbar"
import type { DataTableProps } from "./radix/table/data-table"
import { DataTable as RadixDataTable } from "./radix/table/data-table"
import type { DataTableSearchProps } from "./radix/table/data-table-search"
import { DataTableSearch as RadixSearch } from "./radix/table/data-table-search"
import type { DataTableToolbarProps } from "./radix/table/data-table-toolbar"
import { DataTableToolbar as RadixToolbar } from "./radix/table/data-table-toolbar"

interface Order {
  id: string
  customer: string
  status: "paid" | "open"
}

const CUSTOMERS = ["Nguyễn Văn An", "Olivia Martin", "Đặng Minh Châu"]
// 30 orders, so a page 2 exists.
const ORDERS: Order[] = Array.from({ length: 30 }, (_, index) => ({
  id: String(index + 1),
  customer: `${CUSTOMERS[index % 3]} ${index + 1}`,
  status: index % 2 ? "open" : "paid",
}))

const FIELDS: FieldDefinition[] = [
  {
    name: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Paid", value: "paid" },
      { label: "Open", value: "open" },
    ],
  },
]

const helper = createDataTableColumnHelper<Order>()
const COLUMNS = [
  helper.accessor("customer", { header: "Customer" }),
  helper.accessor("status", { header: "Status" }),
]

const BASES: [
  string,
  ComponentType<DataTableSearchProps<Order>>,
  ComponentType<DataTableToolbarProps<Order>>,
  ComponentType<DataTableProps<Order>>,
][] = [
  ["radix", RadixSearch, RadixToolbar, RadixDataTable],
  ["base", BaseSearch, BaseToolbar, BaseDataTable],
  ["aria", AriaSearch, AriaToolbar, AriaDataTable],
]

describe.each(BASES)(
  "%s DataTableSearch",
  (_, DataTableSearch, DataTableToolbar, DataTable) => {
    function Orders({
      adapter,
      inVietnamese,
      delay = 10,
    }: {
      adapter: UrlStateAdapter
      inVietnamese?: boolean
      delay?: number
      /** Changes to re-render, like a parent polling for data. */
      tick?: number
    }) {
      const table = useDataTable({
        data: ORDERS,
        columns: COLUMNS,
        getRowId: (row) => row.id,
        adapter,
      })
      const messages = inVietnamese ? viTableMessages : undefined
      return (
        <>
          <DataTableToolbar table={table} messages={messages}>
            <DataTableSearch table={table} messages={messages} delay={delay} />
          </DataTableToolbar>
          <DataTable table={table} messages={messages} />
        </>
      )
    }

    function setup(initial = "", withFilter = false, delay?: number) {
      const adapter = createMemoryAdapter(initial)
      const orders = <Orders adapter={adapter} delay={delay} />
      render(
        withFilter ? (
          <FilterProvider
            fields={FIELDS}
            adapter={adapter}
            onApply={() => resetPagePatch()}
          >
            {orders}
          </FilterProvider>
        ) : (
          orders
        )
      )
      return { adapter, user: userEvent.setup() }
    }

    const box = () => screen.getByRole("searchbox", { name: "Search" })
    const customers = () =>
      Array.from(
        document.querySelectorAll('tbody td[data-column-id="customer"]'),
        (cell) => cell.textContent
      )

    it("searches once typing pauses, from page 1, ignoring accents", async () => {
      const { adapter, user } = setup("?page=2")
      await user.type(box(), "dang chau")
      await waitFor(() => expect(adapter.read()).toBe("?q=dang%20chau"))
      expect(customers()).toHaveLength(10)
      expect(customers().every((name) => name!.startsWith("Đặng"))).toBe(true)
    })

    it("searches right away on Enter", async () => {
      // Typing alone would wait five seconds.
      const { adapter, user } = setup("", false, 5000)
      await user.type(box(), "olivia")
      expect(adapter.read()).toBe("")
      await user.keyboard("{Enter}")
      expect(adapter.read()).toBe("?q=olivia")
    })

    it("doesn't submit a form around it on Enter", async () => {
      const adapter = createMemoryAdapter()
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
      render(
        <form onSubmit={onSubmit}>
          <Orders adapter={adapter} delay={5000} />
        </form>
      )
      const user = userEvent.setup()
      await user.type(box(), "olivia{Enter}")
      expect(adapter.read()).toBe("?q=olivia")
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it("clears with the × button and with Escape", async () => {
      const { adapter, user } = setup("?q=olivia")
      expect(box()).toHaveProperty("value", "olivia")
      await user.click(screen.getByRole("button", { name: "Clear search" }))
      expect(adapter.read()).toBe("")
      expect(box()).toHaveProperty("value", "")

      await user.type(box(), "an")
      await waitFor(() => expect(adapter.read()).toBe("?q=an"))
      await user.keyboard("{Escape}")
      expect(adapter.read()).toBe("")
      expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull()
    })

    it("isn't held back by renders while typing pauses", async () => {
      const adapter = createMemoryAdapter()
      const { rerender } = render(<Orders adapter={adapter} delay={80} />)
      const user = userEvent.setup()
      await user.type(box(), "olivia")
      // A render every 30 ms, for longer than the delay.
      for (let tick = 1; tick <= 5; tick++) {
        await act(() => new Promise((resolve) => setTimeout(resolve, 30)))
        rerender(<Orders adapter={adapter} delay={80} tick={tick} />)
      }
      expect(adapter.read()).toBe("?q=olivia")
    })

    it("keeps the Escape that clears to itself", async () => {
      const { user } = setup("?q=olivia")
      const outside = vi.fn()
      document.addEventListener("keydown", outside)
      box().focus()
      await user.keyboard("{Escape}")
      document.removeEventListener("keydown", outside)
      expect(box()).toHaveProperty("value", "")
      expect(outside).not.toHaveBeenCalled()
      // With nothing to clear, Escape goes on, e.g. to close a dialog.
      await user.keyboard("{Escape}")
    })

    it("keeps focus in the box after ×", async () => {
      const { user } = setup("?q=olivia")
      await user.click(screen.getByRole("button", { name: "Clear search" }))
      expect(document.activeElement).toBe(box())
    })

    it("shows a search changed elsewhere", async () => {
      const { adapter } = setup("?q=olivia")
      act(() => adapter.write({ q: "chau" }))
      expect(box()).toHaveProperty("value", "chau")
    })

    it("clears the search with Clear filters, without a FilterProvider too", async () => {
      const { adapter, user } = setup("?q=olivia")
      const toolbar = document.querySelector<HTMLElement>(
        "[data-slot=data-table-toolbar]"
      )!
      await user.click(
        within(toolbar).getByRole("button", { name: "Clear filters" })
      )
      expect(adapter.read()).toBe("")
      expect(box()).toHaveProperty("value", "")
      expect(
        within(toolbar).queryByRole("button", { name: "Clear filters" })
      ).toBeNull()
    })

    it("clears the filter and the search together", async () => {
      const { adapter, user } = setup(
        "?status__eq=paid&q=olivia&sort=customer",
        true
      )
      expect(customers()).toHaveLength(5)
      await user.click(screen.getByRole("button", { name: "Clear filters" }))
      expect(adapter.read()).toBe("?sort=customer")
      expect(customers()).toHaveLength(20)
    })

    it("speaks the messages' language", () => {
      const adapter = createMemoryAdapter()
      render(<Orders adapter={adapter} inVietnamese />)
      const input = screen.getByRole("searchbox", { name: "Tìm kiếm" })
      expect(input.getAttribute("placeholder")).toBe("Tìm kiếm…")
    })
  }
)
