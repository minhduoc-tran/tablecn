import type { DataTableInstance } from "@querycn/table-react"

type Column<TData extends object> = ReturnType<
  DataTableInstance<TData>["getAllLeafColumns"]
>[number]

export interface CardColumns<TData extends object> {
  /** The row's checkbox, at the card's start. */
  select?: Column<TData>
  title?: Column<TData>
  subtitle?: Column<TData>
  /** Columns without a value, like a row menu, at the card's end. */
  actions: Column<TData>[]
  /** Listed as label and value. */
  fields: Column<TData>[]
}

/**
 * Where each visible column goes in a card: `meta.card` picks the title and
 * subtitle, else the first column with a value is the title.
 */
export function getCardColumns<TData extends object>(
  columns: Column<TData>[]
): CardColumns<TData> {
  const shown = columns.filter(
    (column) => column.columnDef.meta?.card !== "hidden"
  )
  const select = shown.find((column) => column.id === "select")
  const actions = shown.filter(
    (column) => column !== select && !column.accessorFn
  )
  const valued = shown.filter((column) => column.accessorFn)
  const title =
    valued.find((column) => column.columnDef.meta?.card === "title") ??
    valued.find((column) => column.columnDef.meta?.card !== "subtitle")
  const subtitle = valued.find(
    (column) => column !== title && column.columnDef.meta?.card === "subtitle"
  )
  return {
    select,
    title,
    subtitle,
    actions,
    fields: valued.filter((column) => column !== title && column !== subtitle),
  }
}
