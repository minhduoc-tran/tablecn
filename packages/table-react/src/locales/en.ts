import type { TableMessages } from "../table-messages"

export const enTableMessages: TableMessages = {
  columns: {
    menu: "Columns",
    hide: "Hide column",
    pinStart: "Pin to start",
    pinEnd: "Pin to end",
    unpin: "Unpin",
    color: "Color",
    noColor: "No color",
    fitContent: "Fit to content",
    fitAll: "Fit all columns",
    resetLayout: "Reset layout",
  },
  sorting: { asc: "Ascending", desc: "Descending", clear: "Clear sort" },
  pagination: {
    rowsPerPage: "Rows per page",
    first: "First page",
    previous: "Previous page",
    next: "Next page",
    last: "Last page",
  },
  selection: { selectAll: "Select all", selectRow: "Select row" },
  actions: { reload: "Reload", clearFilters: "Clear filters", retry: "Retry" },
  states: {
    empty: "No results.",
    error: "Something went wrong.",
    loading: "Loading…",
  },
  counts: {
    page: (page, pageCount) =>
      pageCount === undefined ? `Page ${page}` : `Page ${page} of ${pageCount}`,
    selected: (selected, total) => `${selected} of ${total} selected`,
    rows: (count) => (count === 1 ? "1 row" : `${count} rows`),
  },
}
