// @vitest-environment node
import type { FieldDefinition } from "@querycn/filter-core"
import { renderToString } from "react-dom/server"
import { StaticRouter } from "react-router"
import { describe, expect, it } from "vitest"

import { FilterProvider } from "../filter-provider"
import { useAppliedFilter } from "../use-applied-filter"
import { useReactRouterAdapter } from "./use-react-router-adapter"

const FIELDS: FieldDefinition[] = [
  { name: "amount", label: "Amount", type: "number" },
]

function Count() {
  return <>{useAppliedFilter().activeCount}</>
}

function Filtered() {
  return (
    <FilterProvider fields={FIELDS} adapter={useReactRouterAdapter()}>
      <Count />
    </FilterProvider>
  )
}

describe("useReactRouterAdapter on the server", () => {
  it("reads the filter from the request URL", () => {
    const html = renderToString(
      <StaticRouter location="/orders?amount__gt=5">
        <Filtered />
      </StaticRouter>
    )
    expect(html).toBe("1")
  })
})
