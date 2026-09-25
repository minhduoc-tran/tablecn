"use client"

import * as React from "react"
import type { Join } from "@querycn/filter-core"
import { useFilterActions } from "@querycn/filter-react"

import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/base/ui/select"

export interface FilterJoinSelectProps {
  value: Join
  onValueChange: (join: Join) => void
  className?: string
}

export function FilterJoinSelect({
  value,
  onValueChange,
  className,
}: FilterJoinSelectProps) {
  const { messages } = useFilterActions()
  // Lets the trigger show the label rather than the raw value.
  const items = React.useMemo(
    () => [
      { label: messages.join.and, value: "and" },
      { label: messages.join.or, value: "or" },
    ],
    [messages]
  )
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next === "or" ? "or" : "and")
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={messages.join.toggle}
        className={cn("w-full", className)}
      >
        <SelectValue />
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
