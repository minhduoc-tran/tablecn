import { toSearchText } from "@querycn/filter-core"

import { columnId, type LayoutColumnDef } from "./table-layout-state"

type Accessor<TData> = (row: TData, index: number) => unknown

const MATCH = { accentInsensitive: true }

// `customer.name` reads a nested value, as TanStack Table does.
const readPath = (row: unknown, path: string) =>
  path
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        value !== null && typeof value === "object"
          ? (value as Record<string, unknown>)[key]
          : undefined,
      row
    )

interface SearchColumn<TData> {
  id: string
  /** `undefined` for display columns, which have no value to search. */
  get?: Accessor<TData>
}

function getColumns<TData>(
  defs: readonly LayoutColumnDef[]
): SearchColumn<TData>[] {
  return defs.flatMap((def): SearchColumn<TData>[] => {
    if (def.columns?.length) return getColumns(def.columns)
    const id = columnId(def)
    if (id === undefined) return []
    if (typeof def.accessorFn === "function") {
      return [{ id, get: def.accessorFn as Accessor<TData> }]
    }
    if (def.accessorKey !== undefined) {
      const path = String(def.accessorKey)
      return [{ id, get: (row) => readPath(row, path) }]
    }
    return [{ id }]
  })
}

const warned = new Set<string>()

/**
 * How to read each searched column's value: the columns in `ids`, or every
 * column with an accessor. Ids no column has are left out with a warning; if
 * none is left, every column is searched rather than none.
 */
export function getSearchAccessors<TData>(
  defs: readonly LayoutColumnDef[],
  ids?: readonly string[]
): Accessor<TData>[] {
  const columns = getColumns<TData>(defs)
  const unknown = ids?.filter((id) => !columns.some((c) => c.id === id)) ?? []
  for (const id of unknown) {
    if (warned.has(id)) continue
    warned.add(id)
    console.warn(
      `useDataTable: searchColumns names "${id}", which no column has.`
    )
  }
  const chosen = ids ? columns.filter((c) => ids.includes(c.id)) : columns
  return (chosen.length > 0 ? chosen : columns).flatMap((c) =>
    c.get ? [c.get] : []
  )
}

/**
 * Rows whose searched values hold every word of `search`, ignoring case and
 * accents: `nguyen ha noi` finds "Nguyễn Văn An" in "Hà Nội".
 */
export function searchRows<TData>(
  rows: readonly TData[],
  search: string,
  accessors: readonly Accessor<TData>[]
): readonly TData[] {
  const words = toSearchText(search, MATCH)?.split(/\s+/).filter(Boolean)
  if (!words?.length) return rows
  return rows.filter((row, index) => {
    const text = accessors
      .map((get) => toSearchText(get(row, index), MATCH) ?? "")
      .join("\n")
    return words.every((word) => text.includes(word))
  })
}
