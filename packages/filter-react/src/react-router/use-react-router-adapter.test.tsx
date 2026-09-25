import type { FieldDefinition } from "@querycn/filter-core"
import { act, cleanup, render } from "@testing-library/react"
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
  useLocation,
  useNavigate,
  useNavigationType,
} from "react-router"
import { afterEach, describe, expect, it } from "vitest"

import { FilterProvider } from "../filter-provider"
import { useAppliedFilter } from "../use-applied-filter"
import { useFilter } from "../use-filter"
import { useReactRouterAdapter } from "./use-react-router-adapter"

afterEach(cleanup)

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

interface Harness {
  draft: ReturnType<typeof useFilter>
  applied: ReturnType<typeof useAppliedFilter>
  location: ReturnType<typeof useLocation>
  navigationType: string
  navigate: ReturnType<typeof useNavigate>
}

function Probe({ report }: { report: (h: Harness) => void }) {
  report({
    draft: useFilter(),
    applied: useAppliedFilter(),
    location: useLocation(),
    navigationType: useNavigationType(),
    navigate: useNavigate(),
  })
  return null
}

function Filtered({ into }: { into: Partial<Harness> }) {
  const report = (h: Harness) => Object.assign(into, h)
  const adapter = useReactRouterAdapter()
  return (
    <FilterProvider
      fields={FIELDS}
      adapter={adapter}
      onApply={() => ({ page: null })}
    >
      <Probe report={report} />
    </FilterProvider>
  )
}

function renderInMemoryRouter(entries: string[]) {
  const harness: Partial<Harness> = {}
  render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Filtered into={harness} />
    </MemoryRouter>
  )
  return harness as Harness
}

describe("useReactRouterAdapter", () => {
  it("reads the filter from the URL", () => {
    const h = renderInMemoryRouter([`/orders?${ACTIVE}`])
    expect(h.applied.queryKey).toBe(ACTIVE)
  })

  it("writes the filter and the patch in one replace, keeping the rest", () => {
    const h = renderInMemoryRouter([`/orders?page=3&sort=name#top`])
    act(() => h.draft.addRule("status"))
    act(() => h.draft.setValue(h.draft.state.rules[0]!.id, "active"))
    act(() => h.draft.apply())

    expect(h.location.pathname).toBe("/orders")
    expect(h.location.hash).toBe("#top")
    expect(h.location.search).toBe("?sort=name&status__eq=active")
    expect(h.applied.queryKey).toBe(ACTIVE)
    expect(h.navigationType).toBe("REPLACE")
  })

  it("removes the filter params on reset", () => {
    const h = renderInMemoryRouter([`/orders?${ACTIVE}&sort=name`])
    act(() => h.draft.reset())
    expect(h.location.search).toBe("?sort=name")
    expect(h.applied.activeCount).toBe(0)
  })

  it("restores the filter on back", () => {
    const h = renderInMemoryRouter([`/orders?${ACTIVE}`])
    act(() => {
      void h.navigate(`/orders?${TWO_RULES}`)
    })
    expect(h.applied.activeCount).toBe(2)

    act(() => {
      void h.navigate(-1)
    })
    expect(h.applied.queryKey).toBe(ACTIVE)
    expect(h.draft.state).toBe(h.applied.state)
  })

  it("keeps location state", () => {
    const harness: Partial<Harness> = {}
    render(
      <MemoryRouter
        initialEntries={[{ pathname: "/orders", state: { from: "home" } }]}
      >
        <Filtered into={harness} />
      </MemoryRouter>
    )
    const h = harness as Harness
    act(() => h.draft.addRule("status"))
    act(() => h.draft.setValue(h.draft.state.rules[0]!.id, "active"))
    act(() => h.draft.apply())
    expect(h.location.state).toEqual({ from: "home" })
  })
})

describe("with a data router", () => {
  it("removes two chips in a row", async () => {
    const harness: Partial<Harness> = {}
    const router = createMemoryRouter(
      [{ path: "/orders", element: <Filtered into={harness} /> }],
      { initialEntries: [`/orders?${TWO_RULES}`] }
    )
    render(<RouterProvider router={router} />)
    const h = harness as Harness

    await act(async () => {
      h.applied.removeRule("u0")
      h.applied.removeRule("u0")
    })
    expect(router.state.location.search).toBe("")
    expect(h.applied.activeCount).toBe(0)
  })

  it("builds on a navigation still waiting for its loader", async () => {
    const harness: Partial<Harness> = {}
    let release = () => {}
    const router = createMemoryRouter(
      [
        {
          path: "/orders",
          element: <Filtered into={harness} />,
          loader: () =>
            new Promise<null>((resolve) => {
              release = () => resolve(null)
            }),
        },
      ],
      {
        initialEntries: [`/orders?${TWO_RULES}`],
        hydrationData: { loaderData: { "0": null } },
      }
    )
    render(<RouterProvider router={router} />)
    const h = harness as Harness

    act(() => h.applied.removeRule("u0"))
    expect(router.state.navigation.state).toBe("loading")
    expect(h.applied.activeCount).toBe(1)
    act(() => h.applied.removeRule("u0"))
    await act(async () => release())

    expect(router.state.location.search).toBe("")
    expect(h.applied.activeCount).toBe(0)
  })

  it("does not skip a write that returns to the URL still shown", async () => {
    const harness: Partial<Harness> = {}
    let release = () => {}
    const router = createMemoryRouter(
      [
        {
          path: "/orders",
          element: <Filtered into={harness} />,
          loader: () =>
            new Promise<null>((resolve) => {
              release = () => resolve(null)
            }),
        },
      ],
      {
        initialEntries: [`/orders?${ACTIVE}`],
        hydrationData: { loaderData: { "0": null } },
      }
    )
    render(<RouterProvider router={router} />)
    const h = harness as Harness

    act(() => h.draft.reset())
    act(() => h.draft.addRule("status"))
    act(() => h.draft.setValue(h.draft.state.rules[0]!.id, "active"))
    act(() => h.draft.apply())
    await act(async () => release())

    expect(router.state.location.search).toBe(`?${ACTIVE}`)
    expect(h.applied.queryKey).toBe(ACTIVE)
  })

  it("keeps the basename and a nested path", async () => {
    const harness: Partial<Harness> = {}
    const router = createMemoryRouter(
      [
        {
          path: "/orders/*",
          element: <Filtered into={harness} />,
        },
      ],
      { basename: "/app", initialEntries: ["/app/orders/caf%C3%A9/lines"] }
    )
    render(<RouterProvider router={router} />)
    const h = harness as Harness
    act(() => h.draft.addRule("status"))
    act(() => h.draft.setValue(h.draft.state.rules[0]!.id, "active"))
    await act(async () => h.draft.apply())

    expect(router.state.location.pathname).toBe("/app/orders/caf%C3%A9/lines")
    expect(h.applied.queryKey).toBe(ACTIVE)
  })

  it("follows back/forward", async () => {
    const harness: Partial<Harness> = {}
    const router = createMemoryRouter(
      [{ path: "/orders", element: <Filtered into={harness} /> }],
      { initialEntries: [`/orders?${ACTIVE}`] }
    )
    render(<RouterProvider router={router} />)
    const h = harness as Harness

    await act(() => router.navigate(`/orders?${TWO_RULES}`))
    expect(h.applied.activeCount).toBe(2)
    await act(() => router.navigate(-1))
    expect(h.applied.queryKey).toBe(ACTIVE)
  })
})
