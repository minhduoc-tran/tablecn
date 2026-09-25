import { describe, expect, it } from "vitest"

import {
  djangoTableParams,
  jsonApiTableParams,
  postgrestTableParams,
} from "./table-params-serializers"
import type { TableUrlState } from "./table-url-codec"

const STATE: TableUrlState = {
  sorting: [
    { id: "amount", desc: true },
    { id: "customer_name", desc: false },
  ],
  pagination: { pageIndex: 1, pageSize: 20 },
  search: "",
}
const UNSORTED: TableUrlState = { ...STATE, sorting: [] }

describe("table params serializers", () => {
  it("JSON:API", () => {
    expect(jsonApiTableParams()(STATE)).toEqual({
      sort: "-amount,customer_name",
      "page[number]": "2",
      "page[size]": "20",
    })
    expect(jsonApiTableParams()(UNSORTED)).not.toHaveProperty("sort")
  })

  it("Django REST framework", () => {
    expect(djangoTableParams()(STATE)).toEqual({
      ordering: "-amount,customer_name",
      page: "2",
      page_size: "20",
    })
    expect(
      djangoTableParams({
        orderingParam: "order_by",
        pageSizeParam: "limit",
        sortField: (id) => id.replace("_", "__"),
      })(STATE)
    ).toEqual({ order_by: "-amount,customer__name", page: "2", limit: "20" })
  })

  it("PostgREST", () => {
    expect(postgrestTableParams()(STATE)).toEqual({
      order: "amount.desc,customer_name.asc",
      limit: "20",
      offset: "20",
    })
    expect(postgrestTableParams()(UNSORTED)).toEqual({
      limit: "20",
      offset: "20",
    })
  })

  describe("search", () => {
    const SEARCHED: TableUrlState = { ...UNSORTED, search: "nguyễn an" }

    it("goes into filter[search] for JSON:API", () => {
      expect(jsonApiTableParams()(SEARCHED)["filter[search]"]).toBe("nguyễn an")
      expect(
        jsonApiTableParams({ searchParam: "filter[q]" })(SEARCHED)
      ).toHaveProperty("filter[q]", "nguyễn an")
      expect(jsonApiTableParams()(STATE)).not.toHaveProperty("filter[search]")
    })

    it("goes into search for Django REST framework", () => {
      expect(djangoTableParams()(SEARCHED).search).toBe("nguyễn an")
      expect(djangoTableParams({ searchParam: "q" })(SEARCHED).q).toBe(
        "nguyễn an"
      )
      expect(djangoTableParams()(STATE)).not.toHaveProperty("search")
    })

    it("becomes an ilike over the search columns for PostgREST", () => {
      const serialize = postgrestTableParams({
        searchColumns: ["name", "email"],
      })
      expect(serialize({ ...UNSORTED, search: "ann" }).and).toBe(
        "(or(name.ilike.*ann*,email.ilike.*ann*))"
      )
      // Reserved characters are quoted, LIKE wildcards escaped.
      expect(serialize({ ...UNSORTED, search: 'a,b"c"5%' }).and).toBe(
        '(or(name.ilike."*a,b\\"c\\"5\\\\%*",email.ilike."*a,b\\"c\\"5\\\\%*"))'
      )
      // Every word, in any column.
      expect(serialize({ ...UNSORTED, search: "ann  lee" }).and).toBe(
        "(or(name.ilike.*ann*,email.ilike.*ann*),or(name.ilike.*lee*,email.ilike.*lee*))"
      )
      // Without columns there's nowhere to search.
      expect(postgrestTableParams()(SEARCHED)).not.toHaveProperty("and")
    })
  })
})
