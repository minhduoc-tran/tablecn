// @vitest-environment node
import {
  createMemoryAdapter,
  type UrlStateAdapter,
} from "@querycn/filter-react"
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { useTableUrlState } from "./use-table-url-state"

function Page({ adapter }: { adapter: UrlStateAdapter }) {
  const { sorting, pagination } = useTableUrlState({ adapter })
  return (
    <>{`${sorting.map((s) => s.id).join(",")}|${pagination.pageIndex + 1}`}</>
  )
}

describe("useTableUrlState on the server", () => {
  it("renders from readServer, so hydration matches", () => {
    const html = renderToString(
      <Page
        adapter={{
          read: () => "?sort=name&page=3",
          readServer: () => "",
          write: () => {},
        }}
      />
    )
    expect(html).toBe("|1")
  })

  it("falls back to read", () => {
    const html = renderToString(
      <Page adapter={createMemoryAdapter("?sort=name&page=3")} />
    )
    expect(html).toBe("name|3")
  })
})
