import {
  djangoSerializer,
  type FieldDefinition,
  type FilterState,
} from "@querycn/filter-core"
import {
  createMemoryAdapter,
  FilterProvider,
  type UrlStateAdapter,
} from "@querycn/filter-react"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"

import { createDataTableColumnHelper } from "./data-table-features"
import { djangoTableParams } from "./table-params-serializers"
import { useTableQuery } from "./use-table-query"

interface Order {
  id: string
  amount: number
}

const helper = createDataTableColumnHelper<Order>()
const COLUMNS = helper.columns([
  helper.display({ id: "select" }),
  helper.accessor("amount", {}),
])
const FIELDS: FieldDefinition[] = [
  { name: "status", label: "Status", type: "text" },
]
const serializer = djangoTableParams()

function withFilter(adapter: UrlStateAdapter) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <FilterProvider
        fields={FIELDS}
        adapter={adapter}
        serializer={djangoSerializer()}
      >
        {children}
      </FilterProvider>
    )
  }
}

describe("useTableQuery", () => {
  it("merges the filter's params with sort and page", () => {
    const adapter = createMemoryAdapter(
      "?status__contains=paid&sort=-amount&page=3&tab=open"
    )
    const { result } = renderHook(
      () => useTableQuery({ columns: COLUMNS, serializer }),
      { wrapper: withFilter(adapter) }
    )
    expect(result.current.params).toEqual({
      status__icontains: "paid",
      ordering: "-amount",
      page: "3",
      page_size: "20",
    })
    expect(result.current.queryKey).toBe(
      "status__contains=paid&ordering=-amount&page=3&page_size=20"
    )
  })

  it("changes its key only when the filter, sort or page does", () => {
    const adapter = createMemoryAdapter("?sort=amount")
    const { result } = renderHook(
      () => useTableQuery({ columns: COLUMNS, serializer }),
      { wrapper: withFilter(adapter) }
    )
    const { params, queryKey } = result.current
    act(() => adapter.write({ tab: "closed" }))
    expect(result.current.params).toBe(params)
    expect(result.current.queryKey).toBe(queryKey)
    act(() => adapter.write({ page: "2" }))
    expect(result.current.queryKey).not.toBe(queryKey)
  })

  it("reads sort the way useDataTable does", () => {
    const adapter = createMemoryAdapter("?sort=select,-amount&per_page=50")
    const { result } = renderHook(() =>
      useTableQuery({
        columns: COLUMNS,
        serializer,
        adapter,
        url: { pageSizes: [25, 50] },
      })
    )
    expect(result.current.params).toEqual({
      ordering: "-amount",
      page: "1",
      page_size: "50",
    })
  })

  it("needs an adapter it shares with the table", () => {
    expect(() =>
      renderHook(() => useTableQuery({ columns: COLUMNS, serializer }))
    ).toThrow(/adapter/)
  })

  it("needs a filter serializer that returns query params", () => {
    const adapter = createMemoryAdapter("?status__contains=paid")
    const toWhere = (state: FilterState) => ({ AND: state.rules })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FilterProvider fields={FIELDS} adapter={adapter} serializer={toWhere}>
        {children}
      </FilterProvider>
    )
    expect(() =>
      renderHook(() => useTableQuery({ columns: COLUMNS, serializer }), {
        wrapper,
      })
    ).toThrow(/query params/)
  })
})
