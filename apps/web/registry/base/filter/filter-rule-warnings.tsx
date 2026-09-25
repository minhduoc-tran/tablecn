"use client"

import type { FilterRule } from "@querycn/filter-core"
import {
  useAppliedFilter,
  useRuleWarnings,
  type RuleWarningKey,
} from "@querycn/filter-react"
import { TriangleAlertIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/base/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/base/ui/popover"

/** A warning icon that shows what may go wrong when pressed, so it works on touch too. Nothing when there are none. */
export function FilterRuleWarnings({
  warnings,
  className,
}: {
  warnings: readonly RuleWarningKey[]
  className?: string
}) {
  const { messages } = useAppliedFilter()
  if (warnings.length === 0) return null
  const texts = warnings.map((key) => messages.warnings[key])

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={texts.join(". ")}
            className={cn(
              "text-amber-600 hover:text-amber-600 aria-expanded:text-amber-600 dark:text-amber-500 dark:hover:text-amber-500 dark:aria-expanded:text-amber-500",
              className
            )}
          />
        }
      >
        <TriangleAlertIcon />
      </PopoverTrigger>
      <PopoverContent side="top" className="w-auto max-w-xs gap-1 p-2 text-xs">
        {texts.map((text) => (
          <p key={text}>{text}</p>
        ))}
      </PopoverContent>
    </Popover>
  )
}

/** Warnings for a draft rule. It re-renders with the draft, so the memoized row around it doesn't. */
export function FilterDraftRuleWarnings({ rule }: { rule: FilterRule }) {
  return <FilterRuleWarnings warnings={useRuleWarnings(rule)} />
}
