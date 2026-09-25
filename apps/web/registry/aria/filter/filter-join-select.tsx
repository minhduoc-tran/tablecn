"use client"

import type { Join } from "@querycn/filter-core"
import { useFilterActions } from "@querycn/filter-react"

import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/aria/ui/select"

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
  return (
    <Select
      aria-label={messages.join.toggle}
      value={value}
      onChange={(key) => {
        if (key !== null) onValueChange(key === "or" ? "or" : "and")
      }}
    >
      <SelectTrigger size="sm" className={cn("w-full", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem id="and">{messages.join.and}</SelectItem>
        <SelectItem id="or">{messages.join.or}</SelectItem>
      </SelectContent>
    </Select>
  )
}
