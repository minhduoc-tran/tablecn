"use client"

import { useFilterActions } from "@querycn/filter-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/aria/ui/select"
import type { FilterValueSlotProps } from "@/registry/aria/filter/filter-rule-row"

export function BooleanValueInput({
  id,
  rule,
  field,
  setValue,
}: FilterValueSlotProps) {
  const { messages } = useFilterActions()
  return (
    <Select
      aria-label={field.label}
      placeholder={messages.placeholders.value}
      value={typeof rule.value === "boolean" ? String(rule.value) : null}
      onChange={(key) => {
        if (key !== null) setValue(key === "true")
      }}
    >
      <SelectTrigger id={id} size="sm" className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem id="true">{messages.boolean.true}</SelectItem>
        <SelectItem id="false">{messages.boolean.false}</SelectItem>
      </SelectContent>
    </Select>
  )
}
