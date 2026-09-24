export type Join = "and" | "or"

export type BuiltinOperatorId =
  | "eq"
  | "ne"
  | "contains"
  | "notContains"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "in"
  | "notIn"
  | "isEmpty"
  | "isNotEmpty"

// `string & {}` accepts custom ids while keeping autocomplete for built-ins.
export type OperatorId = BuiltinOperatorId | (string & {})

/** How many values an operator takes: none · one · [from, to] · list. */
export type Arity = "none" | "single" | "range" | "multi"

export interface OperatorDefinition {
  id: OperatorId
  arity: Arity
  /**
   * For client-side filtering. `actual` is the row value as a list (empty = no
   * value); both sides went through the field type's `toComparable`.
   */
  match?(actual: Primitive[], expected: FilterValue): boolean
}

export interface MatchOptions {
  /** Accent-insensitive text matching (`Đà Nẵng` ≈ `da nang`); case is always ignored. */
  accentInsensitive: boolean
}

export type Primitive = string | number | boolean

export type FilterValue =
  null | Primitive | [Primitive, Primitive] | Primitive[]

export interface FilterRule {
  /** Client-only key; never serialized. */
  id: string
  /** Name of the target field. */
  field: string
  operator: OperatorId | null
  value: FilterValue
}

export interface FilterState {
  join: Join
  rules: FilterRule[]
}

export type BuiltinFieldTypeId =
  "text" | "number" | "date" | "datetime" | "boolean" | "select" | "multiSelect"

export type FieldTypeId = BuiltinFieldTypeId | (string & {})

export interface SelectOption {
  label: string
  value: string
}

export interface FieldDefinition {
  name: string
  label: string
  type: FieldTypeId
  /** Restricts and orders the operators offered. Defaults to the type's list. */
  operators?: OperatorId[]
  defaultOperator?: OperatorId
  options?: SelectOption[]
  loadOptions?: (search: string, signal: AbortSignal) => Promise<SelectOption[]>
  meta?: Record<string, unknown>
}
