import type { MatchOptions, Primitive } from "../types"

// NFD splits most Vietnamese marks off, but `đ` is its own letter.
const stripAccents = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")

export function toSearchText(
  value: unknown,
  { accentInsensitive }: MatchOptions
): string | null {
  if (!isPrimitive(value)) return null
  const text = String(value).toLowerCase()
  if (text.trim() === "") return null
  return accentInsensitive ? stripAccents(text) : text
}

const pad = (part: number) => String(part).padStart(2, "0")

// A Date object is read in local time: that is the day the user sees in the table.
export function toDateOnly(value: unknown): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
  }
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)
    ? value.slice(0, 10)
    : null
}

export function toTimestamp(value: unknown): number | null {
  const time =
    value instanceof Date
      ? value.getTime()
      : typeof value === "string"
        ? Date.parse(value)
        : typeof value === "number"
          ? value
          : NaN
  return Number.isFinite(time) ? time : null
}

export function toPrimitive(value: unknown): Primitive | null {
  return isPrimitive(value) && value !== "" ? value : null
}

function isPrimitive(value: unknown): value is Primitive {
  return (
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  )
}
