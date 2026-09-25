import {
  columnPinningFeature,
  columnVisibilityFeature,
  createColumnHelper,
  tableFeatures,
} from "@tanstack/react-table"
import { describe, expect, it } from "vitest"

import {
  getDefaultLayout,
  getLayoutColumns,
  parseLayout,
  serializeLayout,
  type DataTableColumnMeta,
  type LayoutColumnDef,
  type TableLayoutState,
} from "./table-layout-state"

interface Order {
  id: string
  customer: { name: string }
  amount: number
  status: string
}

// Only its type is used: it types the column helper.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const features = tableFeatures({
  columnVisibilityFeature,
  columnPinningFeature,
  columnMeta: {} as DataTableColumnMeta,
})
const helper = createColumnHelper<typeof features, Order>()
const COLUMNS = helper.columns([
  helper.display({
    id: "select",
    enableHiding: false,
    enablePinning: false,
    meta: { defaultPinned: "start" },
  }),
  helper.accessor("customer.name", { header: "Customer" }),
  helper.group({
    header: "Money",
    columns: helper.columns([
      helper.accessor("amount", {}),
      helper.accessor("status", { meta: { defaultHidden: true } }),
    ]),
  }),
  helper.display({ id: "actions", meta: { defaultPinned: "end" } }),
])
const columns = getLayoutColumns(COLUMNS)

const saved = (state: Partial<TableLayoutState>, version = 0) =>
  JSON.stringify({ version, state })

describe("getLayoutColumns", () => {
  it("lists leaf columns with the ids TanStack Table gives them", () => {
    expect(columns.map((c) => c.id)).toEqual([
      "select",
      "customer_name",
      "amount",
      "status",
      "actions",
    ])
    expect(columns[0]).toEqual({
      id: "select",
      canHide: false,
      canPin: false,
      canSort: false,
      defaultHidden: false,
      defaultPinned: "start",
    })
  })

  it("counts a group with no columns as a leaf, like TanStack Table", () => {
    expect(getLayoutColumns([{ id: "empty", columns: [] }])).toHaveLength(1)
  })

  it("marks columns with a value and sorting on as sortable", () => {
    expect(columns.filter((c) => c.canSort).map((c) => c.id)).toEqual([
      "customer_name",
      "amount",
      "status",
    ])
    expect(
      getLayoutColumns([{ accessorKey: "a", enableSorting: false }])[0]!.canSort
    ).toBe(false)
  })

  it("falls back to a string header and skips columns with no id", () => {
    const defs: LayoutColumnDef[] = [
      { header: "Notes" },
      { header: () => null },
    ]
    expect(getLayoutColumns(defs).map((c) => c.id)).toEqual(["Notes"])
  })
})

describe("getDefaultLayout", () => {
  it("reads hidden and pinned columns from meta", () => {
    expect(getDefaultLayout(columns)).toEqual({
      columnVisibility: { status: false },
      columnOrder: ["select", "customer_name", "amount", "status", "actions"],
      columnPinning: { start: ["select"], end: ["actions"] },
      columnSizing: {},
      columnColors: {},
    })
  })
})

describe("parseLayout", () => {
  const defaults = getDefaultLayout(columns)

  it.each([
    ["nothing saved", null],
    ["broken JSON", "{"],
    ["not an object", "[]"],
    ["another version", saved({ columnOrder: ["amount"] }, 2)],
    ["no state", JSON.stringify({ version: 0 })],
  ])("gives the defaults for %s", (_, raw) => {
    expect(parseLayout(raw, columns, 0)).toEqual(defaults)
  })

  it("round-trips a layout", () => {
    const layout: TableLayoutState = {
      columnVisibility: { amount: false },
      columnOrder: ["select", "amount", "customer_name", "status", "actions"],
      columnPinning: {
        start: ["select", "customer_name"],
        end: ["amount", "actions"],
      },
      columnSizing: { amount: 180 },
      columnColors: { status: "amber" },
    }
    expect(
      parseLayout(serializeLayout(layout, columns, 3), columns, 3)
    ).toEqual(layout)
  })

  it("adds new columns with their defaults and drops removed ones", () => {
    const raw = saved({
      columnVisibility: { amount: false, gone: false },
      columnOrder: ["amount", "gone", "customer_name", "select"],
      columnPinning: { start: ["select", "gone"], end: [] },
      columnSizing: { gone: 100 },
      columnColors: { gone: "red" },
    })
    // `status` and `actions` are new: status hidden, actions pinned to the end.
    expect(parseLayout(raw, columns, 0)).toEqual({
      columnVisibility: { amount: false, status: false },
      columnOrder: ["amount", "customer_name", "select", "status", "actions"],
      columnPinning: { start: ["select"], end: ["actions"] },
      columnSizing: {},
      columnColors: {},
    })
  })

  it("keeps the defaults of columns that can't hide or pin", () => {
    const raw = saved({
      columnVisibility: { select: false, status: true },
      columnOrder: defaults.columnOrder,
      columnPinning: { start: [], end: ["select", "actions"] },
    })
    const layout = parseLayout(raw, columns, 0)
    expect(layout.columnVisibility).toEqual({})
    expect(layout.columnPinning).toEqual({
      start: ["select"],
      end: ["actions"],
    })
  })

  it("lets the user unpin a column that can pin", () => {
    const raw = saved({
      columnOrder: defaults.columnOrder,
      columnPinning: { start: [], end: [] },
    })
    expect(parseLayout(raw, columns, 0).columnPinning).toEqual({
      start: ["select"],
      end: [],
    })
  })

  it("saves a short column order in full, so saved columns aren't read as new", () => {
    const layout = {
      ...defaults,
      columnVisibility: { amount: false },
      columnOrder: ["status", "ghost"],
      columnPinning: { start: ["select", "customer_name"], end: ["actions"] },
    }
    const raw = serializeLayout(layout, columns, 0)
    expect(JSON.parse(raw).state.columnOrder).toEqual([
      "status",
      "select",
      "customer_name",
      "amount",
      "actions",
    ])
    const parsed = parseLayout(raw, columns, 0)
    expect(parsed.columnVisibility).toEqual({ amount: false })
    expect(parsed.columnPinning.start).toEqual(["select", "customer_name"])
  })

  it("drops bad values", () => {
    const raw = saved({
      columnOrder: ["amount", "amount", 7, null] as never,
      columnPinning: {
        start: ["amount"],
        end: ["amount", "customer_name"],
      },
      columnSizing: {
        amount: -1,
        status: Infinity,
        customer_name: "80",
      } as never,
      columnColors: {
        amount: "",
        status: "x".repeat(101),
        customer_name: 3,
      } as never,
    })
    const layout = parseLayout(raw, columns, 0)
    expect(layout.columnOrder).toEqual([
      "amount",
      "select",
      "customer_name",
      "status",
      "actions",
    ])
    expect(layout.columnPinning).toEqual({
      start: ["select", "amount"],
      // Not in the saved order, so it's new and keeps its default.
      end: ["actions"],
    })
    expect(layout.columnSizing).toEqual({})
    expect(layout.columnColors).toEqual({})
  })

  it("ignores prototype keys", () => {
    const raw =
      '{"version":0,"state":{"columnOrder":["amount"],"columnSizing":{"__proto__":{"x":1},"toString":5},"columnColors":{"constructor":"red"}}}'
    const layout = parseLayout(raw, columns, 0)
    expect(layout.columnSizing).toEqual({})
    expect(layout.columnColors).toEqual({})
    expect(Object.getPrototypeOf(layout.columnSizing)).toBe(Object.prototype)
  })
})
