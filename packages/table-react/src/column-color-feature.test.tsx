import {
  columnVisibilityFeature,
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { act, renderHook } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it } from "vitest"

import {
  columnColorFeature,
  type ColumnColorsState,
} from "./column-color-feature"

const features = tableFeatures({ columnColorFeature, columnVisibilityFeature })
const helper = createColumnHelper<typeof features, { a: string; b: number }>()
const columns = helper.columns([
  helper.accessor("a", {}),
  helper.accessor("b", {}),
])

describe("columnColorFeature", () => {
  it("keeps colors in table state when uncontrolled", () => {
    const { result } = renderHook(() =>
      useTable({
        features,
        columns,
        data: [],
        initialState: { columnColors: { b: "amber" } },
      })
    )
    const column = (id: string) => result.current.getColumn(id)!
    expect(column("a").getColor()).toBeUndefined()
    expect(column("b").getColor()).toBe("amber")

    act(() => column("a").setColor("#fde68a"))
    expect(column("a").getColor()).toBe("#fde68a")
    act(() => column("b").setColor(undefined))
    expect(column("b").getColor()).toBeUndefined()

    act(() => result.current.resetColumnColors())
    expect(result.current.store.state.columnColors).toEqual({ b: "amber" })
    act(() => result.current.resetColumnColors(true))
    expect(result.current.store.state.columnColors).toEqual({})
  })

  it("reports changes through onColumnColorsChange when controlled", () => {
    const { result } = renderHook(() => {
      const [columnColors, setColumnColors] = useState<ColumnColorsState>({})
      return useTable({
        features,
        columns,
        data: [],
        state: { columnColors },
        onColumnColorsChange: setColumnColors,
      })
    })
    act(() => result.current.getColumn("a")!.setColor("sky"))
    act(() => result.current.setColumnColors((old) => ({ ...old, b: "rose" })))
    expect(result.current.getColumn("a")!.getColor()).toBe("sky")
    expect(result.current.getColumn("b")!.getColor()).toBe("rose")
  })

  it("ignores inherited keys", () => {
    const { result } = renderHook(() =>
      useTable({
        features,
        columns: helper.columns([helper.display({ id: "toString" })]),
        data: [],
      })
    )
    expect(result.current.getColumn("toString")!.getColor()).toBeUndefined()
  })
})
