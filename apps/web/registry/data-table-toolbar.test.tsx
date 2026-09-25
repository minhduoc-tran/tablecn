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
  type DataTableColumnDef,
} from "@querycn/table-react"
import { viTableMessages } from "@querycn/table-react/locales/vi"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useMemo, useState, type ComponentType, type ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { FilterChips as AriaChips } from "./aria/filter/filter-chips"
import { DataTable as AriaDataTable } from "./aria/table/data-table"
import { DataTablePagination as AriaPagination } from "./aria/table/data-table-pagination"
import { createSelectionColumn as ariaSelection } from "./aria/table/data-table-selection-column"
import { DataTableToolbar as AriaToolbar } from "./aria/table/data-table-toolbar"
import { FilterChips as BaseChips } from "./base/filter/filter-chips"
import { DataTable as BaseDataTable } from "./base/table/data-table"
import { DataTablePagination as BasePagination } from "./base/table/data-table-pagination"
import { createSelectionColumn as baseSelection } from "./base/table/data-table-selection-column"
import { DataTableToolbar as BaseToolbar } from "./base/table/data-table-toolbar"
import { FilterChips as RadixChips } from "./radix/filter/filter-chips"
import type { DataTableProps } from "./radix/table/data-table"
import { DataTable as RadixDataTable } from "./radix/table/data-table"
import type { DataTablePaginationProps } from "./radix/table/data-table-pagination"
import { DataTablePagination as RadixPagination } from "./radix/table/data-table-pagination"
import { createSelectionColumn as radixSelection } from "./radix/table/data-table-selection-column"
import type { DataTableToolbarProps } from "./radix/table/data-table-toolbar"
import { DataTableToolbar as RadixToolbar } from "./radix/table/data-table-toolbar"

interface Order {
  id: string
  customer: string
  status: "paid" | "open"
  amount: number
}

// 50 orders, every other one paid; amounts count down so sorting shows.
const ORDERS: Order[] = Array.from({ length: 50 }, (_, index) => ({
  id: String(index + 1),
  customer: `Customer ${index + 1}`,
  status: index % 2 === 0 ? "paid" : "open",
  amount: 1000 - index,
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

const BASES: [
  string,
  ComponentType<DataTableToolbarProps<Order>>,
  ComponentType<DataTableProps<Order>>,
  ComponentType<DataTablePaginationProps<Order>>,
  ComponentType,
  () => DataTableColumnDef<Order>,
][] = [
  [
    "radix",
    RadixToolbar,
    RadixDataTable,
    RadixPagination,
    RadixChips,
    radixSelection,
  ],
  [
    "base",
    BaseToolbar,
    BaseDataTable,
    BasePagination,
    BaseChips,
    baseSelection,
  ],
  [
    "aria",
    AriaToolbar,
    AriaDataTable,
    AriaPagination,
    AriaChips,
    ariaSelection,
  ],
]

describe.each(BASES)(
  "%s DataTableToolbar",
  (
    _,
    DataTableToolbar,
    DataTable,
    DataTablePagination,
    FilterChips,
    createSelectionColumn
  ) => {
    type OrdersProps = {
      adapter: UrlStateAdapter
      data?: Order[]
      inVietnamese?: boolean
      onRefresh?: () => void
      isRefreshing?: boolean
      selectionActions?: DataTableToolbarProps<Order>["selectionActions"]
      /** A Delete action that removes the selected rows. */
      deletable?: boolean
      children?: ReactNode
    }

    function Orders({
      withFilter,
      ...props
    }: OrdersProps & { withFilter?: boolean }) {
      const table = <OrdersTable {...props} />
      if (!withFilter) return table
      return (
        <FilterProvider
          fields={FIELDS}
          adapter={props.adapter}
          onApply={() => resetPagePatch()}
        >
          {table}
        </FilterProvider>
      )
    }

    function OrdersTable({
      adapter,
      data = ORDERS,
      inVietnamese,
      onRefresh,
      isRefreshing,
      selectionActions,
      deletable,
      children,
    }: OrdersProps) {
      const [deleted, setDeleted] = useState<string[]>([])
      const rows = useMemo(
        () => data.filter((row) => !deleted.includes(row.id)),
        [data, deleted]
      )
      const columns = useMemo(
        () => [
          createSelectionColumn(),
          helper.accessor("customer", { header: "Customer" }),
          helper.accessor("status", { header: "Status" }),
          helper.accessor("amount", { header: "Amount" }),
        ],
        []
      )
      const table = useDataTable({
        data: rows,
        columns,
        getRowId: (row) => row.id,
        adapter,
      })
      const messages = inVietnamese ? viTableMessages : undefined
      return (
        <>
          <DataTableToolbar
            table={table}
            messages={messages}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
            selectionActions={
              deletable
                ? (selected) => (
                    <button
                      type="button"
                      onClick={() =>
                        setDeleted((ids) => [
                          ...ids,
                          ...selected.map((row) => row.id),
                        ])
                      }
                    >
                      Delete
                    </button>
                  )
                : selectionActions
            }
          >
            {children}
          </DataTableToolbar>
          <DataTable table={table} messages={messages} />
          <DataTablePagination table={table} messages={messages} />
        </>
      )
    }

    const toolbar = () =>
      document.querySelector<HTMLElement>("[data-slot=data-table-toolbar]")!
    const selectionBar = () =>
      document.querySelector<HTMLElement>(
        "[data-slot=data-table-selection-bar]"
      )
    const customers = () =>
      Array.from(
        document.querySelectorAll('tbody td[data-column-id="customer"]'),
        (cell) => cell.textContent
      )
    const rowCheckboxes = () =>
      screen.getAllByRole("checkbox", { name: "Select row" })

    it("holds the app's controls, reload and the column menu", async () => {
      const user = userEvent.setup()
      const onRefresh = vi.fn()
      render(
        <Orders adapter={createMemoryAdapter()} onRefresh={onRefresh}>
          <input aria-label="Search" />
        </Orders>
      )
      expect(within(toolbar()).getByRole("textbox", { name: "Search" }))
      expect(within(toolbar()).getByRole("button", { name: "Columns" }))
      await user.click(screen.getByRole("button", { name: "Reload" }))
      expect(onRefresh).toHaveBeenCalledTimes(1)
    })

    it("has no reload button without onRefresh", () => {
      render(<Orders adapter={createMemoryAdapter()} />)
      expect(screen.queryByRole("button", { name: "Reload" })).toBeNull()
    })

    it("has no clear filters button without a FilterProvider", () => {
      render(<Orders adapter={createMemoryAdapter("status__eq=paid")} />)
      expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull()
    })

    it("clears the filter and the page in one go, keeping the sort", async () => {
      const user = userEvent.setup()
      const adapter = createMemoryAdapter("status__eq=paid&sort=amount&page=2")
      render(
        <Orders adapter={adapter} withFilter>
          <FilterChips />
        </Orders>
      )
      // Paid orders, cheapest first, second page of 20.
      expect(customers()[0]).toBe("Customer 9")
      const write = vi.spyOn(adapter, "write")

      await user.click(screen.getByRole("button", { name: "Clear filters" }))
      expect(write).toHaveBeenCalledTimes(1)
      expect(adapter.read()).toBe("?sort=amount")
      expect(customers()[0]).toBe("Customer 50")
      expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull()
      expect(document.querySelector("[data-slot=filter-chip]")).toBeNull()
      // Stays in the toolbar rather than falling back to the page.
      expect(document.activeElement).toBe(toolbar())
    })

    it("keeps filter, sort and page in the one adapter", async () => {
      const user = userEvent.setup()
      const adapter = createMemoryAdapter("status__eq=open&sort=-amount")
      render(
        <Orders adapter={adapter} withFilter>
          <FilterChips />
        </Orders>
      )
      await user.click(screen.getByRole("button", { name: "Next page" }))
      expect(adapter.read()).toBe("?status__eq=open&sort=-amount&page=2")
      expect(customers()[0]).toBe("Customer 42")

      // A filter change sends the page back to 1.
      await user.click(
        screen.getByRole("button", { name: /^Remove filter: Status/ })
      )
      expect(adapter.read()).toBe("?sort=-amount")
      expect(customers()[0]).toBe("Customer 1")
    })

    it("shows the selection bar while rows are selected", async () => {
      const user = userEvent.setup()
      const actions = vi.fn<(rows: { id: string }[]) => ReactNode>(() => (
        <button type="button">Delete</button>
      ))
      render(
        <Orders adapter={createMemoryAdapter()} selectionActions={actions} />
      )
      expect(selectionBar()).toBeNull()

      await user.click(rowCheckboxes()[0]!)
      await user.click(rowCheckboxes()[2]!)
      expect(selectionBar()!.textContent).toContain("2 of 20 selected")
      expect(within(selectionBar()!).getByRole("button", { name: "Delete" }))
      expect(actions.mock.lastCall![0].map((row) => row.id)).toEqual(["1", "3"])

      await user.click(
        within(selectionBar()!).getByRole("button", { name: "Clear selection" })
      )
      expect(selectionBar()).toBeNull()
      expect(rowCheckboxes().some((box) => isChecked(box))).toBe(false)
      expect(document.activeElement).toBe(toolbar())
    })

    it("marks reload as pending while it runs", async () => {
      const user = userEvent.setup()
      const onRefresh = vi.fn()
      render(
        <Orders
          adapter={createMemoryAdapter()}
          onRefresh={onRefresh}
          isRefreshing
        />
      )
      const reload = screen.getByRole("button", { name: "Reload" })
      expect(reload.getAttribute("aria-disabled")).toBe("true")
      await user.click(reload)
      expect(onRefresh).not.toHaveBeenCalled()
    })

    it("clears filters from the keyboard, and the selection with them", async () => {
      const user = userEvent.setup()
      render(
        <Orders adapter={createMemoryAdapter("status__eq=paid")} withFilter />
      )
      await user.click(rowCheckboxes()[0]!)
      expect(selectionBar()).not.toBeNull()

      screen.getByRole("button", { name: "Clear filters" }).focus()
      await user.keyboard("{Enter}")
      expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull()
      expect(selectionBar()).toBeNull()
      expect(document.activeElement).toBe(toolbar())
    })

    it("acts only on selected rows the page shows", async () => {
      const user = userEvent.setup()
      const actions = vi.fn<(rows: { id: string }[]) => ReactNode>(() => null)
      const adapter = createMemoryAdapter()
      const { rerender } = render(
        <Orders adapter={adapter} selectionActions={actions} />
      )
      // The last row of page 1…
      await user.click(rowCheckboxes()[19]!)
      expect(selectionBar()).not.toBeNull()
      // …moves to page 2 when a refetch brings a new row first.
      const added = { ...ORDERS[0]!, id: "new", customer: "New customer" }
      rerender(
        <Orders
          adapter={adapter}
          data={[added, ...ORDERS]}
          selectionActions={actions}
        />
      )
      expect(selectionBar()).toBeNull()
    })

    it("keeps focus in the toolbar once an action removes the selected rows", async () => {
      const user = userEvent.setup()
      render(<Orders adapter={createMemoryAdapter()} deletable />)
      await user.click(rowCheckboxes()[0]!)
      within(selectionBar()!).getByRole("button", { name: "Delete" }).focus()
      await user.keyboard("{Enter}")
      expect(selectionBar()).toBeNull()
      expect(customers()[0]).toBe("Customer 2")
      expect(document.activeElement).toBe(toolbar())
    })

    it("speaks the messages' language", async () => {
      const user = userEvent.setup()
      render(
        <Orders
          adapter={createMemoryAdapter("status__eq=paid")}
          withFilter
          inVietnamese
          onRefresh={() => {}}
        />
      )
      expect(screen.getByRole("button", { name: "Xoá bộ lọc" }))
      expect(screen.getByRole("button", { name: "Tải lại" }))
      await user.click(rowCheckboxes()[0]!)
      expect(within(selectionBar()!).getByRole("button", { name: "Bỏ chọn" }))
    })
  }
)

// Radix and Base UI checkboxes are buttons with aria-checked; React Aria's is an input.
function isChecked(box: HTMLElement) {
  return box instanceof HTMLInputElement
    ? box.checked
    : box.getAttribute("aria-checked") === "true"
}
