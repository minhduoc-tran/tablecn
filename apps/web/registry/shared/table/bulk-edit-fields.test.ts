import { describe, expect, it } from "vitest"

import {
  addField,
  canApplyFields,
  getAvailableColumnIds,
  removeField,
  setFieldColumn,
  setFieldError,
  setFieldValue,
  toBulkChanges,
  type BulkEditField,
} from "./bulk-edit-fields"

const PAID = { label: "Paid", value: "paid" }

describe("bulk edit fields", () => {
  it("adds and removes fields by key", () => {
    const fields = addField(addField([], 0), 1)
    expect(fields).toEqual([{ key: 0 }, { key: 1 }])
    expect(removeField(fields, 0)).toEqual([{ key: 1 }])
  })

  it("starts a field's value over when its column changes", () => {
    let fields: BulkEditField[] = [{ key: 0 }]
    fields = setFieldColumn(fields, 0, "status", "select")
    fields = setFieldValue(fields, 0, "paid", PAID)
    fields = setFieldColumn(fields, 0, "customer", "text")
    expect(fields).toEqual([{ key: 0, columnId: "customer", value: undefined }])
    // A checkbox always has a value.
    expect(setFieldColumn(fields, 0, "shipped", "boolean")[0]!.value).toBe(
      false
    )
  })

  it("clears a field's error when its value changes", () => {
    let fields = setFieldError([{ key: 0, columnId: "amount" }], 0, "Too low")
    expect(fields[0]!.error).toBe("Too low")
    fields = setFieldValue(fields, 0, 5)
    expect(fields[0]).toEqual({
      key: 0,
      columnId: "amount",
      value: 5,
      option: undefined,
      error: undefined,
    })
  })

  it("offers a field its own column and those no other field has", () => {
    const fields: BulkEditField[] = [
      { key: 0, columnId: "customer" },
      { key: 1, columnId: "status" },
      { key: 2 },
    ]
    const ids = ["customer", "status", "amount"]
    expect(getAvailableColumnIds(ids, fields, 0)).toEqual([
      "customer",
      "amount",
    ])
    expect(getAvailableColumnIds(ids, fields, 2)).toEqual(["amount"])
  })

  it("applies only when every field has a column, a value and no error", () => {
    expect(canApplyFields([])).toBe(false)
    expect(canApplyFields([{ key: 0 }])).toBe(false)
    expect(canApplyFields([{ key: 0, columnId: "customer" }])).toBe(false)
    expect(
      canApplyFields([{ key: 0, columnId: "shipped", value: false }])
    ).toBe(true)
    expect(
      canApplyFields([
        { key: 0, columnId: "amount", value: -1, error: "Too low" },
      ])
    ).toBe(false)
    expect(
      canApplyFields([
        { key: 0, columnId: "customer", value: "An" },
        { key: 1 },
      ])
    ).toBe(false)
  })

  it("turns fields into changes and options by column id", () => {
    const { changes, options } = toBulkChanges([
      { key: 0, columnId: "status", value: "paid", option: PAID },
      { key: 1, columnId: "constructor", value: 3 },
    ])
    expect({ ...changes }).toEqual({ status: "paid", constructor: 3 })
    expect({ ...options }).toEqual({ status: PAID })
    expect(Object.getPrototypeOf(changes)).toBeNull()
  })
})
