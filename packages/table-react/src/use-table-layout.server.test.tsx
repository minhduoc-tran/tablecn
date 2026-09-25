// @vitest-environment node
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"

import type { LayoutStorage } from "./layout-storage"
import { useTableLayout } from "./use-table-layout"

const COLUMNS = [{ accessorKey: "customer" }, { accessorKey: "amount" }]

function Columns({ storage }: { storage?: LayoutStorage }) {
  const { state } = useTableLayout({
    columns: COLUMNS,
    storageKey: "orders",
    storage,
  })
  return <>{state.columnOrder.join(",")}</>
}

describe("useTableLayout on the server", () => {
  it("renders the column definitions' layout, so hydration matches", () => {
    const saved = JSON.stringify({
      version: 0,
      state: { columnOrder: ["amount", "customer"] },
    })
    const storage: LayoutStorage = {
      getItem: () => saved,
      setItem: () => {},
      removeItem: () => {},
    }
    expect(renderToString(<Columns storage={storage} />)).toBe(
      "customer,amount"
    )
    expect(renderToString(<Columns />)).toBe("customer,amount")
  })
})
