"use client"

import * as React from "react"
import { getFieldType, type FilterValue } from "@querycn/filter-core"
import { useFilterActions } from "@querycn/filter-react"

import { cn } from "@/lib/utils"
import { Input } from "@/registry/radix/ui/input"
import type { FilterValueSlotProps } from "@/registry/radix/filter/filter-rule-row"
import {
  toDateTimeLocal,
  useHydrated,
} from "@/registry/shared/filter/filter-date-format"

const toText = (value: FilterValue | undefined): string =>
  value === null || value === undefined || typeof value === "object"
    ? ""
    : String(value)

function TextLikeInput({
  id,
  rule,
  field,
  arity,
  setValue,
  type,
}: FilterValueSlotProps & { type?: "datetime-local" }) {
  const wide = type === "datetime-local"
  // A zoned value (e.g. "…Z") shows in local time; the time zone is only known in the browser.
  const hydrated = useHydrated()
  const show = (text: string) =>
    wide && hydrated ? toDateTimeLocal(text) : text
  const { context, messages } = useFilterActions()
  // Raw text goes into the draft; the field type parses it on apply, so "1." can be typed.
  const invalid = (text: string) =>
    text.trim() !== "" &&
    getFieldType(field, context.registry)?.parseValue(text, "single") ===
      undefined
  const input = (
    text: string,
    onText: (text: string) => void,
    props: React.ComponentProps<"input">
  ) => (
    <Input
      type={type}
      value={show(text)}
      onChange={(event) => onText(event.target.value)}
      aria-invalid={invalid(text) || undefined}
      {...props}
      className={cn("h-7", props.className)}
    />
  )

  if (arity === "range") {
    const [from, to] =
      Array.isArray(rule.value) && rule.value.length === 2
        ? rule.value.map(toText)
        : ["", ""]
    // A range with one side filled is dropped on apply, so flag the empty side.
    const missing = (text: string, other: string) =>
      text.trim() === "" && other.trim() !== ""
    return (
      <div className="flex items-center gap-1.5">
        {input(from!, (text) => setValue([text, to!]), {
          id,
          className: wide ? "w-48" : "w-24",
          placeholder: messages.placeholders.from,
          "aria-invalid": invalid(from!) || missing(from!, to!) || undefined,
          "aria-label": `${field.label} ${messages.placeholders.from}`,
        })}
        <span aria-hidden className="text-sm text-muted-foreground">
          {messages.rangeSeparator}
        </span>
        {input(to!, (text) => setValue([from!, text]), {
          className: wide ? "w-48" : "w-24",
          placeholder: messages.placeholders.to,
          "aria-invalid": invalid(to!) || missing(to!, from!) || undefined,
          "aria-label": `${field.label} ${messages.placeholders.to}`,
        })}
      </div>
    )
  }

  if (arity !== "single") return null
  return input(toText(rule.value), setValue, {
    id,
    className: wide ? "w-48" : "w-40",
    placeholder: messages.placeholders.value,
    "aria-label": field.label,
  })
}

export function TextValueInput(props: FilterValueSlotProps) {
  return <TextLikeInput {...props} />
}

// No `inputMode="decimal"`: iOS's decimal keypad has no minus key.
export function NumberValueInput(props: FilterValueSlotProps) {
  return <TextLikeInput {...props} />
}

/** Local date and time as `YYYY-MM-DDTHH:mm`, without a zone; the backend decides how to read it. */
export function DateTimeValueInput(props: FilterValueSlotProps) {
  return <TextLikeInput {...props} type="datetime-local" />
}
