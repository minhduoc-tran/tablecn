import { describe, expect, it } from "vitest"

import { createRegistry } from "../registry"
import type { FieldDefinition, FilterRule, FilterValue, Join } from "../types"
import { applyFilter, type ClientFilterContext } from "./apply-filter"

interface Row {
  id: number
  name?: unknown
  amount?: unknown
  status?: unknown
  tags?: unknown
  active?: unknown
  day?: unknown
  at?: unknown
}

const fields: FieldDefinition[] = [
  { name: "name", label: "Name", type: "text" },
  { name: "amount", label: "Amount", type: "number" },
  { name: "status", label: "Status", type: "select" },
  { name: "tags", label: "Tags", type: "multiSelect" },
  { name: "active", label: "Active", type: "boolean" },
  { name: "day", label: "Day", type: "date" },
  { name: "at", label: "At", type: "datetime" },
]

let seq = 0
const rule = (
  field: string,
  operator: string | null,
  value: FilterValue
): FilterRule => ({ id: `r${++seq}`, field, operator, value })

const ids = (
  rows: Row[],
  rules: FilterRule[],
  join: Join = "and",
  extra: Partial<ClientFilterContext<Row>> = {}
) => applyFilter(rows, { join, rules }, { fields, ...extra }).map((r) => r.id)

describe("text", () => {
  const rows: Row[] = [
    { id: 1, name: "Đà Nẵng" },
    { id: 2, name: "Hà Nội" },
    { id: 3, name: "DA NANG port" },
  ]

  it("ignores case and Vietnamese accents, including đ", () => {
    expect(ids(rows, [rule("name", "contains", "da nang")])).toEqual([1, 3])
    expect(ids(rows, [rule("name", "eq", "ĐÀ NẴNG")])).toEqual([1])
    expect(ids(rows, [rule("name", "startsWith", "ha")])).toEqual([2])
    expect(ids(rows, [rule("name", "endsWith", "port")])).toEqual([3])
  })

  it("keeps accents when accentInsensitive is off", () => {
    expect(
      ids(rows, [rule("name", "contains", "da nang")], "and", {
        accentInsensitive: false,
      })
    ).toEqual([3])
  })

  it("matches decomposed input when accents are kept", () => {
    const decomposed = [{ id: 1, name: "Đà Nẵng".normalize("NFD") }]
    expect(
      ids(decomposed, [rule("name", "contains", "Nẵng")], "and", {
        accentInsensitive: false,
      })
    ).toEqual([1])
  })

  it("negations keep rows without a value", () => {
    const withEmpty = [...rows, { id: 4 }]
    expect(ids(withEmpty, [rule("name", "notContains", "nang")])).toEqual([
      2, 4,
    ])
  })
})

describe("number", () => {
  const rows: Row[] = [
    { id: 1, amount: 5 },
    { id: 2, amount: "12" },
    { id: 3, amount: "abc" },
    { id: 4, amount: null },
    { id: 5, amount: 0 },
  ]

  it("reads numeric strings and never matches non-numbers", () => {
    expect(ids(rows, [rule("amount", "gt", 4)])).toEqual([1, 2])
    expect(ids(rows, [rule("amount", "lte", 5)])).toEqual([1, 5])
    expect(ids(rows, [rule("amount", "between", [5, 12])])).toEqual([1, 2])
    expect(ids(rows, [rule("amount", "eq", "12")])).toEqual([2])
  })

  it("treats unreadable values as present but never matching", () => {
    const messy: Row[] = [
      { id: 1, amount: "1,200" },
      { id: 2, amount: null },
      { id: 3, amount: 7 },
    ]
    expect(ids(messy, [rule("amount", "isEmpty", null)])).toEqual([2])
    expect(ids(messy, [rule("amount", "isNotEmpty", null)])).toEqual([3])
    expect(ids(messy, [rule("amount", "ne", 5)])).toEqual([2, 3])
  })

  it("matches nothing for a reversed range", () => {
    expect(ids(rows, [rule("amount", "between", [12, 5])])).toEqual([])
  })
})

describe("empty checks", () => {
  const rows: Row[] = [
    { id: 1, name: null },
    { id: 2 },
    { id: 3, name: "" },
    { id: 4, name: "  " },
    { id: 5, name: "x" },
  ]

  it("treats null, missing, blank and [] as empty", () => {
    expect(ids(rows, [rule("name", "isEmpty", null)])).toEqual([1, 2, 3, 4])
    expect(ids(rows, [rule("name", "isNotEmpty", null)])).toEqual([5])
    expect(
      ids(
        [
          { id: 1, tags: [] },
          { id: 2, tags: ["a"] },
        ],
        [rule("tags", "isEmpty", null)]
      )
    ).toEqual([1])
  })

  it("keeps 0 and false as values", () => {
    expect(
      ids(
        [
          { id: 1, amount: 0 },
          { id: 2, active: false },
        ],
        [rule("amount", "isEmpty", null)]
      )
    ).toEqual([2])
    expect(
      ids(
        [
          { id: 1, name: 0 },
          { id: 2, name: false },
        ],
        [rule("name", "isNotEmpty", null)]
      )
    ).toEqual([1, 2])
  })
})

describe("lists in the row", () => {
  const rows: Row[] = [
    { id: 1, tags: ["a", "b"] },
    { id: 2, tags: ["c"] },
    { id: 3, tags: "b" },
    { id: 4 },
  ]

  it("in matches when any item is listed; notIn when none is", () => {
    expect(ids(rows, [rule("tags", "in", ["b", "x"])])).toEqual([1, 3])
    expect(ids(rows, [rule("tags", "notIn", ["b"])])).toEqual([2, 4])
  })

  it("applies single-value operators to each item", () => {
    const named = [
      { id: 1, name: ["Alpha", "Beta"] },
      { id: 2, name: ["Gamma"] },
    ]
    expect(ids(named, [rule("name", "contains", "bet")])).toEqual([1])
    expect(ids(named, [rule("name", "ne", "alpha")])).toEqual([2])
  })
})

describe("select and boolean", () => {
  it("compares select values exactly, as ids", () => {
    const rows: Row[] = [
      { id: 1, status: 3 },
      { id: 2, status: "ACTIVE" },
    ]
    expect(ids(rows, [rule("status", "eq", "3")])).toEqual([1])
    expect(ids(rows, [rule("status", "eq", "ACTIVE")])).toEqual([2])
    expect(ids(rows, [rule("status", "eq", "active")])).toEqual([])
  })

  it("reads boolean strings", () => {
    const rows: Row[] = [
      { id: 1, active: true },
      { id: 2, active: "false" },
      { id: 3, active: false },
      { id: 4 },
    ]
    expect(ids(rows, [rule("active", "eq", false)])).toEqual([2, 3])
  })
})

describe("dates", () => {
  it("compares date fields by day, reading Date objects in local time", () => {
    const rows: Row[] = [
      { id: 1, day: "2026-09-24T23:00:00" },
      { id: 2, day: new Date(2026, 8, 25, 1, 0) },
      { id: 3, day: "2026-09-26" },
      { id: 4, day: "not a date" },
    ]
    expect(ids(rows, [rule("day", "eq", "2026-09-24")])).toEqual([1])
    expect(
      ids(rows, [rule("day", "between", ["2026-09-25", "2026-09-26"])])
    ).toEqual([2, 3])
  })

  it("reads an instant as the same local day whatever its form", () => {
    const instant = "2026-09-24T20:00:00Z"
    const date = new Date(instant)
    const localDay = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-")
    const rows: Row[] = [
      { id: 1, day: instant },
      { id: 2, day: date },
      { id: 3, day: date.getTime() },
      { id: 4, day: "2026-09-24T20:00:00+00:00" },
    ]
    expect(ids(rows, [rule("day", "eq", localDay)])).toEqual([1, 2, 3, 4])
  })

  it("never matches impossible dates or loose datetime strings", () => {
    const days: Row[] = [{ id: 1, day: "2026-13-99" }]
    expect(ids(days, [rule("day", "isNotEmpty", null)])).toEqual([])
    expect(ids(days, [rule("day", "isEmpty", null)])).toEqual([])
    const times: Row[] = [
      { id: 1, at: "12" },
      { id: 2, at: "Sept 3" },
    ]
    expect(ids(times, [rule("at", "gte", "2000-01-01T00:00")])).toEqual([])
  })

  it("compares datetime fields as instants, not strings", () => {
    const rows: Row[] = [
      { id: 1, at: "2026-09-24T10:00:00+07:00" },
      { id: 2, at: new Date("2026-09-24T05:00:00Z") },
      { id: 3, at: "2026-09-24T02:00:00Z" },
    ]
    expect(ids(rows, [rule("at", "gte", "2026-09-24T03:00:00Z")])).toEqual([
      1, 2,
    ])
  })
})

describe("join and rule selection", () => {
  const rows: Row[] = [
    { id: 1, name: "a", amount: 1 },
    { id: 2, name: "b", amount: 2 },
    { id: 3, name: "c", amount: 3 },
  ]

  it("ANDs or ORs the rules", () => {
    const rules = [rule("name", "eq", "a"), rule("amount", "gte", 3)]
    expect(ids(rows, rules, "and")).toEqual([])
    expect(ids(rows, rules, "or")).toEqual([1, 3])
  })

  it("keeps every row when no rule is complete", () => {
    const incomplete = [rule("name", "contains", ""), rule("name", null, null)]
    expect(ids(rows, [], "and")).toEqual([1, 2, 3])
    expect(ids(rows, incomplete, "or")).toEqual([1, 2, 3])
  })

  it("ignores incomplete rules next to complete ones", () => {
    expect(
      ids(rows, [rule("name", "eq", "b"), rule("amount", "gt", null)])
    ).toEqual([2])
  })
})

describe("extension points", () => {
  it("reads values through getValue", () => {
    const rows = [
      { id: 1, customer: { name: "Anh" } },
      { id: 2, customer: { name: "Bình" } },
    ]
    const matched = applyFilter(
      rows,
      { join: "and", rules: [rule("name", "contains", "binh")] },
      {
        fields,
        getValue: (row, field) =>
          field.name === "name" ? row.customer.name : undefined,
      }
    )
    expect(matched.map((r) => r.id)).toEqual([2])
  })

  it("uses a custom operator's match and a custom type's toComparable", () => {
    const registry = createRegistry({
      operators: [
        {
          id: "divisibleBy",
          arity: "single",
          match: (items, expected) =>
            items.some((item) => (item as number) % (expected as number) === 0),
        },
      ],
      fieldTypes: [
        {
          id: "cents",
          operators: ["divisibleBy", "gt"],
          defaultOperator: "gt",
          parseValue: (raw) => (typeof raw === "number" ? raw : undefined),
          // Dollars in, cents compared, so float noise can't break equality.
          toComparable: (value) =>
            value === null || value === undefined || Number.isNaN(Number(value))
              ? null
              : Math.round(Number(value) * 100),
        },
      ],
    })
    const context = {
      fields: [{ name: "price", label: "Price", type: "cents" }],
      registry,
    }
    const rows = [
      { id: 1, price: "1.50" },
      { id: 2, price: "2.00" },
    ]
    const run = (r: FilterRule) =>
      applyFilter(rows, { join: "and", rules: [r] }, context).map((x) => x.id)
    expect(run(rule("price", "divisibleBy", 1))).toEqual([2])
    expect(run(rule("price", "gt", 1.6))).toEqual([2])
  })

  it("excludes every row for an operator without match", () => {
    const registry = createRegistry({
      operators: [{ id: "near", arity: "single" }],
      fieldTypes: [
        {
          id: "geo",
          operators: ["near"],
          defaultOperator: "near",
          parseValue: (raw) => (typeof raw === "string" ? raw : undefined),
        },
      ],
    })
    expect(
      applyFilter(
        [{ id: 1, place: "x" }],
        { join: "or", rules: [rule("place", "near", "x")] },
        { fields: [{ name: "place", label: "Place", type: "geo" }], registry }
      )
    ).toEqual([])
  })

  it("treats prototype names as missing values", () => {
    const context = {
      fields: [{ name: "constructor", label: "C", type: "text" }],
    }
    expect(
      applyFilter(
        [{ id: 1 }],
        { join: "and", rules: [rule("constructor", "isEmpty", null)] },
        context
      )
    ).toEqual([{ id: 1 }])
  })

  it("keeps client matching when a built-in is overridden", () => {
    const registry = createRegistry({
      operators: [{ id: "contains", arity: "single" }],
      fieldTypes: [
        {
          id: "text",
          operators: ["contains"],
          defaultOperator: "contains",
          parseValue: (raw) => (typeof raw === "string" ? raw : undefined),
        },
      ],
    })
    expect(
      applyFilter(
        [{ id: 1, name: "Đà Nẵng" }],
        { join: "and", rules: [rule("name", "contains", "da")] },
        { fields, registry }
      )
    ).toHaveLength(1)
  })

  it("never orders NaN from a custom toComparable", () => {
    const registry = createRegistry({
      fieldTypes: [
        {
          id: "loose",
          operators: ["gte", "isEmpty"],
          defaultOperator: "gte",
          parseValue: (raw) => (typeof raw === "number" ? raw : undefined),
          toComparable: (value) =>
            typeof value === "number" ? value : Number(value),
        },
      ],
    })
    const context = {
      fields: [{ name: "x", label: "X", type: "loose" }],
      registry,
    }
    const rows = [{ id: 1, x: "abc" }]
    expect(
      applyFilter(rows, { join: "and", rules: [rule("x", "gte", 5)] }, context)
    ).toEqual([])
  })
})
