import {
  BUILTIN_FIELD_TYPES,
  createRegistry,
  type FieldDefinition,
  type SelectOption,
} from "@querycn/filter-core"
import {
  clearFieldOptionsCache,
  createMemoryAdapter,
  FilterProvider,
  useAppliedFilter,
  useFilter,
  type AppliedFilterValue,
  type FilterDraftValue,
} from "@querycn/filter-react"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentType } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type {
  FilterRuleRowProps,
  FilterValueSlotProps,
} from "./radix/filter/filter-rule-row"
import { FilterRuleRow as AriaRuleRow } from "./aria/filter/filter-rule-row"
import * as ariaInputs from "./aria/filter/filter-value-input"
import { FilterRuleRow as BaseRuleRow } from "./base/filter/filter-rule-row"
import * as baseInputs from "./base/filter/filter-value-input"
import { FilterRuleRow as RadixRuleRow } from "./radix/filter/filter-rule-row"
import {
  FilterValueInput as RadixValueInput,
  filterValueInputs as radixInputs,
} from "./radix/filter/filter-value-input"

type ValueInputModule = {
  FilterValueInput: ComponentType<
    FilterValueSlotProps & { inputs?: typeof radixInputs }
  >
  filterValueInputs: typeof radixInputs
}

// Trigger role for a Select: combobox for Radix and Base UI, button for React Aria,
// which also names it "<value> <label>", hence the `/Label$/` queries.
const BASES: [
  string,
  ComponentType<FilterRuleRowProps>,
  ValueInputModule,
  string,
][] = [
  [
    "radix",
    RadixRuleRow,
    { FilterValueInput: RadixValueInput, filterValueInputs: radixInputs },
    "combobox",
  ],
  ["base", BaseRuleRow, baseInputs, "combobox"],
  ["aria", AriaRuleRow, ariaInputs, "button"],
]

const STATUS_OPTIONS: SelectOption[] = [
  { label: "Active", value: "active" },
  { label: "Archived", value: "archived" },
]

const loadCities = vi.fn(async (search: string) =>
  [
    { label: "Đà Nẵng", value: "dn" },
    { label: "Hà Nội", value: "hn" },
  ].filter((c) => c.label.toLowerCase().includes(search.toLowerCase()))
)
const resolveCities = vi.fn(async (values: string[]) =>
  values.map((value) => ({ label: `City ${value}`, value }))
)

// Back to the default implementation, so a leftover `…Once` can't leak into the next base.
afterEach(() => loadCities.mockReset())

const FIELDS: FieldDefinition[] = [
  { name: "name", label: "Name", type: "text" },
  { name: "amount", label: "Amount", type: "number" },
  { name: "active", label: "Active", type: "boolean" },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
  {
    name: "city",
    label: "City",
    type: "select",
    loadOptions: loadCities,
    resolveLabels: resolveCities,
  },
]

const url = (...rules: unknown[]) => JSON.stringify({ and: rules })

// Popups move focus to their search input a frame after opening; type once it's there.
async function typeInSearch(
  user: ReturnType<typeof userEvent.setup>,
  text: string
) {
  await waitFor(() => expect(document.activeElement?.tagName).toBe("INPUT"))
  await user.keyboard(text)
}

interface Harness {
  draft: FilterDraftValue
  applied: AppliedFilterValue<unknown>
}

function Rows({
  Row,
  report,
  valueInput,
}: {
  Row: ComponentType<FilterRuleRowProps>
  report: (harness: Harness) => void
  valueInput?: FilterRuleRowProps["valueInput"]
}) {
  const draft = useFilter()
  report({ draft, applied: useAppliedFilter() })
  return draft.state.rules.map((rule) => (
    <Row key={rule.id} rule={rule} valueInput={valueInput} />
  ))
}

describe.each(BASES)("%s value inputs", (_, Row, inputs, selectRole) => {
  function setup(initial: string | null = null, fields = FIELDS) {
    clearFieldOptionsCache()
    const h = { current: undefined as unknown as Harness }
    render(
      <FilterProvider fields={fields} adapter={createMemoryAdapter(initial)}>
        <Rows Row={Row} report={(value) => (h.current = value)} />
      </FilterProvider>
    )
    return { user: userEvent.setup(), h }
  }

  const firstRule = (h: { current: Harness }) => h.current.draft.state.rules[0]!

  it("text: types into the draft and applies", async () => {
    const { user, h } = setup(url(["name", "contains", "a"]))
    const input = screen.getByRole("textbox", { name: "Name" })
    await user.clear(input)
    await user.type(input, "acme")
    expect(firstRule(h).value).toBe("acme")
    act(() => h.current.draft.apply())
    expect(h.current.applied.state.rules[0]!.value).toBe("acme")
  })

  it("number: keeps partial text, flags what can't parse, applies a number", async () => {
    const { user, h } = setup(url(["amount", "gt", 1]))
    const input = screen.getByRole("textbox", { name: "Amount" })
    expect((input as HTMLInputElement).value).toBe("1")

    await user.clear(input)
    await user.type(input, "12.")
    expect((input as HTMLInputElement).value).toBe("12.")
    expect(input.getAttribute("aria-invalid")).toBeNull()

    await user.type(input, "x")
    expect(input.getAttribute("aria-invalid")).toBe("true")

    await user.clear(input)
    await user.type(input, "12.5")
    act(() => h.current.draft.apply())
    expect(h.current.applied.state.rules[0]!.value).toBe(12.5)
  })

  it("number range: two inputs, applied as numbers", async () => {
    const { user, h } = setup(url(["amount", "between", [1, 5]]))
    const from = screen.getByRole("textbox", { name: "Amount From" })
    const to = screen.getByRole("textbox", { name: "Amount To" })
    expect([
      (from as HTMLInputElement).value,
      (to as HTMLInputElement).value,
    ]).toEqual(["1", "5"])

    await user.clear(to)
    await user.type(to, "9")
    expect(firstRule(h).value).toEqual(["1", "9"])
    act(() => h.current.draft.apply())
    expect(h.current.applied.state.rules[0]!.value).toEqual([1, 9])
  })

  it("boolean: picks yes or no", async () => {
    const { user, h } = setup(url(["active", "eq", true]))
    const trigger = screen.getByRole(selectRole, { name: /Active$/ })
    expect(trigger.textContent).toContain("Yes")
    await user.click(trigger)
    await user.click(await screen.findByRole("option", { name: "No" }))
    expect(firstRule(h).value).toBe(false)
  })

  it("select: shows the label, searches static options and picks one", async () => {
    const { user, h } = setup(url(["status", "eq", "active"]))
    const trigger = screen.getByRole(selectRole, { name: /Status$/ })
    expect(trigger.textContent).toContain("Active")

    await user.click(trigger)
    await typeInSearch(user, "arch")
    await waitFor(() =>
      expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
        "Archived",
      ])
    )
    await user.click(screen.getByRole("option", { name: "Archived" }))
    expect(firstRule(h).value).toBe("archived")
    expect(trigger.textContent).toContain("Archived")
  })

  it("select: loads options, resolves the current label, retries after an error", async () => {
    loadCities.mockRejectedValueOnce(new Error("offline"))
    const { user, h } = setup(url(["city", "eq", "hn"]))
    const trigger = screen.getByRole(selectRole, { name: /City$/ })
    await waitFor(() => expect(trigger.textContent).toContain("City hn"))

    await user.click(trigger)
    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Couldn't load options")
    await user.click(screen.getByRole("button", { name: "Retry" }))

    await user.click(await screen.findByRole("option", { name: "Đà Nẵng" }))
    expect(firstRule(h).value).toBe("dn")
  })

  it("keeps the value across operators of the same arity, clears it otherwise", async () => {
    const { user, h } = setup(url(["amount", "between", [1, 5]]))
    await user.click(screen.getByRole(selectRole, { name: /select operator/i }))
    await user.click(
      await screen.findByRole("option", { name: "is greater than" })
    )
    expect(firstRule(h).value).toBeNull()
    const input = screen.getByRole("textbox", { name: "Amount" })
    await user.type(input, "3")

    await user.click(screen.getByRole(selectRole, { name: /select operator/i }))
    await user.click(
      await screen.findByRole("option", { name: "is less than" })
    )
    expect(firstRule(h).value).toBe("3")
  })

  it("isn't dirty after retyping the applied value", async () => {
    const { user, h } = setup(url(["amount", "gt", 1]))
    const input = screen.getByRole("textbox", { name: "Amount" })
    await user.clear(input)
    await user.type(input, "1")
    expect(firstRule(h).value).toBe("1")
    expect(h.current.draft.isDirty).toBe(false)
  })

  it("flags the empty side of a half-filled range, not a number being typed", async () => {
    const { user } = setup(url(["amount", "between", [1, 5]]))
    const from = screen.getByRole("textbox", { name: "Amount From" })
    const to = screen.getByRole("textbox", { name: "Amount To" })
    await user.clear(from)
    expect(from.getAttribute("aria-invalid")).toBe("true")
    expect(to.getAttribute("aria-invalid")).toBeNull()

    await user.type(from, "-")
    expect(from.getAttribute("aria-invalid")).toBeNull()
  })

  it("shows loading over the previous list while a search loads", async () => {
    const { user } = setup(url(["city", "eq", "dn"]))
    await user.click(screen.getByRole(selectRole, { name: /City$/ }))
    await screen.findByRole("option", { name: "Hà Nội" })

    let resolve: (options: SelectOption[]) => void = () => {}
    const next = new Promise<SelectOption[]>((r) => (resolve = r))
    loadCities.mockImplementation(() => next)
    await typeInSearch(user, "n")
    expect((await screen.findByRole("status")).textContent).toBe("Loading…")
    expect(screen.getByRole("option", { name: "Đà Nẵng" })).toBeTruthy()

    await act(async () => resolve([{ label: "Nam Định", value: "nd" }]))
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull())
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Nam Định",
    ])
  })

  it.each([
    [
      "name",
      "contains",
      "x",
      "does not contain",
      () => screen.getByRole("textbox", { name: "Name" }),
    ],
    [
      "amount",
      "gt",
      1,
      "is between",
      () => screen.getByRole("textbox", { name: "Amount From" }),
    ],
  ] as const)(
    "focuses the %s input after picking an operator",
    async (field, operator, value, next, target) => {
      const { user } = setup(url([field, operator, value]))
      await user.click(
        screen.getByRole(selectRole, { name: /select operator/i })
      )
      await user.click(await screen.findByRole("option", { name: next }))
      await waitFor(() => expect(document.activeElement).toBe(target()))
    }
  )

  it("falls back to a text input for a type without one, and takes overrides", () => {
    const registry = createRegistry({
      fieldTypes: [{ ...BUILTIN_FIELD_TYPES.text, id: "tag" }],
    })
    const fields: FieldDefinition[] = [
      { name: "tag", label: "Tag", type: "tag" },
    ]
    const app = (valueInput?: FilterRuleRowProps["valueInput"]) => (
      <FilterProvider
        fields={fields}
        registry={registry}
        adapter={createMemoryAdapter(url(["tag", "contains", "x"]))}
      >
        <Rows Row={Row} report={() => {}} valueInput={valueInput} />
      </FilterProvider>
    )

    const { unmount } = render(app())
    expect(screen.getByRole("textbox", { name: "Tag" })).toBeTruthy()
    unmount()

    function TagInput({ id }: FilterValueSlotProps) {
      return <input id={id} aria-label="custom tag" />
    }
    const custom = { ...inputs.filterValueInputs, tag: TagInput }
    function CustomValueInput(props: FilterValueSlotProps) {
      return <inputs.FilterValueInput {...props} inputs={custom} />
    }
    render(app(CustomValueInput))
    expect(screen.getByRole("textbox", { name: "custom tag" })).toBeTruthy()
  })

  it("focuses the value input after picking an operator", async () => {
    const { user } = setup(url(["status", "eq", "active"]))
    await user.click(screen.getByRole(selectRole, { name: /select operator/i }))
    await user.click(await screen.findByRole("option", { name: "is not" }))
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole(selectRole, { name: /Status$/ })
      )
    )
  })

  it("starts a new field with a fresh input", async () => {
    const { user, h } = setup(url(["name", "contains", "abc"]))
    await user.click(screen.getByRole(selectRole, { name: /select field/i }))
    await user.click(await screen.findByRole("option", { name: "Amount" }))
    expect(firstRule(h)).toMatchObject({ field: "amount", value: null })
    expect(
      (screen.getByRole("textbox", { name: "Amount" }) as HTMLInputElement)
        .value
    ).toBe("")
  })
})
