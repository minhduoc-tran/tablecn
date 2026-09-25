"use client"

import * as React from "react"
import { parseDate, type CalendarDate } from "@internationalized/date"
import { useFilterActions } from "@querycn/filter-react"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/aria/ui/button"
import { Calendar, RangeCalendar } from "@/registry/aria/ui/calendar"
import { Popover, PopoverTrigger } from "@/registry/aria/ui/popover"
import type { FilterValueSlotProps } from "@/registry/aria/filter/filter-rule-row"
import { useDateOnlyFormat } from "@/registry/shared/filter/filter-date-format"

// CalendarDate is a plain day, so `YYYY-MM-DD` maps to it without any time zone.
function toCalendarDate(value: string | undefined): CalendarDate | null {
  if (!value) return null
  try {
    return parseDate(value)
  } catch {
    return null
  }
}

export function DateValueInput({
  id,
  rule,
  field,
  arity,
  setValue,
}: FilterValueSlotProps) {
  const { messages } = useFilterActions()
  const [open, setOpen] = React.useState(false)
  const formatDateOnly = useDateOnlyFormat()
  const range = arity === "range"
  const [from, to] = (
    Array.isArray(rule.value) ? rule.value : [rule.value]
  ).map((value) =>
    typeof value === "string" && value !== "" ? value : undefined
  )
  const label = range
    ? from || to
      ? `${from ? formatDateOnly(from) : "…"} ${messages.rangeSeparator} ${to ? formatDateOnly(to) : "…"}`
      : undefined
    : from && formatDateOnly(from)
  const start = toCalendarDate(from)
  const end = toCalendarDate(to)

  return (
    <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
      <Button
        id={id}
        variant="outline"
        size="sm"
        className={cn(
          "justify-start text-sm font-normal",
          range ? "w-56" : "w-40"
        )}
      >
        <CalendarIcon className="text-muted-foreground" />
        <span className="sr-only">{field.label}: </span>
        <span className={cn("truncate", !label && "text-muted-foreground")}>
          {label || messages.placeholders.date}
        </span>
      </Button>
      <Popover className="w-auto p-0" placement="bottom start">
        {range ? (
          <RangeCalendar
            aria-label={field.label}
            value={start && end ? { start, end } : null}
            onChange={(next) => {
              if (next) setValue([next.start.toString(), next.end.toString()])
            }}
          />
        ) : (
          <Calendar
            aria-label={field.label}
            value={start}
            onChange={(next) => {
              setValue(next.toString())
              setOpen(false)
            }}
          />
        )}
      </Popover>
    </PopoverTrigger>
  )
}
