import { BUILTIN_FIELD_TYPES, type FieldTypeDefinition } from "./field-types"
import { hasOwn } from "./has-own"
import { BUILTIN_OPERATORS, type OperatorMap } from "./operators"
import type { FieldDefinition, OperatorDefinition, OperatorId } from "./types"

export interface FilterRegistry {
  fieldTypes: Readonly<Record<string, FieldTypeDefinition>>
  operators: OperatorMap
}

export interface RegistryExtension {
  /**
   * Added to the built-ins. An entry with a built-in id overrides it field by
   * field; an operator keeps the built-in `match` only if its arity is unchanged.
   */
  fieldTypes?: FieldTypeDefinition[]
  operators?: OperatorDefinition[]
}

/**
 * Merges extensions over the built-ins. Throws on a field type that references
 * an unknown operator — that is a config bug, better caught at startup.
 */
export function createRegistry(
  extension: RegistryExtension = {}
): FilterRegistry {
  const operators: Record<string, OperatorDefinition> = { ...BUILTIN_OPERATORS }
  for (const operator of extension.operators ?? []) {
    const base = hasOwn(operators, operator.id)
      ? operators[operator.id]
      : undefined
    operators[operator.id] =
      base?.arity === operator.arity ? { ...base, ...operator } : operator
  }

  const fieldTypes: Record<string, FieldTypeDefinition> = {
    ...BUILTIN_FIELD_TYPES,
  }
  for (const fieldType of extension.fieldTypes ?? []) {
    fieldTypes[fieldType.id] = hasOwn(fieldTypes, fieldType.id)
      ? { ...fieldTypes[fieldType.id]!, ...fieldType }
      : fieldType
  }

  for (const fieldType of Object.values(fieldTypes)) {
    const unknown = fieldType.operators.find((id) => !hasOwn(operators, id))
    if (unknown !== undefined) {
      throw new Error(
        `Field type "${fieldType.id}" references unknown operator "${unknown}"`
      )
    }
    if (!fieldType.operators.includes(fieldType.defaultOperator)) {
      throw new Error(
        `Field type "${fieldType.id}" default operator "${fieldType.defaultOperator}" is not in its operators`
      )
    }
  }

  return { fieldTypes, operators }
}

export const DEFAULT_REGISTRY: FilterRegistry = createRegistry()

export function getFieldType(
  field: FieldDefinition,
  registry: FilterRegistry = DEFAULT_REGISTRY
): FieldTypeDefinition | undefined {
  return hasOwn(registry.fieldTypes, field.type)
    ? registry.fieldTypes[field.type]
    : undefined
}

/**
 * Operators available for a field. `field.operators` narrows and reorders the
 * type's list; ids the type doesn't support are dropped silently.
 */
export function getFieldOperators(
  field: FieldDefinition,
  registry: FilterRegistry = DEFAULT_REGISTRY
): OperatorId[] {
  const allowed = getFieldType(field, registry)?.operators ?? []
  if (!field.operators) return [...allowed]
  return field.operators.filter((id) => allowed.includes(id))
}

/**
 * `field.defaultOperator` → type default → first available, if each is offered.
 * `isAllowed` narrows what counts as offered, e.g. to what the serializer supports.
 */
export function getDefaultOperator(
  field: FieldDefinition,
  registry: FilterRegistry = DEFAULT_REGISTRY,
  isAllowed: (operator: OperatorId) => boolean = () => true
): OperatorId | null {
  const available = getFieldOperators(field, registry).filter(isAllowed)
  const candidates = [
    field.defaultOperator,
    getFieldType(field, registry)?.defaultOperator,
  ]
  return (
    candidates.find((id) => id !== undefined && available.includes(id)) ??
    available[0] ??
    null
  )
}
