import { djangoSerializer, type FilterRule } from "@querycn/filter-core"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { createMemoryAdapter } from "./adapters/memory-adapter"
import { FilterProvider } from "./filter-provider"
import { FIELDS } from "./filter-provider-test-utils"
import { useFilter } from "./use-filter"
import { useRuleWarnings } from "./use-rule-warnings"

afterEach(cleanup)

interface Harness {
  draft: ReturnType<typeof useFilter>
  /** Per draft rule, in order. */
  warnings: (readonly string[])[]
}

function RuleProbe({ rule, into }: { rule: FilterRule; into: Harness }) {
  into.warnings.push(useRuleWarnings(rule))
  return null
}

function Probe({ into }: { into: Harness }) {
  const draft = useFilter()
  Object.assign(into, { draft, warnings: [] })
  return draft.state.rules.map((rule) => (
    <RuleProbe key={rule.id} rule={rule} into={into} />
  ))
}

function setup(url: string | null = null) {
  const harness = {} as Harness
  render(
    <FilterProvider
      fields={FIELDS}
      adapter={createMemoryAdapter(url)}
      serializer={djangoSerializer()}
    >
      <Probe into={harness} />
    </FilterProvider>
  )
  return { result: { current: harness } }
}

describe("useRuleWarnings", () => {
  it("flags a reversed range while editing", () => {
    const { result } = setup()
    act(() => result.current.draft.addRule("amount"))
    const { id } = result.current.draft.state.rules[0]!
    act(() => result.current.draft.setOperator(id, "between"))
    act(() => result.current.draft.setValue(id, ["10", "1"]))
    expect(result.current.warnings).toEqual([["reversedRange"]])
    act(() => result.current.draft.setValue(id, ["1", "10"]))
    expect(result.current.warnings).toEqual([[]])
  })

  it("shows serializer issues only after apply", () => {
    const { result } = setup()
    act(() => result.current.draft.addRule("status"))
    act(() => result.current.draft.addRule("status"))
    const [a, b] = result.current.draft.state.rules
    act(() => result.current.draft.setValue(a!.id, "active"))
    act(() => result.current.draft.setValue(b!.id, "archived"))
    expect(result.current.warnings).toEqual([[], []])

    act(() => result.current.draft.apply())
    expect(result.current.warnings).toEqual([[], ["conflict"]])
  })

  it("drops a serializer issue once the rule is edited", () => {
    const { result } = setup(
      '{"and":[["status","eq","active"],["status","eq","archived"]]}'
    )
    expect(result.current.warnings).toEqual([[], ["conflict"]])
    act(() => result.current.draft.setValue("u1", "active"))
    expect(result.current.warnings).toEqual([[], []])
    // Back to what was applied: the issue holds again.
    act(() => result.current.draft.setValue("u1", "archived"))
    expect(result.current.warnings).toEqual([[], ["conflict"]])
  })

  it("drops a conflict once an earlier rule or the join changes", () => {
    const { result } = setup(
      '{"and":[["status","eq","active"],["status","eq","archived"]]}'
    )
    act(() => result.current.draft.removeRule("u0"))
    expect(result.current.warnings).toEqual([[]])
    act(() => result.current.draft.discard())
    expect(result.current.warnings).toEqual([[], ["conflict"]])

    act(() => result.current.draft.setField("u0", "name"))
    expect(result.current.warnings).toEqual([[], []])
    act(() => result.current.draft.discard())
    act(() => result.current.draft.setJoin("or"))
    expect(result.current.warnings).toEqual([[], []])
  })

  it("keeps an unsupported applied rule flagged", () => {
    const { result } = setup('{"and":[["name","ne","x"]]}')
    expect(result.current.warnings).toEqual([["unsupported"]])
  })
})
