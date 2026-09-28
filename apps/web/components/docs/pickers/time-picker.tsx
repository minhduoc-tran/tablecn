"use client"

import * as React from "react"
import { ArrowRightIcon, ClockIcon, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface TimePickerLabels {
  hour: string
  minute: string
  now: string
  ok: string
  from: string
  to: string
}

export const defaultTimePickerLabels: TimePickerLabels = {
  hour: "Hour",
  minute: "Minute",
  now: "Now",
  ok: "OK",
  from: "From",
  to: "To",
}

const pad = (part: number) => String(part).padStart(2, "0")
const HOURS = Array.from({ length: 24 }, (_, hour) => pad(hour))
const MINUTES = Array.from({ length: 60 }, (_, minute) => pad(minute))

/** The browser's local time as `HH:mm`. */
export const currentTime = () => {
  const now = new Date()
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`
}

type TimePart = "hour" | "minute"

function splitTime(value: string): Partial<Record<TimePart, string>> {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  return match ? { hour: match[1], minute: match[2] } : {}
}

function TimeColumn({
  label,
  items,
  selected,
  autoFocus,
  onPick,
  onConfirm,
}: {
  label: string
  items: string[]
  selected: string | undefined
  autoFocus?: boolean
  onPick: (item: string) => void
  onConfirm: () => void
}) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const optionsId = React.useId()
  const opening = React.useRef(selected)

  // Opens with the picked item at the top, like a wheel.
  React.useLayoutEffect(() => {
    const list = listRef.current
    const option =
      opening.current &&
      list?.querySelector<HTMLElement>(`[data-value="${opening.current}"]`)
    if (list && option) list.scrollTop = option.offsetTop - 4
  }, [])

  React.useEffect(() => {
    if (autoFocus) listRef.current?.focus({ preventScroll: true })
  }, [autoFocus])

  const pick = (item: string) => {
    onPick(item)
    listRef.current
      ?.querySelector(`[data-value="${item}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const index = selected ? items.indexOf(selected) : -1
    const next = {
      ArrowDown: items[Math.min(index + 1, items.length - 1)],
      ArrowUp: items[Math.max(index - 1, 0)],
      Home: items[0],
      End: items.at(-1),
    }[event.key]
    if (next) pick(next)
    else if (event.key === "Enter" && selected) onConfirm()
    else return
    event.preventDefault()
  }

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      aria-activedescendant={selected ? `${optionsId}-${selected}` : undefined}
      onKeyDown={onKeyDown}
      className="relative h-full w-14 overflow-y-auto overscroll-contain p-1 outline-none [scrollbar-width:thin] focus-visible:bg-accent/40"
    >
      {items.map((item) => (
        <div
          key={item}
          id={`${optionsId}-${item}`}
          role="option"
          aria-selected={item === selected}
          data-value={item}
          onClick={() => pick(item)}
          className={cn(
            "flex h-7 cursor-default items-center justify-center rounded-sm text-sm tabular-nums select-none hover:bg-accent",
            item === selected &&
              "bg-primary/10 font-medium text-primary hover:bg-primary/15"
          )}
        >
          {item}
        </div>
      ))}
      {/* Room to scroll the last items up to the top. */}
      <div aria-hidden className="h-48" />
    </div>
  )
}

/**
 * Hour and minute columns side by side, driven by ↑/↓, Home/End and Enter.
 * Picking one part starts the other at `00`, so every pick is a valid time.
 */
export function TimeColumns({
  value,
  onValueChange,
  onConfirm,
  labels,
  autoFocus,
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  onConfirm: () => void
  labels: Pick<TimePickerLabels, TimePart>
  autoFocus?: boolean
  className?: string
}) {
  const picked = splitTime(value)
  const { hour = "00", minute = "00" } = picked
  const column = (part: TimePart, items: string[]) => (
    <TimeColumn
      label={labels[part]}
      items={items}
      selected={picked[part]}
      autoFocus={autoFocus && part === "hour"}
      onPick={(item) =>
        onValueChange(part === "hour" ? `${item}:${minute}` : `${hour}:${item}`)
      }
      onConfirm={onConfirm}
    />
  )
  return (
    <div className={cn("flex h-56 divide-x", className)}>
      {column("hour", HOURS)}
      {column("minute", MINUTES)}
    </div>
  )
}

/** Now and OK under a picker. */
export function PickerFooter({
  labels,
  okDisabled,
  onNow,
  onOk,
}: {
  labels: Pick<TimePickerLabels, "now" | "ok">
  okDisabled: boolean
  onNow: () => void
  onOk: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-t p-1.5">
      <Button variant="link" size="sm" className="h-7 px-1.5" onClick={onNow}>
        {labels.now}
      </Button>
      <Button size="sm" className="h-7" disabled={okDisabled} onClick={onOk}>
        {labels.ok}
      </Button>
    </div>
  )
}

/** What a picker's popover shows; `onOk` closes it, or moves on to a range's end. */
export type PickerPanel = (
  value: string,
  onValueChange: (value: string) => void,
  onOk: () => void
) => React.ReactNode

interface PickerFieldProps {
  id?: string
  "aria-label"?: string
  format: (value: string) => string
  icon: LucideIcon
  panel: PickerPanel
  className?: string
}

/** A button showing the value, opening `panel` in a popover. */
export function PickerField({
  id,
  "aria-label": label,
  value,
  onValueChange,
  format,
  placeholder,
  icon: Icon,
  panel,
  className,
}: PickerFieldProps & {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn("justify-between font-normal tabular-nums", className)}
        >
          {label && <span className="sr-only">{label}: </span>}
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ? format(value) : placeholder}
          </span>
          <Icon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto gap-0 p-0" align="start">
        {panel(value, onValueChange, () => setOpen(false))}
      </PopoverContent>
    </Popover>
  )
}

type Side = "from" | "to"

/** Both ends of a range in one field, each opening `panel`; OK on the start moves on to the end. */
export function RangePickerField({
  id,
  "aria-label": label,
  value: [from, to],
  onValueChange,
  format,
  icon: Icon,
  panel,
  className,
  labels,
  sideClassName,
}: PickerFieldProps & {
  value: [string, string]
  onValueChange: (value: [string, string]) => void
  labels: Pick<TimePickerLabels, Side>
  sideClassName?: string
}) {
  const [open, setOpen] = React.useState<Side | null>(null)

  const side = (name: Side, value: string, other: string) => (
    <Popover
      open={open === name}
      onOpenChange={(next) =>
        setOpen((current) => (next ? name : current === name ? null : current))
      }
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          id={name === "from" ? id : undefined}
          aria-label={label ? `${label} ${labels[name]}` : labels[name]}
          data-active={open === name || undefined}
          // Flags the empty end of a half-picked range.
          data-invalid={(value === "" && other !== "") || undefined}
          className={cn(
            "relative flex h-full shrink-0 items-center text-start tabular-nums outline-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity focus-visible:after:opacity-100 data-invalid:text-destructive data-active:after:opacity-100",
            sideClassName
          )}
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value ? format(value) : labels[name]}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto gap-0 p-0"
        align="start"
        // Moving on to the end: focus goes to its picker, not back here.
        onCloseAutoFocus={(event) => {
          if (name === "from" && open === "to") event.preventDefault()
        }}
      >
        {panel(
          value,
          (next) => onValueChange(name === "from" ? [next, to] : [from, next]),
          () => setOpen(name === "from" ? "to" : null)
        )}
      </PopoverContent>
    </Popover>
  )

  return (
    <div
      className={cn(
        "flex h-9 w-fit items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-sm transition-colors focus-within:border-ring dark:bg-input/30",
        className
      )}
    >
      {side("from", from, to)}
      <ArrowRightIcon
        aria-hidden
        className="size-3.5 shrink-0 text-muted-foreground"
      />
      {side("to", to, from)}
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
    </div>
  )
}

const asIs = (value: string) => value

export interface TimePickerProps {
  /** `HH:mm` on a 24-hour clock, or `""`. */
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  labels?: Partial<TimePickerLabels>
  id?: string
  "aria-label"?: string
  className?: string
}

function timePanel(labels: TimePickerLabels): PickerPanel {
  return function renderTimePanel(value, onValueChange, onOk) {
    return (
      <>
        <TimeColumns
          autoFocus
          value={value}
          onValueChange={onValueChange}
          onConfirm={onOk}
          labels={labels}
        />
        <PickerFooter
          labels={labels}
          okDisabled={!value}
          onOk={onOk}
          onNow={() => {
            onValueChange(currentTime())
            onOk()
          }}
        />
      </>
    )
  }
}

/** A time of day, picked from hour and minute columns. */
export function TimePicker({
  placeholder = "Pick a time",
  labels,
  className,
  ...props
}: TimePickerProps) {
  const all = { ...defaultTimePickerLabels, ...labels }
  return (
    <PickerField
      {...props}
      placeholder={placeholder}
      format={asIs}
      icon={ClockIcon}
      panel={timePanel(all)}
      className={cn("w-36", className)}
    />
  )
}

export interface TimeRangePickerProps extends Omit<
  TimePickerProps,
  "value" | "onValueChange" | "placeholder"
> {
  /** `[from, to]`, each `HH:mm` or `""`. */
  value: [string, string]
  onValueChange: (value: [string, string]) => void
}

/** A start and an end time in one field. */
export function TimeRangePicker({ labels, ...props }: TimeRangePickerProps) {
  const all = { ...defaultTimePickerLabels, ...labels }
  return (
    <RangePickerField
      {...props}
      labels={all}
      format={asIs}
      icon={ClockIcon}
      panel={timePanel(all)}
      sideClassName="w-11"
    />
  )
}
