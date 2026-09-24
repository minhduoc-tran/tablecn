import { describe, expect, it } from "vitest"

import type { FilterContext } from "./context"
import { createValueParser } from "./field-types"
import { createRegistry } from "./registry"
import type { FilterRule, FilterValue, OperatorId } from "./types"
import {
  getRuleWarnings,
  isRuleComplete,
  normalizeRule,
  normalizeState,
} from "./validation"

const context: FilterContext = {
  fields: [
    { name: "name", label: "Name", type: "text" },
    { name: "amount", label: "Amount", type: "number" },
    { name: "tags", label: "Tags", type: "multiSelect" },
    { name: "active", label: "Active", type: "boolean" },
    { name: "code", label: "Code", type: "text", operators: ["eq"] },
  ],
}

const rule = (
  field: string,
  operator: OperatorId | null,
  value: FilterValue
): FilterRule => ({ id: "r1", field, operator, value })

describe("isRuleComplete", () => {
  it.each<[string, FilterRule, boolean]>([
    ["single text", rule("name", "contains", "abc"), true],
    ["single empty string", rule("name", "contains", ""), false],
    ["single whitespace", rule("name", "contains", "   "), false],
    ["single null", rule("name", "eq", null), false],
    ["single false boolean", rule("active", "eq", false), true],
    ["single zero", rule("amount", "eq", 0), true],
    ["none ignores value", rule("name", "isEmpty", "leftover"), true],
    ["range full", rule("amount", "between", [1, 10]), true],
    ["range half empty", rule("amount", "between", [1, ""]), false],
    ["range wrong shape", rule("amount", "between", 5), false],
    ["multi with items", rule("tags", "in", ["a", "b"]), true],
    ["multi empty", rule("tags", "in", []), false],
    ["multi blank item", rule("tags", "in", ["a", " "]), false],
    ["unknown field", rule("ghost", "eq", "x"), false],
    ["no operator", rule("name", null, "x"), false],
    ["operator not offered by type", rule("name", "gt", "x"), false],
    ["operator narrowed away by field", rule("code", "contains", "x"), false],
    ["unparseable number", rule("amount", "eq", "abc"), false],
  ])("%s", (_, input, expected) => {
    expect(isRuleComplete(input, context)).toBe(expected)
  })
})

describe("normalizeRule", () => {
  it("coerces the value to canonical form", () => {
    expect(
      normalizeRule(rule("amount", "between", ["1", "10"]), context)
    ).toEqual(rule("amount", "between", [1, 10]))
  })

  it("sets the value to null for arity none", () => {
    expect(normalizeRule(rule("name", "isEmpty", "x"), context)?.value).toBe(
      null
    )
  })

  it("does not mutate the input rule", () => {
    const input = rule("amount", "eq", "5")
    normalizeRule(input, context)
    expect(input.value).toBe("5")
  })

  it("uses a custom registry when provided", () => {
    const registry = createRegistry({
      operators: [{ id: "near", arity: "single" }],
      fieldTypes: [
        {
          id: "geo",
          operators: ["near"],
          defaultOperator: "near",
          parseValue: createValueParser((raw) =>
            typeof raw === "string" ? raw : undefined
          ),
        },
      ],
    })
    const geoContext: FilterContext = {
      fields: [{ name: "place", label: "Place", type: "geo" }],
      registry,
    }
    expect(isRuleComplete(rule("place", "near", "HCM"), geoContext)).toBe(true)
    expect(
      isRuleComplete(rule("place", "near", "HCM"), {
        ...geoContext,
        registry: undefined,
      })
    ).toBe(false)
  })
})

describe("value shape from a custom parseValue", () => {
  // Passes raw input through untouched, so only the shape check stands between it and serializers.
  const registry = createRegistry({
    operators: [{ id: "within", arity: "range" }],
    fieldTypes: [
      {
        id: "raw",
        operators: ["eq", "within", "in", "isEmpty"],
        defaultOperator: "eq",
        parseValue: (raw) => raw as FilterValue,
      },
    ],
  })
  const rawContext: FilterContext = {
    fields: [{ name: "x", label: "X", type: "raw" }],
    registry,
  }

  it.each<[string, OperatorId, unknown, boolean]>([
    ["single primitive", "eq", "a", true],
    ["single object", "eq", { a: 1 }, false],
    ["single array", "eq", ["a"], false],
    ["single NaN", "eq", NaN, false],
    ["range pair", "within", [1, 2], true],
    ["range too short", "within", [1], false],
    ["range too long", "within", [1, 2, 3], false],
    ["range nested", "within", [[1], 2], false],
    ["multi with object", "in", ["a", {}], false],
  ])("%s", (_, operator, value, complete) => {
    expect(
      isRuleComplete(rule("x", operator, value as FilterValue), rawContext)
    ).toBe(complete)
  })

  it("forces null for operators without a value", () => {
    expect(
      normalizeRule(rule("x", "isEmpty", { a: 1 } as never), rawContext)?.value
    ).toBeNull()
  })
})

describe("getRuleWarnings", () => {
  const dateContext: FilterContext = {
    fields: [{ name: "createdAt", label: "Created", type: "date" }],
  }

  it("flags a reversed number range", () => {
    expect(
      getRuleWarnings(rule("amount", "between", [10, 1]), context)
    ).toEqual(["reversedRange"])
  })

  it("flags a reversed date range", () => {
    expect(
      getRuleWarnings(
        rule("createdAt", "between", ["2026-09-30", "2026-09-01"]),
        dateContext
      )
    ).toEqual(["reversedRange"])
  })

  it("compares coerced values, not raw strings", () => {
    expect(
      getRuleWarnings(rule("amount", "between", ["9", "10"]), context)
    ).toEqual([])
  })

  it("returns [] for ordered, equal, incomplete or non-range rules", () => {
    expect(
      getRuleWarnings(rule("amount", "between", [1, 10]), context)
    ).toEqual([])
    expect(getRuleWarnings(rule("amount", "between", [5, 5]), context)).toEqual(
      []
    )
    expect(
      getRuleWarnings(rule("amount", "between", [10, ""]), context)
    ).toEqual([])
    expect(getRuleWarnings(rule("amount", "gt", 10), context)).toEqual([])
  })

  it("keeps the reversed value as entered", () => {
    expect(
      normalizeRule(rule("amount", "between", [10, 1]), context)?.value
    ).toEqual([10, 1])
  })
})

describe("normalizeState", () => {
  it("keeps join, drops incomplete rules and normalizes the rest", () => {
    const state = {
      join: "or" as const,
      rules: [
        rule("amount", "eq", "5"),
        rule("name", "contains", ""),
        rule("tags", "in", ["a"]),
      ],
    }
    expect(normalizeState(state, context)).toEqual({
      join: "or",
      rules: [rule("amount", "eq", 5), rule("tags", "in", ["a"])],
    })
  })
})
