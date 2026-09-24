import { describe, expect, it } from "vitest"

import { BUILTIN_OPERATORS, getOperatorArity } from "./operators"
import type { OperatorDefinition } from "./types"

const ARITIES = ["none", "single", "range", "multi"]

describe("BUILTIN_OPERATORS", () => {
  it("has 15 operators", () => {
    expect(Object.keys(BUILTIN_OPERATORS)).toHaveLength(15)
  })

  it.each(Object.entries(BUILTIN_OPERATORS))(
    "%s: key matches id and arity is valid",
    (key, operator) => {
      expect(operator.id).toBe(key)
      expect(ARITIES).toContain(operator.arity)
    }
  )

  it("assigns the non-single arities to the right operators", () => {
    expect(BUILTIN_OPERATORS.between.arity).toBe("range")
    expect(BUILTIN_OPERATORS.in.arity).toBe("multi")
    expect(BUILTIN_OPERATORS.notIn.arity).toBe("multi")
    expect(BUILTIN_OPERATORS.isEmpty.arity).toBe("none")
    expect(BUILTIN_OPERATORS.isNotEmpty.arity).toBe("none")
  })
})

describe("getOperatorArity", () => {
  it("returns arity of a built-in operator", () => {
    expect(getOperatorArity("eq")).toBe("single")
    expect(getOperatorArity("between")).toBe("range")
  })

  it("returns undefined for unknown ids", () => {
    expect(getOperatorArity("nope")).toBeUndefined()
  })

  it("ignores prototype keys", () => {
    expect(getOperatorArity("toString")).toBeUndefined()
    expect(getOperatorArity("__proto__")).toBeUndefined()
  })

  it("looks up a custom operator map", () => {
    const custom: Record<string, OperatorDefinition> = {
      near: { id: "near", arity: "range" },
    }
    expect(getOperatorArity("near", custom)).toBe("range")
    expect(getOperatorArity("eq", custom)).toBeUndefined()
  })
})
