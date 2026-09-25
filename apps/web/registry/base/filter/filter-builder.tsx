"use client"

import { useAppliedFilter } from "@querycn/filter-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/registry/base/ui/badge"
import { Button } from "@/registry/base/ui/button"

export function FilterBuilder({ className }: { className?: string }) {
  const { activeCount, messages } = useAppliedFilter()
  return (
    <Button variant="outline" size="sm" className={cn(className)}>
      {messages.actions.open}
      {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
    </Button>
  )
}
