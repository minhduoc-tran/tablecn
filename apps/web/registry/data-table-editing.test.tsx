import { createMemoryAdapter } from "@querycn/filter-react"
import {
  createDataTableColumnHelper,
  useDataTable,
  type CellEdit,
} from "@querycn/table-react"
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useMemo, useState, type ComponentType } from "react"
import { describe, expect, it, vi } from "vitest"

import { DataTable as AriaDataTable } from "./aria/table/data-table"
import { DataTable as BaseDataTable } from "./base/table/data-table"
import type { DataTableProps } from "./radix/table/data-table"
import { DataTable as RadixDataTable } from "./radix/table/data-table"

interface Order {
  id: string
  customer: string
  amount: number
  status: string
  shipped: boolean
  city: string
}

const ORDERS: Order[] = [
  {
    id: "1",
    customer: "An",
    amount: 30,
    status: "paid",
    shipped: false,
    city: "hn",
  },
  {
    id: "2",
    customer: "Bình",
    amount: 10,
    status: "open",
    shipped: true,
    city: "dn",
  },
]
const helper = createDataTableColumnHelper<Order>()
const STATUS_OPTIONS = [
  { label: "Paid", value: "paid" },
  { label: "Open", value: "open" },
]

const CITIES = [
  { label: "Hà Nội", value: "hn" },
  { label: "Đà Nẵng", value: "dn" },
  { label: "Huế", value: "hue" },
]
const cityName = (value: string) =>
  CITIES.find((city) => city.value === value)?.label ?? value

type Save = (edit: CellEdit<Order>) => void | Promise<void>
type LoadCities = (search: string) => Promise<typeof CITIES>

const BASES: [string, ComponentType<DataTableProps<Order>>][] = [
  ["radix", RadixDataTable],
  ["base", BaseDataTable],
  ["aria", AriaDataTable],
]

describe.each(BASES)("%s DataTable editing", (_, DataTable) => {
  function Orders({
    onSave,
    canEditCell,
    editable = true,
    loadCities = async () => CITIES,
    ...props
  }: Omit<DataTableProps<Order>, "table"> & {
    onSave?: Save
    loadCities?: LoadCities
    canEditCell?: (row: Order, columnId: string) => boolean
    editable?: boolean
  }) {
    const [adapter] = useState(() => createMemoryAdapter())
    const [orders, setOrders] = useState(ORDERS)
    const columns = useMemo(
      () => [
        helper.accessor("customer", {
          header: "Customer",
          meta: { edit: { type: "text" } },
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
          cell: ({ getValue }) => (getValue<boolean>() ? "Yes" : "No"),
          meta: { edit: { type: "boolean" } },
        }),
        helper.accessor("city", {
          header: "City",
          cell: ({ getValue }) => cityName(getValue<string>()),
          meta: { edit: { type: "select", loadOptions: loadCities } },
        }),
      ],
      [loadCities]
    )
    const table = useDataTable({
      data: orders,
      columns,
      getRowId: (row) => row.id,
      adapter,
      canEditCell,
      onCellEdit: editable
        ? async (edit) => {
            await onSave?.(edit)
            setOrders((current) =>
              current.map((order) =>
                order.id === edit.rowId
                  ? { ...order, [edit.columnId]: edit.value }
                  : order
              )
            )
          }
        : undefined,
    })
    return <DataTable table={table} {...props} />
  }

  const cell = (row: number, column: number) =>
    within(screen.getAllByRole("row")[row + 1]!).getAllByRole("cell")[column]!
  const editableCell = (row: number, column: number) =>
    cell(row, column).querySelector<HTMLElement>("[tabindex='0']")!

  it("edits text with Enter, saves with Enter and focuses the cell again", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn<Save>()
    render(<Orders onSave={onSave} />)
    editableCell(0, 0).focus()
    await user.keyboard("{Enter}")
    const input = within(cell(0, 0)).getByRole("textbox", { name: "Customer" })
    expect(input).toHaveProperty("value", "An")
    await user.keyboard("An Nguyễn{Enter}")
    expect(onSave).toHaveBeenCalledWith({
      row: ORDERS[0],
      rowId: "1",
      columnId: "customer",
      value: "An Nguyễn",
      previous: "An",
    })
    expect(cell(0, 0).textContent).toBe("An Nguyễn")
    expect(document.activeElement).toBe(editableCell(0, 0))
  })

  it("cancels with Escape, and saves nothing unchanged", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn<Save>()
    render(<Orders onSave={onSave} />)
    editableCell(0, 0).focus()
    await user.keyboard("{F2}Other{Escape}")
    expect(within(cell(0, 0)).queryByRole("textbox")).toBeNull()
    expect(cell(0, 0).textContent).toBe("An")
    expect(document.activeElement).toBe(editableCell(0, 0))
    await user.keyboard("{Enter}{Enter}")
    expect(onSave).not.toHaveBeenCalled()
  })

  it("saves when the input loses focus", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn<Save>()
    render(<Orders onSave={onSave} />)
    await user.dblClick(editableCell(1, 0))
    await user.keyboard("{Control>}a{/Control}Châu")
    await user.click(document.body)
    expect(onSave).toHaveBeenCalledOnce()
    expect(cell(1, 0).textContent).toBe("Châu")
  })

  it("reads numbers and flags text that isn't one", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn<Save>()
    render(<Orders onSave={onSave} />)
    editableCell(0, 1).focus()
    await user.keyboard("{Enter}abc{Enter}")
    expect(screen.getByRole("alert").textContent).toBe("Enter a number.")
    expect(onSave).not.toHaveBeenCalled()
    await user.keyboard("{Control>}a{/Control}12.5{Enter}")
    expect(onSave.mock.calls[0]![0].value).toBe(12.5)
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("waits for the save, and keeps the editor open with its error", async () => {
    const user = userEvent.setup()
    let reject!: (error: Error) => void
    const onSave = vi.fn<Save>(() => new Promise((_, fail) => (reject = fail)))
    render(<Orders onSave={onSave} />)
    editableCell(0, 1).focus()
    await user.keyboard("{Enter}-5{Enter}")
    expect(screen.getByRole("status", { name: "Saving…" })).toBeTruthy()
    await act(async () => reject(new Error("Amount can't be negative.")))
    expect(screen.getByRole("alert").textContent).toBe(
      "Amount can't be negative."
    )
    expect(within(cell(0, 1)).getByRole("textbox")).toHaveProperty(
      "value",
      "-5"
    )
    expect(cell(0, 1).querySelector("[aria-invalid]")).not.toBeNull()
  })

  it("flips a boolean cell and opens nothing on a double click's row", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn<Save>()
    const onRowDoubleClick = vi.fn()
    render(<Orders onSave={onSave} onRowDoubleClick={onRowDoubleClick} />)
    editableCell(0, 3).focus()
    await user.keyboard("{Enter}")
    expect(onSave.mock.calls[0]![0].value).toBe(true)
    expect(cell(0, 3).textContent).toBe("Yes")
    await user.dblClick(editableCell(1, 3))
    expect(cell(1, 3).textContent).toBe("No")
    expect(onRowDoubleClick).not.toHaveBeenCalled()
  })

  it("picks from a select's options", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn<Save>()
    render(<Orders onSave={onSave} />)
    editableCell(0, 2).focus()
    await user.keyboard("{Enter}")
    await user.click(await screen.findByRole("option", { name: "Open" }))
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      columnId: "status",
      value: "open",
      previous: "paid",
    })
    expect(cell(0, 2).textContent).toBe("open")
  })

  it("searches a select's options through loadOptions", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn<Save>()
    const loadCities = vi.fn<LoadCities>(async (search) =>
      CITIES.filter((city) => city.label.startsWith(search))
    )
    render(<Orders onSave={onSave} loadCities={loadCities} />)
    editableCell(0, 4).focus()
    await user.keyboard("{Enter}")
    expect(await screen.findByRole("option", { name: "Huế" })).toBeTruthy()
    expect(loadCities).toHaveBeenCalledWith("", expect.any(AbortSignal))
    // The search box takes focus once the list is open. `fireEvent`, not
    // `user.keyboard`: user-event sends a `change` when React Aria moves focus
    // back to the trigger mid-commit, which React rejects in tests only.
    await waitFor(() => expect(document.activeElement?.tagName).toBe("INPUT"))
    fireEvent.change(document.activeElement!, { target: { value: "Đà" } })
    await waitFor(() =>
      expect(screen.queryByRole("option", { name: "Huế" })).toBeNull()
    )
    expect(loadCities).toHaveBeenLastCalledWith("Đà", expect.any(AbortSignal))
    await user.click(screen.getByRole("option", { name: "Đà Nẵng" }))
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      columnId: "city",
      value: "dn",
      previous: "hn",
      option: { label: "Đà Nẵng", value: "dn" },
    })
    expect(cell(0, 4).textContent).toBe("Đà Nẵng")
  })

  it("offers a retry when loadOptions fails, and cancels on Escape", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn<Save>()
    const loadCities = vi
      .fn<LoadCities>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(CITIES)
    render(<Orders onSave={onSave} loadCities={loadCities} />)
    editableCell(1, 4).focus()
    await user.keyboard("{Enter}")
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Couldn't load the options."
    )
    await user.click(screen.getByRole("button", { name: "Retry" }))
    expect(await screen.findByRole("option", { name: "Hà Nội" })).toBeTruthy()
    await user.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("option")).toBeNull())
    expect(onSave).not.toHaveBeenCalled()
    expect(cell(1, 4).textContent).toBe("Đà Nẵng")
  })

  it("edits nothing without onCellEdit, or where canEditCell says no", () => {
    const { unmount } = render(<Orders editable={false} />)
    expect(document.querySelector("td [tabindex='0']")).toBeNull()
    unmount()
    render(
      <Orders canEditCell={(row, id) => row.id === "2" || id !== "amount"} />
    )
    expect(editableCell(0, 1)).toBeNull()
    expect(editableCell(1, 1)).not.toBeNull()
    expect(editableCell(0, 0)).not.toBeNull()
  })
})
