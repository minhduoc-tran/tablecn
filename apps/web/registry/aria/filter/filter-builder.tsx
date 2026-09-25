"use client"

import * as React from "react"
import { useAppliedFilter, useFilterActions } from "@querycn/filter-react"
import { ListFilterIcon } from "lucide-react"
import { Dialog } from "react-aria-components"

import { cn } from "@/lib/utils"
import { Badge } from "@/registry/aria/ui/badge"
import { Button } from "@/registry/aria/ui/button"
import { Popover, PopoverTrigger } from "@/registry/aria/ui/popover"
import {
  FilterBuilderPanel,
  type FilterBuilderPanelProps,
} from "@/registry/aria/filter/filter-builder-panel"

export interface FilterBuilderProps extends Omit<
  FilterBuilderPanelProps,
  "onApply" | "className"
> {
  className?: string
  /** Classes for the popover around the panel. */
  contentClassName?: string
}

/** A button showing how many filters apply; it opens the panel. Closing without Apply drops the edits. */
export function FilterBuilder({
  className,
  contentClassName,
  ...panelProps
}: FilterBuilderProps) {
  const { activeCount, messages } = useAppliedFilter()
  const { addRule, discard } = useFilterActions()
  const [open, setOpen] = React.useState(false)
  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) discard()
    // Starts an empty filter with a rule to fill in.
    else if (activeCount === 0) addRule()
  }

  return (
    <PopoverTrigger isOpen={open} onOpenChange={handleOpenChange}>
      <Button variant="outline" size="sm" className={className}>
        <ListFilterIcon />
        {messages.actions.open}
        {activeCount > 0 && (
          <>
            <Badge variant="secondary" aria-hidden>
              {activeCount}
            </Badge>
            <span className="sr-only">
              {messages.counts.activeFilters(activeCount)}
            </span>
          </>
        )}
      </Button>
      <Popover
        placement="bottom start"
        className={cn("w-auto max-w-[calc(100vw-2rem)] p-3", contentClassName)}
      >
        <Dialog aria-label={messages.actions.open} className="outline-none">
          <FilterBuilderPanel {...panelProps} onApply={() => setOpen(false)} />
        </Dialog>
      </Popover>
    </PopoverTrigger>
  )
}
