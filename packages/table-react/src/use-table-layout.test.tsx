import {
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { columnColorFeature } from "./column-color-feature"
import type { LayoutStorage } from "./layout-storage"
import type { DataTableColumnMeta } from "./table-layout-state"
import { useTableLayout, type UseTableLayoutOptions } from "./use-table-layout"

interface Order {
  customer: string
  amount: number
  note: string
}

const features = tableFeatures({
  columnVisibilityFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnColorFeature,
  columnMeta: {} as DataTableColumnMeta,
})
const helper = createColumnHelper<typeof features, Order>()
const COLUMNS = helper.columns([
  helper.accessor("customer", {}),
  helper.accessor("amount", {}),
  helper.accessor("note", { meta: { defaultHidden: true } }),
])

afterEach(() => localStorage.clear())

const setup = (options: Partial<UseTableLayoutOptions> = {}, strict = false) =>
  renderHook(
    (props: Partial<UseTableLayoutOptions>) =>
      useTableLayout({ columns: COLUMNS, ...props }),
    { initialProps: options, reactStrictMode: strict }
  )

const stored = (key: string) => JSON.parse(localStorage.getItem(key)!)

describe("useTableLayout", () => {
  it("starts from the column definitions", () => {
    const { result } = setup()
    expect(result.current.state.columnVisibility).toEqual({ note: false })
    expect(result.current.state.columnOrder).toEqual([
      "customer",
      "amount",
      "note",
    ])
  })

  it("keeps changes in memory without a storageKey", () => {
    const { result } = setup()
    act(() => result.current.handlers.onColumnSizingChange({ amount: 200 }))
    expect(result.current.state.columnSizing).toEqual({ amount: 200 })
    expect(localStorage.length).toBe(0)
  })

  it("saves to localStorage and reads it back", () => {
    const first = setup({ storageKey: "orders", version: 2 })
    act(() =>
      first.result.current.handlers.onColumnVisibilityChange((old) => ({
        ...old,
        amount: false,
      }))
    )
    expect(stored("orders")).toMatchObject({
      version: 2,
      state: { columnVisibility: { note: false, amount: false } },
    })
    first.unmount()

    const second = setup({ storageKey: "orders", version: 2 })
    expect(second.result.current.state.columnVisibility).toEqual({
      note: false,
      amount: false,
    })
    const other = setup({ storageKey: "orders", version: 3 })
    expect(other.result.current.state.columnVisibility).toEqual({
      note: false,
    })
  })

  it("builds two changes in one event on each other", () => {
    const { result } = setup({ storageKey: "orders" })
    act(() => {
      result.current.handlers.onColumnColorsChange({ amount: "amber" })
      result.current.handlers.onColumnPinningChange({
        start: ["customer"],
        end: [],
      })
    })
    expect(result.current.state.columnColors).toEqual({ amount: "amber" })
    expect(stored("orders").state.columnColors).toEqual({ amount: "amber" })
  })

  it("keeps tables on one key in step", () => {
    const a = setup({ storageKey: "orders" })
    const b = setup({ storageKey: "orders" })
    act(() => a.result.current.handlers.onColumnSizingChange({ customer: 90 }))
    expect(b.result.current.state.columnSizing).toEqual({ customer: 90 })
  })

  it("follows another tab through the storage event", () => {
    const { result } = setup({ storageKey: "orders" })
    act(() => {
      localStorage.setItem(
        "orders",
        JSON.stringify({ version: 0, state: { columnColors: { note: "sky" } } })
      )
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "orders",
          storageArea: localStorage,
        })
      )
    })
    expect(result.current.state.columnColors).toEqual({ note: "sky" })
  })

  it("reset forgets the saved layout", () => {
    const { result } = setup({ storageKey: "orders" })
    act(() => result.current.handlers.onColumnSizingChange({ amount: 300 }))
    act(() => result.current.reset())
    expect(localStorage.getItem("orders")).toBeNull()
    expect(result.current.state.columnSizing).toEqual({})
  })

  it("still changes the layout when the storage refuses writes", () => {
    const refusing: LayoutStorage = {
      getItem: () => {
        throw new Error("SecurityError")
      },
      setItem: () => {
        throw new Error("QuotaExceededError")
      },
      removeItem: () => {},
    }
    const { result } = setup({ storageKey: "refusing", storage: refusing })
    expect(result.current.state.columnOrder).toHaveLength(3)
    act(() => result.current.handlers.onColumnOrderChange(["note", "amount"]))
    expect(result.current.state.columnOrder).toEqual([
      "note",
      "amount",
      "customer",
    ])
  })

  it("keeps unchanged slices while a column is resized", () => {
    const { result } = setup({ storageKey: "orders" })
    const before = result.current.state
    act(() => result.current.handlers.onColumnSizingChange({ amount: 150 }))
    const after = result.current.state
    expect(after.columnSizing).toEqual({ amount: 150 })
    expect(after.columnVisibility).toBe(before.columnVisibility)
    expect(after.columnOrder).toBe(before.columnOrder)
    expect(after.columnPinning).toBe(before.columnPinning)
  })

  it("reads the storage again once another tab writes to it", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementationOnce(() => {
        throw new Error("QuotaExceededError")
      })
    const { result } = setup({ storageKey: "quota" })
    act(() => result.current.handlers.onColumnSizingChange({ amount: 150 }))
    expect(result.current.state.columnSizing).toEqual({ amount: 150 })
    expect(localStorage.getItem("quota")).toBeNull()
    setItem.mockRestore()

    act(() => {
      localStorage.setItem(
        "quota",
        JSON.stringify({ version: 0, state: { columnSizing: { note: 90 } } })
      )
      window.dispatchEvent(
        new StorageEvent("storage", { key: "quota", storageArea: localStorage })
      )
    })
    expect(result.current.state.columnSizing).toEqual({ note: 90 })
  })

  it("keeps state and handlers stable across renders", () => {
    const { result, rerender } = setup({ storageKey: "orders" })
    const { state, handlers } = result.current
    rerender({ storageKey: "orders" })
    expect(result.current.state).toBe(state)
    expect(result.current.handlers).toBe(handlers)
  })

  it("saves once per change in StrictMode", () => {
    const writes: string[] = []
    const storage: LayoutStorage = {
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => {
        writes.push(value)
        localStorage.setItem(key, value)
      },
      removeItem: (key) => localStorage.removeItem(key),
    }
    const { result } = setup({ storageKey: "strict", storage }, true)
    act(() => result.current.handlers.onColumnSizingChange({ amount: 120 }))
    expect(writes).toHaveLength(1)
  })

  it("drives a TanStack table", () => {
    const { result } = renderHook(() => {
      const layout = useTableLayout({ columns: COLUMNS, storageKey: "orders" })
      return useTable({
        features,
        columns: COLUMNS,
        data: [],
        state: layout.state,
        ...layout.handlers,
      })
    })
    const column = (id: string) => result.current.getColumn(id)!
    expect(column("note").getIsVisible()).toBe(false)

    act(() => column("note").toggleVisibility(true))
    act(() => column("amount").pin("start"))
    act(() => column("customer").setColor("rose"))
    act(() => result.current.setColumnOrder(["amount", "note", "customer"]))

    expect(column("note").getIsVisible()).toBe(true)
    expect(column("amount").getIsPinned()).toBe("start")
    expect(column("customer").getColor()).toBe("rose")
    expect(stored("orders").state).toEqual({
      columnVisibility: {},
      columnOrder: ["amount", "note", "customer"],
      columnPinning: { start: ["amount"], end: [] },
      columnSizing: {},
      columnColors: { customer: "rose" },
    })

    // resetColumnOrder writes `[]`; the other saved choices must survive it.
    act(() => column("note").toggleVisibility(false))
    act(() => result.current.resetColumnOrder())
    expect(column("note").getIsVisible()).toBe(false)
    expect(column("amount").getIsPinned()).toBe("start")
    expect(result.current.getAllLeafColumns().map((c) => c.id)).toEqual([
      "customer",
      "amount",
      "note",
    ])
  })
})
