import { renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"

import { createMemoryAdapter } from "./adapters/memory-adapter"
import { FIELDS } from "./filter-provider-test-utils"
import { FilterProvider } from "./filter-provider"
import { useFilterAdapter } from "./use-filter-adapter"

describe("useFilterAdapter", () => {
  it("is null outside a FilterProvider", () => {
    expect(renderHook(() => useFilterAdapter()).result.current).toBeNull()
  })

  it("returns the provider's adapter, or its own memory adapter", () => {
    const adapter = createMemoryAdapter()
    const withAdapter = ({ children }: { children: ReactNode }) => (
      <FilterProvider fields={FIELDS} adapter={adapter}>
        {children}
      </FilterProvider>
    )
    expect(
      renderHook(() => useFilterAdapter(), { wrapper: withAdapter }).result
        .current
    ).toBe(adapter)

    const withoutAdapter = ({ children }: { children: ReactNode }) => (
      <FilterProvider fields={FIELDS}>{children}</FilterProvider>
    )
    const { result, rerender } = renderHook(() => useFilterAdapter(), {
      wrapper: withoutAdapter,
    })
    const memory = result.current
    expect(memory).not.toBeNull()
    rerender()
    expect(result.current).toBe(memory)
  })
})
