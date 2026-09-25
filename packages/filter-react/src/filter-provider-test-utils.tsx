import type { FieldDefinition } from "@querycn/filter-core"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"

import { createMemoryAdapter } from "./adapters/memory-adapter"
import type { UrlStateAdapter } from "./adapters/url-state-adapter-types"
import { FilterProvider, type FilterProviderProps } from "./filter-provider"
import { useAppliedFilter } from "./use-applied-filter"
import { useFilter } from "./use-filter"

export const FIELDS: FieldDefinition[] = [
  { name: "name", label: "Name", type: "text" },
  { name: "amount", label: "Amount", type: "number" },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Active", value: "active" },
      { label: "Archived", value: "archived" },
    ],
  },
]

export const STATUS_ACTIVE = '{"and":[["status","eq","active"]]}'

export function setup(
  props: Partial<FilterProviderProps> = {},
  options: { strict?: boolean } = {}
) {
  const adapter = props.adapter ?? createMemoryAdapter()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <FilterProvider fields={FIELDS} adapter={adapter} {...props}>
      {children}
    </FilterProvider>
  )
  const hook = renderHook(
    () => ({ draft: useFilter(), applied: useAppliedFilter() }),
    { wrapper, reactStrictMode: options.strict }
  )
  return { adapter, ...hook }
}

type Hook = ReturnType<typeof setup>["result"]

export function addRule(result: Hook, field: string, value: string | number) {
  act(() => result.current.draft.addRule(field))
  const { id } = result.current.draft.state.rules.at(-1)!
  act(() => result.current.draft.setValue(id, value))
  return id
}

/** Like a router adapter: writes land only when `flush` runs, i.e. after navigation. */
export function createDeferredAdapter(initial: string | null = null) {
  let value = initial
  let queued: { value: string | null } | null = null
  const listeners = new Set<() => void>()
  const set = (next: string | null) => {
    value = next
    for (const listener of listeners) listener()
  }
  const adapter: UrlStateAdapter = {
    read: () => value,
    write: (next) => {
      queued = { value: next }
    },
    subscribe: (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
  }
  return {
    adapter,
    flush: () => {
      if (queued) set(queued.value)
      queued = null
    },
    navigate: set,
  }
}
