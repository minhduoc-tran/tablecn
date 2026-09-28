"use client"

import * as React from "react"
import { useFieldOptions } from "@querycn/filter-react"
import { formatCellText } from "@querycn/table-react"
import { Autocomplete } from "react-aria-components"

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
import type { CellEditorProps } from "@/registry/aria/table/data-table-cell-editors"

/**
 * A `select` with `loadOptions`: a search box over the options your API
 * returns. Picking one saves it with its label; closing the list cancels.
 */
export function SearchSelectCellEditor({
  value,
  editor,
  label,
  display,
  messages,
  onSave,
  onCancel,
}: CellEditorProps) {
  const current = formatCellText(value)
  const [open, setOpen] = React.useState(true)
  const picked = React.useRef(false)
  const field = React.useMemo(
    () => ({
      name: label,
      label,
      type: "select",
      options: editor.options && [...editor.options],
      loadOptions: editor.loadOptions,
    }),
    [label, editor]
  )
  const { options, loading, error, query, search, retry } = useFieldOptions(
    field,
    { enabled: open }
  )

  return (
    <Select
      aria-label={label}
      defaultOpen
      // Opens with nothing loaded yet, so async options can load and empty/error states show.
      allowsEmptyCollection
      value={current || null}
      onChange={(key) => {
        if (key === null || String(key) === current) return
        picked.current = true
        onSave(String(key), {
          option: options.find((option) => option.value === String(key)),
        })
      }}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next && !picked.current) onCancel()
      }}
      className="-my-1 w-full"
    >
      <SelectTrigger size="sm" className="w-full">
        {/* A value the list doesn't hold (yet) still reads as the cell shows it. */}
        <SelectValue className="data-placeholder:text-foreground">
          {() => display}
        </SelectValue>
      </SelectTrigger>
      <SelectPopover className="w-60">
        {/* No `filter`: your API does the matching. */}
        <Autocomplete inputValue={query} onInputChange={search}>
          <SelectInput aria-label={messages.editing.search} />
          {loading && error === null && (
            // Also shown over the previous list while the next search loads.
            <div
              role="status"
              className="py-2 text-center text-xs text-muted-foreground"
            >
              {messages.states.loading}
            </div>
          )}
          {error !== null && (
            <div
              role="alert"
              className="flex flex-col items-center gap-2 py-4 text-sm text-muted-foreground"
            >
              {messages.editing.loadFailed}
              <Button variant="outline" size="xs" onPress={retry}>
                {messages.actions.retry}
              </Button>
            </div>
          )}
          <SelectList
            items={options}
            renderEmptyState={() =>
              error !== null || loading ? null : (
                <SelectEmpty>{messages.editing.noOptions}</SelectEmpty>
              )
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
