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
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentType } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
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
afterEach(() => {
  loadCities.mockReset()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

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
  {
    name: "tags",
    label: "Tags",
    type: "multiSelect",
    options: [
      { label: "Red", value: "red" },
      { label: "Green", value: "green" },
      { label: "Blue", value: "blue" },
    ],
  },
  { name: "created", label: "Created", type: "date" },
  { name: "updated", label: "Updated", type: "datetime" },
]

const url = (...rules: unknown[]) => JSON.stringify({ and: rules })

// The trigger formats in the runtime's locale.
const dayText = (year: number, month: number, day: number) =>
  new Date(year, month, day).toLocaleDateString(undefined, {
    dateStyle: "medium",
  })

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

  it("number: keeps partial text, applies numbers and sends other text as typed", async () => {
    const { user, h } = setup(url(["amount", "gt", 1]))
    const input = screen.getByRole("textbox", { name: "Amount" })
    expect((input as HTMLInputElement).value).toBe("1")

    await user.clear(input)
    await user.type(input, "12.")
    expect((input as HTMLInputElement).value).toBe("12.")
    await user.type(input, "5")
    act(() => h.current.draft.apply())
    expect(h.current.applied.state.rules[0]!.value).toBe(12.5)

    // The backend decides what "12,5" means.
    await user.clear(input)
    await user.type(input, "12,5")
    expect(input.getAttribute("aria-invalid")).toBeNull()
    act(() => h.current.draft.apply())
    expect(h.current.applied.state.rules[0]!.value).toBe("12,5")
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

  it("multi select: toggles values, stays open and shows the extra count", async () => {
    const { user, h } = setup(url(["tags", "in", ["red"]]))
    const trigger = screen.getByRole(selectRole, { name: /Tags$/ })
    expect(trigger.textContent).toContain("Red")

    await user.click(trigger)
    await user.click(await screen.findByRole("option", { name: "Green" }))
    expect(firstRule(h).value).toEqual(["red", "green"])
    expect(screen.getByRole("option", { name: "Blue" })).toBeTruthy()
    await waitFor(() => expect(trigger.textContent).toContain("+1 more"))

    await user.click(screen.getByRole("option", { name: "Red" }))
    expect(firstRule(h).value).toEqual(["green"])
    act(() => h.current.draft.apply())
    expect(h.current.applied.state.rules[0]!.value).toEqual(["green"])
  })

  it.each([
    ["Pacific/Kiritimati", -840],
    // Daylight saving time already started on 2026-03-08.
    ["America/Los_Angeles", 420],
  ])("date: picks a day without shifting it in %s", async (tz, offset) => {
    vi.stubEnv("TZ", tz)
    expect(new Date(2026, 2, 10).getTimezoneOffset()).toBe(offset)
    const { user, h } = setup(url(["created", "eq", "2026-03-10"]))
    const trigger = screen.getByRole("button", { name: /^Created:/ })
    expect(trigger.textContent).toContain(dayText(2026, 2, 10))

    await user.click(trigger)
    await user.click(
      await screen.findByRole("button", { name: /March 15(th)?, 2026/ })
    )
    expect(firstRule(h).value).toBe("2026-03-15")
    await waitFor(() =>
      expect(trigger.textContent).toContain(dayText(2026, 2, 15))
    )
  })

  it("date: hydrates without a mismatch, then formats in the browser's locale", async () => {
    const app = (
      <FilterProvider
        fields={FIELDS}
        adapter={createMemoryAdapter(url(["created", "eq", "2026-03-10"]))}
      >
        <Rows Row={Row} report={() => {}} />
      </FilterProvider>
    )
    const container = document.createElement("div")
    document.body.append(container)
    container.innerHTML = renderToString(app)
    expect(container.textContent).toContain("2026-03-10")

    const errors = vi.spyOn(console, "error").mockImplementation(() => {})
    const onRecoverableError = vi.fn()
    const root = await act(async () =>
      hydrateRoot(container, app, { onRecoverableError })
    )
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(errors).not.toHaveBeenCalled()
    expect(container.textContent).toContain(dayText(2026, 2, 10))
    errors.mockRestore()
    act(() => root.unmount())
    container.remove()
  })

  it("date: clicking the picked day again keeps it", async () => {
    const { user, h } = setup(url(["created", "eq", "2026-03-10"]))
    await user.click(screen.getByRole("button", { name: /^Created:/ }))
    await user.click(
      await screen.findByRole("button", { name: /March 10(th)?, 2026/ })
    )
    expect(firstRule(h).value).toBe("2026-03-10")
  })

  it("datetime: shows a zoned value in local time", () => {
    vi.stubEnv("TZ", "Asia/Ho_Chi_Minh")
    setup(url(["updated", "gt", "2026-03-01T01:00:00Z"]))
    const input = screen
      .getAllByLabelText("Updated")
      .find((el): el is HTMLInputElement => el instanceof HTMLInputElement)
    expect(input?.value).toBe("2026-03-01T08:00")
  })

  it("multi select: keeps values the search hides and exposes the checked state", async () => {
    const { user, h } = setup(url(["tags", "in", ["red"]]))
    await user.click(screen.getByRole(selectRole, { name: /Tags$/ }))
    await typeInSearch(user, "gr")
    await waitFor(() =>
      expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
        "Green",
      ])
    )
    await user.click(screen.getByRole("option", { name: "Green" }))
    expect(firstRule(h).value).toEqual(["red", "green"])

    // cmdk uses aria-selected for the highlighted item, so Radix and Base UI mark picks with aria-checked.
    const state = selectRole === "button" ? "aria-selected" : "aria-checked"
    expect(
      screen.getByRole("option", { name: "Green" }).getAttribute(state)
    ).toBe("true")
  })

  it("date range: two clicks pick the start and end days", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 2, 10))
    const { user, h } = setup()
    act(() => h.current.draft.addRule("created"))
    act(() => h.current.draft.setOperator(firstRule(h).id, "between"))

    await user.click(screen.getByRole("button", { name: /^Created:/ }))
    await user.click(
      await screen.findByRole("button", { name: /March 5(th)?, 2026/ })
    )
    await user.click(
      screen.getByRole("button", { name: /March 20(th)?, 2026/ })
    )
    expect(firstRule(h).value).toEqual(["2026-03-05", "2026-03-20"])
    act(() => h.current.draft.apply())
    expect(h.current.applied.state.rules[0]!.value).toEqual([
      "2026-03-05",
      "2026-03-20",
    ])
  })

  it("datetime: local date-time inputs for a range", () => {
    const { h } = setup(
      url(["updated", "between", ["2026-03-01T08:00", "2026-03-02T09:30"]])
    )
    const from = screen.getByLabelText("Updated From") as HTMLInputElement
    expect(from.type).toBe("datetime-local")
    expect(from.value).toBe("2026-03-01T08:00")

    fireEvent.change(from, { target: { value: "2026-03-01T07:15" } })
    act(() => h.current.draft.apply())
    expect(h.current.applied.state.rules[0]!.value).toEqual([
      "2026-03-01T07:15",
      "2026-03-02T09:30",
    ])
  })

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
