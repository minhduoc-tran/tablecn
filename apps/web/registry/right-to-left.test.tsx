import { DirectionProvider } from "@base-ui/react/direction-provider"
import type { FieldDefinition } from "@querycn/filter-core"
import { createMemoryAdapter, FilterProvider } from "@querycn/filter-react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Direction } from "radix-ui"
import type { ComponentType, ReactNode } from "react"
import { describe, expect, it } from "vitest"

import { FilterBuilder as BaseBuilder } from "./base/filter/filter-builder"
import { FilterBuilder as RadixBuilder } from "./radix/filter/filter-builder"

const FIELDS: FieldDefinition[] = [
  { name: "created", label: "Created", type: "date" },
]

type Provider = ComponentType<{ children: ReactNode }>

// React Aria reads the direction from `I18nProvider`'s locale on its own.
const BASES: [string, ComponentType, Provider][] = [
  [
    "radix",
    RadixBuilder,
    ({ children }) => (
      <Direction.Provider dir="rtl">{children}</Direction.Provider>
    ),
  ],
  [
    "base",
    BaseBuilder,
    ({ children }) => (
      <DirectionProvider direction="rtl">{children}</DirectionProvider>
    ),
  ],
]

describe.each(BASES)("%s right-to-left", (_, Builder, Rtl) => {
  it("opens popovers and calendars in the library's direction", async () => {
    const user = userEvent.setup()
    render(
      <Rtl>
        <FilterProvider
          fields={FIELDS}
          adapter={createMemoryAdapter("?created__gt=2026-03-05")}
        >
          <Builder />
        </FilterProvider>
      </Rtl>
    )
    await user.click(screen.getByRole("button", { name: /^Filter/ }))
    const panel = await screen.findByRole("form", { name: "Filter" })
    // Portalled out of any `dir` wrapper, so it carries the direction itself.
    expect(panel.closest("[dir]")?.getAttribute("dir")).toBe("rtl")

    await user.click(screen.getByRole("button", { name: /^Created: / }))
    await waitFor(() =>
      expect(
        document.querySelector(".rdp-root, [data-slot=calendar]")
      ).not.toBeNull()
    )
    const calendar = document.querySelector(".rdp-root, [data-slot=calendar]")!
    expect(calendar.closest("[dir]")?.getAttribute("dir")).toBe("rtl")
  })
})
