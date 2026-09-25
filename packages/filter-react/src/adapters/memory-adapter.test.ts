import { describe, expect, it, vi } from "vitest"

import { createMemoryAdapter } from "./memory-adapter"

describe("createMemoryAdapter", () => {
  it("reads, writes and notifies only on change", () => {
    const adapter = createMemoryAdapter("a")
    const listener = vi.fn()
    const unsubscribe = adapter.subscribe!(listener)

    expect(adapter.read()).toBe("a")
    adapter.write("a")
    expect(listener).not.toHaveBeenCalled()
    adapter.write(null)
    expect(adapter.read()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    adapter.write("b")
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("ignores other params: there is no URL", () => {
    const adapter = createMemoryAdapter()
    adapter.write("x", { page: null })
    expect(adapter.read()).toBe("x")
  })

  it("keeps instances independent", () => {
    const first = createMemoryAdapter()
    const second = createMemoryAdapter()
    first.write("x")
    expect(second.read()).toBeNull()
  })
})
