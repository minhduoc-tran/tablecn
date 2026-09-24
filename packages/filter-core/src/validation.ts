import { findField, type FilterContext } from "./context"
import { getOperatorArity } from "./operators"
import { DEFAULT_REGISTRY, getFieldOperators, getFieldType } from "./registry"
import type { Arity, FilterRule, FilterState, FilterValue } from "./types"

const isBlank = (value: unknown) =>
  value === null ||
  value === undefined ||
  (typeof value === "string" && value.trim() === "")

function hasRequiredValue(value: FilterValue, arity: Arity): boolean {
  switch (arity) {
    case "none":
      return true
    case "single":
      return !isBlank(value)
    case "range":
      return Array.isArray(value) && !value.some(isBlank)
    case "multi":
      return Array.isArray(value) && value.length > 0 && !value.some(isBlank)
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

  const value = fieldType.parseValue(rule.value, arity)
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

  const [from, to] = normalized.value
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
