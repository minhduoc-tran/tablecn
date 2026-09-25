import { useSyncExternalStore } from "react"
import { parseDateOnly, toDateOnly } from "@querycn/filter-core"

const subscribe = () => () => {}

/**
 * `false` on the server and while hydrating, then `true`. Output that depends
 * on the browser (locale, time zone) waits for it, so server and client HTML match.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}

/** A `YYYY-MM-DD` day in the user's locale, e.g. "Sep 25, 2026"; anything else as is. */
export function formatDateOnly(value: string): string {
  const date = parseDateOnly(value)
  return date
    ? date.toLocaleDateString(undefined, { dateStyle: "medium" })
    : value
}

const asIs = (value: string) => value

/** `formatDateOnly` once hydrated; the raw day before. */
export function useDateOnlyFormat(): (value: string) => string {
  return useHydrated() ? formatDateOnly : asIs
}

const ZONED = /T.*(?:Z|[+-]\d{2}:?\d{2})$/i
const pad = (part: number) => String(part).padStart(2, "0")

/**
 * A zoned date-time (e.g. from `toISOString`) as the local `YYYY-MM-DDTHH:mm`
 * a `datetime-local` input can show; other values as is.
 */
export function toDateTimeLocal(value: string): string {
  const date = ZONED.test(value) ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return value
  return `${toDateOnly(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
