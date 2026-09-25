import { toSearchText } from "./client-filter/comparable-values"
import type { SelectOption } from "./types"

/** Options whose label contains the search, ignoring case and accents. */
export function filterOptions(
  options: readonly SelectOption[],
  search: string
): readonly SelectOption[] {
  const query = toSearchText(search.trim(), { accentInsensitive: true })
  if (query === null) return options
  return options.filter((option) =>
    toSearchText(option.label, { accentInsensitive: true })?.includes(query)
  )
}
