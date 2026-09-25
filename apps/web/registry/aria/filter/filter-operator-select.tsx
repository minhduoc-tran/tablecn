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
} from "@/registry/aria/ui/select"

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

  return (
    <Select
      aria-label={messages.placeholders.operator}
      placeholder={messages.placeholders.operator}
      value={value}
      onChange={(key) => {
        if (key === null) return
        onValueChange(String(key))
        // React Aria skips returning focus to the trigger once focus has moved on.
        if (open.current && focusAfterSelect) {
          setTimeout(() => document.getElementById(focusAfterSelect)?.focus())
        }
      }}
      onOpenChange={(next) => {
        open.current = next
      }}
      disabledKeys={operators.filter((o) => !o.supported).map((o) => o.id)}
      isDisabled={disabled || operators.length === 0}
    >
      <SelectTrigger size="sm" className={cn("w-44", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {operators.map((operator) => (
          <SelectItem key={operator.id} id={operator.id}>
            {operator.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
