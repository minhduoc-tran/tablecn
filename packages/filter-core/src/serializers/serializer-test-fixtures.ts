import type { FilterContext } from "../context"
import type { FilterRule, FilterState, FilterValue, Join } from "../types"

export const context: FilterContext = {
  fields: [
    { name: "name", label: "Name", type: "text" },
    { name: "amount", label: "Amount", type: "number" },
    { name: "status", label: "Status", type: "select" },
    { name: "tags", label: "Tags", type: "multiSelect" },
    { name: "active", label: "Active", type: "boolean" },
  ],
}

let seq = 0
export const rule = (
  field: string,
  operator: string | null,
  value: FilterValue
): FilterRule => ({ id: `r${++seq}`, field, operator, value })

export const state = (join: Join, ...rules: FilterRule[]): FilterState => ({
  join,
  rules,
})
