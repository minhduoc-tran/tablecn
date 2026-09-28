"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"

import {
  currentTime,
  defaultTimePickerLabels,
  PickerField,
  PickerFooter,
  RangePickerField,
  TimeColumns,
  type PickerPanel,
  type TimePickerLabels,
} from "./time-picker"

const pad = (part: number) => String(part).padStart(2, "0")

/** A date's day in local time, as `YYYY-MM-DD`. */
const toDay = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** The browser's local date and time as `YYYY-MM-DDTHH:mm`. */
export const currentDateTime = () => `${toDay(new Date())}T${currentTime()}`

const ZONED = /T.*(?:Z|[+-]\d{2}:?\d{2})$/i
const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/

/** The picked day (as a local `Date` for the calendar) and `HH:mm`; a zoned value is read in local time. */
function splitDateTime(value: string) {
  const zoned = ZONED.test(value) ? new Date(value) : null
  const local =
    zoned && !Number.isNaN(zoned.getTime())
      ? `${toDay(zoned)}T${pad(zoned.getHours())}:${pad(zoned.getMinutes())}`
      : value
  const match = LOCAL.exec(local)
  if (!match) return {}
  const [year, month, day] = match.slice(1, 4).map(Number) as [
    number,
    number,
    number,
  ]
  return {
    date: new Date(year, month - 1, day),
    day: `${match[1]}-${match[2]}-${match[3]}`,
    time: match[4],
  }
}

const subscribe = () => () => {}

/** `false` on the server and while hydrating: the locale and time zone are only known in the browser. */
function useHydrated() {
  return React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}

/** E.g. "09/28/2026 14:05": the day in the user's locale, the time on a 24-hour clock. */
function useDateTimeFormat() {
  const hydrated = useHydrated()
  return (value: string) => {
    const { date, time } = splitDateTime(value)
    if (!hydrated || !date || !time) return value.replace("T", " ")
    const day = date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    return `${day} ${time}`
  }
}

function dateTimePanel(labels: TimePickerLabels): PickerPanel {
  return function renderDateTimePanel(value, onValueChange, onOk) {
    const { date, day, time } = splitDateTime(value)
    return (
      <>
        <div className="flex">
          <Calendar
            mode="single"
            // Clicking the picked day again keeps it instead of clearing it.
            required
            defaultMonth={date}
            selected={date}
            onSelect={(next: Date) =>
              onValueChange(`${toDay(next)}T${time ?? "00:00"}`)
            }
          />
          {/* As tall as the calendar, whatever the month. */}
          <div className="relative w-28 border-s">
            <TimeColumns
              className="absolute inset-0 h-auto"
              value={time ?? ""}
              onValueChange={(next) =>
                onValueChange(`${day ?? toDay(new Date())}T${next}`)
              }
              onConfirm={onOk}
              labels={labels}
            />
          </div>
        </div>
        <PickerFooter
          labels={labels}
          okDisabled={!day}
          onOk={onOk}
          onNow={() => {
            onValueChange(currentDateTime())
            onOk()
          }}
        />
      </>
    )
  }
}

export interface DateTimePickerProps {
  /** Local date and time as `YYYY-MM-DDTHH:mm`, or `""`. A zoned value (`…Z`) shows in local time. */
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  labels?: Partial<TimePickerLabels>
  id?: string
  "aria-label"?: string
  className?: string
}

/** A moment, picked from a calendar and hour and minute columns. */
export function DateTimePicker({
  placeholder = "Pick date and time",
  labels,
  className,
  ...props
}: DateTimePickerProps) {
  const all = { ...defaultTimePickerLabels, ...labels }
  return (
    <PickerField
      {...props}
      placeholder={placeholder}
      format={useDateTimeFormat()}
      icon={CalendarIcon}
      panel={dateTimePanel(all)}
      className={cn("w-52", className)}
    />
  )
}

export interface DateTimeRangePickerProps extends Omit<
  DateTimePickerProps,
  "value" | "onValueChange" | "placeholder"
> {
  /** `[from, to]`, each `YYYY-MM-DDTHH:mm` or `""`. */
  value: [string, string]
  onValueChange: (value: [string, string]) => void
}

/** A start and an end moment in one field. */
export function DateTimeRangePicker({
  labels,
  ...props
}: DateTimeRangePickerProps) {
  const all = { ...defaultTimePickerLabels, ...labels }
  return (
    <RangePickerField
      {...props}
      labels={all}
      format={useDateTimeFormat()}
      icon={CalendarIcon}
      panel={dateTimePanel(all)}
      sideClassName="min-w-11"
    />
  )
}
