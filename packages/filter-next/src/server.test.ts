import type { FieldDefinition, UrlFormat } from "@querycn/filter-core"
import { describe, expect, it } from "vitest"

import { parseFilters } from "./server"

const FIELDS: FieldDefinition[] = [
  { name: "amount", label: "Amount", type: "number" },
]
const RULES = [{ id: "u0", field: "amount", operator: "gt", value: 5 }]

describe("parseFilters", () => {
  it("reads a page's searchParams object, ignoring other params", () => {
    expect(
      parseFilters({ amount__gt: "5", page: "2" }, { fields: FIELDS }).rules
    ).toEqual(RULES)
  })

  it("keeps every value of a repeated param", () => {
    const state = parseFilters({ amount__gt: ["5", "7"] }, { fields: FIELDS })
    expect(state.rules.map((rule) => rule.value)).toEqual([5, 7])
  })

  it("reads URLSearchParams", () => {
    const params = new URLSearchParams("amount__gt=5&join=or")
    expect(parseFilters(params, { fields: FIELDS })).toEqual({
      join: "or",
      rules: RULES,
    })
  })

  it("returns an empty filter when missing or malformed", () => {
    expect(parseFilters({}, { fields: FIELDS }).rules).toEqual([])
    expect(
      parseFilters(
        { amount__gt: "", amount__nope: "5", amount: undefined },
        { fields: FIELDS }
      ).rules
    ).toEqual([])
  })

  it("decodes with the client's urlFormat", () => {
    const urlFormat: UrlFormat = {
      encodeRule: ({ field, operator, value }) => [
        `_${field}`,
        JSON.stringify([operator, value]),
      ],
      decodeRule: (key, value) => {
        if (!key.startsWith("_")) return null
        const [operator, ruleValue] = JSON.parse(value) as [string, string]
        return { field: key.slice(1), operator, value: ruleValue }
      },
    }
    expect(
      parseFilters({ _amount: '["gt","5"]' }, { fields: FIELDS, urlFormat })
        .rules
    ).toEqual(RULES)
  })
})
