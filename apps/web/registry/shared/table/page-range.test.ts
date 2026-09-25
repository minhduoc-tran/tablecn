import { describe, expect, it } from "vitest"

import { pageRange } from "./page-range"

describe("pageRange", () => {
  it.each([
    [1, 0, []],
    [1, 1, [1]],
    [3, 7, [1, 2, 3, 4, 5, 6, 7]],
    [1, 20, [1, 2, 3, 4, 5, "ellipsis-end", 20]],
    [4, 20, [1, 2, 3, 4, 5, "ellipsis-end", 20]],
    [5, 20, [1, "ellipsis-start", 4, 5, 6, "ellipsis-end", 20]],
    [10, 20, [1, "ellipsis-start", 9, 10, 11, "ellipsis-end", 20]],
    [16, 20, [1, "ellipsis-start", 15, 16, 17, "ellipsis-end", 20]],
    [17, 20, [1, "ellipsis-start", 16, 17, 18, 19, 20]],
    [20, 20, [1, "ellipsis-start", 16, 17, 18, 19, 20]],
    [99, 20, [1, "ellipsis-start", 16, 17, 18, 19, 20]],
    [0, 8, [1, 2, 3, 4, 5, "ellipsis-end", 8]],
  ])("page %i of %i", (page, pageCount, expected) => {
    expect(pageRange(page, pageCount)).toEqual(expected)
  })

  it("never exceeds the slots and always includes the current page", () => {
    for (let pageCount = 1; pageCount <= 30; pageCount++) {
      for (let page = 1; page <= pageCount; page++) {
        const range = pageRange(page, pageCount)
        expect(range.length).toBeLessThanOrEqual(7)
        expect(range).toContain(page)
        expect(range[0]).toBe(1)
        expect(range.at(-1)).toBe(pageCount)
      }
    }
  })

  it("takes fewer slots", () => {
    expect(pageRange(6, 10, 5)).toEqual([
      1,
      "ellipsis-start",
      6,
      "ellipsis-end",
      10,
    ])
  })
})
