import type {
  Arity,
  BuiltinOperatorId,
  OperatorDefinition,
  OperatorId,
} from "./types"

export const BUILTIN_OPERATORS: Readonly<
  Record<BuiltinOperatorId, OperatorDefinition>
> = {
  eq: { id: "eq", arity: "single" },
  ne: { id: "ne", arity: "single" },
  contains: { id: "contains", arity: "single" },
  notContains: { id: "notContains", arity: "single" },
  startsWith: { id: "startsWith", arity: "single" },
  endsWith: { id: "endsWith", arity: "single" },
  gt: { id: "gt", arity: "single" },
  gte: { id: "gte", arity: "single" },
  lt: { id: "lt", arity: "single" },
  lte: { id: "lte", arity: "single" },
  between: { id: "between", arity: "range" },
  in: { id: "in", arity: "multi" },
  notIn: { id: "notIn", arity: "multi" },
  isEmpty: { id: "isEmpty", arity: "none" },
  isNotEmpty: { id: "isNotEmpty", arity: "none" },
}

export type OperatorMap = Readonly<Record<string, OperatorDefinition>>

export function getOperatorArity(
  id: OperatorId,
  operators: OperatorMap = BUILTIN_OPERATORS
): Arity | undefined {
  // Own-property check so ids like "toString" don't resolve via the prototype.
  return Object.prototype.hasOwnProperty.call(operators, id)
    ? operators[id]?.arity
    : undefined
}
