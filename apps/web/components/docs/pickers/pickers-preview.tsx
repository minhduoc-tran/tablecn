"use client"

import * as React from "react"

import {
  DateTimePicker,
  DateTimeRangePicker,
} from "@/components/docs/pickers/date-time-picker"
import {
  TimePicker,
  TimeRangePicker,
} from "@/components/docs/pickers/time-picker"

function Preview({
  children,
  value,
}: {
  children: React.ReactNode
  value: unknown
}) {
  return (
    <div className="not-prose my-6 flex flex-col gap-4 rounded-lg border p-6">
      <div className="flex flex-wrap items-center gap-3">{children}</div>
      <dl className="font-mono text-xs">
        <dt className="text-muted-foreground">value</dt>
        <dd className="break-all">{JSON.stringify(value)}</dd>
      </dl>
    </div>
  )
}

export function TimePickerPreview() {
  const [time, setTime] = React.useState("09:30")
  const [range, setRange] = React.useState<[string, string]>(["09:00", ""])
  return (
    <Preview value={{ time, range }}>
      <TimePicker aria-label="Pickup" value={time} onValueChange={setTime} />
      <TimeRangePicker
        aria-label="Opening hours"
        value={range}
        onValueChange={setRange}
      />
    </Preview>
  )
}

export function DateTimePickerPreview() {
  const [moment, setMoment] = React.useState("2026-09-28T14:05")
  const [range, setRange] = React.useState<[string, string]>(["", ""])
  return (
    <Preview value={{ moment, range }}>
      <DateTimePicker
        aria-label="Starts at"
        value={moment}
        onValueChange={setMoment}
      />
      <DateTimeRangePicker
        aria-label="Created"
        value={range}
        onValueChange={setRange}
      />
    </Preview>
  )
}
