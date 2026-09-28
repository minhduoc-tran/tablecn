import { act, renderHook } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useCardView } from "./use-card-view"

let width = 1024
const lists = new Set<{ query: string; onChange: () => void }>()

function setWidth(next: number) {
  width = next
  act(() => lists.forEach((list) => list.onChange()))
}

function matches(query: string) {
  const max = Number(/width < (\d+)px/.exec(query)?.[1])
  return width < max
}

vi.stubGlobal("matchMedia", (query: string) => ({
  get matches() {
    return matches(query)
  },
  addEventListener: (_: string, onChange: () => void) =>
    lists.add({ query, onChange }),
  removeEventListener: (_: string, onChange: () => void) =>
    lists.forEach((list) => list.onChange === onChange && lists.delete(list)),
}))

afterEach(() => {
  width = 1024
  lists.clear()
})

describe("useCardView", () => {
  it("shows cards below the breakpoint and follows resizes", () => {
    const { result } = renderHook(() => useCardView())
    expect(result.current).toBe(false)
    setWidth(767)
    expect(result.current).toBe(true)
    setWidth(768)
    expect(result.current).toBe(false)
  })

  it("takes another breakpoint", () => {
    width = 700
    const { result } = renderHook(() => useCardView({ cardBreakpoint: 640 }))
    expect(result.current).toBe(false)
  })

  it("forces a view whatever the width", () => {
    width = 400
    expect(
      renderHook(() => useCardView({ view: "table" })).result.current
    ).toBe(false)
    width = 1200
    expect(
      renderHook(() => useCardView({ view: "cards" })).result.current
    ).toBe(true)
    expect(lists.size).toBe(0)
  })

  it("renders the table on the server unless told cards", () => {
    width = 400
    function View({ view }: { view?: "cards" }) {
      return <>{String(useCardView({ view }))}</>
    }
    expect(renderToString(<View />)).toBe("false")
    expect(renderToString(<View view="cards" />)).toBe("true")
  })
})
