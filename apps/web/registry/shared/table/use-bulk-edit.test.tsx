import { createMemoryAdapter } from "@querycn/filter-react"
import {
  createDataTableColumnHelper,
  enTableMessages,
  useDataTable,
  type UseDataTableOptions,
} from "@querycn/table-react"
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useBulkEdit } from "./use-bulk-edit"

interface Order {
  id: string
  customer: string
  shipped: boolean
}

const ORDERS: Order[] = [
  { id: "1", customer: "An", shipped: false },
  { id: "2", customer: "Bình", shipped: true },
  { id: "3", customer: "Châu", shipped: false },
]

const helper = createDataTableColumnHelper<Order>()
const COLUMNS = helper.columns([
  helper.accessor("id", {}),
  helper.accessor("customer", { meta: { edit: { type: "text" } } }),
  helper.accessor("shipped", { meta: { edit: { type: "boolean" } } }),
])

function setup(
  options: Pick<UseDataTableOptions<Order>, "onCellEdit" | "onBulkEdit">
) {
  return renderHook(() => {
    const table = useDataTable({
      data: ORDERS,
      columns: COLUMNS,
      getRowId: (order) => order.id,
      adapter: createMemoryAdapter(),
      enableRowSelection: true,
      ...options,
    })
    const rows = table.getSelectedRowModel().rows
    return {
      table,
      bulk: useBulkEdit({ table, rows, messages: enTableMessages }),
    }
  })
}

function selectAndOpen(result: ReturnType<typeof setup>["result"]) {
  act(() => {
    result.current.table.getRow("1").toggleSelected(true)
    result.current.table.getRow("3").toggleSelected(true)
  })
  act(() => result.current.bulk.onOpenChange(true))
}

describe("useBulkEdit", () => {
  it("opens on the selected rows with one empty field", () => {
    const { result } = setup({ onBulkEdit: vi.fn() })
    selectAndOpen(result)
    const { bulk } = result.current
    expect(bulk.open).toBe(true)
    expect(bulk.rowCount).toBe(2)
    expect(bulk.columns.map((column) => column.id)).toEqual([
      "customer",
      "shipped",
    ])
    expect(bulk.fields).toEqual([{ key: 0 }])
    expect(bulk.canApply).toBe(false)
  })

  it("saves with onBulkEdit, then closes and clears the selection", async () => {
    const onBulkEdit = vi.fn()
    const { result } = setup({ onBulkEdit })
    selectAndOpen(result)
    act(() => result.current.bulk.setColumn(0, "shipped"))
    expect(result.current.bulk.canApply).toBe(true)
    act(() => result.current.bulk.addField())
    const key = result.current.bulk.fields[1]!.key
    expect(
      result.current.bulk.availableColumns(key).map((column) => column.id)
    ).toEqual(["customer"])
    act(() => result.current.bulk.setColumn(key, "customer"))
    act(() => result.current.bulk.setValue(key, "Dũng"))

    await act(() => result.current.bulk.apply())
    expect(onBulkEdit).toHaveBeenCalledTimes(1)
    const edit = onBulkEdit.mock.calls[0]![0]
    expect(edit.rowIds).toEqual(["1", "3"])
    expect({ ...edit.changes }).toEqual({ shipped: false, customer: "Dũng" })
    expect(result.current.bulk.open).toBe(false)
    expect(result.current.table.getSelectedRowModel().rows).toEqual([])
  })

  it("falls back to onCellEdit for each changed cell", async () => {
    const onCellEdit = vi.fn()
    const { result } = setup({ onCellEdit })
    selectAndOpen(result)
    act(() => result.current.bulk.setColumn(0, "shipped"))
    act(() => result.current.bulk.setValue(0, true))
    await act(() => result.current.bulk.apply())
    expect(onCellEdit.mock.calls.map(([edit]) => edit.rowId)).toEqual([
      "1",
      "3",
    ])
  })

  it("keeps the dialog and its fields open with the error's message", async () => {
    const onBulkEdit = vi
      .fn()
      .mockRejectedValueOnce(new Error("Orders are locked"))
      .mockRejectedValueOnce("no message")
    const { result } = setup({ onBulkEdit })
    selectAndOpen(result)
    act(() => result.current.bulk.setColumn(0, "shipped"))

    await act(() => result.current.bulk.apply())
    expect(result.current.bulk.error).toBe("Orders are locked")
    expect(result.current.bulk.open).toBe(true)
    expect(result.current.bulk.fields[0]!.columnId).toBe("shipped")
    expect(result.current.table.getSelectedRowModel().rows).toHaveLength(2)

    await act(() => result.current.bulk.apply())
    expect(result.current.bulk.error).toBe(enTableMessages.editing.saveFailed)
  })

  it("can't close or save twice while a save is pending", async () => {
    let finish!: () => void
    const onBulkEdit = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve))
    )
    const { result } = setup({ onBulkEdit })
    selectAndOpen(result)
    act(() => result.current.bulk.setColumn(0, "shipped"))

    let saving!: Promise<void>
    act(() => {
      saving = result.current.bulk.apply()
      void result.current.bulk.apply()
    })
    expect(result.current.bulk.pending).toBe(true)
    expect(result.current.bulk.canApply).toBe(false)
    act(() => result.current.bulk.onOpenChange(false))
    expect(result.current.bulk.open).toBe(true)

    await act(async () => {
      finish()
      await saving
    })
    expect(onBulkEdit).toHaveBeenCalledTimes(1)
    expect(result.current.bulk.open).toBe(false)
  })
})
