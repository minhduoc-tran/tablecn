import { describe, expect, it, vi } from "vitest"

import { createMemoryAdapter } from "./memory-adapter"

describe("createMemoryAdapter", () => {
  it("reads, writes and notifies only on change", () => {
    const adapter = createMemoryAdapter("a=1")
    const listener = vi.fn()
    const unsubscribe = adapter.subscribe!(listener)

    expect(adapter.read()).toBe("a=1")
    adapter.write({ a: "1" })
    expect(listener).not.toHaveBeenCalled()
    adapter.write({ a: null })
    expect(adapter.read()).toBe("")
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    adapter.write({ b: "2" })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("applies the whole patch, repeating keys given as arrays", () => {
    const adapter = createMemoryAdapter("page=2&sort=name")
    adapter.write({ page: null, tags__in: ["a", "b"] })
    expect(adapter.read()).toBe("?sort=name&tags__in=a&tags__in=b")
  })

  it("keeps instances independent", () => {
    const first = createMemoryAdapter()
    const second = createMemoryAdapter()
    first.write({ x: "1" })
    expect(second.read()).toBe("")
  })
})
