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
})
