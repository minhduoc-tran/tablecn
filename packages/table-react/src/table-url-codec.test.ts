import {
  encodeFilters,
  isFilterParam,
  type FilterContext,
} from "@querycn/filter-core"
import { applyParamChanges } from "@querycn/filter-react"
import { describe, expect, it } from "vitest"

import { parseTableParams } from "./server"
import {
  decodeTableParams,
  encodeTableParams,
  type TableUrlOptions,
  type TableUrlState,
} from "./table-url-codec"

const state = (
  sorting: TableUrlState["sorting"],
  pageIndex = 0,
  pageSize = 20
): TableUrlState => ({ sorting, pagination: { pageIndex, pageSize } })

const DEFAULTS = state([])

describe("encodeTableParams", () => {
  it("writes sort, 1-based page and per_page", () => {
    expect(
      encodeTableParams(
        state(
          [
            { id: "amount", desc: true },
            { id: "name", desc: false },
          ],
          1,
          50
        )
      )
    ).toEqual({ sort: "-amount,name", page: "2", per_page: "50" })
  })

  it("removes params that hold the default", () => {
    expect(encodeTableParams(DEFAULTS)).toEqual({
      sort: null,
      page: null,
      per_page: null,
    })
    const options = { defaultSorting: [{ id: "date", desc: true }] }
    expect(
      encodeTableParams(state([{ id: "date", desc: true }]), options).sort
    ).toBeNull()
  })

  it("writes an empty sort when a default sort is cleared", () => {
    const options = { defaultSorting: [{ id: "date", desc: true }] }
    const patch = encodeTableParams(DEFAULTS, options)
    expect(patch.sort).toBe("")
    expect(applyParamChanges("", patch)).toBe("?sort")
    expect(decodeTableParams("?sort", options).sorting).toEqual([])
  })

  it("keeps at most maxSortColumns", () => {
    const sorting = ["a", "b", "c", "d"].map((id) => ({ id, desc: false }))
    expect(encodeTableParams(state(sorting)).sort).toBe("a,b,c")
    expect(encodeTableParams(state(sorting), { maxSortColumns: 1 }).sort).toBe(
      "a"
    )
  })

  it("uses custom param names", () => {
    const options: TableUrlOptions = {
      params: { sort: "ordering", page: "p", perPage: "size" },
    }
    expect(
      encodeTableParams(state([{ id: "name", desc: false }], 2, 10), options)
    ).toEqual({ ordering: "name", p: "3", size: "10" })
  })
})

describe("decodeTableParams", () => {
  it("round-trips through a query string", () => {
    const original = state(
      [
        { id: "amount", desc: true },
        { id: "createdAt", desc: false },
      ],
      4,
      100
    )
    const search = applyParamChanges("", encodeTableParams(original))
    expect(search).toBe("?sort=-amount,createdAt&page=5&per_page=100")
    expect(decodeTableParams(search)).toEqual(original)
  })

  it("defaults when the params are missing", () => {
    expect(decodeTableParams(null)).toEqual(DEFAULTS)
    expect(decodeTableParams("status__eq=paid")).toEqual(DEFAULTS)
    const defaultSorting = [{ id: "date", desc: true }]
    expect(decodeTableParams("", { defaultSorting }).sorting).toBe(
      defaultSorting
    )
  })

  it.each([
    ["page=0", 0],
    ["page=-2", 0],
    ["page=1.5", 0],
    ["page=abc", 0],
    ["page=99999999999999999999", 0],
    ["page=3", 2],
  ])("%s → pageIndex %i", (search, pageIndex) => {
    expect(decodeTableParams(search).pagination.pageIndex).toBe(pageIndex)
  })

  it("accepts only the offered page sizes", () => {
    expect(decodeTableParams("per_page=50").pagination.pageSize).toBe(50)
    expect(decodeTableParams("per_page=7").pagination.pageSize).toBe(20)
    expect(decodeTableParams("per_page=1000").pagination.pageSize).toBe(20)
    expect(
      decodeTableParams("per_page=25", { pageSizes: [25, 75] }).pagination
        .pageSize
    ).toBe(25)
    expect(
      decodeTableParams("per_page=30", {
        pageSizes: [10],
        defaultPageSize: 30,
      }).pagination.pageSize
    ).toBe(30)
  })

  it("drops empty, repeated and unknown sort columns", () => {
    const options = { sortableColumns: ["amount", "name", "date"] }
    expect(
      decodeTableParams("sort=,-amount,,amount,ghost,__proto__,name", options)
        .sorting
    ).toEqual([
      { id: "amount", desc: true },
      { id: "name", desc: false },
    ])
    expect(decodeTableParams("sort=-", options).sorting).toEqual([])
  })

  it("keeps at most maxSortColumns", () => {
    expect(decodeTableParams("sort=a,b,c,d").sorting.map((s) => s.id)).toEqual([
      "a",
      "b",
      "c",
    ])
  })

  it("never throws on random input", () => {
    const alphabet = "sort=page_-,&%0129ab?"
    let seed = 7
    const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647
    for (let i = 0; i < 1000; i++) {
      let raw = ""
      const length = Math.floor(random() * 30)
      for (let j = 0; j < length; j++) {
        raw += alphabet[Math.floor(random() * alphabet.length)]
      }
      expect(() => decodeTableParams(raw)).not.toThrow()
    }
  })
})

describe("parseTableParams", () => {
  it("reads a page's searchParams object and URLSearchParams", () => {
    const expected = state([{ id: "amount", desc: true }], 1, 50)
    expect(
      parseTableParams({ sort: "-amount", page: ["2", "9"], per_page: "50" })
    ).toEqual(expected)
    expect(
      parseTableParams(new URLSearchParams("sort=-amount&page=2&per_page=50"))
    ).toEqual(expected)
  })
})

describe("next to filter params", () => {
  const context: FilterContext = {
    fields: [{ name: "status", label: "Status", type: "text" }],
  }

  it("uses keys the filter never claims", () => {
    for (const key of ["sort", "page", "per_page"]) {
      expect(isFilterParam(key, "x", context)).toBe(false)
    }
  })

  it("shares one query string with the filter", () => {
    const filters = encodeFilters(
      {
        join: "and",
        rules: [{ id: "a", field: "status", operator: "eq", value: "paid" }],
      },
      context
    )
    const search = applyParamChanges(
      `?${filters}`,
      encodeTableParams(state([{ id: "amount", desc: true }], 1))
    )
    expect(search).toBe("?status__eq=paid&sort=-amount&page=2")
    expect(decodeTableParams(search)).toEqual(
      state([{ id: "amount", desc: true }], 1)
    )
  })
})
