import type { FieldDefinition } from "@querycn/filter-core"
import {
  applyParamChanges,
  createMemoryAdapter,
  FilterProvider,
  useFilter,
  type ParamPatch,
  type UrlStateAdapter,
} from "@querycn/filter-react"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it } from "vitest"

import { createDataTableColumnHelper } from "./data-table-features"
import { resetPagePatch } from "./table-url-codec"
import { useDataTable, type UseDataTableOptions } from "./use-data-table"

interface Order {
  id: string
  customer: string
  amount: number
  status: "paid" | "open"
}

const ORDERS: Order[] = Array.from({ length: 25 }, (_, i) => ({
  id: String(i + 1),
  customer: `Customer ${String(i + 1).padStart(2, "0")}`,
  amount: (i * 37) % 100,
  status: i % 2 ? "open" : "paid",
}))

const helper = createDataTableColumnHelper<Order>()
const COLUMNS = helper.columns([
  helper.display({ id: "select", enableHiding: false, enableSorting: false }),
  helper.accessor("customer", {}),
  helper.accessor("amount", {}),
  helper.accessor("status", { meta: { defaultHidden: true } }),
])

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

afterEach(() => localStorage.clear())

function track(adapter: UrlStateAdapter) {
  const writes: ParamPatch[] = []
  const write = adapter.write
  adapter.write = (changes) => {
    writes.push(changes)
    write(changes)
  }
  return writes
}

type Options = Partial<UseDataTableOptions<Order>>

function setup(initial = "", options: Options = {}, strict = false) {
  const adapter = createMemoryAdapter(initial)
  const writes = track(adapter)
  const hook = renderHook(
    (props: Options) =>
      useDataTable({
        data: ORDERS,
        columns: COLUMNS,
        getRowId: (row) => row.id,
        adapter,
        ...props,
      } as UseDataTableOptions<Order>),
    { initialProps: options, reactStrictMode: strict }
  )
  return { adapter, writes, ...hook }
}

type Table = ReturnType<typeof setup>["result"]["current"]
const ids = (table: Table) => table.getRowModel().rows.map((row) => row.id)

describe("useDataTable in client mode", () => {
  it("pages the rows with the URL's page and page size", () => {
    const { result } = setup("?page=2&per_page=10")
    expect(ids(result.current)).toEqual(
      ORDERS.slice(10, 20).map((row) => row.id)
    )
    expect(result.current.getPageCount()).toBe(3)
  })

  it("tells the UI which page sizes the URL accepts", () => {
    expect(setup().result.current.options.meta?.pageSizes).toEqual([
      10, 20, 50, 100,
    ])
    const custom = setup("", { url: { pageSizes: [75, 25] } })
    expect(custom.result.current.options.meta?.pageSizes).toEqual([20, 25, 75])
  })

  it("sorts through the URL and goes back to page 1", () => {
    const { adapter, result } = setup("?page=2&per_page=10")
    act(() => result.current.getColumn("amount")!.toggleSorting(true))
    expect(adapter.read()).toBe("?per_page=10&sort=-amount")
    const amounts = result.current
      .getRowModel()
      .rows.map((row) => row.original.amount)
    expect(amounts).toEqual([...amounts].sort((a, b) => b - a))
    expect(amounts[0]).toBe(Math.max(...ORDERS.map((row) => row.amount)))
  })

  it("sorts ascending first unless a column says otherwise", () => {
    const { adapter, result } = setup()
    act(() => result.current.getColumn("amount")!.toggleSorting())
    expect(adapter.read()).toBe("?sort=amount")
  })

  it("keeps multi-sort within maxSortColumns", () => {
    const { adapter, result } = setup("", { url: { maxSortColumns: 2 } })
    act(() => {
      result.current.getColumn("amount")!.toggleSorting(false, true)
      result.current.getColumn("customer")!.toggleSorting(true, true)
      result.current.getColumn("status")!.toggleSorting(false, true)
    })
    expect(adapter.read()).toBe("?sort=-customer,status")
  })

  it("clamps a page past the end without writing", () => {
    const { writes, result, rerender } = setup("?page=3&per_page=10")
    rerender({ data: ORDERS.slice(0, 12) })
    expect(result.current.store.state.pagination.pageIndex).toBe(1)
    expect(ids(result.current)).toEqual(["11", "12"])
    expect(writes).toEqual([])
  })

  it("filters with the FilterProvider around it and shares its adapter", () => {
    const adapter = createMemoryAdapter("?page=2&per_page=10")
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FilterProvider
        fields={FIELDS}
        adapter={adapter}
        onApply={() => resetPagePatch()}
      >
        {children}
      </FilterProvider>
    )
    const { result } = renderHook(
      () => ({
        filter: useFilter(),
        table: useDataTable({
          data: ORDERS,
          columns: COLUMNS,
          getRowId: (row) => row.id,
        }),
      }),
      { wrapper }
    )
    act(() => result.current.filter.addRule("status"))
    const { id } = result.current.filter.state.rules[0]!
    act(() => result.current.filter.setValue(id, "open"))
    act(() => result.current.filter.apply())

    expect(adapter.read()).toBe("?per_page=10&status__eq=open")
    const rows = result.current.table.getRowModel().rows
    expect(rows).toHaveLength(10)
    expect(rows.every((row) => row.original.status === "open")).toBe(true)
    expect(result.current.table.getRowCount()).toBe(12)

    act(() => result.current.table.nextPage())
    expect(adapter.read()).toBe("?per_page=10&status__eq=open&page=2")
  })

  it("filters by getFilterValue when field names aren't row keys", () => {
    const adapter = createMemoryAdapter("?state__eq=open")
    const fields: FieldDefinition[] = [
      { ...FIELDS[0]!, name: "state" } as FieldDefinition,
    ]
    const getFilterValue = (row: Order, field: FieldDefinition) =>
      field.name === "state" ? row.status : undefined
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FilterProvider fields={fields} adapter={adapter}>
        {children}
      </FilterProvider>
    )
    const { result } = renderHook(
      () =>
        useDataTable({
          data: ORDERS,
          columns: COLUMNS,
          getRowId: (row) => row.id,
          getFilterValue,
        }),
      { wrapper }
    )
    expect(result.current.getRowCount()).toBe(12)
  })

  it("searches the rows from the URL's q, ignoring case and accents", () => {
    const people = [
      { ...ORDERS[0]!, id: "a", customer: "Nguyễn Văn An" },
      { ...ORDERS[1]!, id: "b", customer: "Lê Thị Bình" },
      { ...ORDERS[2]!, id: "c", customer: "Đặng An" },
    ]
    const { result } = setup("?q=AN", { data: people })
    expect(ids(result.current)).toEqual(["a", "c"])
    // Every word must match, in any searched column.
    act(() => result.current.options.meta!.setSearch("nguyen van"))
    expect(ids(result.current)).toEqual(["a"])
    act(() => result.current.options.meta!.setSearch("dang"))
    expect(ids(result.current)).toEqual(["c"])
  })

  it("searches only searchColumns when given", () => {
    const { result } = setup("?q=paid", { searchColumns: ["customer"] })
    expect(ids(result.current)).toEqual([])
    const all = setup("?q=paid&per_page=50")
    expect(ids(all.result.current)).toHaveLength(13)
  })

  it("writes the search and goes back to page 1", () => {
    const { adapter, result } = setup("?page=2&per_page=10&sort=amount")
    act(() => result.current.options.meta!.setSearch("  Customer 1 "))
    expect(adapter.read()).toBe("?per_page=10&sort=amount&q=Customer%201")
    expect(result.current.options.meta!.search).toBe("Customer 1")
    act(() => result.current.options.meta!.setSearch(""))
    expect(adapter.read()).toBe("?per_page=10&sort=amount")
  })

  it("shows a search right away with a router that applies writes later", () => {
    let value = "?page=2&per_page=10"
    const queue: ParamPatch[] = []
    const adapter: UrlStateAdapter = {
      read: () => value,
      write: (changes) => void queue.push(changes),
    }
    const { result } = renderHook(() =>
      useDataTable({
        data: ORDERS,
        columns: COLUMNS,
        getRowId: (row) => row.id,
        adapter,
      })
    )
    act(() => result.current.options.meta!.setSearch("Customer 03"))
    // The router hasn't navigated yet; rows, page and box agree already.
    expect(value).toBe("?page=2&per_page=10")
    expect(ids(result.current)).toEqual(["3"])
    expect(result.current.store.state.pagination.pageIndex).toBe(0)
    for (const changes of queue) value = applyParamChanges(value, changes)!
    expect(value).toBe("?per_page=10&q=Customer%2003")
  })

  it("counts the searched rows to clamp the page", () => {
    const { result } = setup("?q=Customer+2&page=3&per_page=10", {
      searchColumns: ["customer"],
    })
    // Customer 02, 12 and 20–25: one page.
    expect(ids(result.current)).toHaveLength(8)
    expect(result.current.store.state.pagination.pageIndex).toBe(0)
  })

  it("drops sort ids of columns that can't sort", () => {
    const { result } = setup("?sort=select,ghost,-amount")
    expect(result.current.store.state.sorting).toEqual([
      { id: "amount", desc: true },
    ])
  })

  it("resets sort and page size to the URL defaults", () => {
    const defaultSorting = [{ id: "customer", desc: false }]
    const { adapter, result } = setup("?sort=-amount&per_page=50", {
      url: { defaultSorting, defaultPageSize: 20 },
    })
    act(() => {
      result.current.resetSorting()
      result.current.resetPageSize()
    })
    expect(adapter.read()).toBe("")
    expect(result.current.store.state.sorting).toEqual(defaultSorting)
    expect(result.current.store.state.pagination.pageSize).toBe(20)
  })

  it("works without a FilterProvider or an adapter", () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: ORDERS,
        columns: COLUMNS,
        getRowId: (row) => row.id,
      })
    )
    act(() => result.current.setPageIndex(1))
    expect(ids(result.current)[0]).toBe("21")
  })
})

describe("useDataTable in server mode", () => {
  const PAGE = ORDERS.slice(0, 10).reverse()
  const server = (initial: string, rowCount: number | undefined) =>
    setup(initial, { mode: "server", data: PAGE, rowCount })

  it("shows the rows as given and pages by rowCount", () => {
    const { result } = server("?sort=customer&per_page=10", 95)
    expect(ids(result.current)).toEqual(PAGE.map((row) => row.id))
    expect(result.current.getPageCount()).toBe(10)
    expect(result.current.getCanNextPage()).toBe(true)
  })

  it("writes sort and page for the backend", () => {
    const { adapter, result } = server("?per_page=10", 95)
    act(() => result.current.setPageIndex(4))
    expect(adapter.read()).toBe("?per_page=10&page=5")
    act(() => result.current.getColumn("amount")!.toggleSorting(false))
    expect(adapter.read()).toBe("?per_page=10&sort=amount")
  })

  it("keeps the last known rowCount while the next page loads", () => {
    const { result, rerender } = server("?page=10&per_page=10", 50)
    expect(result.current.store.state.pagination.pageIndex).toBe(4)
    rerender({ mode: "server", data: PAGE, rowCount: undefined })
    expect(result.current.store.state.pagination.pageIndex).toBe(4)
    expect(result.current.getPageCount()).toBe(5)
  })

  it("points the URL at the last page once the backend's total is known", () => {
    const { adapter, writes, rerender } = server(
      "?page=40&per_page=10",
      undefined
    )
    expect(writes).toEqual([])
    rerender({ mode: "server", data: [], rowCount: 95 })
    expect(writes).toEqual([{ page: "10" }])
    expect(adapter.read()).toBe("?per_page=10&page=10")
  })

  it("keeps the URL's page when the total is left over from another filter", () => {
    const adapter = createMemoryAdapter("?page=5&per_page=10")
    const writes = track(adapter)
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FilterProvider fields={FIELDS} adapter={adapter}>
        {children}
      </FilterProvider>
    )
    const { result, rerender } = renderHook(
      ({ rowCount }: { rowCount: number }) =>
        useDataTable({
          mode: "server",
          data: PAGE,
          rowCount,
          columns: COLUMNS,
          getRowId: (row) => row.id,
        }),
      { wrapper, initialProps: { rowCount: 200 } }
    )
    // A link to a filtered list, its total, then back to page 5 while
    // `keepPreviousData` still hands over the filtered total.
    act(() => adapter.write({ page: null, status__eq: "open" }))
    rerender({ rowCount: 10 })
    act(() => adapter.write({ page: "5", status__eq: null }))
    rerender({ rowCount: 10 })
    expect(result.current.store.state.pagination.pageIndex).toBe(0)
    rerender({ rowCount: 200 })
    expect(result.current.store.state.pagination.pageIndex).toBe(4)
    expect(adapter.read()).toBe("?per_page=10&page=5")
    expect(writes.filter((w) => !("status__eq" in w))).toEqual([])
  })

  it("points the URL at the last page when another search has the same total", () => {
    const { adapter, writes, rerender } = server("?q=an&page=3&per_page=10", 25)
    // Back/forward to another search on a page past its end, while
    // `keepPreviousData` still hands over the old page and total.
    act(() => adapter.write({ q: "bi", page: "5" }))
    rerender({ mode: "server", data: PAGE, rowCount: 25 })
    expect(writes.filter((w) => !("q" in w))).toEqual([])
    // The backend answers for this search: the same total, new rows.
    rerender({ mode: "server", data: PAGE.slice(), rowCount: 25 })
    expect(adapter.read()).toBe("?per_page=10&q=bi&page=3")
  })

  it("settles when data is a new array every render", () => {
    const adapter = createMemoryAdapter("?q=an&page=2&per_page=10")
    const { result } = renderHook(() =>
      useDataTable({
        mode: "server",
        data: [...PAGE],
        rowCount: 25,
        columns: COLUMNS,
        getRowId: (row) => row.id,
        adapter,
      })
    )
    act(() => adapter.write({ q: "bi" }))
    expect(result.current.store.state.pagination.pageIndex).toBe(1)
  })

  it("clamps to the last page once rowCount is known", () => {
    const { result, rerender } = server("?page=40&per_page=10", undefined)
    expect(result.current.store.state.pagination.pageIndex).toBe(39)
    rerender({ mode: "server", data: PAGE, rowCount: 95 })
    expect(result.current.store.state.pagination.pageIndex).toBe(9)
  })
})

describe("useDataTable selection and layout", () => {
  it("keeps the selection across refetches and clears it on another page", () => {
    const { result, rerender } = setup("?per_page=10")
    act(() => result.current.getRow("3").toggleSelected(true))
    rerender({ data: [...ORDERS] })
    expect(result.current.getSelectedRowModel().rows.map((r) => r.id)).toEqual([
      "3",
    ])
    act(() => result.current.nextPage())
    expect(result.current.store.state.rowSelection).toEqual({})
  })

  it("clears the selection when the search changes", () => {
    const { result } = setup()
    act(() => result.current.getRow("1").toggleSelected(true))
    act(() => result.current.options.meta!.setSearch("Customer"))
    expect(result.current.store.state.rowSelection).toEqual({})
  })

  it("honours enableRowSelection", () => {
    const { result } = setup("", {
      enableRowSelection: (row) => row.original.status === "paid",
    })
    expect(result.current.getRow("1").getCanSelect()).toBe(true)
    expect(result.current.getRow("2").getCanSelect()).toBe(false)
  })

  it("forgets the saved layout on meta.resetLayout", () => {
    const { result } = setup("", { storageKey: "orders" })
    act(() => result.current.getColumn("amount")!.toggleVisibility(false))
    expect(localStorage.getItem("orders")).not.toBeNull()
    act(() => result.current.options.meta!.resetLayout())
    expect(localStorage.getItem("orders")).toBeNull()
    expect(result.current.getColumn("amount")!.getIsVisible()).toBe(true)
  })

  it("saves the column layout and resets to the columns' defaults", () => {
    const { result } = setup("", { storageKey: "orders" })
    const column = (id: string) => result.current.getColumn(id)!
    expect(column("status").getIsVisible()).toBe(false)
    expect(column("select").getCanHide()).toBe(false)

    act(() => column("status").toggleVisibility(true))
    act(() => column("amount").setColor("amber"))
    expect(
      JSON.parse(localStorage.getItem("orders")!).state.columnColors
    ).toEqual({ amount: "amber" })

    act(() => {
      result.current.resetColumnVisibility()
      result.current.resetColumnColors()
    })
    expect(column("status").getIsVisible()).toBe(false)
    expect(column("amount").getColor()).toBeUndefined()
  })

  it("writes once per change in StrictMode", () => {
    const { writes, result } = setup("", {}, true)
    act(() => result.current.getColumn("customer")!.toggleSorting(false))
    expect(writes).toEqual([{ sort: "customer" }])
  })
})
