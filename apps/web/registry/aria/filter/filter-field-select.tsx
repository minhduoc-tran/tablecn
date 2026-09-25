"use client"

import * as React from "react"
import { filterOptions, type FieldDefinition } from "@querycn/filter-core"
import { useFilterActions } from "@querycn/filter-react"
import { Autocomplete } from "react-aria-components"

import { cn } from "@/lib/utils"
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
  const [search, setSearch] = React.useState("")
  // Typeahead on the closed trigger would switch fields and wipe the rule's value.
  const open = React.useRef(false)

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
    <Select
      aria-label={messages.placeholders.field}
      placeholder={messages.placeholders.field}
      value={field?.name ?? null}
      onChange={(key) => {
        if (key !== null && open.current) onFieldChange(String(key))
      }}
      onOpenChange={(next) => {
        open.current = next
        // Cleared on open, not close, so the list doesn't jump during the exit animation.
        if (next) setSearch("")
      }}
    >
      <SelectTrigger size="sm" className={cn("w-40", className)}>
        {/* A field the list doesn't offer still reads as a value, not a placeholder. */}
        <SelectValue
          className={cn(field && "data-placeholder:text-foreground")}
        >
          {() => field?.label ?? messages.placeholders.field}
        </SelectValue>
      </SelectTrigger>
      <SelectPopover className="w-56">
        {/* No `filter`: the list is filtered here so matching ignores accents, like the rest of the filter. */}
        <Autocomplete inputValue={search} onInputChange={setSearch}>
          <SelectInput aria-label={messages.placeholders.search} />
          <SelectList
            items={visible}
            renderEmptyState={() => (
              <SelectEmpty>{messages.empty.fields}</SelectEmpty>
            )}
          >
            {(option) => (
              <SelectItem id={option.name} textValue={option.label}>
                {option.label}
              </SelectItem>
            )}
          </SelectList>
        </Autocomplete>
      </SelectPopover>
    </Select>
  )
}
