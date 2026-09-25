"use client"

import * as React from "react"
import type { SelectOption } from "@querycn/filter-core"
import { useFilterActions } from "@querycn/filter-react"
import { Autocomplete, type Key } from "react-aria-components"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/aria/ui/button"
import {
  Select,
  SelectEmpty,
  SelectInput,
  SelectItem,
  SelectList,
  SelectPopover,
  SelectTrigger,
  SelectValue,
} from "@/registry/aria/ui/select"

export interface FilterComboboxProps {
  id?: string
  "aria-label": string
  /** Trigger content; `undefined` shows the placeholder. */
  label: React.ReactNode | undefined
  placeholder: string
  /** Already filtered for `search`. */
  options: readonly SelectOption[]
  selected: readonly string[]
  /** Picks toggle values and the list stays open. */
  multiple?: boolean
  onSelectedChange: (values: string[]) => void
  search: string
  onSearchChange: (search: string) => void
  emptyText: string
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  onOpenChange?: (open: boolean) => void
  className?: string
}

/** A searchable select of one or several values; the caller does the filtering. */
export function FilterCombobox({
  id,
  "aria-label": ariaLabel,
  label,
  placeholder,
  options,
  selected,
  multiple = false,
  onSelectedChange,
  search,
  onSearchChange,
  emptyText,
  loading = false,
  error = false,
  onRetry,
  onOpenChange,
  className,
}: FilterComboboxProps) {
  const { messages } = useFilterActions()
  // Typeahead on the closed trigger would change the value without the list open.
  const open = React.useRef(false)

  return (
    <Select
      aria-label={ariaLabel}
      placeholder={placeholder}
      // Opens with nothing loaded yet, so async options can load and empty/error states show.
      allowsEmptyCollection
      selectionMode={multiple ? "multiple" : "single"}
      value={multiple ? selected : (selected[0] ?? null)}
      onChange={(next: Key | Key[] | null) => {
        if (!open.current) return
        onSelectedChange(
          Array.isArray(next)
            ? next.map(String)
            : next === null
              ? []
              : [String(next)]
        )
      }}
      onOpenChange={(next) => {
        open.current = next
        // Cleared on open, not close, so the list doesn't jump during the exit animation.
        if (next) onSearchChange("")
        onOpenChange?.(next)
      }}
    >
      <SelectTrigger id={id} size="sm" className={cn("w-40", className)}>
        {/* A value the list doesn't hold (yet) still reads as a value, not a placeholder. */}
        <SelectValue
          className={cn(
            label !== undefined && "data-placeholder:text-foreground"
          )}
        >
          {() => label ?? placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectPopover className="w-56">
        {/* No `filter`: the caller filters, so matching ignores accents like the rest of the filter. */}
        <Autocomplete inputValue={search} onInputChange={onSearchChange}>
          <SelectInput aria-label={messages.placeholders.search} />
          {loading && !error && (
            // Also shown over the previous list while the next search loads.
            <div
              role="status"
              className="py-2 text-center text-xs text-muted-foreground"
            >
              {messages.loading}
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="flex flex-col items-center gap-2 py-4 text-sm text-muted-foreground"
            >
              {messages.errors.loadOptions}
              <Button variant="outline" size="xs" onPress={onRetry}>
                {messages.actions.retry}
              </Button>
            </div>
          )}
          <SelectList
            items={options}
            renderEmptyState={() =>
              error || loading ? null : <SelectEmpty>{emptyText}</SelectEmpty>
            }
          >
            {(option) => (
              <SelectItem id={option.value} textValue={option.label}>
                {option.label}
              </SelectItem>
            )}
          </SelectList>
        </Autocomplete>
      </SelectPopover>
    </Select>
  )
}
