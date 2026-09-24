import { findField, type FilterContext } from "../context"
import { getOperatorArity } from "../operators"
import { DEFAULT_REGISTRY } from "../registry"
import type {
  FieldDefinition,
  FilterState,
  Join,
  OperatorId,
  Primitive,
} from "../types"
import { normalizeState } from "../validation"

/** A complete, normalized rule; narrow `value` by checking `arity`. */
export type AppliedRule = {
  id: string
  field: string
  operator: OperatorId
  definition: FieldDefinition
} & (
  | { arity: "none"; value: null }
  | { arity: "single"; value: Primitive }
  | { arity: "range"; value: [Primitive, Primitive] }
  | { arity: "multi"; value: Primitive[] }
)

export function getAppliedRules(
  state: FilterState,
  context: FilterContext
): { join: Join; rules: AppliedRule[] } {
  const operators = (context.registry ?? DEFAULT_REGISTRY).operators
  const { join, rules } = normalizeState(state, context)
  return {
    join,
    // normalizeRule guarantees the field, operator and arity resolve and the value matches the arity.
    rules: rules.map(
      (rule) =>
        ({
          ...rule,
          operator: rule.operator!,
          arity: getOperatorArity(rule.operator!, operators)!,
          definition: findField(context, rule.field)!,
        }) as AppliedRule
    ),
  }
}
