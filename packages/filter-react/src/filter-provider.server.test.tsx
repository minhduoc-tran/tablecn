// @vitest-environment node
import type { FieldDefinition } from "@querycn/filter-core"
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { createMemoryAdapter } from "./adapters/memory-adapter"
import type { UrlStateAdapter } from "./adapters/url-state-adapter-types"
import { FilterProvider } from "./filter-provider"
import { useAppliedFilter } from "./use-applied-filter"

const FIELDS: FieldDefinition[] = [
  { name: "status", label: "Status", type: "text" },
]
const FILTER = '{"and":[["status","eq","active"]]}'

function Count() {
  return <>{useAppliedFilter().activeCount}</>
}

const renderWith = (adapter: UrlStateAdapter) =>
  renderToString(
    <FilterProvider fields={FIELDS} adapter={adapter}>
      <Count />
    </FilterProvider>
  )

describe("FilterProvider on the server", () => {
  it("renders from readServer when the adapter has one", () => {
    const html = renderWith({
      read: () => FILTER,
      readServer: () => null,
      write: () => {},
    })
    expect(html).toBe("0")
  })

  it("falls back to read", () => {
    expect(renderWith(createMemoryAdapter(FILTER))).toBe("1")
  })
})
