import {
  toDateOnly,
  toOptionValue,
  toSearchText,
  toTimestamp,
} from "./client-filter/comparable-values"
import type {
  Arity,
  BuiltinFieldTypeId,
  FieldTypeId,
  FilterValue,
  MatchOptions,
  OperatorId,
  Primitive,
} from "./types"

export interface FieldTypeDefinition {
  id: FieldTypeId
  /** Operators offered for this type, in display order. */
  operators: OperatorId[]
  defaultOperator: OperatorId
  /** Coerces raw input (URL, form) to the canonical value; `undefined` = invalid. */
  parseValue(raw: unknown, arity: Arity): FilterValue | undefined
  /**
   * Client-side filtering: maps a row value and a rule value to what operators
   * compare; `null` = empty. Defaults to primitives as they are.
   */
  toComparable?(value: unknown, options: MatchOptions): Primitive | null
}

type ParsePrimitive = (raw: unknown) => Primitive | undefined

/** Builds a `parseValue` that applies `parseOne` to every item the arity expects. */
export function createValueParser(
  parseOne: ParsePrimitive
): FieldTypeDefinition["parseValue"] {
  return (raw, arity) => {
    switch (arity) {
      case "none":
        return null
      case "single":
        return parseOne(raw)
      case "range": {
        if (!Array.isArray(raw) || raw.length !== 2) return undefined
        const from = parseOne(raw[0])
        const to = parseOne(raw[1])
        return from === undefined || to === undefined ? undefined : [from, to]
      }
      case "multi": {
        if (!Array.isArray(raw)) return undefined
        const items = raw.map(parseOne)
        return items.every((item) => item !== undefined)
          ? (items as Primitive[])
          : undefined
      }
    }
  }
}

const parseString: ParsePrimitive = (raw) =>
  typeof raw === "string"
    ? raw
    : typeof raw === "number" && Number.isFinite(raw)
      ? String(raw)
      : undefined

const parseNumber: ParsePrimitive = (raw) => {
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== ""
        ? Number(raw)
        : NaN
  return Number.isFinite(value) ? value : undefined
}

// Text that isn't a number (e.g. "12,5") is sent as typed; the backend decides what it means.
const parseNumberInput: ParsePrimitive = (raw) =>
  parseNumber(raw) ??
  (typeof raw === "string" && raw.trim() !== "" ? raw.trim() : undefined)

// Dates stay as `YYYY-MM-DD` strings: converting to Date would shift the day across time zones.
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const parseDate: ParsePrimitive = (raw) => {
  if (typeof raw !== "string") return undefined
  const match = DATE_PATTERN.exec(raw)
  if (!match) return undefined
  const [year, month, day] = match.slice(1).map(Number) as [
    number,
    number,
    number,
  ]
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? raw
    : undefined
}

const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

const parseDateTime: ParsePrimitive = (raw) =>
  typeof raw === "string" &&
  DATETIME_PATTERN.test(raw) &&
  !Number.isNaN(Date.parse(raw))
    ? raw
    : undefined

const parseBoolean: ParsePrimitive = (raw) => {
  if (typeof raw === "boolean") return raw
  if (raw === "true") return true
  if (raw === "false") return false
  return undefined
}

const EMPTY_OPERATORS: OperatorId[] = ["isEmpty", "isNotEmpty"]
const RANGE_OPERATORS: OperatorId[] = ["gt", "gte", "lt", "lte", "between"]

export const BUILTIN_FIELD_TYPES: Readonly<
  Record<BuiltinFieldTypeId, FieldTypeDefinition>
> = {
  text: {
    id: "text",
    operators: [
      "contains",
      "notContains",
      "eq",
      "ne",
      "startsWith",
      "endsWith",
      ...EMPTY_OPERATORS,
    ],
    defaultOperator: "contains",
    parseValue: createValueParser(parseString),
    toComparable: toSearchText,
  },
  number: {
    id: "number",
    operators: ["eq", "ne", ...RANGE_OPERATORS, ...EMPTY_OPERATORS],
    defaultOperator: "eq",
    parseValue: createValueParser(parseNumberInput),
    toComparable: (value) => parseNumber(value) ?? null,
  },
  date: {
    id: "date",
    operators: ["eq", ...RANGE_OPERATORS, ...EMPTY_OPERATORS],
    defaultOperator: "eq",
    parseValue: createValueParser(parseDate),
    toComparable: toDateOnly,
  },
  // No `eq`: exact-instant equality is never what users mean.
  datetime: {
    id: "datetime",
    operators: [...RANGE_OPERATORS, ...EMPTY_OPERATORS],
    defaultOperator: "between",
    parseValue: createValueParser(parseDateTime),
    toComparable: toTimestamp,
  },
  boolean: {
    id: "boolean",
    operators: ["eq"],
    defaultOperator: "eq",
    parseValue: createValueParser(parseBoolean),
    toComparable: (value) => parseBoolean(value) ?? null,
  },
  select: {
    id: "select",
    operators: ["eq", "ne", ...EMPTY_OPERATORS],
    defaultOperator: "eq",
    parseValue: createValueParser(parseString),
    toComparable: toOptionValue,
  },
  multiSelect: {
    id: "multiSelect",
    operators: ["in", "notIn", ...EMPTY_OPERATORS],
    defaultOperator: "in",
    parseValue: createValueParser(parseString),
    toComparable: toOptionValue,
  },
}
