import type { FieldDefinition, SelectOption } from "@querycn/filter-core"

interface FieldOptionsCache {
  /** Successful `loadOptions` results by search; errors are not kept. */
  lists: Map<string, readonly SelectOption[]>
  labels: Map<string, string>
  /** Values `resolveLabels` answered without, so they aren't asked for again. */
  unlabeled: Set<string>
}

type CacheKey = NonNullable<
  FieldDefinition["loadOptions"] | FieldDefinition["resolveLabels"]
>

// Keyed by the loader function, not the field name: two tables may both have a `status`
// field backed by different endpoints.
let caches = new WeakMap<CacheKey, FieldOptionsCache>()

const cacheKey = (field: FieldDefinition) =>
  field.loadOptions ?? field.resolveLabels

export function getFieldOptionsCache(
  field: FieldDefinition
): FieldOptionsCache | undefined {
  const key = cacheKey(field)
  if (!key) return undefined
  let cache = caches.get(key)
  if (!cache) {
    cache = { lists: new Map(), labels: new Map(), unlabeled: new Set() }
    caches.set(key, cache)
  }
  return cache
}

/**
 * Loaded options and labels are kept for the page session. Clear them when
 * they go stale: after creating a record, or on logout / tenant switch.
 * Without a field, clears every field's cache.
 */
export function clearFieldOptionsCache(field?: FieldDefinition): void {
  if (!field) {
    caches = new WeakMap()
    return
  }
  const key = cacheKey(field)
  if (key) caches.delete(key)
}

export function rememberLabels(
  cache: FieldOptionsCache,
  options: readonly SelectOption[]
): void {
  for (const option of options) cache.labels.set(option.value, option.label)
}
