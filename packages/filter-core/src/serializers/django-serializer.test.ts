import { describe, expect, it } from "vitest"

import type { FilterRule } from "../types"
import { djangoSerializer } from "./django-serializer"
import type { QueryParams } from "./query-params"
import { context, rule, state } from "./serializer-test-fixtures"

const serialize = djangoSerializer()

describe("djangoSerializer", () => {
  it.each<[FilterRule, QueryParams]>([
    [rule("status", "eq", "active"), { status: "active" }],
    [rule("name", "contains", "a"), { name__icontains: "a" }],
    [rule("name", "startsWith", "a"), { name__istartswith: "a" }],
    [rule("name", "endsWith", "a"), { name__iendswith: "a" }],
    [rule("amount", "gt", 1), { amount__gt: "1" }],
    [rule("amount", "gte", 1), { amount__gte: "1" }],
    [rule("amount", "lt", 1), { amount__lt: "1" }],
    [rule("amount", "lte", 1), { amount__lte: "1" }],
    [rule("amount", "between", [1, 5]), { amount__range: "1,5" }],
    [rule("tags", "in", ["a", "b"]), { tags__in: "a,b" }],
    [rule("name", "isEmpty", null), { name__isnull: "true" }],
    [rule("name", "isNotEmpty", null), { name__isnull: "false" }],
    [rule("active", "eq", true), { active: "true" }],
  ])("%o", (input, expected) => {
    expect(serialize(state("and", input), context)).toEqual(expected)
  })

  it("skips a list with a comma inside an item, which comma-joining would split", () => {
    const range = rule("amount", "between", ["12,5", "20"])
    const serializer = djangoSerializer()
    const withRange = state("and", range, rule("tags", "in", ["a"]))
    expect(serializer(withRange, context)).toEqual({ tags__in: "a" })
    expect(serializer.inspect(withRange, context).skipped).toEqual([range.id])
    // A single value is sent as is.
    expect(
      serializer(state("and", rule("amount", "gt", "12,5")), context)
    ).toEqual({
      amount__gt: "12,5",
    })
  })

  it("skips operators without a lookup", () => {
    expect(
      serialize(
        state(
          "or",
          rule("status", "ne", "a"),
          rule("name", "notContains", "a"),
          rule("tags", "notIn", ["a"]),
          rule("amount", "gt", 1)
        ),
        context
      )
    ).toEqual({ amount__gt: "1" })
  })

  it("merges custom lookups over the defaults", () => {
    const custom = djangoSerializer({
      lookups: { eq: "eq", ne: "ne", notIn: "not_in", contains: undefined },
    })
    expect(
      custom(
        state(
          "and",
          rule("status", "eq", "a"),
          rule("status", "ne", "b"),
          rule("tags", "notIn", ["x", "y"]),
          rule("name", "contains", "z"),
          rule("amount", "gt", 1)
        ),
        context
      )
    ).toEqual({
      status__eq: "a",
      status__ne: "b",
      tags__not_in: "x,y",
      amount__gt: "1",
    })
  })

  it("adds the join param only for OR with several serialized rules", () => {
    const rules = [rule("status", "eq", "a"), rule("amount", "gt", 1)]
    expect(serialize(state("or", ...rules), context).conjunction).toBe("or")
    expect(
      djangoSerializer({ joinParam: "join" })(state("or", ...rules), context)
        .join
    ).toBe("or")
    expect(serialize(state("and", ...rules), context)).not.toHaveProperty(
      "conjunction"
    )
    expect(
      serialize(state("or", rules[0]!, rule("status", "ne", "b")), context)
    ).not.toHaveProperty("conjunction")
  })

  it("reports rules that collide on the same param", () => {
    const empty = rule("name", "isEmpty", null)
    const notEmpty = rule("name", "isNotEmpty", null)
    expect(
      serialize.inspect(
        state("and", empty, rule("amount", "gt", 1), notEmpty),
        context
      ).conflicts
    ).toEqual([notEmpty.id])
  })

  it("supports only operators with a lookup and reports the rest as skipped", () => {
    const ne = rule("status", "ne", "a")
    expect(serialize.supports("contains")).toBe(true)
    expect(serialize.supports("ne")).toBe(false)
    expect(
      serialize.inspect(state("and", rule("status", "eq", "a"), ne), context)
        .skipped
    ).toEqual([ne.id])
    expect(djangoSerializer({ lookups: { ne: "ne" } }).supports("ne")).toBe(
      true
    )
  })

  it("maps UI fields to relation lookups through mapRule", () => {
    const mapped = djangoSerializer({
      mapRule: (r) =>
        r.field === "name" ? { ...r, field: "customer__name" } : r,
    })
    expect(
      mapped(state("and", rule("name", "contains", "abc")), context)
    ).toEqual({ customer__name__icontains: "abc" })
  })

  it("reports rules mapRule drops as skipped", () => {
    const dropped = rule("name", "contains", "a")
    const mapped = djangoSerializer({
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
