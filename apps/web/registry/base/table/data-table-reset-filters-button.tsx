"use client"

import * as React from "react"
import { useAppliedFilter, useFilterActions } from "@querycn/filter-react"
import { enTableMessages, type TableMessages } from "@querycn/table-react"
import { XIcon } from "lucide-react"

import { Button } from "@/registry/base/ui/button"
import { useFocusToolbarOnUnmount } from "@/registry/shared/table/use-focus-toolbar-on-unmount"

export interface DataTableResetFiltersButtonProps {
  messages?: TableMessages
  className?: string
}

/**
 * Clears the applied filter. Shown only while one applies, so it stays hidden
 * outside a `FilterProvider`. The page goes back to 1 through the provider's
 * `onApply={() => resetPagePatch()}`, like any other filter change.
 */
export function DataTableResetFiltersButton(
  props: DataTableResetFiltersButtonProps
) {
  const { activeCount } = useAppliedFilter()
  if (activeCount === 0) return null
  return <ResetFiltersButton {...props} />
}

function ResetFiltersButton({
  messages = enTableMessages,
  className,
}: DataTableResetFiltersButtonProps) {
  const { reset } = useFilterActions()
  const ref = useFocusToolbarOnUnmount<HTMLButtonElement>()
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="sm"
      className={className}
      onClick={reset}
    >
      <XIcon />
      {messages.actions.clearFilters}
    </Button>
  )
}
