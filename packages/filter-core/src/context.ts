import type { FilterRegistry } from "./registry"
import type { FieldDefinition } from "./types"

/** What most operations need to interpret rules: the declared fields and the registry. */
export interface FilterContext {
  fields: readonly FieldDefinition[]
  registry?: FilterRegistry
}

export function findField(
  context: FilterContext,
  name: string
): FieldDefinition | undefined {
  return context.fields.find((field) => field.name === name)
}
