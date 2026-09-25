"use client"

import * as React from "react"
import { useFieldOptions, useFilterActions } from "@querycn/filter-react"

import { FilterCombobox } from "@/registry/radix/filter/filter-combobox"
import type { FilterValueSlotProps } from "@/registry/radix/filter/filter-rule-row"

/** Static `options` or `loadOptions`; the row keys it by field, so a new field starts fresh. */
export function SelectValueInput({
  id,
  rule,
  field,
  setValue,
}: FilterValueSlotProps) {
  const { messages } = useFilterActions()
  const [open, setOpen] = React.useState(false)
  const value =
    typeof rule.value === "string" || typeof rule.value === "number"
      ? String(rule.value)
      : null
  const selected = React.useMemo(() => (value === null ? [] : [value]), [value])
  const { options, loading, error, query, search, retry, getLabel } =
    useFieldOptions(field, { selected, enabled: open })

  return (
    <FilterCombobox
      id={id}
      aria-label={field.label}
      label={value === null ? undefined : getLabel(value)}
      placeholder={messages.placeholders.value}
      options={options}
      value={value}
      onValueChange={setValue}
      search={query}
      onSearchChange={search}
      emptyText={messages.empty.options}
      loading={loading}
      error={error !== null}
      onRetry={retry}
      onOpenChange={setOpen}
    />
  )
}
