import type { FieldDefinition } from "@querycn/filter-core"
import { useAppliedFilter, useFilter } from "@querycn/filter-react"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { NextFilterProvider } from "./next-filter-provider"

// A stand-in App Router: `replace` lands only when the test flushes it, like a server round trip.
const router = vi.hoisted(() => {
  let url = new URL("http://localhost/")
  const listeners = new Set<() => void>()
  const queued: string[] = []
  return {
    get url() {
      return url
    },
    set(next: string) {
      url = new URL(next, url)
      for (const listener of listeners) listener()
    },
    queued,
    replace: (...args: [href: string, options?: { scroll?: boolean }]) => {
      queued.push(args[0])
    },
    flush() {
      const last = queued.at(-1)
      queued.length = 0
      if (last) this.set(last)
    },
    listeners,
  }
})

vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react")
  const useUrl = () =>
    useSyncExternalStore(
      (onChange) => {
        router.listeners.add(onChange)
        return () => router.listeners.delete(onChange)
      },
      () => router.url.href
    )
  const api = {
    replace: (href: string, options?: { scroll?: boolean }) =>
      router.replace(href, options),
  }
  return {
    usePathname: () => new URL(useUrl()).pathname,
    useSearchParams: () => new URL(useUrl()).searchParams,
    useRouter: () => api,
  }
})

const FIELDS: FieldDefinition[] = [
  {
    name: "status",
    label: "Status",
    type: "select",
    options: [{ label: "Active", value: "active" }],
  },
  { name: "amount", label: "Amount", type: "number" },
]

const ACTIVE = "status__eq=active"
const TWO_RULES = "status__eq=active&amount__gt=5"
const withFilters = (filters: string) => `/orders?${filters}`

interface Harness {
  draft: ReturnType<typeof useFilter>
  applied: ReturnType<typeof useAppliedFilter>
}

function Probe({ report }: { report: (h: Harness) => void }) {
  report({ draft: useFilter(), applied: useAppliedFilter() })
  return null
}

function renderProvider(props: { shallow?: boolean } = {}) {
  const harness = {} as Harness
  render(
    <NextFilterProvider
      fields={FIELDS}
      onApply={() => ({ page: null })}
      {...props}
    >
      <Probe report={(h) => Object.assign(harness, h)} />
    </NextFilterProvider>
  )
  return harness
}

function applyStatusActive(h: Harness) {
  act(() => h.draft.addRule("status"))
  act(() => h.draft.setValue(h.draft.state.rules[0]!.id, "active"))
  act(() => h.draft.apply())
}

beforeEach(() => {
  router.queued.length = 0
  router.set("/")
  window.history.replaceState(null, "", "/")
})
afterEach(cleanup)

describe("NextFilterProvider", () => {
  it("reads the filter from the URL", () => {
    router.set(withFilters(ACTIVE))
    expect(renderProvider().applied.queryKey).toBe(ACTIVE)
  })

  it("replaces the URL once, with the patch, keeping other params and the hash", () => {
    router.set("/orders?page=3&sort=name")
    window.history.replaceState(null, "", "/orders?page=3&sort=name#top")
    const replace = vi.spyOn(router, "replace")
    const h = renderProvider()
    applyStatusActive(h)

    expect(replace).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith(`/orders?sort=name&${ACTIVE}#top`, {
      scroll: false,
    })
    // Shown right away, before the navigation lands.
    expect(h.applied.queryKey).toBe(ACTIVE)
    act(() => router.flush())
    expect(router.url.search).toBe(`?sort=name&${ACTIVE}`)
  })

  it("chains writes made before the navigation lands", () => {
    router.set(withFilters(TWO_RULES))
    const h = renderProvider()
    act(() => h.applied.removeRule("u0"))
    act(() => h.applied.removeRule("u0"))
    act(() => router.flush())

    expect(router.url.search).toBe("")
    expect(h.applied.activeCount).toBe(0)
  })

  it("does not skip a write that returns to the URL still shown", () => {
    router.set(withFilters(ACTIVE))
    const h = renderProvider()
    act(() => h.draft.reset())
    applyStatusActive(h)
    act(() => router.flush())

    expect(router.url.search).toBe(`?${ACTIVE}`)
    expect(h.applied.queryKey).toBe(ACTIVE)
  })

  it("follows back/forward", () => {
    router.set(withFilters(ACTIVE))
    const h = renderProvider()
    act(() => router.set(withFilters(TWO_RULES)))
    expect(h.applied.activeCount).toBe(2)
    expect(h.draft.state).toBe(h.applied.state)
  })

  it("updates the browser URL without the router when shallow", () => {
    // `usePathname` strips basePath; the browser URL keeps it.
    window.history.replaceState(null, "", "/admin/orders?page=2#top")
    router.set("/orders?page=2")
    const replace = vi.spyOn(router, "replace")
    const replaceState = vi.spyOn(window.history, "replaceState")
    const h = renderProvider({ shallow: true })
    applyStatusActive(h)

    expect(replace).not.toHaveBeenCalled()
    expect(replaceState.mock.calls.at(-1)?.[0]).toBeNull()
    expect(window.location.pathname).toBe("/admin/orders")
    expect(window.location.hash).toBe("#top")
    expect(window.location.search).toBe(`?${ACTIVE}`)
    expect(h.applied.queryKey).toBe(ACTIVE)
  })
})
