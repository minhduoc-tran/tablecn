import {
  djangoSerializer,
  type QuerySerializer,
  type UrlFormat,
} from "@querycn/filter-core"
import { act, cleanup, render, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createMemoryAdapter } from "./adapters/memory-adapter"
import { FilterProvider } from "./filter-provider"
import {
  addRule,
  FIELDS,
  setup,
  STATUS_ACTIVE,
} from "./filter-provider-test-utils"
import { useAppliedFilter } from "./use-applied-filter"
import { useFilter } from "./use-filter"

afterEach(cleanup)

describe("FilterProvider", () => {
  it("reads the applied filter from the adapter", () => {
    const { result } = setup({ adapter: createMemoryAdapter(STATUS_ACTIVE) })
    expect(result.current.applied.state.rules).toEqual([
      { id: "u0", field: "status", operator: "eq", value: "active" },
    ])
    expect(result.current.applied.activeCount).toBe(1)
    expect(result.current.applied.queryKey).toBe(STATUS_ACTIVE)
    expect(result.current.applied.query).toEqual({
      "filter[status][eq]": "active",
    })
    expect(result.current.draft.state).toBe(result.current.applied.state)
  })

  it("keeps edits in the draft until apply writes them", () => {
    const { adapter, result } = setup()
    addRule(result, "status", "active")
    act(() => result.current.draft.addRule())

    expect(adapter.read()).toBe("")
    expect(result.current.applied.activeCount).toBe(0)
    expect(result.current.draft.isDirty).toBe(true)

    act(() => result.current.draft.apply())
    expect(adapter.read()).toBe(`?${STATUS_ACTIVE}`)
    expect(result.current.applied.activeCount).toBe(1)
    // The incomplete rule is dropped and ids match the applied state.
    expect(result.current.draft.state).toEqual(result.current.applied.state)
    expect(result.current.draft.isDirty).toBe(false)
  })

  it("does not count incomplete rules as changes", () => {
    const { result } = setup()
    act(() => result.current.draft.addRule("name"))
    expect(result.current.draft.isDirty).toBe(false)
  })

  it("passes the applied state to onApply and writes its patch along", () => {
    const adapter = createMemoryAdapter()
    const write = vi.spyOn(adapter, "write")
    const onApply = vi.fn(() => ({ page: null }))
    const { result } = setup({ adapter, onApply })
    addRule(result, "status", "active")
    act(() => result.current.draft.apply())

    expect(onApply).toHaveBeenCalledWith({
      join: "and",
      rules: [{ id: "u0", field: "status", operator: "eq", value: "active" }],
    })
    expect(write).toHaveBeenCalledWith({ page: null, status__eq: ["active"] })
  })

  it("reset clears the draft and removes the filter params", () => {
    const onApply = vi.fn()
    const { adapter, result } = setup({
      adapter: createMemoryAdapter(STATUS_ACTIVE),
      onApply,
    })
    addRule(result, "name", "x")
    act(() => result.current.draft.reset())

    expect(adapter.read()).toBe("")
    expect(result.current.draft.state.rules).toEqual([])
    expect(onApply).toHaveBeenCalledWith({ join: "and", rules: [] })
  })

  it("discard drops unapplied edits", () => {
    const { result } = setup({ adapter: createMemoryAdapter(STATUS_ACTIVE) })
    addRule(result, "name", "x")
    act(() => result.current.draft.discard())
    expect(result.current.draft.state).toBe(result.current.applied.state)
  })

  it("follows changes made outside, e.g. back/forward", () => {
    const { adapter, result } = setup()
    addRule(result, "name", "unsaved")
    act(() => adapter.write({ status__eq: "active" }))

    expect(result.current.applied.activeCount).toBe(1)
    expect(result.current.draft.state).toBe(result.current.applied.state)
  })

  it("keeps the draft when the provider re-renders with new fields", () => {
    const adapter = createMemoryAdapter()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FilterProvider fields={[...FIELDS]} adapter={adapter}>
        {children}
      </FilterProvider>
    )
    const { result, rerender } = renderHook(() => useFilter(), { wrapper })
    act(() => result.current.addRule("name"))
    rerender()
    expect(result.current.state.rules).toHaveLength(1)
  })

  it("removes one applied rule at once", () => {
    const { adapter, result } = setup({
      adapter: createMemoryAdapter("status__eq=active&amount__gt=5"),
    })
    act(() => result.current.applied.removeRule("u0"))
    expect(adapter.read()).toBe("?amount__gt=5")
    expect(result.current.draft.state.rules).toHaveLength(1)
  })

  it("replaces every filter param on apply, keeping the others", () => {
    const { adapter, result } = setup({
      adapter: createMemoryAdapter(
        "page=2&name__nope=x&amount__gt=5&sort=name&join=or"
      ),
    })
    addRule(result, "status", "active")
    act(() => result.current.draft.apply())
    expect(adapter.read()).toBe(
      "?page=2&sort=name&join=or&amount__gt=5&status__eq=active"
    )
  })

  it("reads and writes through a custom urlFormat", () => {
    const urlFormat: UrlFormat = {
      encodeRule: ({ field, operator, value }) => [
        `_${field}`,
        JSON.stringify([operator, value]),
      ],
      decodeRule: (key, value) => {
        if (!key.startsWith("_")) return null
        const [operator, ruleValue] = JSON.parse(value) as [string, string]
        return { field: key.slice(1), operator, value: ruleValue }
      },
    }
    const { adapter, result } = setup({
      urlFormat,
      adapter: createMemoryAdapter(
        'page=2&_status=["eq","active"]&_amount=bad'
      ),
    })
    expect(result.current.applied.state.rules).toEqual([
      { id: "u0", field: "status", operator: "eq", value: "active" },
    ])
    act(() => result.current.draft.reset())
    // The format threw on `_amount`, so it can't tell it's a filter param.
    expect(adapter.read()).toBe("?page=2&_amount=bad")
  })

  it("does not change the applied state when other params change", () => {
    const { adapter, result } = setup({
      adapter: createMemoryAdapter(STATUS_ACTIVE),
    })
    const applied = result.current.applied.state
    act(() => adapter.write({ page: "2" }))
    expect(result.current.applied.state).toBe(applied)
  })

  it("stops adding rules at maxRules", () => {
    const { result } = setup({ maxRules: 1 })
    expect(result.current.draft.canAddRule).toBe(true)
    act(() => result.current.draft.addRule("name"))
    expect(result.current.draft.canAddRule).toBe(false)
    act(() => result.current.draft.addRule("name"))
    expect(result.current.draft.state.rules).toHaveLength(1)
  })

  it("merges message overrides over English", () => {
    const { result } = setup({ messages: { actions: { apply: "Go" } } })
    expect(result.current.draft.messages.actions.apply).toBe("Go")
    expect(result.current.draft.messages.actions.cancel).toBe("Cancel")
  })

  it("works without a URL adapter", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FilterProvider fields={FIELDS}>{children}</FilterProvider>
    )
    const { result } = renderHook(
      () => ({ draft: useFilter(), applied: useAppliedFilter() }),
      { wrapper }
    )
    addRule(result, "status", "active")
    act(() => result.current.draft.apply())
    expect(result.current.applied.queryKey).toBe(STATUS_ACTIVE)
  })
})

describe("serializer issues", () => {
  it("reports unsupported rules only after apply", () => {
    const { result } = setup({ serializer: djangoSerializer() })
    act(() => result.current.draft.addRule("name"))
    const { id } = result.current.draft.state.rules[0]!
    act(() => result.current.draft.setOperator(id, "ne"))
    act(() => result.current.draft.setValue(id, "x"))

    expect(result.current.applied.ruleIssues).toEqual({})
    act(() => result.current.draft.apply())
    expect(result.current.applied.ruleIssues).toEqual({ u0: ["unsupported"] })
    expect(result.current.draft.supportsOperator("ne")).toBe(false)
    expect(result.current.draft.supportsOperator("eq")).toBe(true)
  })

  it("reports rules whose keys collide", () => {
    const { result } = setup({
      adapter: createMemoryAdapter("status__eq=active&status__eq=archived"),
    })
    expect(result.current.applied.ruleIssues).toEqual({ u1: ["conflict"] })
  })

  it("accepts a plain function serializer", () => {
    const serializer: QuerySerializer<number> = (state) => state.rules.length
    const { result } = setup({
      serializer,
      adapter: createMemoryAdapter(STATUS_ACTIVE),
    })
    expect(result.current.applied.query).toBe(1)
    expect(result.current.applied.ruleIssues).toEqual({})
    expect(result.current.draft.supportsOperator("anything")).toBe(true)
  })
})

describe("re-renders", () => {
  it("does not re-render applied consumers while the draft changes", () => {
    const renders = { draft: 0, applied: 0 }
    let draft: ReturnType<typeof useFilter> | undefined
    function DraftConsumer() {
      renders.draft++
      draft = useFilter()
      return null
    }
    function AppliedConsumer() {
      renders.applied++
      useAppliedFilter()
      return null
    }
    render(
      <FilterProvider fields={FIELDS}>
        <DraftConsumer />
        <AppliedConsumer />
      </FilterProvider>
    )
    act(() => draft!.addRule("name"))
    act(() => draft!.setValue(draft!.state.rules[0]!.id, "abc"))

    expect(renders.draft).toBe(3)
    expect(renders.applied).toBe(1)
  })
})

describe("outside a provider", () => {
  it("useAppliedFilter returns an empty filter", () => {
    const { result } = renderHook(() => useAppliedFilter())
    expect(result.current.activeCount).toBe(0)
    expect(result.current.query).toEqual({})
    expect(result.current.queryKey).toBe("")
  })

  it("useFilter throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => renderHook(() => useFilter())).toThrow(/FilterProvider/)
    vi.restoreAllMocks()
  })
})
