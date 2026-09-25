import type { TableMessages } from "../table-messages"

const format = new Intl.NumberFormat("en-US").format

export const enTableMessages: TableMessages = {
  columns: {
    menu: "Columns",
    hide: "Hide column",
    pinStart: "Pin to start",
    pinEnd: "Pin to end",
    unpin: "Unpin",
    color: "Color",
    noColor: "No color",
    customColor: "Custom color…",
    fitContent: "Fit to content",
    fitAll: "Fit all columns",
    resetLayout: "Reset layout",
    options: (column) => `${column} options`,
  },
  colors: {
    red: "Red",
    orange: "Orange",
    amber: "Amber",
    green: "Green",
    teal: "Teal",
    blue: "Blue",
    violet: "Violet",
    pink: "Pink",
  },
  sorting: { asc: "Ascending", desc: "Descending", clear: "Clear sort" },
  pagination: {
    label: "Pagination",
    rowsPerPage: "Rows per page",
    first: "First page",
    previous: "Previous page",
    next: "Next page",
    last: "Last page",
    morePages: "More pages",
  },
  selection: { selectAll: "Select all", selectRow: "Select row" },
  actions: { reload: "Reload", clearFilters: "Clear filters", retry: "Retry" },
  states: {
    empty: "No results.",
    error: "Something went wrong.",
    loading: "Loading…",
  },
  header: {
    move: (column) => `Move column ${column}`,
    resize: (column) => `Resize column ${column}`,
    instructions:
      "To pick up a column, press space or enter. Use the arrow keys to move it, space or enter to drop it, and escape to cancel.",
    pickedUp: (column) => `Picked up column ${column}.`,
    movedTo: (column, position, total) =>
      `Column ${column} moved to position ${position} of ${total}.`,
    dropped: (column, position, total) =>
      `Column ${column} dropped at position ${position} of ${total}.`,
    cancelled: (column) => `Moving column ${column} was cancelled.`,
  },
  counts: {
    number: format,
    page: (page, pageCount) =>
      pageCount === undefined
        ? `Page ${format(page)}`
        : `Page ${format(page)} of ${format(pageCount)}`,
    selected: (selected, total) =>
      `${format(selected)} of ${format(total)} selected`,
    rows: (count) => (count === 1 ? "1 row" : `${format(count)} rows`),
  },
}
