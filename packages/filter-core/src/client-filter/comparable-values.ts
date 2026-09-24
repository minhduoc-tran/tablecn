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
  const text = String(value).toLowerCase().normalize("NFC")
  const result = accentInsensitive ? stripAccents(text) : text
  return result.trim() === "" ? null : result
}

// Option values are ids: compared exactly, not as text.
export function toOptionValue(value: unknown): string | null {
  return isPrimitive(value) && value !== "" ? String(value) : null
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})/
const ZONED_TIME = /T.*(?:Z|[+-]\d{2}:?\d{2})$/i

const pad = (part: number) => String(part).padStart(2, "0")

const localDay = (date: Date) =>
  Number.isNaN(date.getTime())
    ? null
    : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

// Instants (Date, epoch ms, ISO with a zone) are read in local time: the day the table shows.
// Zone-less strings already name the day.
export function toDateOnly(value: unknown): string | null {
  if (value instanceof Date || typeof value === "number") {
    return localDay(new Date(value))
  }
  if (typeof value !== "string") return null
  if (ZONED_TIME.test(value)) return localDay(new Date(value))
  const match = DAY.exec(value)
  if (!match) return null
  const [year, month, day] = match.slice(1).map(Number) as [
    number,
    number,
    number,
  ]
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? match[0]
    : null
}

// `Date.parse` accepts almost anything ("12", "Sept 3"), so require an ISO date first.
export function toTimestamp(value: unknown): number | null {
  const time =
    value instanceof Date
      ? value.getTime()
      : typeof value === "string" && DAY.test(value)
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
