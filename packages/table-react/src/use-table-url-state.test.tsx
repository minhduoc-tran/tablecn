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
import { describe, expect, it } from "vitest"

import { resetPagePatch } from "./table-url-codec"
import {
  useTableUrlState,
  type UseTableUrlStateOptions,
} from "./use-table-url-state"

function spyOn(adapter: UrlStateAdapter) {
  const writes: ParamPatch[] = []
  const write = adapter.write
  adapter.write = (changes) => {
    writes.push(changes)
    write(changes)
  }
  return writes
}

function setup(
  initial = "",
  options: Omit<UseTableUrlStateOptions, "adapter"> = {},
  strict = false
) {
  const adapter = createMemoryAdapter(initial)
  const writes = spyOn(adapter)
  const hook = renderHook(
    (props: Omit<UseTableUrlStateOptions, "adapter">) =>
      useTableUrlState({ adapter, ...props }),
    { initialProps: options, reactStrictMode: strict }
  )
  return { adapter, writes, ...hook }
}

/** Like a router adapter: writes land only when `flush` runs, i.e. after navigation. */
function createDeferredAdapter(initial = "") {
  let value = initial
  let queued: ParamPatch | null = null
  const listeners = new Set<() => void>()
  const adapter: UrlStateAdapter = {
    read: () => value,
    write: (changes) => {
      queued = { ...queued, ...changes }
    },
    subscribe: (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
  }
  const flush = () => {
    if (queued) value = applyParamChanges(value, queued) ?? value
    queued = null
    for (const listener of listeners) listener()
  }
  return { adapter, flush }
}

describe("useTableUrlState", () => {
  it("reads sorting and pagination from the adapter", () => {
    const { result } = setup(
      "?status__contains=paid&sort=-amount&page=3&per_page=50"
    )
    expect(result.current.sorting).toEqual([{ id: "amount", desc: true }])
    expect(result.current.pagination).toEqual({ pageIndex: 2, pageSize: 50 })
  })

  it("keeps its state in memory without an adapter", () => {
    const { result } = renderHook(() => useTableUrlState())
    act(() =>
      result.current.onPaginationChange((p) => ({ ...p, pageIndex: 1 }))
    )
    expect(result.current.pagination).toEqual({ pageIndex: 1, pageSize: 20 })
  })

  it("writes only the params that change and keeps the others", () => {
    const { adapter, writes, result } = setup("?tab=open&sort=name&per_page=50")
    act(() =>
      result.current.onPaginationChange((p) => ({ ...p, pageIndex: 1 }))
    )
    expect(writes).toEqual([{ page: "2" }])
    expect(adapter.read()).toBe("?tab=open&sort=name&per_page=50&page=2")
  })

  it("goes back to page 1 in the same write when the sort changes", () => {
    const { adapter, writes, result } = setup("?sort=name&page=4")
    act(() => result.current.onSortingChange([{ id: "amount", desc: true }]))
    expect(writes).toEqual([{ sort: "-amount", page: null }])
    expect(adapter.read()).toBe("?sort=-amount")
    expect(result.current.pagination.pageIndex).toBe(0)
  })

  it("goes back to page 1 when the page size changes", () => {
    const { adapter, result } = setup("?page=4")
    act(() =>
      result.current.onPaginationChange((p) => ({ ...p, pageSize: 100 }))
    )
    expect(adapter.read()).toBe("?per_page=100")
  })

  it("does not write when nothing changes", () => {
    const { writes, result } = setup("?sort=name")
    act(() => result.current.onSortingChange((s) => s))
    act(() => result.current.onPaginationChange((p) => p))
    expect(writes).toEqual([])
  })

  it("keeps the page when the sort the URL shows stays the same", () => {
    const { writes, result } = setup("?sort=a,b,c&page=4")
    act(() =>
      result.current.onSortingChange((s) => [...s, { id: "d", desc: false }])
    )
    expect(writes).toEqual([])
    expect(result.current.pagination.pageIndex).toBe(3)
  })

  it("builds the next update on what the URL will read back", () => {
    const { adapter, result } = setup("", {
      sortableColumns: ["name"],
      pageSizes: [10, 20],
    })
    act(() => {
      result.current.onSortingChange([
        { id: "ghost", desc: false },
        { id: "name", desc: true },
      ])
      result.current.onPaginationChange((p) => ({ ...p, pageSize: 7 }))
      result.current.onPaginationChange((p) => ({ ...p, pageIndex: 1 }))
    })
    expect(adapter.read()).toBe("?sort=-name&page=2")
    expect(result.current.pagination).toEqual({ pageIndex: 1, pageSize: 20 })
  })

  it("rewrites a page param the codec rejected", () => {
    const { adapter, result } = setup("?page=abc&sort=name")
    act(() => result.current.onSortingChange([]))
    expect(adapter.read()).toBe("")
  })

  it("builds two updates in one event on each other", () => {
    const { adapter, result } = setup()
    act(() => {
      result.current.onSortingChange([{ id: "name", desc: false }])
      result.current.onPaginationChange((p) => ({ ...p, pageIndex: 2 }))
    })
    expect(adapter.read()).toBe("?sort=name&page=3")
  })

  it("keeps both updates when the adapter applies writes later", () => {
    const { adapter, flush } = createDeferredAdapter("?tab=open")
    const { result } = renderHook(() => useTableUrlState({ adapter }))
    act(() => result.current.onSortingChange([{ id: "name", desc: true }]))
    expect(result.current.sorting).toEqual([{ id: "name", desc: true }])
    act(() =>
      result.current.onPaginationChange((p) => ({ ...p, pageIndex: 1 }))
    )
    expect(result.current.pagination.pageIndex).toBe(1)
    expect(result.current.sorting).toEqual([{ id: "name", desc: true }])
    act(() =>
      result.current.onSortingChange((s) => [
        ...s,
        { id: "amount", desc: false },
      ])
    )
    expect(result.current.sorting).toEqual([
      { id: "name", desc: true },
      { id: "amount", desc: false },
    ])
    expect(result.current.pagination.pageIndex).toBe(0)
    act(() =>
      result.current.onPaginationChange((p) => ({ ...p, pageIndex: 1 }))
    )
    act(flush)
    expect(adapter.read()).toBe("?tab=open&sort=-name,amount&page=2")
    expect(result.current.sorting).toEqual([
      { id: "name", desc: true },
      { id: "amount", desc: false },
    ])
    expect(result.current.pagination.pageIndex).toBe(1)
  })

  it("clamps the page to pageCount without writing", () => {
    const { writes, result, rerender } = setup("?page=9", { pageCount: 3 })
    expect(result.current.pagination.pageIndex).toBe(2)
    rerender({ pageCount: 0 })
    expect(result.current.pagination.pageIndex).toBe(0)
    for (const pageCount of [-1, NaN, undefined]) {
      rerender({ pageCount })
      expect(result.current.pagination.pageIndex).toBe(8)
    }
    expect(writes).toEqual([])
  })

  it("clamps with rowCount and the page size in the URL", () => {
    const { result, rerender } = setup("?page=9&per_page=50", { rowCount: 120 })
    expect(result.current.pagination.pageIndex).toBe(2)
    rerender({ rowCount: 0 })
    expect(result.current.pagination.pageIndex).toBe(0)
    rerender({ rowCount: 120, pageCount: 5 })
    expect(result.current.pagination.pageIndex).toBe(4)
  })

  it("steps back from a clamped page", () => {
    const { adapter, result } = setup("?page=9", { pageCount: 3 })
    act(() =>
      result.current.onPaginationChange((p) => ({
        ...p,
        pageIndex: p.pageIndex - 1,
      }))
    )
    expect(adapter.read()).toBe("?page=2")
  })

  it("keeps state references while the URL holds still", () => {
    const { result, rerender } = setup("?sort=-amount", {
      pageSizes: [10, 20],
      defaultSorting: [{ id: "date", desc: true }],
    })
    const { sorting, pagination, onSortingChange } = result.current
    rerender({
      pageSizes: [10, 20],
      defaultSorting: [{ id: "date", desc: true }],
    })
    expect(result.current.sorting).toBe(sorting)
    expect(result.current.pagination).toBe(pagination)
    expect(result.current.onSortingChange).toBe(onSortingChange)
  })

  it("uses custom param names and defaults", () => {
    const options = {
      params: { sort: "ordering", page: "p", perPage: "size" },
      defaultPageSize: 10,
      pageSizes: [10, 25],
    }
    const { adapter, result } = setup("?p=2", options)
    act(() =>
      result.current.onPaginationChange((p) => ({ ...p, pageSize: 25 }))
    )
    expect(adapter.read()).toBe("?size=25")
    act(() => result.current.onSortingChange([{ id: "name", desc: false }]))
    expect(adapter.read()).toBe("?size=25&ordering=name")
  })

  it("writes once per change in StrictMode", () => {
    const { writes, result } = setup("", {}, true)
    act(() => result.current.onSortingChange([{ id: "name", desc: false }]))
    expect(writes).toEqual([{ sort: "name" }])
  })

  it("follows back/forward navigation", () => {
    const { adapter, result } = setup("?page=2")
    act(() => adapter.write({ page: "5", sort: "name" }))
    expect(result.current.pagination.pageIndex).toBe(4)
    expect(result.current.sorting).toEqual([{ id: "name", desc: false }])
  })
})

describe("useTableUrlState next to FilterProvider", () => {
  const FIELDS: FieldDefinition[] = [
    { name: "status", label: "Status", type: "text" },
  ]

  it("shares one URL, in the order things happened", () => {
    const adapter = createMemoryAdapter("?tab=open")
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
      () => ({ filter: useFilter(), table: useTableUrlState({ adapter }) }),
      { wrapper }
    )

    act(() =>
      result.current.table.onPaginationChange((p) => ({ ...p, pageIndex: 3 }))
    )
    act(() =>
      result.current.table.onSortingChange([{ id: "amount", desc: true }])
    )
    act(() =>
      result.current.table.onPaginationChange((p) => ({ ...p, pageIndex: 1 }))
    )
    expect(adapter.read()).toBe("?tab=open&sort=-amount&page=2")

    act(() => result.current.filter.addRule("status"))
    const { id } = result.current.filter.state.rules[0]!
    act(() => result.current.filter.setValue(id, "paid"))
    act(() => result.current.filter.apply())
    expect(adapter.read()).toBe("?tab=open&sort=-amount&status__contains=paid")
    expect(result.current.table.pagination.pageIndex).toBe(0)

    act(() =>
      result.current.table.onPaginationChange((p) => ({ ...p, pageIndex: 1 }))
    )
    expect(adapter.read()).toBe(
      "?tab=open&sort=-amount&status__contains=paid&page=2"
    )
    expect(result.current.filter.state.rules).toHaveLength(1)
  })
})
