import type { FieldDefinition } from "@querycn/filter-core"
import { act, cleanup, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createMemoryAdapter } from "./adapters/memory-adapter"
import type { UrlStateAdapter } from "./adapters/url-state-adapter-types"
import { FilterProvider } from "./filter-provider"
import {
  addRule,
  createDeferredAdapter,
  FIELDS,
  setup,
  STATUS_ACTIVE,
} from "./filter-provider-test-utils"
import { useAppliedFilter } from "./use-applied-filter"
import { useFilter } from "./use-filter"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const TWO_RULES = '{"and":[["status","eq","active"],["amount","gt",5]]}'

describe("adapters that write asynchronously", () => {
  it("builds the next write on the pending one", () => {
    const { adapter, flush } = createDeferredAdapter(TWO_RULES)
    const { result } = setup({ adapter })

    act(() => result.current.applied.removeRule("u0"))
    expect(result.current.applied.queryKey).toBe('{"and":[["amount","gt",5]]}')
    act(() => result.current.applied.removeRule("u0"))
    act(() => flush())

    expect(adapter.read()).toBeNull()
    expect(result.current.applied.activeCount).toBe(0)
  })

  it("follows the adapter again once it moves", () => {
    const { adapter, flush, navigate } = createDeferredAdapter(TWO_RULES)
    const { result } = setup({ adapter })
    act(() => result.current.applied.removeRule("u0"))
    act(() => flush())
    act(() => navigate(TWO_RULES))

    expect(result.current.applied.activeCount).toBe(2)
    expect(result.current.draft.state).toBe(result.current.applied.state)
  })

  it("is not dirty right after apply", () => {
    const { adapter } = createDeferredAdapter()
    const { result } = setup({ adapter })
    addRule(result, "status", "active")
    act(() => result.current.draft.apply())
    expect(result.current.draft.isDirty).toBe(false)
    expect(result.current.applied.activeCount).toBe(1)
  })
})

describe("apply", () => {
  it("applies a value set in the same handler", () => {
    const { adapter, result } = setup()
    act(() => result.current.draft.addRule("status"))
    const { id } = result.current.draft.state.rules[0]!
    act(() => {
      result.current.draft.setValue(id, "active")
      result.current.draft.apply()
    })
    expect(adapter.read()).toBe(STATUS_ACTIVE)
  })

  it("skips onApply and the write when nothing changed", () => {
    const adapter = createMemoryAdapter(STATUS_ACTIVE)
    const write = vi.spyOn(adapter, "write")
    const onApply = vi.fn()
    const { result } = setup({ adapter, onApply })
    act(() => result.current.draft.addRule("name"))
    act(() => result.current.draft.apply())
    act(() => result.current.applied.removeRule("missing"))

    expect(onApply).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    // The incomplete rule is still dropped.
    expect(result.current.draft.state.rules).toHaveLength(1)
  })

  it("keeps an OR join", () => {
    const { adapter, result } = setup({
      adapter: createMemoryAdapter(TWO_RULES),
    })
    act(() => result.current.draft.setJoin("or"))
    expect(result.current.draft.isDirty).toBe(true)
    act(() => result.current.draft.apply())
    expect(adapter.read()).toBe(TWO_RULES.replace("and", "or"))
  })

  it("rewrites a malformed URL value in canonical form", () => {
    const { adapter, result } = setup({
      adapter: createMemoryAdapter(
        '{"and":[["status","eq","active"],["nope"]]'
      ),
    })
    expect(result.current.applied.activeCount).toBe(0)
    addRule(result, "status", "active")
    act(() => result.current.draft.apply())
    expect(adapter.read()).toBe(STATUS_ACTIVE)
  })

  it("keeps action identities while editing", () => {
    const { result } = setup()
    const { setValue, apply } = result.current.draft
    addRule(result, "name", "x")
    expect(result.current.draft.setValue).toBe(setValue)
    expect(result.current.draft.apply).toBe(apply)
  })
})

describe("fields that change", () => {
  it("resyncs the draft when new fields decode more of the URL", () => {
    const adapter = createMemoryAdapter(STATUS_ACTIVE)
    let fields: FieldDefinition[] = FIELDS.filter((f) => f.name !== "status")
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FilterProvider fields={fields} adapter={adapter}>
        {children}
      </FilterProvider>
    )
    const { result, rerender } = renderHook(
      () => ({ draft: useFilter(), applied: useAppliedFilter() }),
      { wrapper }
    )
    expect(result.current.draft.state.rules).toEqual([])

    fields = FIELDS
    rerender()
    expect(result.current.applied.activeCount).toBe(1)
    expect(result.current.draft.state).toBe(result.current.applied.state)
  })
})

describe("StrictMode", () => {
  it("edits, applies and follows outside changes", () => {
    const { adapter, result } = setup({}, { strict: true })
    addRule(result, "status", "active")
    act(() => result.current.draft.apply())
    expect(adapter.read()).toBe(STATUS_ACTIVE)

    act(() => adapter.write(TWO_RULES))
    expect(result.current.draft.state.rules).toHaveLength(2)
  })
})

describe("hydration", () => {
  it("renders the server value first, then the URL, without a mismatch", async () => {
    const adapter: UrlStateAdapter = {
      read: () => STATUS_ACTIVE,
      readServer: () => null,
      write: () => {},
    }
    let draftRules = -1
    function Count() {
      draftRules = useFilter().state.rules.length
      return <>{useAppliedFilter().activeCount}</>
    }
    const app = (
      <FilterProvider fields={FIELDS} adapter={adapter}>
        <Count />
      </FilterProvider>
    )
    const container = document.createElement("div")
    container.innerHTML = renderToString(app)
    expect(container.textContent).toBe("0")

    const errors = vi.spyOn(console, "error").mockImplementation(() => {})
    const onRecoverableError = vi.fn()
    const root = await act(async () =>
      hydrateRoot(container, app, { onRecoverableError })
    )

    expect(container.textContent).toBe("1")
    expect(draftRules).toBe(1)
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(errors).not.toHaveBeenCalled()
    act(() => root.unmount())
  })
})
