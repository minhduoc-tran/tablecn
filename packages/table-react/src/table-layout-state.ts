import type {
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  ColumnVisibilityState,
} from "@tanstack/react-table"

import type { ColumnColorsState } from "./column-color-feature"

export interface TableLayoutState {
  columnVisibility: ColumnVisibilityState
  columnOrder: ColumnOrderState
  columnPinning: ColumnPinningState
  columnSizing: ColumnSizingState
  columnColors: ColumnColorsState
}

/** `meta` keys the layout reads from column definitions. */
export interface DataTableColumnMeta {
  defaultHidden?: boolean
  defaultPinned?: "start" | "end"
}

/** The parts of a column definition the layout reads; TanStack column defs fit. */
export interface LayoutColumnDef {
  id?: string
  accessorKey?: unknown
  header?: unknown
  columns?: readonly LayoutColumnDef[]
  enableHiding?: boolean
  enablePinning?: boolean
  meta?: object
}

export interface LayoutColumn {
  id: string
  canHide: boolean
  canPin: boolean
  defaultHidden: boolean
  defaultPinned?: "start" | "end"
}

// Same id TanStack Table gives the column.
function columnId(def: LayoutColumnDef): string | undefined {
  if (def.id !== undefined) return def.id
  if (def.accessorKey !== undefined) {
    return String(def.accessorKey).split(".").join("_")
  }
  return typeof def.header === "string" ? def.header : undefined
}

/** Leaf columns in definition order; group columns only hold others. */
export function getLayoutColumns(
  defs: readonly LayoutColumnDef[]
): LayoutColumn[] {
  return defs.flatMap((def): LayoutColumn[] => {
    // v9 treats a group with no columns as a leaf.
    if (def.columns?.length) return getLayoutColumns(def.columns)
    const id = columnId(def)
    if (id === undefined) return []
    const meta = def.meta as DataTableColumnMeta | undefined
    return [
      {
        id,
        canHide: def.enableHiding ?? true,
        canPin: def.enablePinning ?? true,
        defaultHidden: meta?.defaultHidden ?? false,
        defaultPinned: meta?.defaultPinned,
      },
    ]
  })
}

const idsPinned = (columns: LayoutColumn[], side: "start" | "end") =>
  columns.filter((c) => c.defaultPinned === side).map((c) => c.id)

export function getDefaultLayout(columns: LayoutColumn[]): TableLayoutState {
  return {
    columnVisibility: Object.fromEntries(
      columns
        .filter((c) => c.canHide && c.defaultHidden)
        .map((c) => [c.id, false])
    ),
    columnOrder: columns.map((c) => c.id),
    columnPinning: {
      start: idsPinned(columns, "start"),
      end: idsPinned(columns, "end"),
    },
    columnSizing: {},
    columnColors: {},
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const MAX_COLOR_LENGTH = 100

/**
 * The stored layout over the one from column definitions. Columns added since
 * it was saved get their defaults (order: at the end), removed ones are dropped,
 * and anything unreadable or saved under another `version` gives the defaults.
 */
export function parseLayout(
  raw: string | null,
  columns: LayoutColumn[],
  version: number
): TableLayoutState {
  const defaults = getDefaultLayout(columns)
  if (raw === null) return defaults
  let stored: unknown
  try {
    stored = JSON.parse(raw)
  } catch {
    return defaults
  }
  if (
    !isRecord(stored) ||
    stored.version !== version ||
    !isRecord(stored.state)
  ) {
    return defaults
  }
  const state = stored.state
  const byId = new Map(columns.map((c) => [c.id, c]))
  const knownIds = (value: unknown) =>
    Array.isArray(value)
      ? [...new Set(value.filter((id): id is string => byId.has(id)))]
      : []
  const entries = (value: unknown) =>
    isRecord(value) ? Object.entries(value).filter(([id]) => byId.has(id)) : []

  const order = knownIds(state.columnOrder)
  const seen = new Set(order)
  // Columns the user couldn't change, or hasn't seen yet, keep their defaults.
  const keepsDefault = (c: LayoutColumn) => !seen.has(c.id)

  const storedVisibility = new Map(entries(state.columnVisibility))
  const hidden = columns.filter((c) =>
    !c.canHide
      ? false
      : keepsDefault(c)
        ? c.defaultHidden
        : storedVisibility.get(c.id) === false
  )

  const pinning = isRecord(state.columnPinning) ? state.columnPinning : {}
  const storedStart = knownIds(pinning.start)
  const storedEnd = knownIds(pinning.end).filter(
    (id) => !storedStart.includes(id)
  )
  const sideOf = (c: LayoutColumn) =>
    keepsDefault(c) || !c.canPin
      ? c.defaultPinned
      : storedStart.includes(c.id)
        ? "start"
        : storedEnd.includes(c.id)
          ? "end"
          : undefined
  // Columns that can't be unpinned stay at the outer edge.
  const pinned = (side: "start" | "end", storedIds: string[]) => {
    const onSide = columns.filter((c) => sideOf(c) === side)
    const fixed = onSide.filter((c) => !c.canPin).map((c) => c.id)
    const movable = onSide.filter((c) => c.canPin).map((c) => c.id)
    const ordered = [
      ...storedIds.filter((id) => movable.includes(id)),
      ...movable.filter((id) => !storedIds.includes(id)),
    ]
    return side === "start" ? [...fixed, ...ordered] : [...ordered, ...fixed]
  }

  return {
    columnVisibility: Object.fromEntries(hidden.map((c) => [c.id, false])),
    columnOrder: [
      ...order,
      ...defaults.columnOrder.filter((id) => !seen.has(id)),
    ],
    columnPinning: {
      start: pinned("start", storedStart),
      end: pinned("end", storedEnd),
    },
    columnSizing: Object.fromEntries(
      entries(state.columnSizing).filter(
        ([, size]) =>
          typeof size === "number" && Number.isFinite(size) && size > 0
      )
    ) as ColumnSizingState,
    columnColors: Object.fromEntries(
      entries(state.columnColors).filter(
        ([, color]) =>
          typeof color === "string" &&
          color.length > 0 &&
          color.length <= MAX_COLOR_LENGTH
      )
    ) as ColumnColorsState,
  }
}

/**
 * Saved with every column in `columnOrder`, as TanStack Table shows them (missing
 * ids go last), so a short order (`resetColumnOrder()` writes `[]`) isn't read
 * back as columns the user has never seen.
 */
export function serializeLayout(
  state: TableLayoutState,
  columns: LayoutColumn[],
  version: number
) {
  const order = state.columnOrder.filter((id) =>
    columns.some((c) => c.id === id)
  )
  const columnOrder = [
    ...order,
    ...columns.map((c) => c.id).filter((id) => !order.includes(id)),
  ]
  return JSON.stringify({ version, state: { ...state, columnOrder } })
}
