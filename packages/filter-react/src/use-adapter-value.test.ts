import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { createDeferredAdapter } from "./filter-provider-test-utils"
import { useAdapterValue } from "./use-adapter-value"

describe("useAdapterValue", () => {
  it("shows every write the adapter hasn't applied yet", () => {
    const { adapter, flush } = createDeferredAdapter("?tab=open")
    const { result } = renderHook(() => useAdapterValue(adapter))
    act(() => result.current[1]({ sort: "name" }))
    act(() => result.current[1]({ page: "2" }))
    expect(result.current[0]).toBe("?tab=open&sort=name&page=2")
    act(flush)
    expect(adapter.read()).toBe("?tab=open&sort=name&page=2")
    expect(result.current[0]).toBe("?tab=open&sort=name&page=2")
  })

  it("chains writes made in one event", () => {
    const { adapter } = createDeferredAdapter()
    const { result } = renderHook(() => useAdapterValue(adapter))
    act(() => {
      result.current[1]({ sort: "name" })
      result.current[1]({ page: "2" })
    })
    expect(result.current[0]).toBe("?sort=name&page=2")
  })

  it("drops the pending value when a write undoes it", () => {
    const { adapter } = createDeferredAdapter("?page=2")
    const { result } = renderHook(() => useAdapterValue(adapter))
    act(() => result.current[1]({ page: null }))
    expect(result.current[0]).toBe("")
    act(() => result.current[1]({ page: "2" }))
    expect(result.current[0]).toBe("?page=2")
  })

  it("follows a navigation that lands before the write", () => {
    const { adapter, navigate } = createDeferredAdapter()
    const { result } = renderHook(() => useAdapterValue(adapter))
    act(() => result.current[1]({ sort: "name" }))
    act(() => navigate("?tab=closed"))
    expect(result.current[0]).toBe("?tab=closed")
  })
})
