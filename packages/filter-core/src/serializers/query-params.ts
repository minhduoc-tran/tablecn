import type { FilterContext } from "../context"
import { hasOwn } from "../has-own"
import type { FilterState, FilterValue, OperatorId } from "../types"

/** An array means the key is sent once per item (`?k=a&k=b`). */
export type QueryParams = Record<string, string | string[]>

/** Anything a backend needs: query params, a request body, an ORM `where`… */
export type QuerySerializer<T = QueryParams> = (
  state: FilterState,
  context: FilterContext
) => T

export interface SerializerInspection {
  /** Rules left out of the output: operator off, arity mismatch or dropped by `mapRule`. */
  skipped: string[]
  /**
   * Rules whose keys repeat an earlier rule's. The params keep every value,
   * but most backends read only one.
   */
  conflicts: string[]
}

/** The built-in serializers can explain what they dropped, so the UI can warn or hide operators. */
export interface InspectableSerializer<
  T = QueryParams,
> extends QuerySerializer<T> {
  inspect(state: FilterState, context: FilterContext): SerializerInspection
  /** Whether the backend can express this operator at all. */
  supports(operator: OperatorId): boolean
}

export type ArrayFormat = "repeat" | "comma"

// No prototype, so field names like `constructor` or `__proto__` are plain keys.
export function createQueryParams(): QueryParams {
  return Object.create(null) as QueryParams
}

export function addParam(
  params: QueryParams,
  key: string,
  value: string | string[]
): void {
  const existing = hasOwn(params, key) ? params[key] : undefined
  params[key] = existing === undefined ? value : [existing, value].flat()
}

/** Operators without a value send `true`. */
export function formatValue(
  value: FilterValue,
  arrayFormat: ArrayFormat
): string | string[] {
  if (value === null) return "true"
  if (!Array.isArray(value)) return String(value)
  return arrayFormat === "comma" ? value.join(",") : value.map(String)
}

/** For fetch/axios/ky: arrays become repeated keys regardless of the client's own array format. */
export function toSearchParams(params: QueryParams): URLSearchParams {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    for (const item of [value].flat()) searchParams.append(key, item)
  }
  return searchParams
}
