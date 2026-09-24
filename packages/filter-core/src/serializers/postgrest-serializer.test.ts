import { describe, expect, it } from "vitest"

import { BUILTIN_FIELD_TYPES } from "../field-types"
import { createRegistry } from "../registry"
import type { FilterRule } from "../types"
import { postgrestSerializer } from "./postgrest-serializer"
import type { QueryParams } from "./query-params"
import { context, rule, state } from "./serializer-test-fixtures"

const serialize = postgrestSerializer()

describe("postgrestSerializer — AND", () => {
  it.each<[FilterRule, QueryParams]>([
    [rule("status", "eq", "active"), { status: "eq.active" }],
    [rule("status", "ne", "draft"), { status: "neq.draft" }],
    [rule("name", "contains", "a"), { name: "ilike.*a*" }],
    [rule("name", "notContains", "a"), { name: "not.ilike.*a*" }],
    [rule("name", "startsWith", "a"), { name: "ilike.a*" }],
    [rule("name", "endsWith", "a"), { name: "ilike.*a" }],
    [rule("amount", "gt", 1), { amount: "gt.1" }],
    [rule("amount", "gte", 1), { amount: "gte.1" }],
    [rule("amount", "lt", 1), { amount: "lt.1" }],
    [rule("amount", "lte", 1), { amount: "lte.1" }],
    [rule("amount", "between", [1, 5]), { amount: ["gte.1", "lte.5"] }],
    [rule("tags", "in", ["a", "b"]), { tags: "in.(a,b)" }],
    [rule("tags", "notIn", ["a"]), { tags: "not.in.(a)" }],
    [rule("name", "isEmpty", null), { name: "is.null" }],
    [rule("name", "isNotEmpty", null), { name: "not.is.null" }],
    [rule("active", "eq", true), { active: "eq.true" }],
  ])("%o", (input, expected) => {
    expect(serialize(state("and", input), context)).toEqual(expected)
  })

  it("quotes list items with reserved characters", () => {
    expect(
      serialize(
        state("and", rule("tags", "in", ["a,b", "(x)", 'say "hi"', "c\\d"])),
        context
      )
    ).toEqual({ tags: 'in.("a,b","(x)","say \\"hi\\"","c\\\\d")' })
  })

  it("leaves top-level values unquoted and escapes LIKE wildcards", () => {
    expect(
      serialize(
        state(
          "and",
          rule("status", "eq", "a,b"),
          rule("name", "contains", "50%_")
        ),
        context
      )
    ).toEqual({ status: "eq.a,b", name: "ilike.*50\\%\\_*" })
  })

  it("repeats the field key for several rules on it", () => {
    expect(
      serialize(
        state(
          "and",
          rule("amount", "gt", 1),
          rule("amount", "between", [2, 3])
        ),
        context
      )
    ).toEqual({ amount: ["gt.1", "gte.2", "lte.3"] })
  })
})

describe("postgrestSerializer — OR", () => {
  it("builds a single or param", () => {
    expect(
      serialize(
        state(
          "or",
          rule("status", "eq", "a"),
          rule("amount", "between", [1, 5]),
          rule("tags", "in", ["x", "y"]),
          rule("name", "isEmpty", null)
        ),
        context
      )
    ).toEqual({
      or: "(status.eq.a,and(amount.gte.1,amount.lte.5),tags.in.(x,y),name.is.null)",
    })
  })

  it("quotes values inside the or param", () => {
    expect(
      serialize(
        state(
          "or",
          rule("status", "eq", "a,b"),
          rule("name", "contains", "x.y")
        ),
        context
      )
    ).toEqual({ or: '(status.eq."a,b",name.ilike."*x.y*")' })
  })

  it("falls back to plain params with a single rule", () => {
    expect(serialize(state("or", rule("status", "eq", "a")), context)).toEqual({
      status: "eq.a",
    })
  })
})

describe("postgrestSerializer — operators option", () => {
  const serialize = postgrestSerializer({
    operators: {
      contains: (rule, quote) => [`fts.${quote(String(rule.value))}`],
      startsWith: undefined,
    },
  })

  it("overrides built-in filters in AND and OR", () => {
    expect(
      serialize(state("and", rule("name", "contains", "a b")), context)
    ).toEqual({ name: "fts.a b" })
    expect(
      serialize(
        state("or", rule("name", "contains", "a b"), rule("status", "eq", "x")),
        context
      )
    ).toEqual({ or: '(name.fts."a b",status.eq.x)' })
  })

  it("turns an operator off with undefined", () => {
    expect(
      serialize(state("and", rule("name", "startsWith", "a")), context)
    ).toEqual({})
  })
})

describe("custom operators", () => {
  const registry = createRegistry({
    operators: [{ id: "regex", arity: "single" }],
    fieldTypes: [
      {
        ...BUILTIN_FIELD_TYPES.text,
        operators: [...BUILTIN_FIELD_TYPES.text.operators, "regex"],
      },
    ],
  })
  const custom = { ...context, registry }
  const regex = state("and", rule("name", "regex", "^a"))

  it("are skipped by default", () => {
    expect(serialize(regex, custom)).toEqual({})
  })

  it("can be added through the operators option", () => {
    expect(
      postgrestSerializer({
        operators: {
          regex: (rule, quote) => [`match.${quote(String(rule.value))}`],
        },
      })(regex, custom)
    ).toEqual({ name: "match.^a" })
  })
})

it("skips a built-in operator redefined with another arity", () => {
  const registry = createRegistry({
    operators: [{ id: "in", arity: "single" }],
    fieldTypes: [{ ...BUILTIN_FIELD_TYPES.select, operators: ["eq", "in"] }],
  })
  expect(
    serialize(state("and", rule("status", "in", "a")), { ...context, registry })
  ).toEqual({})
})

describe("postgrestSerializer — inspect, supports, mapRule", () => {
  it("reports skipped rules but never conflicts: repeated keys are ANDed", () => {
    const custom = postgrestSerializer({ operators: { ne: undefined } })
    const ne = rule("status", "ne", "a")
    expect(
      custom.inspect(
        state("and", rule("name", "eq", "a"), rule("name", "eq", "b"), ne),
        context
      )
    ).toEqual({ skipped: [ne.id], conflicts: [] })
  })

  it("supports only operators with a filter", () => {
    const custom = postgrestSerializer({ operators: { ne: undefined } })
    expect(custom.supports("eq")).toBe(true)
    expect(custom.supports("ne")).toBe(false)
    expect(custom.supports("within")).toBe(false)
  })

  it("aliases fields and drops rules through mapRule in AND and OR", () => {
    const dropped = rule("name", "eq", "x")
    const mapped = postgrestSerializer({
      mapRule: (r) =>
        r.field === "name" ? undefined : { ...r, field: `data->>${r.field}` },
    })
    const rules = [
      rule("status", "eq", "a"),
      rule("amount", "gt", 1),
      dropped,
    ] as const
    expect(mapped(state("and", ...rules), context)).toEqual({
      "data->>status": "eq.a",
      "data->>amount": "gt.1",
    })
    expect(mapped(state("or", ...rules), context)).toEqual({
      or: "(data->>status.eq.a,data->>amount.gt.1)",
    })
    expect(mapped.inspect(state("or", ...rules), context).skipped).toEqual([
      dropped.id,
    ])
  })

  it("falls back to plain params when OR keeps a single rule", () => {
    const custom = postgrestSerializer({ operators: { ne: undefined } })
    expect(
      custom(
        state("or", rule("status", "ne", "a"), rule("name", "eq", "a b")),
        context
      )
    ).toEqual({ name: "eq.a b" })
  })

  it("skips a rule whose mapRule output doesn't fit the filter", () => {
    const between = rule("amount", "between", [1, 5])
    const broken = postgrestSerializer({
      mapRule: (r) => ({ ...r, arity: "single", value: "x" }),
    })
    expect(broken(state("and", between), context)).toEqual({})
    expect(broken.inspect(state("and", between), context).skipped).toEqual([
      between.id,
    ])
  })
})
