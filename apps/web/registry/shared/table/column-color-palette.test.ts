import { describe, expect, it } from "vitest"

import {
  columnColorStyle,
  COLUMN_COLOR_PRESETS,
  resolveColumnColor,
} from "./column-color-palette"

describe("column colors", () => {
  it("resolves presets and passes plain CSS colors through", () => {
    expect(resolveColumnColor("blue")).toBe(COLUMN_COLOR_PRESETS.blue)
    expect(resolveColumnColor("#0ea5e9")).toBe("#0ea5e9")
    expect(resolveColumnColor("rgb(1 2 3 / 50%)")).toBe("rgb(1 2 3 / 50%)")
    expect(resolveColumnColor("rebeccapurple")).toBe("rebeccapurple")
    expect(resolveColumnColor(undefined)).toBeUndefined()
  })

  it("drops values that could do more than color", () => {
    expect(resolveColumnColor("url(https://x.test/a.png)")).toBeUndefined()
    expect(resolveColumnColor("red; position: fixed")).toBeUndefined()
    expect(resolveColumnColor("rgb(1,2,3)), url(x)")).toBeUndefined()
    expect(columnColorStyle("url(x)")).toBeUndefined()
  })

  it("sets the color for the cell's tint", () => {
    expect(columnColorStyle("#ff0000")).toEqual({ "--column-color": "#ff0000" })
    expect(columnColorStyle(undefined)).toBeUndefined()
  })
})
