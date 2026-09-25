import { findField, type FilterContext } from "./context"
import { getOperatorArity } from "./operators"
import { DEFAULT_REGISTRY, getFieldOperators, getFieldType } from "./registry"
import type {
  Arity,
  FilterRule,
  FilterState,
  FilterValue,
  Primitive,
} from "./types"

const isFilled = (value: unknown): value is Primitive =>
  (typeof value === "number" && Number.isFinite(value)) ||
  typeof value === "boolean" ||
  (typeof value === "string" && value.trim() !== "")

// Custom `parseValue`s can return any shape, so check it matches the arity.
function hasRequiredValue(value: FilterValue, arity: Arity): boolean {
  switch (arity) {
    case "none":
      return true
    case "single":
      return isFilled(value)
    case "range":
      return Array.isArray(value) && value.length === 2 && value.every(isFilled)
    case "multi":
      return Array.isArray(value) && value.length > 0 && value.every(isFilled)
  }
}

/**
 * Returns the rule with its value coerced to canonical form, or `null` when the
 * rule can't be applied yet (unknown field, unsupported operator, missing or
 * malformed value).
 */
export function normalizeRule(
  rule: FilterRule,
  context: FilterContext
): FilterRule | null {
  const registry = context.registry ?? DEFAULT_REGISTRY
  const field = findField(context, rule.field)
  if (!field || rule.operator === null) return null
  if (!getFieldOperators(field, registry).includes(rule.operator)) return null

  const arity = getOperatorArity(rule.operator, registry.operators)
  const fieldType = getFieldType(field, registry)
  if (!arity || !fieldType) return null

  const value =
    arity === "none" ? null : fieldType.parseValue(rule.value, arity)
  if (value === undefined || !hasRequiredValue(value, arity)) return null

  return { ...rule, value }
}

export function isRuleComplete(
  rule: FilterRule,
  context: FilterContext
): boolean {
  return normalizeRule(rule, context) !== null
}

/** Non-blocking issues: the rule is still applied as entered, the UI should just flag it. */
export type RuleWarning = "reversedRange"

export function getRuleWarnings(
  rule: FilterRule,
  context: FilterContext
): RuleWarning[] {
  const normalized = normalizeRule(rule, context)
  if (!normalized?.operator) return []

  const registry = context.registry ?? DEFAULT_REGISTRY
  const arity = getOperatorArity(normalized.operator, registry.operators)
  if (arity !== "range" || !Array.isArray(normalized.value)) return []

  // Compared as the field type sees them, so number text like "9,5" isn't ordered as a string.
  const { toComparable } = getFieldType(
    findField(context, normalized.field)!,
    registry
  )!
  const [from, to] = normalized.value.map((value) =>
    toComparable ? toComparable(value, { accentInsensitive: false }) : value
  )
  const comparable =
    typeof from === typeof to &&
    (typeof from === "number" || typeof from === "string")
  return comparable && from! > to! ? ["reversedRange"] : []
}

/** Drops incomplete rules and normalizes the rest — the state that gets applied. */
export function normalizeState(
  state: FilterState,
  context: FilterContext
): FilterState {
  const rules: FilterRule[] = []
  for (const rule of state.rules) {
    const normalized = normalizeRule(rule, context)
    if (normalized) rules.push(normalized)
  }
  return { join: state.join, rules }
}
