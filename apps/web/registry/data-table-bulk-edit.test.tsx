import { createMemoryAdapter } from "@querycn/filter-react"
import {
  createDataTableColumnHelper,
  useDataTable,
  type BulkEdit,
  type CellEdit,
  type DataTableColumnDef,
} from "@querycn/table-react"
import { viTableMessages } from "@querycn/table-react/locales/vi"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useMemo, useState, type ComponentType, type ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { DataTable as AriaDataTable } from "./aria/table/data-table"
import { createSelectionColumn as ariaSelection } from "./aria/table/data-table-selection-column"
import { DataTableToolbar as AriaToolbar } from "./aria/table/data-table-toolbar"
import { DataTable as BaseDataTable } from "./base/table/data-table"
import { createSelectionColumn as baseSelection } from "./base/table/data-table-selection-column"
import { DataTableToolbar as BaseToolbar } from "./base/table/data-table-toolbar"
import type { DataTableProps } from "./radix/table/data-table"
import { DataTable as RadixDataTable } from "./radix/table/data-table"
import { createSelectionColumn as radixSelection } from "./radix/table/data-table-selection-column"
import type { DataTableToolbarProps } from "./radix/table/data-table-toolbar"
import { DataTableToolbar as RadixToolbar } from "./radix/table/data-table-toolbar"

interface Order {
  id: string
  customer: string
  amount: number
  status: string
  shipped: boolean
}

const ORDERS: Order[] = [
  { id: "1", customer: "An", amount: 30, status: "paid", shipped: false },
  { id: "2", customer: "Bình", amount: 10, status: "open", shipped: true },
  { id: "3", customer: "Châu", amount: 20, status: "open", shipped: false },
]
const STATUS_OPTIONS = [
  { label: "Paid", value: "paid" },
  { label: "Open", value: "open" },
]
const helper = createDataTableColumnHelper<Order>()

type Base = [
  string,
  ComponentType<DataTableProps<Order>>,
  ComponentType<DataTableToolbarProps<Order>>,
  (messages?: typeof viTableMessages) => DataTableColumnDef<Order>,
]

const BASES: Base[] = [
  ["radix", RadixDataTable, RadixToolbar, radixSelection],
  ["base", BaseDataTable, BaseToolbar, baseSelection],
  ["aria", AriaDataTable, AriaToolbar, ariaSelection],
]

describe.each(BASES)(
  "%s bulk edit",
  (_, DataTable, DataTableToolbar, createSelectionColumn) => {
    function Orders({
      onBulkEdit,
      onCellEdit,
      editable = true,
      canEditCell,
      actions,
      messages,
    }: {
      onBulkEdit?: (edit: BulkEdit<Order>) => void | Promise<void>
      onCellEdit?: (edit: CellEdit<Order>) => void | Promise<void>
      editable?: boolean
      canEditCell?: (row: Order, columnId: string) => boolean
      actions?: ReactNode
      messages?: typeof viTableMessages
    }) {
      const [adapter] = useState(() => createMemoryAdapter())
      const columns = useMemo(
        () => [
          createSelectionColumn(messages),
          helper.accessor("customer", {
            header: "Customer",
            meta: editable ? { edit: { type: "text" } } : undefined,
          }),
          helper.accessor("amount", {
            header: "Amount",
            meta: { edit: { type: "number" } },
          }),
          helper.accessor("status", {
            header: "Status",
            meta: { edit: { type: "select", options: STATUS_OPTIONS } },
          }),
          helper.accessor("shipped", {
            header: "Shipped",
            meta: { edit: { type: "boolean" } },
          }),
        ],
        [editable, messages]
      )
      const table = useDataTable({
        data: ORDERS,
        columns,
        getRowId: (row) => row.id,
        adapter,
        onBulkEdit,
        onCellEdit,
        canEditCell,
      })
      return (
        <>
          <DataTableToolbar
            table={table}
            messages={messages}
            selectionActions={actions ? () => actions : undefined}
          />
          <DataTable table={table} messages={messages} />
        </>
      )
    }

    // The cards repeat each row's checkbox; select in the table.
    async function select(
      user: ReturnType<typeof userEvent.setup>,
      ...rows: number[]
    ) {
      const boxes = within(screen.getByRole("table")).getAllByRole("checkbox")
      for (const row of rows) await user.click(boxes[row + 1]!)
    }

    async function open(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("button", { name: "Bulk edit" }))
      return screen.getByRole("dialog", { name: "Bulk edit" })
    }

    // A combobox, or a button for React Aria; named "Column" either way.
    const pickers = (dialog: HTMLElement) => [
      ...dialog.querySelectorAll<HTMLElement>("[aria-label='Column']"),
    ]

    async function pickColumn(
      user: ReturnType<typeof userEvent.setup>,
      dialog: HTMLElement,
      index: number,
      name: string
    ) {
      await user.click(pickers(dialog)[index]!)
      await user.click(await screen.findByRole("option", { name }))
    }

    const apply = (dialog: HTMLElement) =>
      within(dialog).getByRole("button", { name: /^Apply to/ })

    it("shows Bulk edit after the actions, only for editable columns and a save handler", async () => {
      const user = userEvent.setup()
      const { unmount } = render(<Orders />)
      await select(user, 0)
      expect(screen.queryByRole("toolbar")).toBeNull()
      unmount()

      render(<Orders onBulkEdit={vi.fn()} actions={<button>Export</button>} />)
      await select(user, 0)
      const buttons = within(screen.getByRole("toolbar")).getAllByRole("button")
      expect(buttons.map((button) => button.textContent)).toEqual([
        "",
        "Export",
        "Bulk edit",
      ])
    })

    it("applies a select's option to the selected rows, then clears them", async () => {
      const user = userEvent.setup()
      const onBulkEdit = vi.fn()
      render(<Orders onBulkEdit={onBulkEdit} />)
      await select(user, 0, 2)
      const dialog = await open(user)
      expect(
        within(dialog).getByText("Set the same values in 2 selected rows.")
      ).toBeTruthy()
      expect(apply(dialog)).toHaveProperty("disabled", true)

      await pickColumn(user, dialog, 0, "Status")
      await user.click(await screen.findByRole("option", { name: "Paid" }))
      await user.click(apply(dialog))

      expect(onBulkEdit).toHaveBeenCalledTimes(1)
      const edit = onBulkEdit.mock.calls[0]![0]
      expect(edit.rowIds).toEqual(["1", "3"])
      expect({ ...edit.changes }).toEqual({ status: "paid" })
      expect({ ...edit.options }).toEqual({ status: STATUS_OPTIONS[0] })
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      expect(
        within(screen.getByRole("table"))
          .getAllByRole("checkbox")
          .some((box) => box.getAttribute("aria-checked") === "true")
      ).toBe(false)
    })

    it("adds fields for the columns left, and removes them", async () => {
      const user = userEvent.setup()
      const onBulkEdit = vi.fn()
      render(<Orders onBulkEdit={onBulkEdit} />)
      await select(user, 1)
      const dialog = await open(user)
      await pickColumn(user, dialog, 0, "Shipped")
      await user.click(
        within(dialog).getByRole("checkbox", { name: "Shipped" })
      )
      await user.click(
        within(dialog).getByRole("button", { name: "Add field" })
      )
      expect(document.activeElement).toBe(pickers(dialog)[1])
      await user.click(document.activeElement!)
      expect(screen.queryByRole("option", { name: "Shipped" })).toBeNull()
      await user.click(await screen.findByRole("option", { name: "Customer" }))
      await user.keyboard("Dũng{Tab}")

      await user.click(
        within(dialog).getByRole("button", { name: "Remove Shipped" })
      )
      expect(
        within(dialog).queryByRole("checkbox", { name: "Shipped" })
      ).toBeNull()
      await user.click(apply(dialog))
      expect({ ...onBulkEdit.mock.calls[0]![0].changes }).toEqual({
        customer: "Dũng",
      })
    })

    it("flags text that isn't a number and keeps Apply off", async () => {
      const user = userEvent.setup()
      render(<Orders onBulkEdit={vi.fn()} />)
      await select(user, 0)
      const dialog = await open(user)
      await pickColumn(user, dialog, 0, "Amount")
      await user.keyboard("abc{Enter}")
      expect(within(dialog).getByRole("alert").textContent).toBe(
        "Enter a number."
      )
      expect(apply(dialog)).toHaveProperty("disabled", true)
      await user.keyboard("{Control>}a{/Control}12{Enter}")
      expect(within(dialog).queryByRole("alert")).toBeNull()
      expect(apply(dialog)).toHaveProperty("disabled", false)
    })

    it("falls back to onCellEdit, one call per changed cell", async () => {
      const user = userEvent.setup()
      const onCellEdit = vi.fn()
      render(<Orders onCellEdit={onCellEdit} />)
      await select(user, 0, 1)
      const dialog = await open(user)
      await pickColumn(user, dialog, 0, "Shipped")
      await user.click(
        within(dialog).getByRole("checkbox", { name: "Shipped" })
      )
      await user.click(apply(dialog))
      // Row 2 is shipped already.
      expect(onCellEdit.mock.calls.map(([edit]) => edit)).toMatchObject([
        { rowId: "1", columnId: "shipped", value: true, previous: false },
      ])
    })

    it("keeps the dialog open with the error, and can't close while applying", async () => {
      const user = userEvent.setup()
      let reject!: (error: Error) => void
      const onBulkEdit = vi.fn(
        () => new Promise<void>((_, fail) => (reject = fail))
      )
      render(<Orders onBulkEdit={onBulkEdit} />)
      await select(user, 0)
      const dialog = await open(user)
      await pickColumn(user, dialog, 0, "Shipped")
      await user.click(apply(dialog))
      expect(
        within(dialog).getByRole("button", { name: "Applying…" })
      ).toBeTruthy()
      await user.keyboard("{Escape}")
      expect(screen.getByRole("dialog")).toBe(dialog)

      await act(async () => reject(new Error("Orders are locked.")))
      expect(within(dialog).getByRole("alert").textContent).toBe(
        "Orders are locked."
      )
      expect(
        within(dialog).getByRole("checkbox", { name: "Shipped" })
      ).toBeTruthy()
    })

    it("offers only columns every selected row can edit", async () => {
      const user = userEvent.setup()
      render(
        <Orders
          onBulkEdit={vi.fn()}
          canEditCell={(row, columnId) =>
            !(row.id === "2" && columnId === "amount")
          }
        />
      )
      await select(user, 0, 1)
      const dialog = await open(user)
      await user.click(pickers(dialog)[0]!)
      const options = (await screen.findAllByRole("option")).map(
        (o) => o.textContent
      )
      expect(options).toEqual(["Customer", "Status", "Shipped"])
    })

    it("speaks the table's language", async () => {
      const user = userEvent.setup()
      render(<Orders onBulkEdit={vi.fn()} messages={viTableMessages} />)
      await select(user, 0)
      await user.click(
        screen.getByRole("button", { name: viTableMessages.bulkEdit.open })
      )
      const dialog = screen.getByRole("dialog")
      expect(
        within(dialog).getByRole("button", {
          name: viTableMessages.bulkEdit.apply(1),
        })
      ).toBeTruthy()
    })
  }
)
