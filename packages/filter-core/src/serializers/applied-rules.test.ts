import { describe, expect, it } from "vitest"

import { getAppliedRules } from "./applied-rules"
import type { QuerySerializer } from "./query-params"
import { context, rule, state } from "./serializer-test-fixtures"

describe("getAppliedRules", () => {
  it("returns complete rules with id, arity and field definition", () => {
    const range = rule("amount", "between", ["1", "5"])
    const empty = rule("name", "isEmpty", "leftover")
    expect(
      getAppliedRules(
        state("or", range, rule("name", "contains", ""), empty),
        context
      )
    ).toEqual({
      join: "or",
      rules: [
        {
          id: range.id,
          field: "amount",
          operator: "between",
          arity: "range",
          value: [1, 5],
          definition: context.fields[1],
        },
        {
          id: empty.id,
          field: "name",
          operator: "isEmpty",
          arity: "none",
          value: null,
          definition: context.fields[0],
        },
      ],
    })
  })

  it("is enough to build a non-param serializer", () => {
    type Where = Record<string, unknown>
    const prismaLike: QuerySerializer<Where> = (s, ctx) => {
      const { join, rules } = getAppliedRules(s, ctx)
      const conditions = rules.map((rule) => ({
        [rule.field]:
          rule.arity === "range"
            ? { gte: rule.value[0], lte: rule.value[1] }
            : {
                [rule.operator === "eq" ? "equals" : rule.operator]: rule.value,
              },
      }))
      return { [join.toUpperCase()]: conditions }
    }

    expect(
      prismaLike(
        state(
          "and",
          rule("status", "eq", "a"),
          rule("amount", "between", [1, 5])
        ),
        context
      )
    ).toEqual({
      AND: [{ status: { equals: "a" } }, { amount: { gte: 1, lte: 5 } }],
    })
  })
})
