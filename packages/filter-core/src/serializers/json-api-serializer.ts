import { createParamsSerializer } from "./create-params-serializer"
import type { MapRule } from "./encode-applied-rules"
import { mapOperator, type OperatorMapping } from "./operator-mapping"
import {
  formatValue,
  hasCommaItem,
  type ArrayFormat,
  type InspectableSerializer,
} from "./query-params"

export interface JsonApiSerializerOptions {
  prefix?: string
  /** Renames operators in keys, e.g. `{ notContains: "not_contains" }`. */
  operators?: OperatorMapping<string>
  /** `repeat` → `?k=a&k=b` · `comma` → `?k=a,b`, skipping rules with a comma inside a list item */
  arrayFormat?: ArrayFormat
  mapRule?: MapRule
}

/** `filter[status][eq]=active`; operators without a value send `true`. */
export function jsonApiSerializer({
  prefix = "filter",
  operators = {},
  arrayFormat = "repeat",
  mapRule,
}: JsonApiSerializerOptions = {}): InspectableSerializer {
  const operatorKey = (operator: string) =>
    mapOperator(operators, operator, operator)
  return createParamsSerializer({
    encodeRule: ({ field, operator, value }) => {
      const key = operatorKey(operator)
      if (key === undefined) return undefined
      if (arrayFormat === "comma" && hasCommaItem(value)) return undefined
      return [[`${prefix}[${field}][${key}]`, formatValue(value, arrayFormat)]]
    },
    orParams: { [`${prefix}[join]`]: "or" },
    mapRule,
    supports: (operator) => operatorKey(operator) !== undefined,
  })
}
