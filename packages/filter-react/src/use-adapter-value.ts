import { useCallback, useState, useSyncExternalStore } from "react"

import type {
  ParamPatch,
  UrlStateAdapter,
} from "./adapters/url-state-adapter-types"

const noopSubscribe = () => () => {}

interface PendingWrite {
  /** What the adapter still returned right after the write. */
  base: string | null
  value: string | null
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
  // Once the adapter moves (caught up, back/forward), it is the truth again.
  const isPending = pending !== null && pending.base === raw
  if (pending !== null && !isPending) setPending(null)

  const write = useCallback(
    (value: string | null, otherParams?: ParamPatch) => {
      adapter.write(value, otherParams)
      const base = adapter.read()
      setPending(base === value ? null : { base, value })
    },
    [adapter]
  )

  return [isPending ? pending.value : raw, write] as const
}
