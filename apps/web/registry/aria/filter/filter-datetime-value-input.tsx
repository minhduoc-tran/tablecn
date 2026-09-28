"use client"

import { parseDate, type CalendarDate } from "@internationalized/date"
import { useFilterActions } from "@querycn/filter-react"
import { CalendarIcon } from "lucide-react"

import { Calendar } from "@/registry/aria/ui/calendar"
import {
  PickerField,
  PickerFooter,
  RangePickerField,
  type PickerPanel,
} from "@/registry/aria/filter/filter-picker-field"
import type { FilterValueSlotProps } from "@/registry/aria/filter/filter-rule-row"
import {
  currentDateTime,
  splitDateTime,
  useDateTimeFormat,
} from "@/registry/shared/filter/filter-date-format"
import { TimeColumns } from "@/registry/shared/filter/filter-time-panel"
import { toTextRange } from "@/registry/shared/filter/filter-picker-field-parts"

// CalendarDate is a plain day, so `YYYY-MM-DD` maps to it without any time zone.
function toCalendarDate(day: string | undefined): CalendarDate | null {
  if (!day) return null
  try {
    return parseDate(day)
  } catch {
    return null
  }
}

/**
 * A moment as the local `YYYY-MM-DDTHH:mm`, picked from a calendar and hour
 * and minute columns. A zoned value (e.g. "…Z") shows in local time.
 */
export function DateTimeValueInput({
  id,
  rule,
  field,
  arity,
  setValue,
}: FilterValueSlotProps) {
  const { messages } = useFilterActions()
  const format = useDateTimeFormat()
  const panel: PickerPanel = (value, onChange, onOk) => {
    const { day, time } = splitDateTime(value)
    return (
      <>
        <div className="flex">
          <Calendar
            aria-label={field.label}
            value={toCalendarDate(day)}
            onChange={(date) =>
              onChange(`${date.toString()}T${time ?? "00:00"}`)
            }
          />
          {/* As tall as the calendar, whatever the month. */}
          <div className="relative w-28 border-s">
            <TimeColumns
              className="absolute inset-0 h-auto"
              value={time ?? ""}
              onChange={(next) =>
                onChange(`${day ?? currentDateTime().slice(0, 10)}T${next}`)
              }
              onConfirm={onOk}
              labels={messages.placeholders}
            />
          </div>
        </div>
        <PickerFooter
          okDisabled={!day}
          onOk={onOk}
          onNow={() => {
            onChange(currentDateTime())
            onOk()
          }}
        />
      </>
    )
  }
  return arity === "range" ? (
    <RangePickerField
      id={id}
      label={field.label}
      value={toTextRange(rule.value)}
      onChange={setValue}
      format={format}
      icon={CalendarIcon}
      panel={panel}
      sideClassName="min-w-11"
    />
  ) : (
    <PickerField
      id={id}
      label={field.label}
      value={typeof rule.value === "string" ? rule.value : ""}
      onChange={setValue}
      format={format}
      placeholder={messages.placeholders.datetime}
      icon={CalendarIcon}
      panel={panel}
      className="w-48"
    />
  )
}
