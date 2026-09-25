import {
  djangoSerializer,
  type FieldDefinition,
  type QuerySerializer,
} from "@querycn/filter-core"
import {
  clearFieldOptionsCache,
  createMemoryAdapter,
  FilterProvider,
  type UrlStateAdapter,
} from "@querycn/filter-react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentType, FormEvent } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { FilterBuilder as AriaBuilder } from "./aria/filter/filter-builder"
import { FilterBuilderPanel as AriaPanel } from "./aria/filter/filter-builder-panel"
import { FilterChips as AriaChips } from "./aria/filter/filter-chips"
import { FilterBuilder as BaseBuilder } from "./base/filter/filter-builder"
import { FilterBuilderPanel as BasePanel } from "./base/filter/filter-builder-panel"
import { FilterChips as BaseChips } from "./base/filter/filter-chips"
import { FilterBuilder as RadixBuilder } from "./radix/filter/filter-builder"
import { FilterBuilderPanel as RadixPanel } from "./radix/filter/filter-builder-panel"
import { FilterChips as RadixChips } from "./radix/filter/filter-chips"

const FIELDS: FieldDefinition[] = [
  { name: "name", label: "Name", type: "text" },
  { name: "amount", label: "Amount", type: "number" },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Active", value: "active" },
      { label: "Archived", value: "archived" },
    ],
  },
  {
    name: "tags",
    label: "Tags",
    type: "multiSelect",
    options: [
      { label: "Red", value: "red" },
      { label: "Blue", value: "blue" },
    ],
  },
  { name: "flag", label: "Flag", type: "boolean" },
  { name: "created", label: "Created", type: "date" },
]

const url = (...rules: unknown[]) => JSON.stringify({ and: rules })

const dayText = (year: number, month: number, day: number) =>
  new Date(year, month, day).toLocaleDateString(undefined, {
    dateStyle: "medium",
  })

async function typeInSearch(
  user: ReturnType<typeof userEvent.setup>,
  text: string
) {
  await waitFor(() => expect(document.activeElement?.tagName).toBe("INPUT"))
  await user.keyboard(text)
}

// Select triggers are combobox buttons for Radix and Base UI, plain buttons for React Aria.
const BASES: [string, ComponentType, ComponentType, string, ComponentType][] = [
  ["radix", RadixBuilder, RadixChips, "combobox", RadixPanel],
  ["base", BaseBuilder, BaseChips, "combobox", BasePanel],
  ["aria", AriaBuilder, AriaChips, "button", AriaPanel],
]

beforeEach(() => clearFieldOptionsCache())

describe.each(BASES)(
  "%s FilterBuilder",
  (_, Builder, Chips, selectRole, Panel) => {
    function setup(
      initial: string | null = null,
      {
        serializer,
        maxRules,
        adapter = createMemoryAdapter(initial),
      }: {
        serializer?: QuerySerializer<unknown>
        maxRules?: number
        adapter?: UrlStateAdapter
      } = {}
    ) {
      const view = render(
        <FilterProvider
          fields={FIELDS}
          adapter={adapter}
          serializer={serializer}
          maxRules={maxRules}
        >
          <Builder />
          <Chips />
        </FilterProvider>
      )
      return { user: userEvent.setup(), adapter, ...view }
    }

    const trigger = () => screen.getByRole("button", { name: /^Filter/ })
    const panel = () => screen.queryByRole("form", { name: "Filter" })
    const button = (name: string | RegExp) =>
      within(panel()!).getByRole("button", { name })
    const chips = () =>
      Array.from(
        document.querySelectorAll("[data-slot=filter-chip] [title]")
      ).map((chip) => chip.getAttribute("title"))

    async function open(user: ReturnType<typeof userEvent.setup>) {
      await user.click(trigger())
      return waitFor(() => expect(panel()).toBeTruthy())
    }

    it("adds, fills and applies with Enter; the filter survives a reload", async () => {
      const { user, adapter, unmount } = setup()
      expect(trigger().textContent).toBe("Filter")
      await open(user)
      // An empty filter opens with a rule to fill in.
      expect(within(panel()!).getByText("Where")).toBeTruthy()
      expect(button("Apply").hasAttribute("disabled")).toBe(true)

      await user.click(screen.getByRole(selectRole, { name: /select field/i }))
      await typeInSearch(user, "nam")
      await user.click(await screen.findByRole("option", { name: "Name" }))
      await user.type(
        screen.getByRole("textbox", { name: "Name" }),
        "acme{Enter}"
      )

      expect(adapter.read()).toBe(url(["name", "contains", "acme"]))
      await waitFor(() => expect(panel()).toBeNull())
      expect(trigger().textContent).toContain("1 filter")
      expect(chips()).toEqual(["Name contains acme"])

      unmount()
      setup(adapter.read())
      expect(trigger().textContent).toContain("1 filter")
      expect(chips()).toEqual(["Name contains acme"])
    })

    it("drops unapplied edits when closed", async () => {
      const { user, adapter } = setup(url(["name", "contains", "a"]))
      await open(user)
      await user.type(screen.getByRole("textbox", { name: "Name" }), "bc")
      expect(button("Apply").hasAttribute("disabled")).toBe(false)
      await user.keyboard("{Escape}")
      await waitFor(() => expect(panel()).toBeNull())
      expect(adapter.read()).toBe(url(["name", "contains", "a"]))

      await open(user)
      expect(
        (screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement)
          .value
      ).toBe("a")
    })

    it("has Apply as its only submit button", async () => {
      const { user } = setup(
        url(
          ["amount", "between", [10, 1]],
          ["status", "eq", "active"],
          ["tags", "in", ["red"]],
          ["flag", "eq", true],
          ["created", "between", ["2026-03-01", "2026-03-05"]]
        )
      )
      await open(user)
      const submits = panel()!.querySelectorAll(
        "button[type=submit], button:not([type])"
      )
      expect(Array.from(submits).map((b) => b.textContent)).toEqual(["Apply"])
    })

    it("doesn't submit a form it's rendered in", async () => {
      const onSubmit = vi.fn((event: FormEvent) => event.preventDefault())
      const adapter = createMemoryAdapter(url(["name", "contains", "a"]))
      render(
        <form onSubmit={onSubmit}>
          <FilterProvider fields={FIELDS} adapter={adapter}>
            <Builder />
            <Chips />
          </FilterProvider>
        </form>
      )
      const user = userEvent.setup()
      await open(user)
      await user.type(screen.getByRole("textbox", { name: "Name" }), "b{Enter}")
      expect(adapter.read()).toBe(url(["name", "contains", "ab"]))
      await user.click(
        screen.getByRole("button", { name: "Remove filter: Name contains ab" })
      )
      expect(adapter.read()).toBeNull()
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it("keeps focus in a standalone panel after Apply", async () => {
      const adapter = createMemoryAdapter(url(["name", "contains", "a"]))
      render(
        <FilterProvider fields={FIELDS} adapter={adapter}>
          <Panel />
        </FilterProvider>
      )
      const user = userEvent.setup()
      const name = screen.getByRole("textbox", { name: "Name" })
      await user.type(name, "b{Enter}")
      expect(adapter.read()).toBe(url(["name", "contains", "ab"]))
      expect(document.activeElement).toBe(name)

      // A new rule gets a positional id on apply, so its row remounts and the input goes away.
      await user.click(button("Add filter"))
      await user.click(document.activeElement as HTMLElement)
      await typeInSearch(user, "amo")
      await user.click(await screen.findByRole("option", { name: "Amount" }))
      await user.type(
        screen.getByRole("textbox", { name: "Amount" }),
        "5{Enter}"
      )
      expect(adapter.read()).toBe(
        url(["name", "contains", "ab"], ["amount", "eq", 5])
      )
      await waitFor(() =>
        expect(document.activeElement).toBe(button("Add filter"))
      )
    })

    it("switches AND/OR on the second rule", async () => {
      const { user, adapter } = setup(
        url(["name", "contains", "a"], ["amount", "gt", 1])
      )
      await open(user)
      await user.click(
        screen.getByRole(selectRole, { name: /combine filters with/i })
      )
      await user.click(await screen.findByRole("option", { name: "or" }))
      await user.click(button("Apply"))
      expect(JSON.parse(adapter.read()!)).toEqual({
        or: [
          ["name", "contains", "a"],
          ["amount", "gt", 1],
        ],
      })
      expect(screen.getByText("or")).toBeTruthy()
    })

    it("adds a rule and focuses its field; stops at maxRules", async () => {
      const { user } = setup(url(["name", "contains", "a"]), { maxRules: 2 })
      await open(user)
      await user.click(button("Add filter"))
      await waitFor(() =>
        expect(
          document.activeElement?.closest("[data-slot=filter-rule-row]")
        ).toBe(document.querySelectorAll("[data-slot=filter-rule-row]")[1])
      )
      expect(document.activeElement?.textContent).toMatch(/select field/i)
      expect(button("Add filter").hasAttribute("disabled")).toBe(true)
    })

    it("clears and applies at once, keeping focus in the panel", async () => {
      const { user, adapter } = setup(url(["name", "contains", "a"]))
      await open(user)
      await user.click(button("Clear all"))
      expect(adapter.read()).toBeNull()
      expect(within(panel()!).getByText("No filters yet")).toBeTruthy()
      await waitFor(() =>
        expect(document.activeElement).toBe(button("Add filter"))
      )
    })

    it("warns about a reversed range without blocking Apply", async () => {
      const { user, adapter } = setup(url(["amount", "between", [10, 1]]))
      await open(user)
      const warning = "The start of the range is after its end"
      // Opens on press, so touch screens can read it too.
      await user.click(button(warning))
      await waitFor(() =>
        expect(screen.getByText(warning, { selector: "p" })).toBeTruthy()
      )
      await user.keyboard("{Escape}")
      await waitFor(() =>
        expect(screen.queryByText(warning, { selector: "p" })).toBeNull()
      )
      expect(panel()).toBeTruthy()
      const to = screen.getByRole("textbox", { name: "Amount To" })
      await user.clear(to)
      await user.type(to, "2")
      await user.click(button("Apply"))
      expect(adapter.read()).toBe(url(["amount", "between", [10, 2]]))
    })

    it("flags rules the server ignores or may drop, on rows and chips", async () => {
      const { user } = setup(
        url(
          ["name", "ne", "x"],
          ["status", "eq", "active"],
          ["status", "eq", "archived"]
        ),
        { serializer: djangoSerializer() }
      )
      const unsupported = "The server can't apply this filter, so it is ignored"
      const conflict =
        "Another filter already uses this field; the server may ignore one of them"
      const chipList = document.querySelectorAll("[data-slot=filter-chip]")
      expect(
        within(chipList[0] as HTMLElement).getByRole("button", {
          name: unsupported,
        })
      ).toBeTruthy()
      expect(
        chipList[0]!
          .querySelector("[title]")!
          .className.includes("line-through")
      ).toBe(true)
      expect(
        within(chipList[2] as HTMLElement).getByRole("button", {
          name: conflict,
        })
      ).toBeTruthy()

      await open(user)
      const rows = panel()!.querySelectorAll("[data-slot=filter-rule-row]")
      expect(
        within(rows[0] as HTMLElement).getByRole("button", {
          name: unsupported,
        })
      ).toBeTruthy()
      expect(
        within(rows[2] as HTMLElement).getByRole("button", { name: conflict })
      ).toBeTruthy()
      expect(
        within(rows[1] as HTMLElement).queryByRole("button", { name: conflict })
      ).toBeNull()

      // Without the rule it clashed with, the conflict no longer holds.
      await user.click(
        within(rows[1] as HTMLElement).getByRole("button", {
          name: "Remove filter",
        })
      )
      expect(
        within(panel()!).queryByRole("button", { name: conflict })
      ).toBeNull()
      expect(
        within(panel()!).getByRole("button", { name: unsupported })
      ).toBeTruthy()
    })

    it("describes applied rules in words", async () => {
      setup(
        url(
          ["status", "eq", "active"],
          ["tags", "in", ["red", "blue"]],
          ["flag", "eq", true],
          ["amount", "between", [1, 5]],
          ["created", "eq", "2026-03-01"],
          ["name", "isEmpty", null]
        )
      )
      await waitFor(() =>
        expect(chips()).toEqual([
          "Status is Active",
          "Tags is any of Red, Blue",
          "Flag is Yes",
          "Amount is between 1 – 5",
          `Created is on ${dayText(2026, 2, 1)}`,
          "Name is empty",
        ])
      )
    })

    it("removes a rule from its chip and focuses the next chip", async () => {
      const { user, adapter } = setup(
        url(["name", "contains", "a"], ["amount", "gt", 1])
      )
      await user.click(
        screen.getByRole("button", { name: "Remove filter: Name contains a" })
      )
      expect(adapter.read()).toBe(url(["amount", "gt", 1]))
      expect(trigger().textContent).toContain("1 filter")
      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole("button", {
            name: "Remove filter: Amount is greater than 1",
          })
        )
      )

      // Removing the only chip removes the list.
      await user.click(
        screen.getByRole("button", {
          name: "Remove filter: Amount is greater than 1",
        })
      )
      expect(adapter.read()).toBeNull()
      expect(document.querySelector("[data-slot=filter-chips]")).toBeNull()
    })

    it("moves focus to the previous chip when the last one is removed", async () => {
      const { user, adapter } = setup(
        url(["name", "contains", "a"], ["amount", "gt", 1])
      )
      await user.click(
        screen.getByRole("button", {
          name: "Remove filter: Amount is greater than 1",
        })
      )
      expect(adapter.read()).toBe(url(["name", "contains", "a"]))
      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole("button", { name: "Remove filter: Name contains a" })
        )
      )
    })
  }
)
