"use client"

import * as React from "react"
import { useFilterActions } from "@querycn/filter-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/base/ui/select"
import type { FilterValueSlotProps } from "@/registry/base/filter/filter-rule-row"

export function BooleanValueInput({
  id,
  rule,
  field,
  setValue,
}: FilterValueSlotProps) {
  const { messages } = useFilterActions()
  // Lets the trigger show "Yes"/"No" rather than the raw value.
  const items = React.useMemo(
    () => [
      { label: messages.boolean.true, value: "true" },
      { label: messages.boolean.false, value: "false" },
    ],
    [messages]
  )
  return (
    <Select
      items={items}
      value={typeof rule.value === "boolean" ? String(rule.value) : null}
      onValueChange={(next) => {
        if (next !== null) setValue(next === "true")
      }}
    >
      <SelectTrigger
        id={id}
        size="sm"
        aria-label={field.label}
        className="w-28"
      >
        <SelectValue placeholder={messages.placeholders.value} />
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
