import { afterEach, describe, expect, it, vi } from "vitest"

import { measureColumnWidth } from "./measure-column-width"

afterEach(() => {
  document.body.innerHTML = ""
  vi.restoreAllMocks()
})

// jsdom has no layout: each content element reports the width in its data attribute.
function cell(columnId: string, contentWidth: number) {
  const td = document.createElement("td")
  td.dataset.columnId = columnId
  td.style.padding = "0 8px"
  const content = document.createElement("div")
  content.style.width = "120px"
  vi.spyOn(content, "getBoundingClientRect").mockImplementation(
    () =>
      ({
        width: content.style.width === "max-content" ? contentWidth : 120,
      }) as DOMRect
  )
  td.append(content)
  return td
}

describe("measureColumnWidth", () => {
  it("fits the widest header or cell, with the cell padding", () => {
    const table = document.createElement("table")
    table.append(cell("amount", 50), cell("amount", 91.2), cell("name", 300))
    document.body.append(table)
    expect(measureColumnWidth(table, "amount")).toBe(108)
    expect(
      [...table.querySelectorAll("div")].map((div) => div.style.width)
    ).toEqual(["120px", "120px", "120px"])
  })

  it("keeps within min and max", () => {
    const table = document.createElement("table")
    table.append(cell("tiny", 2), cell("huge", 5000))
    expect(measureColumnWidth(table, "tiny")).toBe(40)
    expect(measureColumnWidth(table, "huge", { max: 600 })).toBe(600)
    expect(measureColumnWidth(table, "missing", { min: 64 })).toBe(64)
  })

  it("measures cells holding only text by their text", () => {
    const table = document.createElement("table")
    const td = document.createElement("td")
    td.dataset.columnId = "note"
    td.textContent = "A long note"
    table.append(td)
    vi.spyOn(document, "createRange").mockImplementation(
      () =>
        ({
          selectNodeContents: () => {},
          getBoundingClientRect: () => ({ width: 150 }) as DOMRect,
        }) as unknown as Range
    )
    expect(measureColumnWidth(table, "note")).toBe(150)
  })

  it("escapes column ids", () => {
    const table = document.createElement("table")
    table.append(cell('a"b', 200))
    expect(measureColumnWidth(table, 'a"b')).toBe(216)
  })
})
