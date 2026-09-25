import { describe, expect, it } from "vitest"

import type { FilterContext } from "./context"
import { EMPTY_FILTER_STATE } from "./reducer"
import type { FilterRule, FilterState, FilterValue, Join } from "./types"
import { decodeFilters, encodeFilters, isFilterParam } from "./url-codec"
import type { UrlFormat } from "./url-format"

const context: FilterContext = {
  fields: [
    { name: "name", label: "Name", type: "text" },
    { name: "amount", label: "Amount", type: "number" },
    { name: "status", label: "Status", type: "select" },
    { name: "tags", label: "Tags", type: "multiSelect" },
    { name: "active", label: "Active", type: "boolean" },
    { name: "createdAt", label: "Created", type: "date" },
    { name: "updatedAt", label: "Updated", type: "datetime" },
    { name: "customer__name", label: "Customer", type: "text" },
  ],
}

let seq = 0
const rule = (
  field: string,
  operator: string | null,
  value: FilterValue
): FilterRule => ({ id: `r${++seq}`, field, operator, value })

const state = (join: Join, ...rules: FilterRule[]): FilterState => ({
  join,
  rules,
})

const withoutIds = ({ join, rules }: FilterState) => ({
  join,
  rules: rules.map(({ field, operator, value }) => ({
    field,
    operator,
    value,
  })),
})

const encode = (s: FilterState) => encodeFilters(s, context)
const decode = (raw: string | null) => decodeFilters(raw, context)

describe("encodeFilters", () => {
  it("writes one field__operator param per rule", () => {
    expect(
      encode(
        state(
          "and",
          rule("status", "eq", "active"),
          rule("amount", "between", [1, 5]),
          rule("tags", "in", ["a", "b"])
        )
      )
    ).toBe("status__eq=active&amount__between=1,5&tags__in=a,b")
  })

  it("writes join=or first, only for an OR", () => {
    expect(
      encode(state("or", rule("status", "eq", "a"), rule("status", "eq", "b")))
    ).toBe("join=or&status__eq=a&status__eq=b")
  })

  it("writes the bare key for operators without a value", () => {
    expect(encode(state("and", rule("name", "isEmpty", "leftover")))).toBe(
      "name__isEmpty"
    )
  })

  it("writes normalized values", () => {
    expect(encode(state("and", rule("amount", "eq", "5")))).toBe("amount__eq=5")
  })

  it("keeps commas and colons readable, escapes the rest", () => {
    expect(
      encode(
        state(
          "and",
          rule("name", "contains", "a, b & c"),
          rule("updatedAt", "gte", "2026-01-31T10:00")
        )
      )
    ).toBe("name__contains=a,%20b%20%26%20c&updatedAt__gte=2026-01-31T10:00")
  })

  it("skips incomplete rules", () => {
    expect(
      encode(
        state(
          "and",
          rule("", null, null),
          rule("name", "contains", ""),
          rule("ghost", "eq", "x"),
          rule("name", "contains", "abc")
        )
      )
    ).toBe("name__contains=abc")
  })

  it("returns an empty string when no rule is complete", () => {
    expect(encode(EMPTY_FILTER_STATE)).toBe("")
    expect(encode(state("or", rule("name", "contains", "")))).toBe("")
  })
})

describe("decodeFilters", () => {
  it("round-trips every complete rule", () => {
    const original = state(
      "or",
      rule("name", "contains", 'a,b "quoted" & ?=#+%'),
      rule("amount", "between", [1.5, 10]),
      rule("status", "ne", "draft"),
      rule("tags", "in", ["x,y", "100%", "%2C", "z"]),
      rule("active", "eq", false),
      rule("createdAt", "gte", "2026-01-31"),
      rule("updatedAt", "lt", "2026-01-31T10:00"),
      rule("customer__name", "eq", "Đà Nẵng"),
      rule("name", "isNotEmpty", null)
    )
    expect(withoutIds(decode(encode(original)))).toEqual(withoutIds(original))
  })

  it("reads the format backends and people write", () => {
    expect(
      decode("?status__eq=paid&amount__gte=10&tags__in=a%2Cb,c&page=2")
    ).toEqual({
      join: "and",
      rules: [
        { id: "u0", field: "status", operator: "eq", value: "paid" },
        { id: "u1", field: "amount", operator: "gte", value: 10 },
        { id: "u2", field: "tags", operator: "in", value: ["a", "b", "c"] },
      ],
    })
  })

  it("accepts URLSearchParams", () => {
    expect(
      decodeFilters(new URLSearchParams("join=or&name__isEmpty="), context)
    ).toEqual({
      join: "or",
      rules: [{ id: "u0", field: "name", operator: "isEmpty", value: null }],
    })
  })

  it("assigns positional ids", () => {
    const raw = "bad__eq=1&name__eq=a&amount__eq=1"
    expect(decode(raw).rules.map((r) => r.id)).toEqual(["u0", "u1"])
    expect(decode(raw)).toEqual(decode(raw))
  })

  it.each([null, "", "?", "page=2&sort=name", "join=or", "__eq=a", "&&=="])(
    "returns the empty state for %j",
    (raw) => {
      expect(decode(raw)).toEqual(EMPTY_FILTER_STATE)
    }
  )

  it("drops only the bad rules", () => {
    const raw = [
      "ghost__eq=x",
      "name__nope=x",
      "active__eq=maybe",
      "amount__between=1",
      "amount__between=1,2,3",
      "tags__in=",
      "createdAt__eq=2026-02-30",
      "name__eq=",
      "name__eq",
      "name=a",
      "join=xor",
      "amount__gt=3",
    ].join("&")
    expect(decode(raw)).toEqual({
      join: "and",
      rules: [{ id: "u0", field: "amount", operator: "gt", value: 3 }],
    })
  })

  it("does not resolve prototype keys as fields or operators", () => {
    expect(
      decode("toString__eq=a&name__constructor=a&__proto__=a").rules
    ).toEqual([])
  })

  it("never throws on random input", () => {
    const alphabet = "_&=,%2Cnameqoinjr0123 ?#"
    let s = 42
    const random = () => (s = (s * 48271) % 2147483647) / 2147483647
    for (let i = 0; i < 2000; i++) {
      const length = Math.floor(random() * 40)
      let raw = ""
      for (let j = 0; j < length; j++) {
        raw += alphabet[Math.floor(random() * alphabet.length)]
      }
      expect(() => decode(raw)).not.toThrow()
    }
  })
})

describe("isFilterParam", () => {
  it.each([
    ["join", true],
    ["name__eq", true],
    ["name__nope", true],
    ["customer__name__eq", true],
    ["ghost__eq", false],
    ["name", false],
    ["page", false],
  ])("%s → %s", (key, expected) => {
    expect(isFilterParam(key, "x", context)).toBe(expected)
  })
})

describe("custom UrlFormat", () => {
  // `_status=["eq","paid"]`
  const format: UrlFormat = {
    encodeRule: ({ field, operator, value }) => [
      `_${field}`,
      JSON.stringify(value === null ? [operator] : [operator, value]),
    ],
    decodeRule: (key, value) => {
      if (!key.startsWith("_")) return null
      const [operator, ruleValue = null] = JSON.parse(value) as [string, never]
      return { field: key.slice(1), operator, value: ruleValue }
    },
    joinParam: "_join",
  }

  it("encodes and decodes through the format", () => {
    const original = state(
      "or",
      rule("status", "eq", "paid"),
      rule("tags", "in", ["a,b", "c"]),
      rule("name", "isEmpty", null)
    )
    const encoded = encodeFilters(original, context, format)
    expect(encoded).toBe(
      "_join=or&_status=[%22eq%22,%22paid%22]&_tags=[%22in%22,[%22a,b%22,%22c%22]]&_name=[%22isEmpty%22]"
    )
    expect(withoutIds(decodeFilters(encoded, context, format))).toEqual(
      withoutIds(original)
    )
  })

  it("drops params the format throws on", () => {
    expect(
      decodeFilters('_status=not json&_name=["eq","a"]', context, format).rules
    ).toEqual([{ id: "u0", field: "name", operator: "eq", value: "a" }])
    expect(isFilterParam("_status", "not json", context, format)).toBe(false)
    expect(isFilterParam("_join", "or", context, format)).toBe(true)
  })
})
