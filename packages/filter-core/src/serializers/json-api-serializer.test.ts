import { describe, expect, it } from "vitest"

import type { FilterRule } from "../types"
import { jsonApiSerializer } from "./json-api-serializer"
import type { QueryParams } from "./query-params"
import { context, rule, state } from "./serializer-test-fixtures"

const serialize = jsonApiSerializer()

describe("jsonApiSerializer", () => {
  it.each<[FilterRule, QueryParams]>([
    [rule("status", "eq", "active"), { "filter[status][eq]": "active" }],
    [rule("status", "ne", "draft"), { "filter[status][ne]": "draft" }],
    [rule("name", "contains", "a"), { "filter[name][contains]": "a" }],
    [rule("name", "notContains", "a"), { "filter[name][notContains]": "a" }],
    [rule("name", "startsWith", "a"), { "filter[name][startsWith]": "a" }],
    [rule("name", "endsWith", "a"), { "filter[name][endsWith]": "a" }],
    [rule("amount", "gt", 1), { "filter[amount][gt]": "1" }],
    [rule("amount", "gte", 1), { "filter[amount][gte]": "1" }],
    [rule("amount", "lt", 1), { "filter[amount][lt]": "1" }],
    [rule("amount", "lte", 1), { "filter[amount][lte]": "1" }],
    [
      rule("amount", "between", [1, 5]),
      { "filter[amount][between]": ["1", "5"] },
    ],
    [rule("tags", "in", ["a", "b,c"]), { "filter[tags][in]": ["a", "b,c"] }],
    [rule("tags", "notIn", ["a"]), { "filter[tags][notIn]": ["a"] }],
    [rule("name", "isEmpty", null), { "filter[name][isEmpty]": "true" }],
    [rule("name", "isNotEmpty", null), { "filter[name][isNotEmpty]": "true" }],
    [rule("active", "eq", false), { "filter[active][eq]": "false" }],
  ])("%o", (input, expected) => {
    expect(serialize(state("and", input), context)).toEqual(expected)
  })

  it("normalizes values and skips incomplete rules", () => {
    expect(
      serialize(
        state("and", rule("amount", "eq", "5"), rule("name", "contains", "")),
        context
      )
    ).toEqual({ "filter[amount][eq]": "5" })
  })

  it("reports the later rule of a repeated key as a conflict", () => {
    const second = rule("name", "contains", "b")
    expect(
      serialize.inspect(
        state("and", rule("name", "contains", "a"), second),
        context
      ).conflicts
    ).toEqual([second.id])
  })

  it("keeps every value of a repeated key", () => {
    expect(
      serialize(
        state(
          "and",
          rule("name", "contains", "a"),
          rule("name", "contains", "b")
        ),
        context
      )
    ).toEqual({ "filter[name][contains]": ["a", "b"] })
  })

  it("adds the join only for OR with several rules", () => {
    const or = state("or", rule("status", "eq", "a"), rule("amount", "gt", 1))
    expect(serialize(or, context)["filter[join]"]).toBe("or")
    expect(
      serialize(state("or", rule("status", "eq", "a")), context)
    ).not.toHaveProperty("filter[join]")
    expect(serialize({ ...or, join: "and" }, context)).not.toHaveProperty(
      "filter[join]"
    )
  })

  it("supports a custom prefix", () => {
    expect(
      jsonApiSerializer({ prefix: "q" })(
        state("and", rule("status", "eq", "a")),
        context
      )
    ).toEqual({ "q[status][eq]": "a" })
  })

  it("renames or disables operators", () => {
    const serialize = jsonApiSerializer({
      operators: { notContains: "not_contains", isEmpty: undefined },
    })
    expect(
      serialize(
        state(
          "and",
          rule("name", "notContains", "a"),
          rule("name", "isEmpty", null),
          rule("status", "eq", "b")
        ),
        context
      )
    ).toEqual({
      "filter[name][not_contains]": "a",
      "filter[status][eq]": "b",
    })
  })

  it("comma-joins arrays with arrayFormat comma", () => {
    expect(
      jsonApiSerializer({ arrayFormat: "comma" })(
        state(
          "and",
          rule("tags", "in", ["a", "b"]),
          rule("amount", "between", [1, 5])
        ),
        context
      )
    ).toEqual({ "filter[tags][in]": "a,b", "filter[amount][between]": "1,5" })
  })

  it("skips a comma inside a list item only when comma-joining", () => {
    const range = rule("amount", "between", ["12,5", "20"])
    const comma = jsonApiSerializer({ arrayFormat: "comma" })
    expect(comma(state("and", range), context)).toEqual({})
    expect(comma.inspect(state("and", range), context).skipped).toEqual([
      range.id,
    ])
    expect(serialize(state("and", range), context)).toEqual({
      "filter[amount][between]": ["12,5", "20"],
    })
  })

  it("returns no params for an empty state", () => {
    expect(serialize(state("or"), context)).toEqual({})
  })

  it("reports rules whose operator is turned off as skipped", () => {
    const custom = jsonApiSerializer({ operators: { ne: undefined } })
    const ne = rule("status", "ne", "a")
    expect(
      custom.inspect(state("and", rule("name", "eq", "a"), ne), context)
    ).toEqual({ skipped: [ne.id], conflicts: [] })
    expect(custom.supports("eq")).toBe(true)
    expect(custom.supports("within")).toBe(true)
    expect(custom.supports("ne")).toBe(false)
  })

  it("aliases fields and reshapes values through mapRule", () => {
    const mapped = jsonApiSerializer({
      mapRule: (r) =>
        r.field === "name"
          ? { ...r, field: "customer.name" }
          : r.arity === "single" && typeof r.value === "string"
            ? { ...r, value: r.value.toUpperCase() }
            : r,
    })
    expect(
      mapped(
        state("and", rule("name", "eq", "a"), rule("status", "eq", "b")),
        context
      )
    ).toEqual({
      "filter[customer.name][eq]": "a",
      "filter[status][eq]": "B",
    })
  })

  it("reports rules mapRule drops as skipped", () => {
    const dropped = rule("name", "contains", "a")
    const mapped = jsonApiSerializer({
      mapRule: (r) => (r.field === "name" ? undefined : r),
    })
    const both = state("and", dropped, rule("status", "eq", "b"))
    expect(Object.keys(mapped(both, context))).toHaveLength(1)
    expect(mapped.inspect(both, context)).toEqual({
      skipped: [dropped.id],
      conflicts: [],
    })
  })
})
