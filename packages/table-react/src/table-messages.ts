type Labels<K extends string> = Record<K, string>

/** Every string the table UI shows. */
export interface TableMessages {
  columns: Labels<
    | "menu"
    | "hide"
    | "pinStart"
    | "pinEnd"
    | "unpin"
    | "color"
    | "noColor"
    | "customColor"
    | "fitContent"
    | "fitAll"
    | "resetLayout"
  > & {
    /** The label of a column's own menu in the column list. */
    options: (column: string) => string
  }
  /** Names of the preset column colors. */
  colors: Labels<
    "red" | "orange" | "amber" | "green" | "teal" | "blue" | "violet" | "pink"
  >
  sorting: Labels<"asc" | "desc" | "clear">
  pagination: Labels<
    "label" | "rowsPerPage" | "first" | "previous" | "next" | "last" | "morePages"
  >
  selection: Labels<"selectAll" | "selectRow">
  actions: Labels<"reload" | "clearFilters" | "retry">
  states: Labels<"empty" | "error" | "loading">
  /** Column header controls and what screen readers hear while moving a column. */
  header: {
    move: (column: string) => string
    resize: (column: string) => string
    instructions: string
    pickedUp: (column: string) => string
    movedTo: (column: string, position: number, total: number) => string
    dropped: (column: string, position: number, total: number) => string
    cancelled: (column: string) => string
  }
  counts: {
    /** Formats numbers shown on their own: page buttons and page sizes. */
    number: (value: number) => string
    /** `page` is 1-based; `pageCount` is `undefined` while unknown. */
    page: (page: number, pageCount: number | undefined) => string
    selected: (selected: number, total: number) => string
    rows: (count: number) => string
  }
}

export type TableMessagesOverrides = {
  [Group in keyof TableMessages]?: Partial<TableMessages[Group]>
}

/** Merges overrides per group, so `{ states: { empty: "…" } }` keeps the other states. */
export function mergeTableMessages(
  base: TableMessages,
  overrides: TableMessagesOverrides = {}
): TableMessages {
  const merged: Record<string, object> = { ...base }
  for (const [group, labels] of Object.entries(overrides)) {
    if (!labels) continue
    const defined = Object.entries(labels).filter(([, v]) => v !== undefined)
    merged[group] = {
      ...base[group as keyof TableMessages],
      ...Object.fromEntries(defined),
    }
  }
  return merged as unknown as TableMessages
}
