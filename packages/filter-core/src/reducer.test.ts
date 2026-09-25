import { describe, expect, it } from "vitest"

import { createId } from "./create-id"
import {
  EMPTY_FILTER_STATE,
  filterReducer,
  type FilterAction,
  type ReducerContext,
} from "./reducer"
import type { FilterRule, FilterState } from "./types"

let seq = 0
const context: ReducerContext = {
  fields: [
    { name: "name", label: "Name", type: "text" },
    { name: "amount", label: "Amount", type: "number" },
    { name: "code", label: "Code", type: "text", defaultOperator: "eq" },
  ],
  createId: () => `id-${++seq}`,
}

const reduce = (state: FilterState, action: FilterAction, ctx = context) =>
  filterReducer(state, action, ctx)

const rule = (overrides: Partial<FilterRule> = {}): FilterRule => ({
  id: "r1",
  field: "amount",
  operator: "eq",
  value: 5,
  ...overrides,
})

const withRules = (...rules: FilterRule[]): FilterState => ({
  join: "and",
  rules,
})

describe("addRule", () => {
  it("adds an empty rule", () => {
    const next = reduce(EMPTY_FILTER_STATE, { type: "addRule" })
    expect(next.rules).toEqual([
      { id: expect.any(String), field: "", operator: null, value: null },
    ])
  })

  it("preselects the default operator when a field is given", () => {
    expect(
      reduce(EMPTY_FILTER_STATE, { type: "addRule", field: "name" }).rules[0]
        ?.operator
    ).toBe("contains")
    expect(
      reduce(EMPTY_FILTER_STATE, { type: "addRule", field: "code" }).rules[0]
        ?.operator
    ).toBe("eq")
  })

  it("leaves the operator null for an unknown field", () => {
    expect(
      reduce(EMPTY_FILTER_STATE, { type: "addRule", field: "ghost" }).rules[0]
        ?.operator
    ).toBeNull()
  })

  it("stops at maxRules", () => {
    const state = withRules(rule())
    expect(
      reduce(state, { type: "addRule" }, { ...context, maxRules: 1 })
    ).toBe(state)
  })

  it("does not mutate the previous state", () => {
    const state = withRules(rule())
    reduce(state, { type: "addRule" })
    expect(state.rules).toHaveLength(1)
  })

  it("skips ids already present in the state", () => {
    const ids = ["a", "b", "c"]
    const next = reduce(
      withRules(rule({ id: "a" }), rule({ id: "b" })),
      { type: "addRule" },
      { ...context, createId: () => ids.shift()! }
    )
    expect(next.rules.map((r) => r.id)).toEqual(["a", "b", "c"])
  })

  it("avoids collisions with ids restored from a previous session", () => {
    const restored = withRules(rule({ id: "r0" }), rule({ id: "r1" }))
    const next = reduce(restored, { type: "addRule" }, { ...context, createId })
    const ids = next.rules.map((r) => r.id)
    expect(new Set(ids).size).toBe(3)
  })

  it("throws instead of looping when createId keeps colliding", () => {
    expect(() =>
      reduce(
        withRules(rule({ id: "x" })),
        { type: "addRule" },
        { ...context, createId: () => "x" }
      )
    ).toThrow(/createId/)
  })
})

describe("removeRule", () => {
  it("removes by id", () => {
    const state = withRules(rule(), rule({ id: "r2" }))
    expect(reduce(state, { type: "removeRule", id: "r1" }).rules).toEqual([
      rule({ id: "r2" }),
    ])
  })

  it("returns the same state for an unknown id", () => {
    const state = withRules(rule())
    expect(reduce(state, { type: "removeRule", id: "nope" })).toBe(state)
  })
})

describe("setField", () => {
  it("switches field, resets operator to its default and clears the value", () => {
    const next = reduce(withRules(rule()), {
      type: "setField",
      id: "r1",
      field: "name",
    })
    expect(next.rules[0]).toEqual(
      rule({ field: "name", operator: "contains", value: null })
    )
  })

  it("is a no-op for the same field", () => {
    const state = withRules(rule())
    expect(reduce(state, { type: "setField", id: "r1", field: "amount" })).toBe(
      state
    )
  })

  it("picks a default the serializer supports", () => {
    const ctx = { ...context, supportsOperator: (id: string) => id !== "eq" }
    const added = reduce(
      EMPTY_FILTER_STATE,
      { type: "addRule", field: "code" },
      ctx
    )
    expect(added.rules[0]?.operator).toBe("contains")
    const switched = reduce(
      withRules(rule({ field: "name" })),
      { type: "setField", id: "r1", field: "code" },
      ctx
    )
    expect(switched.rules[0]?.operator).toBe("contains")
  })
})

describe("setOperator", () => {
  it("keeps the value when arity is unchanged", () => {
    const next = reduce(withRules(rule()), {
      type: "setOperator",
      id: "r1",
      operator: "gt",
    })
    expect(next.rules[0]).toEqual(rule({ operator: "gt", value: 5 }))
  })

  it("clears the value when arity changes", () => {
    const next = reduce(withRules(rule()), {
      type: "setOperator",
      id: "r1",
      operator: "between",
    })
    expect(next.rules[0]?.value).toBeNull()
  })

  it("clears the value when switching to a no-value operator", () => {
    const next = reduce(withRules(rule()), {
      type: "setOperator",
      id: "r1",
      operator: "isEmpty",
    })
    expect(next.rules[0]?.value).toBeNull()
  })

  it("clears the value when there was no operator before", () => {
    const next = reduce(withRules(rule({ operator: null, value: "x" })), {
      type: "setOperator",
      id: "r1",
      operator: "eq",
    })
    expect(next.rules[0]?.value).toBeNull()
  })

  it("is a no-op for the same operator", () => {
    const state = withRules(rule())
    expect(
      reduce(state, { type: "setOperator", id: "r1", operator: "eq" })
    ).toBe(state)
  })
})

describe("setValue / setJoin / reset / replace", () => {
  it("sets the value of the targeted rule only", () => {
    const state = withRules(rule(), rule({ id: "r2" }))
    const next = reduce(state, { type: "setValue", id: "r2", value: 9 })
    expect(next.rules.map((r) => r.value)).toEqual([5, 9])
    expect(next.rules[0]).toBe(state.rules[0])
  })

  it("returns the same state for an unchanged value or unknown id", () => {
    const state = withRules(rule())
    expect(reduce(state, { type: "setValue", id: "r1", value: 5 })).toBe(state)
    expect(reduce(state, { type: "setValue", id: "nope", value: 1 })).toBe(
      state
    )
  })

  it("sets join", () => {
    const state = withRules(rule())
    expect(reduce(state, { type: "setJoin", join: "or" }).join).toBe("or")
    expect(reduce(state, { type: "setJoin", join: "and" })).toBe(state)
  })

  it("resets and replaces", () => {
    const state = withRules(rule())
    expect(reduce(state, { type: "reset" })).toEqual(EMPTY_FILTER_STATE)
    const other = withRules(rule({ id: "x" }))
    expect(reduce(state, { type: "replace", state: other })).toBe(other)
  })
})

describe("createId", () => {
  it("returns unique ids", () => {
    const ids = new Set(Array.from({ length: 100 }, createId))
    expect(ids.size).toBe(100)
  })
})
