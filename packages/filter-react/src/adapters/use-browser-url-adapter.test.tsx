import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from "@testing-library/react"
import { useSyncExternalStore } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { UrlStateAdapter } from "./url-state-adapter-types"
import { useBrowserUrlAdapter } from "./use-browser-url-adapter"

const noopSubscribe = () => () => {}

function Value({ adapter }: { adapter: UrlStateAdapter }) {
  const value = useSyncExternalStore(
    adapter.subscribe ?? noopSubscribe,
    adapter.read,
    adapter.readServer ?? adapter.read
  )
  return <output>{value || "none"}</output>
}

const adapterFor = () => renderHook(() => useBrowserUrlAdapter()).result.current

afterEach(() => {
  cleanup()
  window.history.replaceState(null, "", "/")
})

describe("useBrowserUrlAdapter", () => {
  it("reads the whole query string", () => {
    window.history.replaceState(null, "", "/list?status__eq=paid&page=2")
    expect(adapterFor().read()).toBe("?status__eq=paid&page=2")
  })

  it("writes with replaceState, keeping other params, hash and history state", () => {
    window.history.pushState({ router: 1 }, "", "/list?page=2#top")
    const length = window.history.length
    const adapter = adapterFor()

    adapter.write({ name__eq: "x y", tags__in: "a,b" })
    expect(window.location.search).toBe("?page=2&name__eq=x%20y&tags__in=a,b")
    expect(window.location.hash).toBe("#top")
    expect(window.history.state).toEqual({ router: 1 })
    expect(window.history.length).toBe(length)

    adapter.write({ name__eq: null, tags__in: null })
    expect(window.location.search).toBe("?page=2")
  })

  it("re-renders subscribers on write, including other instances", () => {
    const writer = adapterFor()
    render(<Value adapter={adapterFor()} />)
    expect(screen.getByRole("status").textContent).toBe("none")

    act(() => writer.write({ name__eq: "abc" }))
    expect(screen.getByRole("status").textContent).toBe("?name__eq=abc")
  })

  it("follows back/forward through popstate", () => {
    render(<Value adapter={adapterFor()} />)
    act(() => {
      window.history.pushState(null, "", "/?name__eq=old")
      window.dispatchEvent(new PopStateEvent("popstate"))
    })
    expect(screen.getByRole("status").textContent).toBe("?name__eq=old")
  })

  it("keeps the same adapter across renders", () => {
    const { result, rerender } = renderHook(() => useBrowserUrlAdapter())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })

  it("skips unchanged writes, leaving a non-canonical URL untouched", () => {
    window.history.replaceState(null, "", "/?tags=a,b&debug")
    const replace = vi.spyOn(window.history, "replaceState")
    const listener = vi.fn()
    const adapter = adapterFor()
    const unsubscribe = adapter.subscribe!(listener)

    adapter.write({ name__eq: null })
    adapter.write({ name__eq: null, page: null, tags: "a,b" })
    expect(replace).not.toHaveBeenCalled()
    expect(listener).not.toHaveBeenCalled()
    expect(window.location.search).toBe("?tags=a,b&debug")

    unsubscribe()
    replace.mockRestore()
  })

  it("changes other params in the same write", () => {
    window.history.replaceState(null, "", "/?page=3&sort=name")
    const replace = vi.spyOn(window.history, "replaceState")
    adapterFor().write({ page: null, view: "grid", name__eq: "abc" })
    expect(replace).toHaveBeenCalledTimes(1)
    expect(window.location.search).toBe("?sort=name&view=grid&name__eq=abc")
    replace.mockRestore()
  })

  it("keeps each subscription when the same callback is used twice", () => {
    const listener = vi.fn()
    const offFirst = adapterFor().subscribe!(listener)
    const offSecond = adapterFor().subscribe!(listener)
    offFirst()
    window.dispatchEvent(new PopStateEvent("popstate"))
    expect(listener).toHaveBeenCalledTimes(1)
    offSecond()
  })

  it("removes the popstate listener after the last unsubscribe", () => {
    const remove = vi.spyOn(window, "removeEventListener")
    const off = adapterFor().subscribe!(() => {})
    off()
    expect(remove).toHaveBeenCalledWith("popstate", expect.any(Function))
    remove.mockRestore()
  })

  it("reports an empty query during server render so hydration matches", () => {
    window.history.replaceState(null, "", "/?name__eq=abc")
    expect(adapterFor().readServer?.()).toBe("")
  })
})
