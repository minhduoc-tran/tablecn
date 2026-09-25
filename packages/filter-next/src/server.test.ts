import type { FieldDefinition } from "@querycn/filter-core"
import { describe, expect, it } from "vitest"

import { parseFilters } from "./server"

const FIELDS: FieldDefinition[] = [
  { name: "amount", label: "Amount", type: "number" },
]
const FILTER = '{"and":[["amount","gt",5]]}'
const RULES = [{ id: "u0", field: "amount", operator: "gt", value: 5 }]

describe("parseFilters", () => {
  it("reads a page's searchParams object", () => {
    expect(parseFilters({ filters: FILTER }, { fields: FIELDS }).rules).toEqual(
      RULES
    )
  })

  it("takes the first of repeated params", () => {
    const state = parseFilters({ filters: [FILTER, "x"] }, { fields: FIELDS })
    expect(state.rules).toEqual(RULES)
  })

  it("reads URLSearchParams and a custom param", () => {
    const params = new URLSearchParams({ f: FILTER })
    expect(parseFilters(params, { fields: FIELDS, param: "f" }).rules).toEqual(
      RULES
    )
  })

  it("returns an empty filter when missing or malformed", () => {
    expect(parseFilters({}, { fields: FIELDS }).rules).toEqual([])
    expect(parseFilters({ filters: "{" }, { fields: FIELDS }).rules).toEqual([])
  })
})
