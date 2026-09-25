"use client"

import * as React from "react"
import type { SelectOption } from "@querycn/filter-core"
import { useFilterActions } from "@querycn/filter-react"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/base/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/registry/base/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/base/ui/popover"

export interface FilterComboboxProps {
  id?: string
  "aria-label": string
  /** Trigger text; `undefined` shows the placeholder. */
  label: string | undefined
  placeholder: string
  /** Already filtered for `search`. */
  options: readonly SelectOption[]
  value: string | null
  onValueChange: (value: string) => void
  search: string
  onSearchChange: (search: string) => void
  emptyText: string
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  onOpenChange?: (open: boolean) => void
  className?: string
}

/** A searchable single select; the caller does the filtering. */
export function FilterCombobox({
  id,
  "aria-label": ariaLabel,
  label,
  placeholder,
  options,
  value,
  onValueChange,
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
  const [open, setOpen] = React.useState(false)
  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    // Cleared on open, not close, so the list doesn't jump during the exit animation.
    if (next) onSearchChange("")
    onOpenChange?.(next)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={open}
            aria-label={ariaLabel}
            className={cn(
              "w-40 justify-between text-sm font-normal",
              className
            )}
          />
        }
      >
        <span
          className={cn(
            "truncate",
            label === undefined && "text-muted-foreground"
          )}
        >
          {label ?? placeholder}
        </span>
        <ChevronsUpDownIcon className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={messages.placeholders.search}
            value={search}
            onValueChange={onSearchChange}
          />
          <CommandList>
            {error ? (
              <div
                role="alert"
                className="flex flex-col items-center gap-2 py-4 text-sm text-muted-foreground"
              >
                {messages.errors.loadOptions}
                <Button variant="outline" size="xs" onClick={onRetry}>
                  {messages.actions.retry}
                </Button>
              </div>
            ) : loading ? (
              // Also shown over the previous list while the next search loads.
              <div
                role="status"
                className="py-2 text-center text-xs text-muted-foreground"
              >
                {messages.loading}
              </div>
            ) : (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onValueChange(option.value)
                    handleOpenChange(false)
                  }}
                >
                  <span className="truncate">{option.label}</span>
                  <CheckIcon
                    className={cn(
                      "ml-auto",
                      option.value !== value && "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
