import { createParamsSerializer } from "./create-params-serializer"
import type { MapRule } from "./encode-applied-rules"
import { mapOperator, type OperatorMapping } from "./operator-mapping"
import {
  formatValue,
  hasCommaItem,
  type InspectableSerializer,
} from "./query-params"

// django-filter conventions; an empty lookup means the bare field name (exact match).
const DEFAULT_LOOKUPS: OperatorMapping<string> = {
  eq: "",
  contains: "icontains",
  startsWith: "istartswith",
  endsWith: "iendswith",
  gt: "gt",
  gte: "gte",
  lt: "lt",
  lte: "lte",
  between: "range",
  in: "in",
  isEmpty: "isnull",
  isNotEmpty: "isnull",
}

const NULL_CHECK_VALUES: OperatorMapping<string> = {
  isEmpty: "true",
  isNotEmpty: "false",
}

export interface DjangoSerializerOptions {
  /** Merged over the defaults; map `ne`, `notContains`, `notIn` here if the backend has them. */
  lookups?: OperatorMapping<string>
  joinParam?: string
  mapRule?: MapRule
}

/**
 * `status=active`, `name__icontains=abc`, `amount__range=1,5`. Rules whose
 * operator has no lookup are skipped. Lists are comma-joined as django-filter's
 * CSV filters expect, so a rule with a comma inside a list item is skipped too.
 */
export function djangoSerializer({
  lookups,
  joinParam = "conjunction",
  mapRule,
}: DjangoSerializerOptions = {}): InspectableSerializer {
  const lookupByOperator = { ...DEFAULT_LOOKUPS, ...lookups }
  return createParamsSerializer({
    encodeRule: ({ field, operator, value }) => {
      const lookup = mapOperator(lookupByOperator, operator)
      if (lookup === undefined || hasCommaItem(value)) return undefined
      const paramValue =
        mapOperator(NULL_CHECK_VALUES, operator) ?? formatValue(value, "comma")
      return [[lookup ? `${field}__${lookup}` : field, paramValue]]
    },
    orParams: { [joinParam]: "or" },
    mapRule,
    supports: (operator) =>
      mapOperator(lookupByOperator, operator) !== undefined,
  })
}
