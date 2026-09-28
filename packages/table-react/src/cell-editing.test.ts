import { describe, expect, it } from "vitest"

import { formatCellText, parseCellText } from "./cell-editing"

describe("cell text", () => {
  it("formats empty values as empty text", () => {
    expect(formatCellText(null)).toBe("")
    expect(formatCellText(undefined)).toBe("")
    expect(formatCellText(12.5)).toBe("12.5")
  })

  it("keeps text as typed", () => {
    expect(parseCellText("  An ", "text")).toEqual({ value: "  An " })
  })

  it("reads numbers, empty as null, and flags the rest", () => {
    expect(parseCellText(" 12.5 ", "number")).toEqual({ value: 12.5 })
    expect(parseCellText("-3", "number")).toEqual({ value: -3 })
    expect(parseCellText("  ", "number")).toEqual({ value: null })
    expect(parseCellText("12,5", "number")).toEqual({ error: "invalidNumber" })
    expect(parseCellText("1e999", "number")).toEqual({
      error: "invalidNumber",
    })
  })
})
