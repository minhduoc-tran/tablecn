import { hasOwn } from "../has-own"
import type { OperatorId } from "../types"

/** Per-operator values; an explicit `undefined` entry turns that operator off. */
export type OperatorMapping<T> = Partial<Record<OperatorId, T>>

export function mapOperator<T>(
  mapping: OperatorMapping<T>,
  operator: OperatorId,
  fallback?: T
): T | undefined {
  return hasOwn(mapping, operator) ? mapping[operator] : fallback
}
