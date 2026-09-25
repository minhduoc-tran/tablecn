import {
  jsonApiSerializer,
  type FieldDefinition,
  type QuerySerializer,
} from "@querycn/filter-core"
import { act, cleanup, render, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { createMemoryAdapter } from "./adapters/memory-adapter"
import { FilterProvider } from "./filter-provider"
import { FIELDS } from "./filter-provider-test-utils"
import { useFilter } from "./use-filter"
import { useFilterActions } from "./use-filter-actions"
import { useFilterRule } from "./use-filter-rule"

afterEach(cleanup)

const FLAG: FieldDefinition = { name: "flag", label: "Flag", type: "boolean" }

// Sends everything except `eq`, so `boolean` (eq only) has nothing to offer.
const withoutEq: QuerySerializer<unknown> = Object.assign(
  (...args: Parameters<QuerySerializer<unknown>>) =>
    jsonApiSerializer()(...args),
  { supports: (operator: string) => operator !== "eq" }
)

interface Harness {
  draft: ReturnType<typeof useFilter>
  actions: ReturnType<typeof useFilterActions>
  rule?: ReturnType<typeof useFilterRule>
}

function RuleProbe({ into }: { into: Harness }) {
  const rule = useFilterRule(into.draft.state.rules[0]!)
  Object.assign(into, { rule })
  return null
}

function Probe({ into }: { into: Harness }) {
  const draft = useFilter()
  Object.assign(into, { draft, actions: useFilterActions(), rule: undefined })
  return draft.state.rules.length > 0 ? <RuleProbe into={into} /> : null
}

function setup(url: string | null = null, serializer = withoutEq) {
  const harness = {} as Harness
  render(
    <FilterProvider
      fields={[...FIELDS, FLAG]}
      adapter={createMemoryAdapter(url)}
      serializer={serializer}
    >
      <Probe into={harness} />
    </FilterProvider>
  )
  return { result: { current: harness } }
}

describe("useFilterRule", () => {
  it("offers only fields and operators the serializer supports", () => {
    const { result } = setup()
    act(() => result.current.draft.addRule("status"))
    const rule = result.current.rule!

    expect(rule.fields.map((f) => f.name)).toEqual(["name", "amount", "status"])
    expect(rule.operators.map((o) => o.id)).toEqual([
      "ne",
      "isEmpty",
      "isNotEmpty",
    ])
    expect(rule.operators[0]).toEqual({
      id: "ne",
      label: "is not",
      supported: true,
    })
    // The select default `eq` is unsupported, so the first supported one is used.
    expect(result.current.draft.state.rules[0]!.operator).toBe("ne")
    expect(rule.arity).toBe("single")
  })

  it("keeps an unsupported operator from the URL, flagged", () => {
    const { result } = setup('{"and":[["status","eq","active"]]}')
    expect(result.current.rule!.operators.at(-1)).toEqual({
      id: "eq",
      label: "is",
      supported: false,
    })
  })

  it("edits its own rule", () => {
    const { result } = setup(null, jsonApiSerializer())
    act(() => result.current.draft.addRule())
    expect(result.current.rule!.field).toBeUndefined()
    expect(result.current.rule!.operators).toEqual([])
    expect(result.current.rule!.arity).toBeNull()

    act(() => result.current.rule!.setField("amount"))
    act(() => result.current.rule!.setOperator("between"))
    expect(result.current.rule!.arity).toBe("range")
    act(() => result.current.rule!.setValue([1, 5]))
    expect(result.current.draft.state.rules[0]).toMatchObject({
      field: "amount",
      operator: "between",
      value: [1, 5],
    })

    act(() => result.current.rule!.remove())
    expect(result.current.draft.state.rules).toEqual([])
  })
})

describe("useFilterActions", () => {
  it("keeps its identity while the draft changes", () => {
    const { result } = setup()
    const actions = result.current.actions
    act(() => result.current.draft.addRule("name"))
    act(() =>
      result.current.draft.setValue(
        result.current.draft.state.rules[0]!.id,
        "x"
      )
    )
    expect(result.current.actions).toBe(actions)
  })

  it("throws outside a provider", () => {
    expect(() => renderHook(() => useFilterActions())).toThrow(
      "useFilterActions must be used inside <FilterProvider>"
    )
  })
})
