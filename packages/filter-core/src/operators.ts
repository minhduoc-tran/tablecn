import { BUILTIN_MATCHERS } from "./client-filter/operator-matchers"
import { hasOwn } from "./has-own"
import type {
  Arity,
  BuiltinOperatorId,
  OperatorDefinition,
  OperatorId,
} from "./types"

const builtin = (id: BuiltinOperatorId, arity: Arity): OperatorDefinition => ({
  id,
  arity,
  match: BUILTIN_MATCHERS[id],
})

export const BUILTIN_OPERATORS: Readonly<
  Record<BuiltinOperatorId, OperatorDefinition>
> = {
  eq: builtin("eq", "single"),
  ne: builtin("ne", "single"),
  contains: builtin("contains", "single"),
  notContains: builtin("notContains", "single"),
  startsWith: builtin("startsWith", "single"),
  endsWith: builtin("endsWith", "single"),
  gt: builtin("gt", "single"),
  gte: builtin("gte", "single"),
  lt: builtin("lt", "single"),
  lte: builtin("lte", "single"),
  between: builtin("between", "range"),
  in: builtin("in", "multi"),
  notIn: builtin("notIn", "multi"),
  isEmpty: builtin("isEmpty", "none"),
  isNotEmpty: builtin("isNotEmpty", "none"),
}

export type OperatorMap = Readonly<Record<string, OperatorDefinition>>

export function getOperatorArity(
  id: OperatorId,
  operators: OperatorMap = BUILTIN_OPERATORS
): Arity | undefined {
  return hasOwn(operators, id) ? operators[id]?.arity : undefined
}
