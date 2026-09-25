import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState, type ComponentType } from "react"
import type { Selection } from "react-aria-components"
import { describe, expect, it } from "vitest"

import { Button as AriaButton } from "@/registry/aria/ui/button"
import * as AriaMenu from "@/registry/aria/ui/dropdown-menu"
import { Separator as AriaSeparator } from "@/registry/aria/ui/separator"
import { Skeleton as AriaSkeleton } from "@/registry/aria/ui/skeleton"
import * as AriaTable from "@/registry/aria/ui/table"
import * as AriaTooltip from "@/registry/aria/ui/tooltip"
import { Button as BaseButton } from "@/registry/base/ui/button"
import * as BaseMenu from "@/registry/base/ui/dropdown-menu"
import { Separator as BaseSeparator } from "@/registry/base/ui/separator"
import { Skeleton as BaseSkeleton } from "@/registry/base/ui/skeleton"
import * as BaseTable from "@/registry/base/ui/table"
import * as BaseTooltip from "@/registry/base/ui/tooltip"
import { Button as RadixButton } from "@/registry/radix/ui/button"
import * as RadixMenu from "@/registry/radix/ui/dropdown-menu"
import { Separator as RadixSeparator } from "@/registry/radix/ui/separator"
import { Skeleton as RadixSkeleton } from "@/registry/radix/ui/skeleton"
import * as RadixTable from "@/registry/radix/ui/table"
import * as RadixTooltip from "@/registry/radix/ui/tooltip"

// A column menu, as the table UI will build it with each library.
function RadixColumns() {
  const [visible, setVisible] = useState(true)
  return (
    <RadixMenu.DropdownMenu>
      <RadixMenu.DropdownMenuTrigger asChild>
        <RadixButton>Columns</RadixButton>
      </RadixMenu.DropdownMenuTrigger>
      <RadixMenu.DropdownMenuContent>
        <RadixMenu.DropdownMenuCheckboxItem
          checked={visible}
          onCheckedChange={setVisible}
        >
          Amount
        </RadixMenu.DropdownMenuCheckboxItem>
      </RadixMenu.DropdownMenuContent>
    </RadixMenu.DropdownMenu>
  )
}

function BaseColumns() {
  const [visible, setVisible] = useState(true)
  return (
    <BaseMenu.DropdownMenu>
      <BaseMenu.DropdownMenuTrigger render={<BaseButton />}>
        Columns
      </BaseMenu.DropdownMenuTrigger>
      <BaseMenu.DropdownMenuContent>
        <BaseMenu.DropdownMenuCheckboxItem
          checked={visible}
          onCheckedChange={setVisible}
        >
          Amount
        </BaseMenu.DropdownMenuCheckboxItem>
      </BaseMenu.DropdownMenuContent>
    </BaseMenu.DropdownMenu>
  )
}

function AriaColumns() {
  const [visible, setVisible] = useState<Selection>(new Set(["amount"]))
  return (
    <AriaMenu.DropdownMenu>
      <AriaButton>Columns</AriaButton>
      <AriaMenu.DropdownMenuContent
        selectionMode="multiple"
        selectedKeys={visible}
        onSelectionChange={setVisible}
      >
        <AriaMenu.DropdownMenuItem id="amount">
          Amount
        </AriaMenu.DropdownMenuItem>
      </AriaMenu.DropdownMenuContent>
    </AriaMenu.DropdownMenu>
  )
}

function RadixHint() {
  return (
    <RadixTooltip.TooltipProvider>
      <RadixTooltip.Tooltip>
        <RadixTooltip.TooltipTrigger asChild>
          <RadixButton>Reload</RadixButton>
        </RadixTooltip.TooltipTrigger>
        <RadixTooltip.TooltipContent>Reload rows</RadixTooltip.TooltipContent>
      </RadixTooltip.Tooltip>
    </RadixTooltip.TooltipProvider>
  )
}

function BaseHint() {
  return (
    <BaseTooltip.TooltipProvider>
      <BaseTooltip.Tooltip>
        <BaseTooltip.TooltipTrigger render={<BaseButton />}>
          Reload
        </BaseTooltip.TooltipTrigger>
        <BaseTooltip.TooltipContent>Reload rows</BaseTooltip.TooltipContent>
      </BaseTooltip.Tooltip>
    </BaseTooltip.TooltipProvider>
  )
}

function AriaHint() {
  return (
    <AriaTooltip.Tooltip>
      <AriaButton>Reload</AriaButton>
      <AriaTooltip.TooltipContent>Reload rows</AriaTooltip.TooltipContent>
    </AriaTooltip.Tooltip>
  )
}

type TableParts = typeof RadixTable

const BASES: [
  string,
  TableParts,
  ComponentType,
  ComponentType,
  ComponentType<{ orientation?: "horizontal" | "vertical" }>,
  ComponentType<{ className?: string }>,
][] = [
  ["radix", RadixTable, RadixColumns, RadixHint, RadixSeparator, RadixSkeleton],
  ["base", BaseTable, BaseColumns, BaseHint, BaseSeparator, BaseSkeleton],
  ["aria", AriaTable, AriaColumns, AriaHint, AriaSeparator, AriaSkeleton],
]

describe.each(BASES)(
  "%s table primitives",
  (_, Table, Columns, Hint, Separator, Skeleton) => {
    it("renders a table", () => {
      render(
        <Table.Table>
          <Table.TableHeader>
            <Table.TableRow>
              <Table.TableHead>Amount</Table.TableHead>
            </Table.TableRow>
          </Table.TableHeader>
          <Table.TableBody>
            <Table.TableRow>
              <Table.TableCell>42</Table.TableCell>
            </Table.TableRow>
          </Table.TableBody>
        </Table.Table>
      )
      expect(screen.getByRole("columnheader", { name: "Amount" })).toBeDefined()
      expect(screen.getByRole("cell", { name: "42" })).toBeDefined()
    })

    it("toggles a checkbox item in a dropdown menu", async () => {
      const user = userEvent.setup()
      render(<Columns />)
      await user.click(screen.getByRole("button", { name: "Columns" }))
      const item = await screen.findByRole("menuitemcheckbox", {
        name: "Amount",
      })
      expect(item.getAttribute("aria-checked")).toBe("true")
      await user.click(item)
      // Some libraries keep the menu open after a checkbox item; close it either way.
      if (screen.queryByRole("menu")) await user.keyboard("{Escape}")
      await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
      await user.click(screen.getByRole("button", { name: "Columns" }))
      await waitFor(() =>
        expect(
          screen
            .getByRole("menuitemcheckbox", { name: "Amount" })
            .getAttribute("aria-checked")
        ).toBe("false")
      )
    })

    it("shows a tooltip on focus", async () => {
      const user = userEvent.setup()
      render(<Hint />)
      await user.tab()
      expect(
        (await screen.findAllByText("Reload rows")).length
      ).toBeGreaterThan(0)
    })

    it("renders a separator and a skeleton", () => {
      const { container } = render(
        <>
          <Separator orientation="vertical" />
          <Skeleton className="h-4" />
        </>
      )
      expect(container.querySelector("[data-slot=separator]")).not.toBeNull()
      expect(container.querySelector("[data-slot=skeleton]")).not.toBeNull()
    })
  }
)
