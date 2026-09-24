import { describe, expect, it } from "vitest"

import {
  BUILTIN_FIELD_TYPES,
  createValueParser,
  type FieldTypeDefinition,
} from "./field-types"
import { BUILTIN_OPERATORS } from "./operators"
import {
  createRegistry,
  DEFAULT_REGISTRY,
  getDefaultOperator,
  getFieldOperators,
  getFieldType,
} from "./registry"
import type { FieldDefinition } from "./types"

const field = (overrides: Partial<FieldDefinition> = {}): FieldDefinition => ({
  name: "status",
  label: "Status",
  type: "text",
  ...overrides,
})

const ratingType: FieldTypeDefinition = {
  id: "rating",
  operators: ["gte", "near"],
  defaultOperator: "gte",
  parseValue: createValueParser((raw) =>
    typeof raw === "number" ? raw : undefined
  ),
}

describe("createRegistry", () => {
  it("contains the built-ins by default", () => {
    expect(Object.keys(DEFAULT_REGISTRY.fieldTypes)).toHaveLength(7)
    expect(Object.keys(DEFAULT_REGISTRY.operators)).toHaveLength(15)
  })

  it("adds custom field types and operators", () => {
    const registry = createRegistry({
      fieldTypes: [ratingType],
      operators: [{ id: "near", arity: "range" }],
    })
    expect(getFieldType(field({ type: "rating" }), registry)).toBe(ratingType)
    expect(registry.operators.near?.arity).toBe("range")
    expect(registry.fieldTypes.text).toBeDefined()
  })

  it("replaces a built-in type with the same id", () => {
    const narrowText = { ...ratingType, id: "text", operators: ["gte"] }
    const registry = createRegistry({ fieldTypes: [narrowText] })
    expect(getFieldOperators(field(), registry)).toEqual(["gte"])
  })

  it("does not mutate the default registry", () => {
    createRegistry({ operators: [{ id: "near", arity: "range" }] })
    expect(DEFAULT_REGISTRY.operators.near).toBeUndefined()
  })

  it("throws when a field type references an unknown operator", () => {
    expect(() => createRegistry({ fieldTypes: [ratingType] })).toThrow(
      /unknown operator "near"/
    )
  })

  it("throws when the default operator is not offered", () => {
    const broken = { ...ratingType, operators: ["gte"], defaultOperator: "lt" }
    expect(() => createRegistry({ fieldTypes: [broken] })).toThrow(
      /default operator "lt"/
    )
  })
})

describe("getFieldType", () => {
  it("returns undefined for unknown or prototype type ids", () => {
    expect(getFieldType(field({ type: "nope" }))).toBeUndefined()
    expect(getFieldType(field({ type: "toString" }))).toBeUndefined()
  })
})

describe("getFieldOperators", () => {
  it("returns the type's operators by default", () => {
    expect(getFieldOperators(field({ type: "boolean" }))).toEqual(["eq"])
  })

  it("narrows and reorders by field.operators, dropping unsupported ids", () => {
    const narrowed = field({ operators: ["eq", "gt", "contains"] })
    expect(getFieldOperators(narrowed)).toEqual(["eq", "contains"])
  })

  it("returns a copy, not the type's array", () => {
    const operators = getFieldOperators(field())
    operators.pop()
    expect(getFieldOperators(field())).toContain("isNotEmpty")
  })

  it("returns [] for an unknown type", () => {
    expect(getFieldOperators(field({ type: "nope" }))).toEqual([])
  })
})

describe("getDefaultOperator", () => {
  it("prefers field.defaultOperator when offered", () => {
    expect(getDefaultOperator(field({ defaultOperator: "eq" }))).toBe("eq")
  })

  it("falls back to the type default", () => {
    expect(getDefaultOperator(field({ defaultOperator: "gt" }))).toBe(
      "contains"
    )
  })

  it("falls back to the first offered operator", () => {
    expect(getDefaultOperator(field({ operators: ["ne", "eq"] }))).toBe("ne")
  })

  it("returns null when nothing is offered", () => {
    expect(getDefaultOperator(field({ type: "nope" }))).toBeNull()
  })
})

describe("createRegistry overrides", () => {
  it("overrides built-ins field by field, keeping match only for the same arity", () => {
    const registry = createRegistry({
      operators: [
        { id: "eq", arity: "single" },
        { id: "in", arity: "single" },
      ],
      fieldTypes: [
        {
          id: "text",
          operators: ["eq"],
          defaultOperator: "eq",
          parseValue: (raw) => raw as never,
        },
      ],
    })
    expect(registry.operators.eq?.match).toBe(BUILTIN_OPERATORS.eq.match)
    expect(registry.operators.in?.match).toBeUndefined()
    expect(registry.fieldTypes.text?.toComparable).toBe(
      BUILTIN_FIELD_TYPES.text.toComparable
    )
    expect(registry.fieldTypes.text?.operators).toEqual(["eq"])
  })
})
