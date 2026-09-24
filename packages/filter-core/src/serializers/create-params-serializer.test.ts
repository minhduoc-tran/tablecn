import { describe, expect, it } from "vitest"

import type { OperatorId } from "../types"
import { createParamsSerializer } from "./create-params-serializer"
import { context, rule, state } from "./serializer-test-fixtures"

// A Strapi-style backend: `filters[name][$containsi]=a`, OR nests rules by index.
const STRAPI: Partial<Record<OperatorId, string>> = {
  eq: "$eq",
  contains: "$containsi",
  between: "$between",
  in: "$in",
}

const strapi = createParamsSerializer({
  encodeRule: ({ field, operator, value }, { index, join }) => {
    const name = STRAPI[operator]
    if (!name) return undefined
    const base = join === "or" ? `filters[$or][${index}]` : "filters"
    const values = Array.isArray(value) ? value : [value]
    return values.map((item, i) => [
      `${base}[${field}][${name}]${Array.isArray(value) ? `[${i}]` : ""}`,
      String(item),
    ])
  },
})

describe("createParamsSerializer", () => {
  it("encodes AND rules with the given encoder", () => {
    expect(
      strapi(
        state(
          "and",
          rule("name", "contains", "a"),
          rule("amount", "between", [1, 5])
        ),
        context
      )
    ).toEqual({
      "filters[name][$containsi]": "a",
      "filters[amount][$between][0]": "1",
      "filters[amount][$between][1]": "5",
    })
  })

  it("passes the index and join so OR can be nested", () => {
    expect(
      strapi(
        state("or", rule("status", "eq", "a"), rule("tags", "in", ["x"])),
        context
      )
    ).toEqual({
      "filters[$or][0][status][$eq]": "a",
      "filters[$or][1][tags][$in][0]": "x",
    })
  })

  it("skips rules the encoder returns nothing for", () => {
    expect(
      strapi(state("and", rule("name", "isEmpty", null)), context)
    ).toEqual({})
  })

  it("adds orParams only when OR has two or more encoded rules", () => {
    const serialize = createParamsSerializer({
      encodeRule: ({ field, value }) =>
        field === "name" ? undefined : [[field, String(value)]],
      orParams: { join: "or" },
    })
    const a = rule("status", "eq", "a")
    const b = rule("amount", "gt", 1)
    const skipped = rule("name", "contains", "x")
    expect(serialize(state("or", a, b), context).join).toBe("or")
    expect(serialize(state("or", a, skipped), context)).toEqual({ status: "a" })
    expect(serialize(state("and", a, b), context)).not.toHaveProperty("join")
  })
})

describe("inspect conflicts", () => {
  const byField = createParamsSerializer({
    encodeRule: ({ field, value }) => [[field, String(value)]],
  })

  it("returns ids of rules whose key an earlier rule already used", () => {
    const first = rule("name", "contains", "a")
    const second = rule("name", "contains", "b")
    const other = rule("status", "eq", "x")
    const third = rule("name", "eq", "c")
    expect(
      byField.inspect(state("and", first, other, second, third), context)
        .conflicts
    ).toEqual([second.id, third.id])
  })

  it("ignores a rule repeating its own key and skipped rules", () => {
    const ranged = createParamsSerializer({
      encodeRule: ({ field, operator, value }) =>
        operator === "isEmpty"
          ? undefined
          : [value].flat().map((item) => [field, String(item)]),
    })
    expect(
      ranged.inspect(
        state(
          "and",
          rule("amount", "between", [1, 5]),
          rule("name", "isEmpty", null),
          rule("name", "isNotEmpty", null)
        ),
        context
      ).conflicts
    ).toEqual([])
  })

  it("flags a rule whose key orParams overwrite in OR", () => {
    const byField = createParamsSerializer({
      encodeRule: ({ field, value }) => [[field, String(value)]],
      orParams: { status: "or" },
    })
    const status = rule("status", "eq", "a")
    const name = rule("name", "eq", "b")
    expect(byField.inspect(state("or", status, name), context)).toEqual({
      skipped: [],
      conflicts: [status.id],
    })
    expect(
      byField.inspect(state("and", status, name), context).conflicts
    ).toEqual([])
  })

  it("finds nothing when keys differ, e.g. OR rules nested by index", () => {
    expect(
      strapi.inspect(
        state("or", rule("status", "eq", "a"), rule("status", "eq", "b")),
        context
      ).conflicts
    ).toEqual([])
  })
})

describe("inspect skipped, supports and mapRule", () => {
  it("reports rules the encoder skips, keeping the original id", () => {
    const skipped = rule("name", "isEmpty", null)
    expect(
      strapi.inspect(state("and", rule("status", "eq", "a"), skipped), context)
    ).toEqual({ skipped: [skipped.id], conflicts: [] })
  })

  it("supports every operator unless told otherwise", () => {
    expect(strapi.supports("anything")).toBe(true)
    const limited = createParamsSerializer({
      encodeRule: () => undefined,
      supports: (operator) => operator === "eq",
    })
    expect(limited.supports("eq")).toBe(true)
    expect(limited.supports("ne")).toBe(false)
  })

  it("runs mapRule before encoding and skips rules it drops", () => {
    const byField = createParamsSerializer({
      encodeRule: ({ field, value }) => [[field, String(value)]],
      mapRule: (r) =>
        r.field === "name"
          ? undefined
          : { ...r, id: "renamed", field: `x_${r.field}` },
    })
    const dropped = rule("name", "eq", "a")
    const kept = rule("status", "eq", "b")
    const both = state("and", dropped, kept, rule("status", "eq", "c"))
    expect(byField(both, context)).toEqual({ x_status: ["b", "c"] })
    expect(byField.inspect(both, context)).toEqual({
      skipped: [dropped.id],
      conflicts: [both.rules[2]!.id],
    })
  })
})

it("treats prototype names as plain keys", () => {
  const byField = createParamsSerializer({
    encodeRule: ({ field, value }) => [[field, String(value)]],
  })
  const fields = ["constructor", "__proto__", "toString"].map((name) => ({
    name,
    label: name,
    type: "text",
  }))
  const params = byField(
    state(
      "and",
      rule("constructor", "eq", "a"),
      rule("__proto__", "eq", "b"),
      rule("toString", "eq", "c")
    ),
    { fields }
  )
  expect(Object.entries(params)).toEqual([
    ["constructor", "a"],
    ["__proto__", "b"],
    ["toString", "c"],
  ])
})
