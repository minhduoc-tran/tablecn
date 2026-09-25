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
  return <output>{value ?? "none"}</output>
}

const adapterFor = (param?: string) =>
  renderHook(() => useBrowserUrlAdapter(param ? { param } : undefined)).result
    .current

afterEach(() => {
  cleanup()
  window.history.replaceState(null, "", "/")
})

describe("useBrowserUrlAdapter", () => {
  it("reads the filters param", () => {
    window.history.replaceState(null, "", "/list?filters=abc&page=2")
    expect(adapterFor().read()).toBe("abc")
    expect(adapterFor("f").read()).toBeNull()
  })

  it("writes with replaceState, keeping other params, hash and history state", () => {
    window.history.pushState({ router: 1 }, "", "/list?page=2#top")
    const length = window.history.length
    const adapter = adapterFor()

    adapter.write("x y")
    expect(window.location.search).toBe("?page=2&filters=x+y")
    expect(window.location.hash).toBe("#top")
    expect(window.history.state).toEqual({ router: 1 })
    expect(window.history.length).toBe(length)

    adapter.write(null)
    expect(window.location.search).toBe("?page=2")
  })

  it("re-renders subscribers on write, including other instances", () => {
    const writer = adapterFor()
    render(<Value adapter={adapterFor()} />)
    expect(screen.getByRole("status").textContent).toBe("none")

    act(() => writer.write("abc"))
    expect(screen.getByRole("status").textContent).toBe("abc")
  })

  it("follows back/forward through popstate", () => {
    render(<Value adapter={adapterFor()} />)
    act(() => {
      window.history.pushState(null, "", "/?filters=old")
      window.dispatchEvent(new PopStateEvent("popstate"))
    })
    expect(screen.getByRole("status").textContent).toBe("old")
  })

  it("keeps the same adapter across renders for the same param", () => {
    const { result, rerender } = renderHook(
      ({ param }) => useBrowserUrlAdapter({ param }),
      { initialProps: { param: "filters" } }
    )
    const first = result.current
    rerender({ param: "filters" })
    expect(result.current).toBe(first)
    rerender({ param: "other" })
    expect(result.current).not.toBe(first)
  })

  it("skips unchanged writes, leaving a non-canonical URL untouched", () => {
    window.history.replaceState(null, "", "/?tags=a,b&debug")
    const replace = vi.spyOn(window.history, "replaceState")
    const listener = vi.fn()
    const adapter = adapterFor()
    const unsubscribe = adapter.subscribe!(listener)

    adapter.write(null)
    adapter.write(null, { page: null })
    expect(replace).not.toHaveBeenCalled()
    expect(listener).not.toHaveBeenCalled()
    expect(window.location.search).toBe("?tags=a,b&debug")

    unsubscribe()
    replace.mockRestore()
  })

  it("changes other params in the same write", () => {
    window.history.replaceState(null, "", "/?page=3&sort=name")
    const replace = vi.spyOn(window.history, "replaceState")
    adapterFor().write("abc", { page: null, view: "grid" })
    expect(replace).toHaveBeenCalledTimes(1)
    expect(new URLSearchParams(window.location.search).toString()).toBe(
      "sort=name&view=grid&filters=abc"
    )
    replace.mockRestore()
  })

  it("keeps each subscription when the same callback is used twice", () => {
    const listener = vi.fn()
    const offFirst = adapterFor().subscribe!(listener)
    const offSecond = adapterFor("other").subscribe!(listener)
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

  it("reports null during server render so hydration matches", () => {
    window.history.replaceState(null, "", "/?filters=abc")
    expect(adapterFor().readServer?.()).toBeNull()
  })
})
