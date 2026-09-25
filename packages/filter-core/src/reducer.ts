import { findField, type FilterContext } from "./context"
import { createId as defaultCreateId } from "./create-id"
import { getOperatorArity } from "./operators"
import { DEFAULT_REGISTRY, getDefaultOperator } from "./registry"
import type {
  FilterRule,
  FilterState,
  FilterValue,
  Join,
  OperatorId,
} from "./types"

export type FilterAction =
  | { type: "addRule"; field?: string }
  | { type: "removeRule"; id: string }
  | { type: "setField"; id: string; field: string }
  | { type: "setOperator"; id: string; operator: OperatorId }
  | { type: "setValue"; id: string; value: FilterValue }
  | { type: "setJoin"; join: Join }
  | { type: "reset" }
  | { type: "replace"; state: FilterState }

export interface ReducerContext extends FilterContext {
  /** Upper bound on rules; `addRule` is ignored once reached. */
  maxRules?: number
  createId?: () => string
  /** Keeps default operators to those the serializer can send. */
  supportsOperator?: (operator: OperatorId) => boolean
}

export const EMPTY_FILTER_STATE: FilterState = { join: "and", rules: [] }

// Returns the same state object when nothing changes, so React can bail out of re-renders.
function updateRule(
  state: FilterState,
  id: string,
  update: (rule: FilterRule) => FilterRule
): FilterState {
  let changed = false
  const rules = state.rules.map((rule) => {
    if (rule.id !== id) return rule
    const next = update(rule)
    if (next !== rule) changed = true
    return next
  })
  return changed ? { ...state, rules } : state
}

function defaultOperatorFor(
  fieldName: string,
  context: ReducerContext
): OperatorId | null {
  const field = findField(context, fieldName)
  return field
    ? getDefaultOperator(
        field,
        context.registry ?? DEFAULT_REGISTRY,
        context.supportsOperator
      )
    : null
}

/**
 * Skips ids already in the state (e.g. restored from storage). A generator that
 * yields distinct values succeeds within `rules.length + 1` tries; exceeding that
 * means it repeats itself, so throw instead of looping forever.
 */
function uniqueId(state: FilterState, createId: () => string): string {
  const taken = new Set(state.rules.map((rule) => rule.id))
  for (let attempt = 0; attempt <= taken.size; attempt++) {
    const id = createId()
    if (!taken.has(id)) return id
  }
  throw new Error("createId keeps returning ids already used in the state")
}

export function filterReducer(
  state: FilterState,
  action: FilterAction,
  context: ReducerContext
): FilterState {
  switch (action.type) {
    case "addRule": {
      if (
        context.maxRules !== undefined &&
        state.rules.length >= context.maxRules
      ) {
        return state
      }
      const field = action.field ?? ""
      const rule: FilterRule = {
        id: uniqueId(state, context.createId ?? defaultCreateId),
        field,
        operator: field ? defaultOperatorFor(field, context) : null,
        value: null,
      }
      return { ...state, rules: [...state.rules, rule] }
    }

    case "removeRule": {
      const rules = state.rules.filter((rule) => rule.id !== action.id)
      return rules.length === state.rules.length ? state : { ...state, rules }
    }

    case "setField":
      return updateRule(state, action.id, (rule) =>
        rule.field === action.field
          ? rule
          : {
              ...rule,
              field: action.field,
              operator: defaultOperatorFor(action.field, context),
              value: null,
            }
      )

    // Keeps the value when the arity is unchanged (eq → ne), clears it otherwise (eq → between).
    case "setOperator":
      return updateRule(state, action.id, (rule) => {
        if (rule.operator === action.operator) return rule
        const operators = (context.registry ?? DEFAULT_REGISTRY).operators
        const nextArity = getOperatorArity(action.operator, operators)
        const sameArity =
          rule.operator !== null &&
          nextArity !== "none" &&
          getOperatorArity(rule.operator, operators) === nextArity
        return {
          ...rule,
          operator: action.operator,
          value: sameArity ? rule.value : null,
        }
      })

    case "setValue":
      return updateRule(state, action.id, (rule) =>
        rule.value === action.value ? rule : { ...rule, value: action.value }
      )

    case "setJoin":
      return state.join === action.join
        ? state
        : { ...state, join: action.join }

    case "reset":
      return EMPTY_FILTER_STATE

    case "replace":
      return action.state
  }
}
