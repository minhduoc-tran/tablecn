import { afterEach, describe, expect, it, vi } from "vitest"

import { createDataTableColumnHelper } from "./data-table-features"
import { getSearchAccessors, searchRows } from "./table-search"

interface Person {
  id: string
  name: { first: string; last: string }
  city: string
}

const PEOPLE: Person[] = [
  { id: "1", name: { first: "Nguyễn", last: "An" }, city: "Hà Nội" },
  { id: "2", name: { first: "Olivia", last: "Martin" }, city: "Huế" },
]

const helper = createDataTableColumnHelper<Person>()
const COLUMNS = helper.columns([
  helper.display({ id: "select" }),
  helper.group({
    id: "person",
    columns: helper.columns([
      helper.accessor("name.first", {}),
      helper.accessor((row) => row.name.last, { id: "last" }),
    ]),
  }),
  helper.accessor("city", {}),
])

const search = (text: string, ids?: string[]) =>
  searchRows(PEOPLE, text, getSearchAccessors<Person>(COLUMNS, ids)).map(
    (row) => row.id
  )

afterEach(() => vi.restoreAllMocks())

describe("searchRows", () => {
  it("reads nested keys, accessor functions and grouped columns", () => {
    expect(search("nguyen")).toEqual(["1"])
    expect(search("martin")).toEqual(["2"])
    expect(search("hue")).toEqual(["2"])
  })

  it("wants every word, in any column", () => {
    expect(search("an ha noi")).toEqual(["1"])
    expect(search("an hue")).toEqual([])
  })

  it("keeps every row for blank text", () => {
    expect(search("  ")).toEqual(["1", "2"])
  })

  it("searches only the named columns", () => {
    expect(search("hue", ["name_first", "last"])).toEqual([])
    expect(search("hue", ["city"])).toEqual(["2"])
  })

  it("warns about ids no column has, and searches every column if none is left", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(search("hue", ["town", "city"])).toEqual(["2"])
    expect(search("martin", ["nope"])).toEqual(["2"])
    expect(warn.mock.calls.map(([message]) => message)).toEqual([
      'useDataTable: searchColumns names "town", which no column has.',
      'useDataTable: searchColumns names "nope", which no column has.',
    ])
  })
})
