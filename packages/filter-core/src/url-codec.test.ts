import { describe, expect, it } from "vitest"

import type { FilterContext } from "./context"
import { EMPTY_FILTER_STATE } from "./reducer"
import type { FilterRule, FilterState, FilterValue, Join } from "./types"
import { decodeFilters, encodeFilters } from "./url-codec"

const context: FilterContext = {
  fields: [
    { name: "name", label: "Name", type: "text" },
    { name: "amount", label: "Amount", type: "number" },
    { name: "status", label: "Status", type: "select" },
    { name: "tags", label: "Tags", type: "multiSelect" },
    { name: "active", label: "Active", type: "boolean" },
    { name: "createdAt", label: "Created", type: "date" },
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
  it("writes the join as the key and rules as tuples", () => {
    expect(
      encode(
        state(
          "and",
          rule("status", "eq", "active"),
          rule("amount", "between", [1, 5])
        )
      )
    ).toBe('{"and":[["status","eq","active"],["amount","between",[1,5]]]}')
  })

  it("omits the value for operators without one", () => {
    expect(encode(state("or", rule("name", "isEmpty", "leftover")))).toBe(
      '{"or":[["name","isEmpty"]]}'
    )
  })

  it("writes normalized values", () => {
    expect(encode(state("and", rule("amount", "eq", "5")))).toBe(
      '{"and":[["amount","eq",5]]}'
    )
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
    ).toBe('{"and":[["name","contains","abc"]]}')
  })

  it("returns null when no rule is complete", () => {
    expect(encode(EMPTY_FILTER_STATE)).toBeNull()
    expect(encode(state("and", rule("name", "contains", "")))).toBeNull()
  })
})

describe("decodeFilters", () => {
  it("round-trips every complete rule", () => {
    const original = state(
      "or",
      rule("name", "contains", 'a,b "quoted" & ?=#'),
      rule("amount", "between", [1.5, 10]),
      rule("status", "ne", "draft"),
      rule("tags", "in", ["x,y", "z"]),
      rule("active", "eq", false),
      rule("createdAt", "gte", "2026-01-31"),
      rule("name", "isNotEmpty", null)
    )
    expect(withoutIds(decode(encode(original)))).toEqual(withoutIds(original))
  })

  it("assigns positional ids", () => {
    const raw = '{"and":[["bad"],["name","eq","a"],["amount","eq",1]]}'
    expect(decode(raw).rules.map((r) => r.id)).toEqual(["u0", "u1"])
    expect(decode(raw)).toEqual(decode(raw))
  })

  it("coerces string values through the field type", () => {
    expect(decode('{"and":[["amount","between",["1","5"]]]}').rules).toEqual([
      { id: "u0", field: "amount", operator: "between", value: [1, 5] },
    ])
  })

  it.each([null, "", "not json", "{", "null", "42", '"x"', "[]", "{}"])(
    "returns the empty state for %j",
    (raw) => {
      expect(decode(raw)).toEqual(EMPTY_FILTER_STATE)
    }
  )

  it("ignores unknown join keys", () => {
    expect(decode('{"xor":[["name","eq","a"]]}')).toEqual(EMPTY_FILTER_STATE)
    expect(decode('{"and":"nope"}')).toEqual(EMPTY_FILTER_STATE)
  })

  it("drops only the bad rules", () => {
    const raw = JSON.stringify({
      and: [
        ["ghost", "eq", "x"],
        ["name", "nope", "x"],
        ["amount", "eq", "abc"],
        ["amount", "between", [1]],
        ["tags", "in", []],
        ["createdAt", "eq", "2026-02-30"],
        ["name", "eq"],
        ["name", "eq", "a", "extra"],
        [1, "eq", "a"],
        "name",
        null,
        { field: "name" },
        ["amount", "gt", 3],
      ],
    })
    expect(decode(raw)).toEqual({
      join: "and",
      rules: [{ id: "u0", field: "amount", operator: "gt", value: 3 }],
    })
  })

  it("does not resolve prototype keys as fields or operators", () => {
    expect(
      decode('{"and":[["toString","eq","a"],["name","constructor","a"]]}').rules
    ).toEqual([])
    expect(decode('{"__proto__":[["name","eq","a"]]}')).toEqual(
      EMPTY_FILTER_STATE
    )
  })

  it("never throws on random input", () => {
    const alphabet = '{}[]",:andor eqname0123 \\'
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
