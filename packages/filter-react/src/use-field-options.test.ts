import type { FieldDefinition, SelectOption } from "@querycn/filter-core"
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { clearFieldOptionsCache } from "./field-options-cache"
import { useFieldOptions, type FieldOptionsConfig } from "./use-field-options"

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const option = (value: string): SelectOption => ({
  value,
  label: value.toUpperCase(),
})

/** A loader whose responses the test settles by hand, in any order. */
function manualLoader() {
  const calls: {
    search: string
    signal: AbortSignal
    resolve: (options: SelectOption[]) => void
    reject: (error: unknown) => void
  }[] = []
  const load = vi.fn(
    (search: string, signal: AbortSignal) =>
      new Promise<SelectOption[]>((resolve, reject) => {
        calls.push({ search, signal, resolve, reject })
      })
  )
  return { load, calls }
}

const asyncField = (
  loadOptions: FieldDefinition["loadOptions"],
  extra: Partial<FieldDefinition> = {}
): FieldDefinition => ({
  name: "customer",
  label: "Customer",
  type: "select",
  loadOptions,
  ...extra,
})

const flush = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms))

function renderOptions(field: FieldDefinition, config?: FieldOptionsConfig) {
  return renderHook((props) => useFieldOptions(props.field, props.config), {
    initialProps: { field, config },
  })
}

describe("static options", () => {
  it("filters locally without loading", () => {
    const field: FieldDefinition = {
      name: "city",
      label: "City",
      type: "select",
      options: [
        { value: "dn", label: "Đà Nẵng" },
        { value: "hn", label: "Hà Nội" },
      ],
    }
    const { result } = renderOptions(field)
    act(() => result.current.search("da nang"))
    expect(result.current.options.map((o) => o.value)).toEqual(["dn"])
    expect(result.current.loading).toBe(false)
    expect(result.current.getLabel("hn")).toBe("Hà Nội")
  })
})

describe("loadOptions", () => {
  it("loads the first list right away", async () => {
    const { load, calls } = manualLoader()
    const { result } = renderOptions(asyncField(load))
    expect(result.current.loading).toBe(true)
    await flush()
    expect(load).toHaveBeenCalledWith("", expect.any(AbortSignal))

    await act(async () => calls[0]!.resolve([option("a")]))
    expect(result.current.loading).toBe(false)
    expect(result.current.options).toEqual([option("a")])
  })

  it("debounces typing into one request", async () => {
    const { load, calls } = manualLoader()
    const { result } = renderOptions(asyncField(load))
    await flush()
    await act(async () => calls[0]!.resolve([option("a")]))

    for (const query of ["b", "bo", "bob"]) {
      act(() => result.current.search(query))
      await flush(100)
    }
    expect(load).toHaveBeenCalledTimes(1)
    // The previous list stays while the next one loads.
    expect(result.current.options).toEqual([option("a")])
    expect(result.current.loading).toBe(true)

    await flush(300)
    expect(load).toHaveBeenCalledTimes(2)
    expect(load).toHaveBeenLastCalledWith("bob", expect.any(AbortSignal))
  })

  it("keeps only the latest search when responses arrive out of order", async () => {
    const { calls, load } = manualLoader()
    const { result } = renderOptions(asyncField(load), { debounceMs: 0 })
    await flush()
    for (const query of ["a", "ab", "abc"]) {
      act(() => result.current.search(query))
      await flush()
    }
    const [, first, second, last] = calls
    expect(first!.signal.aborted).toBe(true)
    expect(second!.signal.aborted).toBe(true)

    await act(async () => last!.resolve([option("abc")]))
    await act(async () => first!.resolve([option("a")]))
    await act(async () => second!.resolve([option("ab")]))
    expect(result.current.query).toBe("abc")
    expect(result.current.options).toEqual([option("abc")])
  })

  it("serves repeated searches from the cache, across instances", async () => {
    const load = vi.fn(async (search: string) => [option(search || "all")])
    const field = asyncField(load)
    const { result } = renderOptions(field, { debounceMs: 0 })
    await flush()
    act(() => result.current.search("x"))
    await flush()
    act(() => result.current.search(""))
    expect(result.current.options).toEqual([option("all")])
    expect(result.current.loading).toBe(false)

    const other = renderOptions(asyncField(load, { name: "other" }))
    expect(other.result.current.options).toEqual([option("all")])
    await flush()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it("does not share the cache between loaders", async () => {
    const first = vi.fn(async () => [option("a")])
    const second = vi.fn(async () => [option("b")])
    renderOptions(asyncField(first))
    await flush()
    const { result } = renderOptions(asyncField(second))
    await flush()
    expect(result.current.options).toEqual([option("b")])
  })

  it("reports errors and retries", async () => {
    const { calls, load } = manualLoader()
    const { result } = renderOptions(asyncField(load))
    await flush()
    const failure = new Error("offline")
    await act(async () => calls[0]!.reject(failure))
    expect(result.current.error).toBe(failure)
    expect(result.current.loading).toBe(false)

    act(() => result.current.retry())
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
    await flush()
    await act(async () => calls[1]!.resolve([option("a")]))
    expect(result.current.options).toEqual([option("a")])
    expect(result.current.error).toBeNull()
  })

  it("survives a loader that throws synchronously", async () => {
    const load = vi.fn(() => {
      throw new Error("bad")
    })
    const { result } = renderOptions(asyncField(load))
    await flush()
    expect(result.current.error).toEqual(new Error("bad"))
  })

  it("does not load while disabled", async () => {
    const { load } = manualLoader()
    const { result } = renderOptions(asyncField(load), { enabled: false })
    await flush(1000)
    expect(load).not.toHaveBeenCalled()
    expect(result.current.loading).toBe(false)
  })
})

describe("request state", () => {
  it("does not show an old error when going back to a failed search", async () => {
    const { calls, load } = manualLoader()
    const { result } = renderOptions(asyncField(load), { debounceMs: 0 })
    await flush()
    await act(async () => calls[0]!.resolve([option("all")]))
    act(() => result.current.search("x"))
    await flush()
    await act(async () => calls[1]!.reject(new Error("offline")))
    expect(result.current.error).not.toBeNull()
    expect(result.current.options).toEqual([])

    act(() => result.current.search("xy"))
    act(() => result.current.search("x"))
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it("keeps the list on screen, even one served from the cache", async () => {
    const { calls, load } = manualLoader()
    const { result } = renderOptions(asyncField(load), { debounceMs: 0 })
    await flush()
    await act(async () => calls[0]!.resolve([option("all")]))
    act(() => result.current.search("x"))
    await flush()
    await act(async () => calls[1]!.resolve([option("x")]))
    act(() => result.current.search(""))
    act(() => result.current.search("y"))

    expect(result.current.loading).toBe(true)
    expect(result.current.options).toEqual([option("all")])
  })

  it("trims the search before loading", async () => {
    const load = vi.fn(async (search: string) => [option(search || "all")])
    const { result } = renderOptions(asyncField(load), { debounceMs: 0 })
    await flush()
    act(() => result.current.search("   "))
    expect(result.current.options).toEqual([option("all")])
    act(() => result.current.search(" a "))
    await flush()
    expect(load).toHaveBeenLastCalledWith("a", expect.any(AbortSignal))
    expect(result.current.query).toBe(" a ")
  })

  it("aborts when disabled and loads again when re-enabled", async () => {
    const { calls, load } = manualLoader()
    const field = asyncField(load)
    const { result, rerender } = renderOptions(field)
    await flush()
    rerender({ field, config: { enabled: false } })
    expect(calls[0]!.signal.aborted).toBe(true)
    expect(result.current.loading).toBe(false)

    rerender({ field, config: { enabled: true } })
    expect(result.current.loading).toBe(true)
    await flush()
    await act(async () => calls[1]!.resolve([option("a")]))
    expect(result.current.options).toEqual([option("a")])
  })

  it("loads again after the cache is cleared", async () => {
    const load = vi.fn(async () => [option("a")])
    const field = asyncField(load)
    renderOptions(field)
    await flush()
    clearFieldOptionsCache(field)
    renderOptions(field)
    await flush()
    clearFieldOptionsCache()
    renderOptions(field)
    await flush()
    expect(load).toHaveBeenCalledTimes(3)
  })

  it("works under StrictMode", async () => {
    const load = vi.fn(async () => [option("a")])
    const { result } = renderHook(() => useFieldOptions(asyncField(load)), {
      reactStrictMode: true,
    })
    await flush()
    expect(result.current.options).toEqual([option("a")])
    expect(result.current.loading).toBe(false)
  })
})

describe("labels", () => {
  it("resolves labels for selected values nothing has loaded", async () => {
    const resolveLabels = vi.fn(async (values: string[]) =>
      values.filter((value) => value !== "gone").map(option)
    )
    const load = vi.fn(async () => [option("a")])
    const field = asyncField(load, { resolveLabels })
    const { result } = renderOptions(field, {
      selected: ["x", "gone"],
      enabled: false,
    })
    expect(result.current.getLabel("x")).toBe("x")
    await flush()

    expect(resolveLabels).toHaveBeenCalledTimes(1)
    expect(resolveLabels).toHaveBeenCalledWith(
      ["x", "gone"],
      expect.any(AbortSignal)
    )
    expect(result.current.getLabel("x")).toBe("X")
    expect(result.current.getLabel("gone")).toBe("gone")
  })

  it("skips values a loaded list already labels", async () => {
    const resolveLabels = vi.fn(async () => [])
    const field = asyncField(
      vi.fn(async () => [option("a")]),
      { resolveLabels }
    )
    const { result, rerender } = renderOptions(field)
    await flush()
    rerender({ field, config: { selected: ["a"] } })
    await flush()
    expect(result.current.getLabel("a")).toBe("A")
    expect(resolveLabels).not.toHaveBeenCalled()
  })

  it("keeps raw values when resolveLabels fails", async () => {
    const resolveLabels = vi.fn(async () => {
      throw new Error("offline")
    })
    const field = asyncField(
      vi.fn(async () => []),
      { resolveLabels }
    )
    const { result } = renderOptions(field, {
      selected: ["x"],
      enabled: false,
    })
    await flush()
    expect(result.current.getLabel("x")).toBe("x")
    expect(resolveLabels).toHaveBeenCalledTimes(1)
  })

  it("prefers static labels over loaded ones", async () => {
    const field = asyncField(
      vi.fn(async () => [{ value: "a", label: "Loaded" }]),
      { options: [{ value: "a", label: "Static" }] }
    )
    const { result } = renderOptions(field)
    await flush()
    expect(result.current.getLabel("a")).toBe("Static")
  })
})
