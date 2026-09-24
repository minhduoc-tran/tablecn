import { describe, expect, it } from "vitest"

import { BUILTIN_FIELD_TYPES, createValueParser } from "./field-types"

const { text, number, date, datetime, boolean } = BUILTIN_FIELD_TYPES

describe("createValueParser", () => {
  const parse = createValueParser((raw) =>
    typeof raw === "string" ? raw : undefined
  )

  it("returns null for arity none regardless of input", () => {
    expect(parse("x", "none")).toBeNull()
  })

  it("parses a range only when it is a pair of valid items", () => {
    expect(parse(["a", "b"], "range")).toEqual(["a", "b"])
    expect(parse(["a"], "range")).toBeUndefined()
    expect(parse(["a", 1], "range")).toBeUndefined()
    expect(parse("a", "range")).toBeUndefined()
  })

  it("parses a list only when every item is valid", () => {
    expect(parse(["a", "b"], "multi")).toEqual(["a", "b"])
    expect(parse([], "multi")).toEqual([])
    expect(parse(["a", 1], "multi")).toBeUndefined()
    expect(parse("a", "multi")).toBeUndefined()
  })
})

describe("built-in parsers (single)", () => {
  it.each([
    [text, "abc", "abc"],
    [text, 5, "5"],
    [text, true, undefined],
    [number, 5, 5],
    [number, "5.5", 5.5],
    [number, " ", undefined],
    [number, "abc", undefined],
    [number, Infinity, undefined],
    [date, "2026-02-28", "2026-02-28"],
    [date, "2026-02-30", undefined],
    [date, "2026-2-3", undefined],
    [date, 20260228, undefined],
    [datetime, "2026-09-24T10:00:00Z", "2026-09-24T10:00:00Z"],
    [datetime, "2026-09-24", undefined],
    [datetime, "2026-13-24T10:00", undefined],
    [boolean, true, true],
    [boolean, "false", false],
    [boolean, "yes", undefined],
  ])("%# %o → %o", (type, raw, expected) => {
    expect(type.parseValue(raw, "single")).toEqual(expected)
  })

  it("coerces range items", () => {
    expect(number.parseValue(["1", "10"], "range")).toEqual([1, 10])
  })
})

describe("BUILTIN_FIELD_TYPES", () => {
  it.each(Object.entries(BUILTIN_FIELD_TYPES))(
    "%s: key matches id and default operator is offered",
    (key, type) => {
      expect(type.id).toBe(key)
      expect(type.operators).toContain(type.defaultOperator)
    }
  )
})
