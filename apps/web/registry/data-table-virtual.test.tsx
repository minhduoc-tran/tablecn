import {
  createMemoryAdapter,
  type UrlStateAdapter,
} from "@querycn/filter-react"
import {
  createDataTableColumnHelper,
  useDataTable,
  type DataTableColumnDef,
} from "@querycn/table-react"
import { act, fireEvent, render } from "@testing-library/react"
import { useMemo, type ComponentType } from "react"
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
}

const ORDERS: Order[] = Array.from({ length: 1000 }, (_, index) => ({
  id: String(index + 1),
  customer: `Customer ${index + 1}`,
  // Customer 2's amount sorts it to the middle.
  amount: index === 1 ? 500.5 : index,
}))
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

const ROW_HEIGHT = 40
const VIEW_HEIGHT = 400

// jsdom has no layout: the table shows 400px, rows are 40px high but
// Customer 2's, which is twice that.
const isTall = (element: HTMLElement) =>
  element.querySelector('td[data-column-id="customer"]')?.textContent ===
  "Customer 2"

beforeEach(() => {
  const size = (element: HTMLElement) =>
    element.matches("[data-slot=data-table]")
      ? { width: 800, height: VIEW_HEIGHT }
      : { width: 100, height: isTall(element) ? ROW_HEIGHT * 2 : ROW_HEIGHT }
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
    function (this: HTMLElement) {
      return size(this).height
    }
  )
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(
    function (this: HTMLElement) {
      return size(this).width
    }
  )
})
afterEach(() => vi.restoreAllMocks())

describe.each(BASES)(
  "%s DataTable virtualize",
  (_, DataTable, createSelectionColumn) => {
    function Orders({
      adapter,
      virtualize = true,
      count = ORDERS.length,
    }: {
      adapter: UrlStateAdapter
      virtualize?: boolean
      count?: number
    }) {
      const columns = useMemo(
        () => [
          createSelectionColumn(),
          helper.accessor("customer", { header: "Customer" }),
          helper.accessor("amount", { header: "Amount" }),
        ],
        []
      )
      const table = useDataTable({
        data: count === ORDERS.length ? ORDERS : ORDERS.slice(0, count),
        columns,
        getRowId: (row) => row.id,
        adapter,
        url: { defaultPageSize: 1000, pageSizes: [1000] },
      })
      return (
        <DataTable
          table={table}
          virtualize={virtualize}
          estimateRowHeight={ROW_HEIGHT}
        />
      )
    }

    const container = () =>
      document.querySelector<HTMLElement>("[data-slot=data-table]")!
    const rendered = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>("tbody tr[data-index]"),
        (row) => Number(row.dataset.index)
      )
    const spacers = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>("tbody tr[aria-hidden]"),
        (row) => parseFloat(row.querySelector("td")!.style.height)
      )

    async function scrollTo(top: number) {
      await act(async () => {
        container().scrollTop = top
        fireEvent.scroll(container())
      })
    }

    it("renders the rows in view and spaces out the rest", () => {
      render(<Orders adapter={createMemoryAdapter()} />)
      const shown = rendered()
      expect(shown[0]).toBe(0)
      expect(shown.length).toBeGreaterThanOrEqual(VIEW_HEIGHT / ROW_HEIGHT)
      expect(shown.length).toBeLessThan(40)
      // Only a spacer below; together the rows keep the full height.
      expect(spacers()).toEqual([(1000 - shown.length) * ROW_HEIGHT])
    })

    it("tells screen readers where each row sits", () => {
      render(<Orders adapter={createMemoryAdapter()} />)
      expect(
        document.querySelector("table")!.getAttribute("aria-rowcount")
      ).toBe("1001")
      // The header row is row 1.
      expect(
        document
          .querySelector("tbody tr[data-index]")!
          .getAttribute("aria-rowindex")
      ).toBe("2")
    })

    it("gives no row count to the empty state", () => {
      render(<Orders adapter={createMemoryAdapter()} count={0} />)
      expect(
        document.querySelector("table")!.hasAttribute("aria-rowcount")
      ).toBe(false)
      expect(spacers()).toEqual([])
    })

    it("follows the scroll", async () => {
      render(<Orders adapter={createMemoryAdapter()} />)
      await scrollTo(500 * ROW_HEIGHT)
      const shown = rendered()
      expect(shown).toContain(500)
      expect(shown).not.toContain(0)
      expect(shown.length).toBeLessThan(40)
      const [before, after] = spacers()
      // Customer 2's row, above them, is twice as high.
      expect(before).toBe((shown[0]! + 1) * ROW_HEIGHT)
      expect(after).toBe((999 - shown.at(-1)!) * ROW_HEIGHT)
      // Pinned cells stay pinned on the rows it brings in.
      expect(
        document
          .querySelector(`tr[data-index="500"] td[data-column-id="select"]`)!
          .getAttribute("data-pinned")
      ).toBe("start")
    })

    it("keeps a row's measured height when the sort moves it", async () => {
      const adapter = createMemoryAdapter()
      render(<Orders adapter={adapter} />)
      // The rows after the tall one move up a place; it goes to index 500.
      await act(async () => adapter.write({ sort: "amount" }))
      await scrollTo(50 * ROW_HEIGHT)
      const shown = rendered()
      expect(shown[0]).toBeLessThan(500)
      expect(spacers()[0]).toBe(shown[0]! * ROW_HEIGHT)
    })

    it("goes back to the first row when the sort changes", async () => {
      const adapter = createMemoryAdapter()
      render(<Orders adapter={adapter} />)
      await scrollTo(500 * ROW_HEIGHT)
      await act(async () => adapter.write({ sort: "-amount" }))
      expect(container().scrollTop).toBe(0)
      await act(async () => fireEvent.scroll(container()))
      expect(rendered()[0]).toBe(0)
      expect(
        document.querySelector(
          'tr[data-index="0"] td[data-column-id="customer"]'
        )!.textContent
      ).toBe("Customer 1000")
    })

    it("renders every row when off", () => {
      render(
        <Orders
          adapter={createMemoryAdapter()}
          virtualize={false}
          count={100}
        />
      )
      expect(rendered()).toHaveLength(100)
      expect(spacers()).toEqual([])
      expect(
        document.querySelector("table")!.hasAttribute("aria-rowcount")
      ).toBe(false)
    })
  }
)
