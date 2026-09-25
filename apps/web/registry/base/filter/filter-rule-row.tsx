"use client"

import * as React from "react"
import type {
  Arity,
  FieldDefinition,
  FilterRule,
  FilterValue,
} from "@querycn/filter-core"
import { useFilterActions, useFilterRule } from "@querycn/filter-react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/base/ui/button"
import { FilterFieldSelect } from "@/registry/base/filter/filter-field-select"
import { FilterOperatorSelect } from "@/registry/base/filter/filter-operator-select"

export interface FilterValueSlotProps {
  /** Put on the first focusable element; it gets focus after an operator is picked. */
  id: string
  rule: FilterRule
  field: FieldDefinition
  arity: Exclude<Arity, "none">
  setValue: (value: FilterValue) => void
}

export interface FilterRuleRowProps {
  rule: FilterRule
  /** A component, not a render function, so the memoized row keeps its props stable. */
  valueInput?: React.ComponentType<FilterValueSlotProps>
  className?: string
}

export const FilterRuleRow = React.memo(function FilterRuleRow({
  rule,
  valueInput: ValueInput,
  className,
}: FilterRuleRowProps) {
  const { messages } = useFilterActions()
  const {
    field,
    fields,
    operators,
    arity,
    setField,
    setOperator,
    setValue,
    remove,
  } = useFilterRule(rule)
  const valueId = React.useId()

  return (
    <div
      data-slot="filter-rule-row"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      <FilterFieldSelect
        field={field}
        fields={fields}
        onFieldChange={setField}
      />
      <FilterOperatorSelect
        value={rule.operator}
        operators={operators}
        onValueChange={setOperator}
        focusAfterSelect={valueId}
        disabled={!field}
      />
      {ValueInput && field && arity && arity !== "none" && (
        <ValueInput
          id={valueId}
          rule={rule}
          field={field}
          arity={arity}
          setValue={setValue}
        />
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={messages.actions.removeRule}
        onClick={remove}
      >
        <XIcon />
      </Button>
    </div>
  )
})
