import {
  findField,
  getFieldOperators,
  getOperatorArity,
  getOperatorLabel,
  type Arity,
  type FieldDefinition,
  type FilterRule,
  type FilterValue,
  type OperatorId,
} from "@querycn/filter-core"
import { useCallback, useMemo } from "react"

import { useFilterActions } from "./use-filter-actions"

export interface OperatorOption {
  id: OperatorId
  label: string
  /** `false` for an operator kept from the URL that the serializer can't send. */
  supported: boolean
}

export interface FilterRuleValue {
  /** `undefined` until a field is picked, or when the rule names an unknown field. */
  field: FieldDefinition | undefined
  /** Fields worth offering: those with at least one supported operator. */
  fields: readonly FieldDefinition[]
  operators: readonly OperatorOption[]
  /** `null` while no operator is picked. */
  arity: Arity | null
  setField: (name: string) => void
  setOperator: (operator: OperatorId) => void
  setValue: (value: FilterValue) => void
  remove: () => void
}

/** What a rule row needs to render and edit one rule. */
export function useFilterRule(rule: FilterRule): FilterRuleValue {
  const {
    context,
    messages,
    supportsOperator,
    setField,
    setOperator,
    setValue,
    removeRule,
  } = useFilterActions()
  const { fields: allFields, registry } = context
  const { id, operator } = rule

  const fields = useMemo(
    () =>
      allFields.filter((field) =>
        getFieldOperators(field, registry).some(supportsOperator)
      ),
    [allFields, registry, supportsOperator]
  )

  const field = findField(context, rule.field)

  const operators = useMemo(() => {
    if (!field) return []
    const option = (id: OperatorId, supported: boolean): OperatorOption => ({
      id,
      label: getOperatorLabel(messages, id, field.type),
      supported,
    })
    const offered = getFieldOperators(field, registry)
      .filter(supportsOperator)
      .map((id) => option(id, true))
    return operator === null || offered.some((o) => o.id === operator)
      ? offered
      : [...offered, option(operator, false)]
  }, [field, registry, messages, supportsOperator, operator])

  return {
    field,
    fields,
    operators,
    arity:
      operator === null
        ? null
        : (getOperatorArity(operator, registry.operators) ?? null),
    setField: useCallback((name) => setField(id, name), [setField, id]),
    setOperator: useCallback((op) => setOperator(id, op), [setOperator, id]),
    setValue: useCallback((value) => setValue(id, value), [setValue, id]),
    remove: useCallback(() => removeRule(id), [removeRule, id]),
  }
}
