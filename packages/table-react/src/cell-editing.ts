export type CellEditorType =
  "text" | "number" | "boolean" | "date" | "time" | "datetime"

export interface CellEditorOption {
  label: string
  value: string
}

/** `meta.edit`: the editor a column's cells open. */
export interface CellEditor {
  /** A built-in editor, `select`, or a type you give the UI an editor for. */
  type: CellEditorType | "select" | (string & {})
  /** A `select`'s options. */
  options?: readonly CellEditorOption[]
  /**
   * A `select`'s options from your API, for what the user types (`""` on
   * open). Searches are debounced, older requests aborted through `signal`,
   * and lists cached per function: define it outside components.
   */
  loadOptions?: (
    search: string,
    signal: AbortSignal
  ) => Promise<CellEditorOption[]>
}

/** What `onCellEdit` gets when a cell is saved. */
export interface CellEdit<TData> {
  row: TData
  rowId: string
  columnId: string
  value: unknown
  previous: unknown
  /** The picked option, from a `select`: its label too, to show before a refetch. */
  option?: CellEditorOption
}

/** A value as the text an input starts with. */
export function formatCellText(value: unknown): string {
  return value === null || value === undefined ? "" : String(value)
}

export type ParsedCellText =
  { value: unknown; error?: undefined } | { error: "invalidNumber" }

/** Typed text as a cell value: a number, or `null` for an empty one. */
export function parseCellText(text: string, type: string): ParsedCellText {
  if (type !== "number") return { value: text }
  const trimmed = text.trim()
  if (trimmed === "") return { value: null }
  const value = Number(trimmed)
  return Number.isFinite(value) ? { value } : { error: "invalidNumber" }
}
