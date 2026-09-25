import { useCallback, useState, useSyncExternalStore } from "react"

import { applyParamChanges } from "./adapters/apply-param-changes"
import type {
  ParamPatch,
  UrlStateAdapter,
} from "./adapters/url-state-adapter-types"

const noopSubscribe = () => () => {}

interface PendingWrite {
  adapter: UrlStateAdapter
  /** What the adapter still returned right after the write. */
  base: string
  value: string
}

/**
 * The adapter's value, plus the last write until the adapter reflects it.
 * Router adapters apply writes on a later render; without this, two quick
 * writes would both start from the old value and the second would undo the first.
 */
export function useAdapterValue(adapter: UrlStateAdapter) {
  const raw = useSyncExternalStore(
    adapter.subscribe ?? noopSubscribe,
    adapter.read,
    adapter.readServer ?? adapter.read
  )
  const [pending, setPending] = useState<PendingWrite | null>(null)
  // Once the adapter moves (caught up, back/forward), it is the truth again. Router adapters
  // are rebuilt per URL, so a new instance also means another navigation landed, e.g. one
  // that dropped the param; without this the write could stay pending forever.
  const isPending =
    pending !== null && pending.adapter === adapter && pending.base === raw
  if (pending !== null && !isPending) setPending(null)

  const write = useCallback(
    (changes: ParamPatch) => {
      adapter.write(changes)
      const base = adapter.read()
      const value = applyParamChanges(base, changes)
      setPending(value === null ? null : { adapter, base, value })
    },
    [adapter]
  )

  return [isPending ? pending.value : raw, write] as const
}
