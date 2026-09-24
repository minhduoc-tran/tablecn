import type { FilterMessages } from "../messages"

const dateOperators = {
  eq: "is on",
  gt: "is after",
  gte: "is on or after",
  lt: "is before",
  lte: "is on or before",
}

export const enMessages: FilterMessages = {
  operators: {
    eq: "is",
    ne: "is not",
    contains: "contains",
    notContains: "does not contain",
    startsWith: "starts with",
    endsWith: "ends with",
    gt: "is greater than",
    gte: "is greater than or equal to",
    lt: "is less than",
    lte: "is less than or equal to",
    between: "is between",
    in: "is any of",
    notIn: "is none of",
    isEmpty: "is empty",
    isNotEmpty: "is not empty",
  },
  operatorsByType: { date: dateOperators, datetime: dateOperators },
  join: {
    where: "Where",
    and: "and",
    or: "or",
    toggle: "Combine filters with",
  },
  actions: {
    open: "Filter",
    addRule: "Add filter",
    removeRule: "Remove filter",
    clearAll: "Clear all",
    apply: "Apply",
    cancel: "Cancel",
    retry: "Retry",
  },
  placeholders: {
    field: "Select field",
    operator: "Select operator",
    value: "Enter value",
    search: "Search…",
    from: "From",
    to: "To",
    date: "Pick a date",
    datetime: "Pick date and time",
  },
  rangeSeparator: "–",
  counts: {
    selected: (count) => `${count} selected`,
    more: (count) => `+${count} more`,
    activeFilters: (count) => (count === 1 ? "1 filter" : `${count} filters`),
  },
  empty: {
    rules: "No filters yet",
    fields: "No fields found",
    options: "No results",
  },
  loading: "Loading…",
  errors: { loadOptions: "Couldn't load options" },
  boolean: { true: "Yes", false: "No" },
  warnings: {
    reversedRange: "The start of the range is after its end",
    conflict:
      "Another filter already uses this field; the server may ignore one of them",
    unsupported: "The server can't apply this filter, so it is ignored",
  },
}
