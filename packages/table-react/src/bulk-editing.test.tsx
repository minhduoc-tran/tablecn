import { createMemoryAdapter } from "@querycn/filter-react"
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { applyBulkEdit, getBulkEditColumns } from "./bulk-editing"
import type { CellEdit } from "./cell-editing"
import { createDataTableColumnHelper } from "./data-table-features"
import { useDataTable, type UseDataTableOptions } from "./use-data-table"

interface Order {
  id: string
  customer: string
  status: string
  amount: number
}

const ORDERS: Order[] = [
  { id: "1", customer: "An", status: "paid", amount: 10 },
  { id: "2", customer: "Bình", status: "open", amount: 20 },
  { id: "3", customer: "Chi", status: "open", amount: 30 },
]

const helper = createDataTableColumnHelper<Order>()
const COLUMNS = helper.columns([
  helper.accessor("id", {}),
  helper.accessor("customer", { meta: { edit: { type: "text" } } }),
  helper.accessor("status", {
    meta: {
      defaultHidden: true,
      edit: {
        type: "select",
        options: [
          { label: "Paid", value: "paid" },
          { label: "Open", value: "open" },
        ],
      },
    },
  }),
  helper.accessor("amount", { meta: { edit: { type: "number" } } }),
])

function setup(
  options: Pick<
    UseDataTableOptions<Order>,
    "onCellEdit" | "onBulkEdit" | "canEditCell"
  > = {}
) {
  const { result } = renderHook(() =>
    useDataTable({
      data: ORDERS,
      columns: COLUMNS,
      getRowId: (order) => order.id,
      adapter: createMemoryAdapter(),
      ...options,
    })
  )
  const table = result.current
  return { table, rows: table.getRowModel().rows }
}

const ids = (columns: { id: string }[]) => columns.map((column) => column.id)
const PAID = { label: "Paid", value: "paid" }

describe("getBulkEditColumns", () => {
  it("offers the columns with meta.edit, hidden ones included", () => {
    const { table, rows } = setup({ onCellEdit: () => {} })
    expect(ids(getBulkEditColumns(table, rows))).toEqual([
      "customer",
      "status",
      "amount",
    ])
  })

  it("offers none without a save handler", () => {
    const { table, rows } = setup()
    expect(getBulkEditColumns(table, rows)).toEqual([])
  })

  it("works with onBulkEdit alone", () => {
    const { table, rows } = setup({ onBulkEdit: () => {} })
    expect(getBulkEditColumns(table, rows)).toHaveLength(3)
  })

  it("drops a column canEditCell refuses in any of the rows", () => {
    const { table, rows } = setup({
      onCellEdit: () => {},
      canEditCell: (order, columnId) =>
        !(columnId === "amount" && order.status === "paid"),
    })
    expect(ids(getBulkEditColumns(table, rows))).toEqual(["customer", "status"])
    expect(ids(getBulkEditColumns(table, rows.slice(1)))).toEqual([
      "customer",
      "status",
      "amount",
    ])
  })
})

describe("applyBulkEdit", () => {
  it("calls onBulkEdit once with the rows, changes and options", async () => {
    const onBulkEdit = vi.fn(async () => {})
    const onCellEdit = vi.fn()
    const { table, rows } = setup({ onBulkEdit, onCellEdit })
    await applyBulkEdit(
      table,
      rows.slice(1),
      { status: "paid" },
      { status: PAID }
    )
    expect(onBulkEdit).toHaveBeenCalledExactlyOnceWith({
      rowIds: ["2", "3"],
      rows: [ORDERS[1], ORDERS[2]],
      changes: { status: "paid" },
      options: { status: PAID },
    })
    expect(onCellEdit).not.toHaveBeenCalled()
  })

  it("rejects with onBulkEdit's error", async () => {
    const { table, rows } = setup({
      onBulkEdit: async () => {
        throw new Error("Nope")
      },
    })
    await expect(applyBulkEdit(table, rows, { amount: 5 })).rejects.toThrow(
      "Nope"
    )
  })

  it("falls back to onCellEdit for each changed cell", async () => {
    const edits: CellEdit<Order>[] = []
    const { table, rows } = setup({
      onCellEdit: (edit) => void edits.push(edit),
    })
    await applyBulkEdit(
      table,
      rows,
      { status: "paid", amount: 20 },
      { status: PAID }
    )
    expect(
      edits.map(({ rowId, columnId, value, previous, option }) => ({
        rowId,
        columnId,
        value,
        previous,
        option,
      }))
    ).toEqual([
      {
        rowId: "1",
        columnId: "amount",
        value: 20,
        previous: 10,
        option: undefined,
      },
      {
        rowId: "2",
        columnId: "status",
        value: "paid",
        previous: "open",
        option: PAID,
      },
      {
        rowId: "3",
        columnId: "status",
        value: "paid",
        previous: "open",
        option: PAID,
      },
      {
        rowId: "3",
        columnId: "amount",
        value: 20,
        previous: 30,
        option: undefined,
      },
    ])
    expect(edits[0]!.row).toBe(ORDERS[0])
  })

  it("saves the other rows when one fails, then rejects with its error", async () => {
    const saved: string[] = []
    const { table, rows } = setup({
      onCellEdit: async ({ rowId }) => {
        if (rowId === "2") throw new Error("Row 2 is locked")
        saved.push(rowId)
      },
    })
    await expect(
      applyBulkEdit(table, rows, { customer: "Dũng" })
    ).rejects.toThrow("Row 2 is locked")
    expect(saved).toEqual(["1", "3"])
  })

  it("saves one row's cells in turn", async () => {
    const order: string[] = []
    const { table, rows } = setup({
      onCellEdit: async ({ columnId }) => {
        order.push(`start ${columnId}`)
        await new Promise((resolve) => setTimeout(resolve, 5))
        order.push(`end ${columnId}`)
      },
    })
    await applyBulkEdit(table, rows.slice(0, 1), { customer: "X", amount: 1 })
    expect(order).toEqual([
      "start customer",
      "end customer",
      "start amount",
      "end amount",
    ])
  })
})
