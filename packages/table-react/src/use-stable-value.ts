import { useMemo } from "react"

/** The same reference while the JSON content is the same. */
export function useStableValue<T>(value: T): T {
  const key = JSON.stringify(value)
  return useMemo(() => JSON.parse(key) as T, [key])
}
