import { hasOwn } from "./has-own"
import type { BuiltinOperatorId, FieldTypeId, Join, OperatorId } from "./types"
import type { RuleIssue } from "./serializers/query-params"
import type { RuleWarning } from "./validation"

type Labels<K extends string> = Record<K, string>

/** Every string the UI shows. Custom operators add their labels to `operators`. */
export interface FilterMessages {
  operators: Labels<BuiltinOperatorId> & Partial<Labels<string>>
  /** Wording that reads better for one type, e.g. date `gt` → "is after". */
  operatorsByType: Partial<Record<FieldTypeId, Partial<Labels<OperatorId>>>>
  /** `where` prefixes the first rule; `toggle` names the AND/OR switch. */
  join: Labels<Join | "where" | "toggle">
  actions: Labels<
    | "open"
    | "addRule"
    | "removeRule"
    | "clearAll"
    | "apply"
    | "cancel"
    | "retry"
  >
  placeholders: Labels<
    | "field"
    | "operator"
    | "value"
    | "search"
    | "from"
    | "to"
    | "date"
    | "datetime"
  >
  /** Between the two values of a range, e.g. "1 – 5". */
  rangeSeparator: string
  counts: Record<
    "selected" | "more" | "activeFilters",
    (count: number) => string
  >
  empty: Labels<"rules" | "fields" | "options">
  loading: string
  errors: Labels<"loadOptions">
  boolean: Labels<"true" | "false">
  warnings: Labels<RuleWarning | RuleIssue>
}

export type FilterMessagesOverrides = {
  [Group in keyof FilterMessages]?: FilterMessages[Group] extends string
    ? string
    : Partial<FilterMessages[Group]>
}

const definedEntries = (group: object) =>
  Object.entries(group).filter(([, value]) => value !== undefined)

function mergeGroup(base: object | undefined, overrides: object): object {
  return { ...base, ...Object.fromEntries(definedEntries(overrides)) }
}

/**
 * Merges overrides per group, so `{ actions: { apply: "Go" } }` keeps the other
 * actions; `operatorsByType` merges per type. `undefined` never replaces a label.
 */
export function mergeMessages(
  base: FilterMessages,
  overrides: FilterMessagesOverrides = {}
): FilterMessages {
  const merged: Record<string, unknown> = { ...base }
  for (const [group, value] of definedEntries(overrides)) {
    const baseGroup = base[group as keyof FilterMessages] as object
    if (typeof value === "string") merged[group] = value
    else if (group === "operatorsByType") {
      const byType: Record<string, object> = { ...baseGroup }
      for (const [type, labels] of definedEntries(value as object)) {
        byType[type] = mergeGroup(byType[type], labels as object)
      }
      merged[group] = byType
    } else merged[group] = mergeGroup(baseGroup, value as object)
  }
  return merged as unknown as FilterMessages
}

/** Type-specific label → general label → the operator id itself. */
export function getOperatorLabel(
  messages: FilterMessages,
  operator: OperatorId,
  fieldType?: FieldTypeId
): string {
  const byType = fieldType ? messages.operatorsByType[fieldType] : undefined
  if (byType && hasOwn(byType, operator) && byType[operator]) {
    return byType[operator]
  }
  return (
    (hasOwn(messages.operators, operator) && messages.operators[operator]) ||
    operator
  )
}
