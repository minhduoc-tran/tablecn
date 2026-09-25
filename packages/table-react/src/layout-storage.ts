export type LayoutStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">

const listeners = new Map<string, Set<() => void>>()
// Writes the storage refused (quota, privacy mode), so the layout still changes for this page.
const refusedByStorage = new WeakMap<
  LayoutStorage,
  Map<string, string | null>
>()
const refusedWithoutStorage = new Map<string, string | null>()

function refusedWrites(storage: LayoutStorage | undefined) {
  if (!storage) return refusedWithoutStorage
  let refused = refusedByStorage.get(storage)
  if (!refused) refusedByStorage.set(storage, (refused = new Map()))
  return refused
}

/** `localStorage`, or `undefined` on the server or when the browser blocks it. */
export function getLocalStorage(): LayoutStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

export function readLayout(
  storage: LayoutStorage | undefined,
  key: string
): string | null {
  const refused = refusedWrites(storage)
  if (refused.has(key)) return refused.get(key)!
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}

/** `null` removes the saved layout. Every hook on this key, in this tab, rerenders. */
export function writeLayout(
  storage: LayoutStorage | undefined,
  key: string,
  value: string | null
) {
  try {
    if (!storage) throw new Error("No storage")
    if (value === null) storage.removeItem(key)
    else storage.setItem(key, value)
    refusedWrites(storage).delete(key)
  } catch {
    refusedWrites(storage).set(key, value)
  }
  for (const listener of listeners.get(key) ?? []) listener()
}

/** Also hears other tabs through the `storage` event, when `storage` is `localStorage` or `sessionStorage` itself. */
export function subscribeLayout(
  storage: LayoutStorage | undefined,
  key: string,
  onChange: () => void
) {
  const keyListeners = listeners.get(key) ?? new Set()
  listeners.set(key, keyListeners)
  keyListeners.add(onChange)
  const onStorage = (event: StorageEvent) => {
    if (
      event.storageArea === storage &&
      (event.key === key || event.key === null)
    ) {
      // Another tab wrote it, so the storage works again.
      refusedWrites(storage).delete(key)
      onChange()
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage)
  }
  return () => {
    keyListeners.delete(onChange)
    if (keyListeners.size === 0) listeners.delete(key)
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage)
    }
  }
}
