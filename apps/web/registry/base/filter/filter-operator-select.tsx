"use client"

import * as React from "react"
import type { OperatorId } from "@querycn/filter-core"
import { useFilterActions, type OperatorOption } from "@querycn/filter-react"

import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/base/ui/select"

export interface FilterOperatorSelectProps {
  value: OperatorId | null
  operators: readonly OperatorOption[]
  onValueChange: (operator: OperatorId) => void
  /** Id of the element to focus once an operator is picked, e.g. the value input. */
  focusAfterSelect?: string
  disabled?: boolean
  className?: string
}

export function FilterOperatorSelect({
  value,
  operators,
  onValueChange,
  focusAfterSelect,
  disabled,
  className,
}: FilterOperatorSelectProps) {
  const { messages } = useFilterActions()
  // Typeahead on the closed trigger also changes the value; only a pick from the open list moves focus.
  const open = React.useRef(false)
  const picked = React.useRef(false)
  // Lets the trigger show the label rather than the operator id.
  const items = React.useMemo(
    () =>
      operators.map((operator) => ({
        label: operator.label,
        value: operator.id,
      })),
    [operators]
  )

  return (
    <Select
      items={items}
      value={value}
      onOpenChange={(next) => {
        open.current = next
      }}
      onValueChange={(next) => {
        if (next === null) return
        picked.current = open.current
        onValueChange(next)
      }}
      disabled={disabled || operators.length === 0}
    >
      <SelectTrigger
        size="sm"
        aria-label={messages.placeholders.operator}
        className={cn("w-44", className)}
      >
        <SelectValue placeholder={messages.placeholders.operator} />
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        finalFocus={() => {
          const target =
            picked.current && focusAfterSelect
              ? document.getElementById(focusAfterSelect)
              : null
          picked.current = false
          return target ?? true
        }}
      >
        {operators.map((operator) => (
          <SelectItem
            key={operator.id}
            value={operator.id}
            disabled={!operator.supported}
          >
            {operator.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
