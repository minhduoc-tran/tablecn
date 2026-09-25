import type { FilterContext } from "./context"
import { getOperatorArity } from "./operators"
import { DEFAULT_REGISTRY } from "./registry"
import type { FilterValue, OperatorId, Primitive } from "./types"

/** A rule as it travels through the URL; ids are never stored. */
export interface UrlRule {
  field: string
  operator: OperatorId
  /** On decode, raw text is fine: the field type parses it, e.g. `"5"` → `5`. */
  value: FilterValue
}

/** How rules map to query params. One param per rule; `joinParam=or` marks an OR. */
export interface UrlFormat {
  encodeRule(rule: UrlRule): [key: string, value: string]
  /** `null` when the param isn't a rule of this format, e.g. `page`. */
  decodeRule(key: string, value: string, context: FilterContext): UrlRule | null
  /** Defaults to `"join"`. */
  joinParam?: string
}

const SEPARATOR = "__"

// List items are comma-joined, so a comma (and `%`, the escape itself) inside an item is escaped.
const escapeItem = (item: Primitive) =>
  String(item).replace(/[%,]/g, (char) => (char === "%" ? "%25" : "%2C"))
const unescapeItem = (item: string) =>
  item.replace(/%(25|2C)/gi, (match) => (match === "%25" ? "%" : ","))

/** `status__eq=paid`, `amount__between=10,50`, `tags__in=a,b`, `deletedAt__isEmpty`. */
export const defaultUrlFormat: UrlFormat = {
  encodeRule: ({ field, operator, value }) => [
    `${field}${SEPARATOR}${operator}`,
    value === null
      ? ""
      : Array.isArray(value)
        ? value.map(escapeItem).join(",")
        : String(value),
  ],
  decodeRule: (key, value, context) => {
    // Operators never contain `__`, so the last one splits even `customer__name__eq`.
    const index = key.lastIndexOf(SEPARATOR)
    if (index <= 0) return null
    const field = key.slice(0, index)
    const operator = key.slice(index + SEPARATOR.length)
    const operators = (context.registry ?? DEFAULT_REGISTRY).operators
    const arity = getOperatorArity(operator, operators)
    const isList = arity === "range" || arity === "multi"
    return {
      field,
      operator,
      value: isList ? value.split(",").map(unescapeItem) : value,
    }
  },
}
