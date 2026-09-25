"use client"

import * as React from "react"
import { filterOptions, type FieldDefinition } from "@querycn/filter-core"
import { useFilterActions } from "@querycn/filter-react"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/radix/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/registry/radix/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/radix/ui/popover"

export interface FilterFieldSelectProps {
  /** The rule's field; shown even when it isn't in `fields`. */
  field: FieldDefinition | undefined
  fields: readonly FieldDefinition[]
  onFieldChange: (name: string) => void
  className?: string
}

export function FilterFieldSelect({
  field,
  fields,
  onFieldChange,
  className,
}: FilterFieldSelectProps) {
  const { messages } = useFilterActions()
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const visible = React.useMemo(() => {
    const names = new Set(
      filterOptions(
        fields.map((f) => ({ label: f.label, value: f.name })),
        search
      ).map((option) => option.value)
    )
    return fields.filter((f) => names.has(f.name))
  }, [fields, search])

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        // Cleared on open, not close, so the list doesn't jump during the exit animation.
        if (next) setSearch("")
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label={messages.placeholders.field}
          className={cn("w-40 justify-between text-sm font-normal", className)}
        >
          <span className={cn("truncate", !field && "text-muted-foreground")}>
            {field?.label ?? messages.placeholders.field}
          </span>
          <ChevronsUpDownIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        {/* Filtered here so matching ignores accents, like the rest of the filter. */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={messages.placeholders.search}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{messages.empty.fields}</CommandEmpty>
            <CommandGroup>
              {visible.map((option) => (
                <CommandItem
                  key={option.name}
                  value={option.name}
                  onSelect={() => {
                    onFieldChange(option.name)
                    setOpen(false)
                  }}
                >
                  {option.label}
                  <CheckIcon
                    className={cn(
                      "ml-auto",
                      option.name !== field?.name && "opacity-0"
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
