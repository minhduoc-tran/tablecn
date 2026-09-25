import {
  jsonApiSerializer,
  type FieldDefinition,
  type QuerySerializer,
} from "@querycn/filter-core"
import {
  createMemoryAdapter,
  FilterProvider,
  useFilter,
  type FilterDraftValue,
} from "@querycn/filter-react"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentType } from "react"
import { describe, expect, it } from "vitest"

import { FilterRuleRow as AriaRuleRow } from "./aria/filter/filter-rule-row"
import { FilterRuleRow as BaseRuleRow } from "./base/filter/filter-rule-row"
import type {
  FilterRuleRowProps,
  FilterValueSlotProps,
} from "./radix/filter/filter-rule-row"
import { FilterRuleRow as RadixRuleRow } from "./radix/filter/filter-rule-row"

const FIELDS: FieldDefinition[] = [
  { name: "name", label: "Name", type: "text" },
  { name: "amount", label: "Amount", type: "number" },
  { name: "city", label: "Thành phố", type: "text" },
  // Only offers `eq`, which the serializer below can't send.
  { name: "flag", label: "Flag", type: "boolean" },
]

const withoutEq: QuerySerializer<unknown> = Object.assign(
  (...args: Parameters<QuerySerializer<unknown>>) =>
    jsonApiSerializer()(...args),
  { supports: (operator: string) => operator !== "eq" }
)

const url = (...rules: unknown[]) => JSON.stringify({ and: rules })

// The trigger role differs: a combobox button for Radix and Base UI, a plain button for React Aria.
const BASES: [string, ComponentType<FilterRuleRowProps>, string][] = [
  ["radix", RadixRuleRow, "combobox"],
  ["base", BaseRuleRow, "combobox"],
  ["aria", AriaRuleRow, "button"],
]

const valueRenders = new Map<string, number>()

function ValueInput({ id, rule }: FilterValueSlotProps) {
  valueRenders.set(rule.id, (valueRenders.get(rule.id) ?? 0) + 1)
  return <input id={id} aria-label={`Value ${rule.field}`} />
}

function Rows({
  Row,
  report,
}: {
  Row: ComponentType<FilterRuleRowProps>
  report: (draft: FilterDraftValue) => void
}) {
  const draft = useFilter()
  report(draft)
  return draft.state.rules.map((rule) => (
    <Row key={rule.id} rule={rule} valueInput={ValueInput} />
  ))
}

describe.each(BASES)("%s FilterRuleRow", (_, Row, triggerRole) => {
  function setup(initial: string | null = null) {
    valueRenders.clear()
    const draft = { current: undefined as unknown as FilterDraftValue }
    render(
      <FilterProvider
        fields={FIELDS}
        adapter={createMemoryAdapter(initial)}
        serializer={withoutEq}
      >
        <Rows Row={Row} report={(value) => (draft.current = value)} />
      </FilterProvider>
    )
    return { user: userEvent.setup(), draft }
  }

  const trigger = (name: RegExp) => screen.getByRole(triggerRole, { name })

  it("offers supported fields, searches ignoring accents and picks one", async () => {
    const { user, draft } = setup()
    act(() => draft.current.addRule())
    expect(screen.queryByLabelText(/^Value/)).toBeNull()

    await user.click(trigger(/select field/i))
    expect(
      (await screen.findAllByRole("option")).map((o) => o.textContent)
    ).toEqual(["Name", "Amount", "Thành phố"])

    await user.keyboard("thanh")
    await waitFor(() =>
      expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
        "Thành phố",
      ])
    )
    await user.click(screen.getByRole("option", { name: "Thành phố" }))

    expect(draft.current.state.rules[0]).toMatchObject({
      field: "city",
      operator: "contains",
    })
    expect(trigger(/select field/i).textContent).toContain("Thành phố")
    expect(screen.getByLabelText("Value city")).toBeTruthy()
  })

  it("lists supported operators and keeps an unsupported one from the URL, disabled", async () => {
    const { user } = setup(url(["amount", "eq", 5]))
    await user.click(trigger(/select operator/i))

    const options = await screen.findAllByRole("option")
    expect(options.map((o) => o.textContent)).toEqual([
      "is not",
      "is greater than",
      "is greater than or equal to",
      "is less than",
      "is less than or equal to",
      "is between",
      "is empty",
      "is not empty",
      "is",
    ])
    expect(options.at(-1)!.getAttribute("aria-disabled")).toBe("true")
  })

  it("focuses the value input after picking an operator", async () => {
    const { user, draft } = setup(url(["name", "contains", "x"]))
    await user.click(trigger(/select operator/i))
    await user.click(
      await screen.findByRole("option", { name: "does not contain" })
    )

    expect(draft.current.state.rules[0]!.operator).toBe("notContains")
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText("Value name"))
    )
  })

  it("returns focus to the trigger when closed without a pick", async () => {
    const { user } = setup(url(["name", "contains", "x"]))
    await user.click(trigger(/select operator/i))
    await screen.findAllByRole("option")
    await user.keyboard("{Escape}")
    await waitFor(() =>
      expect(document.activeElement).toBe(trigger(/select operator/i))
    )
  })

  it("keeps focus on the trigger after typeahead on the closed operator select", async () => {
    const { user, draft } = setup(url(["name", "contains", "x"]))
    act(() => trigger(/select operator/i).focus())
    await user.keyboard("d")
    await waitFor(() =>
      expect(draft.current.state.rules[0]!.operator).toBe("notContains")
    )
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(document.activeElement).toBe(trigger(/select operator/i))

    await user.click(trigger(/select operator/i))
    await screen.findAllByRole("option")
    await user.keyboard("{Escape}")
    await waitFor(() =>
      expect(document.activeElement).toBe(trigger(/select operator/i))
    )
  })

  it("doesn't switch fields on typeahead over the closed field select", async () => {
    const { user, draft } = setup(url(["name", "contains", "x"]))
    act(() => trigger(/select field/i).focus())
    await user.keyboard("a")
    expect(draft.current.state.rules[0]).toMatchObject({
      field: "name",
      value: "x",
    })
  })

  it("shows a field the list doesn't offer, with only its disabled operator", async () => {
    const { user } = setup(url(["flag", "eq", true]))
    expect(trigger(/select field/i).textContent).toContain("Flag")
    await user.click(trigger(/select operator/i))
    const options = await screen.findAllByRole("option")
    expect(
      options.map((o) => [o.textContent, o.getAttribute("aria-disabled")])
    ).toEqual([["is", "true"]])
  })

  it("re-renders only the rule that changed", () => {
    const { draft } = setup(
      url(["name", "contains", "x"], ["city", "contains", "y"])
    )
    const [first, second] = draft.current.state.rules
    const before = valueRenders.get(first!.id)
    act(() => draft.current.setValue(second!.id, "yy"))
    expect(valueRenders.get(first!.id)).toBe(before)
    expect(valueRenders.get(second!.id)).toBeGreaterThan(1)
  })

  it("removes the rule", async () => {
    const { user, draft } = setup(url(["name", "contains", "x"]))
    await user.click(screen.getByRole("button", { name: "Remove filter" }))
    expect(draft.current.state.rules).toEqual([])
  })
})
