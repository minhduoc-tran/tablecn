"use client"

import type * as React from "react"
import type { FieldTypeId } from "@querycn/filter-core"

import { BooleanValueInput } from "@/registry/aria/filter/filter-boolean-value-input"
import type { FilterValueSlotProps } from "@/registry/aria/filter/filter-rule-row"
import { SelectValueInput } from "@/registry/aria/filter/filter-select-value-input"
import {
  NumberValueInput,
  TextValueInput,
} from "@/registry/aria/filter/filter-text-value-input"

export type FilterValueInputs = Partial<
  Record<FieldTypeId, React.ComponentType<FilterValueSlotProps>>
>

/** Value input per field type; a custom field type adds its own entry. */
export const filterValueInputs: FilterValueInputs = {
  text: TextValueInput,
  number: NumberValueInput,
  boolean: BooleanValueInput,
  select: SelectValueInput,
}

export interface FilterValueInputProps extends FilterValueSlotProps {
  /** Overrides by field type, e.g. `{ ...filterValueInputs, rating: RatingInput }`. */
  inputs?: FilterValueInputs
}

/**
 * Picks the input for the rule's field type; types without one get a text
 * input, which handles single and range values only.
 */
export function FilterValueInput({
  inputs = filterValueInputs,
  ...props
}: FilterValueInputProps) {
  const { type } = props.field
  // Own keys only: a custom type id like "toString" must not hit Object.prototype.
  const Input = Object.hasOwn(inputs, type) ? inputs[type] : undefined
  return Input ? <Input {...props} /> : <TextValueInput {...props} />
}
