import { createMemoryAdapter } from "@querycn/filter-react"
import {
  createDataTableColumnHelper,
  useDataTable,
  type UseDataTableOptions,
} from "@querycn/table-react"
import { viTableMessages } from "@querycn/table-react/locales/vi"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useMemo, useState, type ComponentType } from "react"
import { describe, expect, it } from "vitest"

import { DataTablePagination as AriaPagination } from "./aria/table/data-table-pagination"
import { DataTablePagination as BasePagination } from "./base/table/data-table-pagination"
import type { DataTablePaginationProps } from "./radix/table/data-table-pagination"
import { DataTablePagination as RadixPagination } from "./radix/table/data-table-pagination"

interface Order {
  id: string
  amount: number
}

const orders = (count: number): Order[] =>
  Array.from({ length: count }, (_, i) => ({ id: String(i + 1), amount: i }))
const ORDERS_45 = orders(45)
const ORDERS_250 = orders(250)
const helper = createDataTableColumnHelper<Order>()

// The size picker is a combobox for Radix and Base UI, a plain button for React Aria.
const BASES: [
  string,
  ComponentType<DataTablePaginationProps<Order>>,
  "combobox" | "button",
][] = [
  ["radix", RadixPagination, "combobox"],
  ["base", BasePagination, "combobox"],
  ["aria", AriaPagination, "button"],
]

describe.each(BASES)(
  "%s DataTablePagination",
  (_, DataTablePagination, pickerRole) => {
    type Props = Partial<Pick<DataTablePaginationProps<Order>, "messages">> & {
      search?: string
      data?: Order[]
      server?: { rowCount: number | undefined }
    }

    function Orders({
      search = "",
      data = ORDERS_45,
      server,
      ...props
    }: Props) {
      const [adapter] = useState(() => createMemoryAdapter(search))
      const columns = useMemo(() => [helper.accessor("amount", {})], [])
      const options = {
        data,
        columns,
        getRowId: (row) => row.id,
        adapter,
        ...(server && { mode: "server", rowCount: server.rowCount }),
      } as UseDataTableOptions<Order>
      const table = useDataTable(options)
      return (
        <>
          <DataTablePagination table={table} {...props} />
          <button
            type="button"
            onClick={() => table.toggleAllPageRowsSelected()}
          >
            Select page
          </button>
          <output data-testid="url">{adapter.read()}</output>
        </>
      )
    }

    const url = () => screen.getByTestId("url").textContent
    const button = (name: string) => screen.getByRole("button", { name })
    const isDisabled = (element: HTMLElement) =>
      element.hasAttribute("disabled") ||
      element.getAttribute("aria-disabled") === "true" ||
      element.hasAttribute("data-disabled")
    const pages = () =>
      Array.from(
        screen.getByRole("navigation").querySelectorAll("li"),
        (li) => li.textContent
      )

    it("moves between pages and marks the current one", async () => {
      const user = userEvent.setup()
      render(<Orders />)
      expect(screen.getByText("45 rows")).toBeDefined()
      expect(screen.getByText("Page 1 of 3")).toBeDefined()
      expect(isDisabled(button("Previous page"))).toBe(true)
      expect(isDisabled(button("First page"))).toBe(true)
      expect(button("Page 1").getAttribute("aria-current")).toBe("page")

      await user.click(button("Next page"))
      expect(url()).toBe("?page=2")
      expect(button("Page 2").getAttribute("aria-current")).toBe("page")
      expect(button("Page 1").getAttribute("aria-current")).toBeNull()

      await user.click(button("Last page"))
      expect(url()).toBe("?page=3")
      expect(isDisabled(button("Next page"))).toBe(true)

      await user.click(button("Page 2"))
      expect(url()).toBe("?page=2")
      await user.click(button("First page"))
      expect(url()).toBe("")
    })

    it("shortens long page lists with ellipses", () => {
      render(<Orders data={ORDERS_250} search="?page=12&per_page=10" />)
      expect(pages()).toEqual([
        "",
        "",
        "1",
        "More pages",
        "11",
        "12",
        "13",
        "More pages",
        "25",
        "",
        "",
      ])
    })

    it("goes back to page 1 when the page size changes", async () => {
      const user = userEvent.setup()
      render(<Orders search="?page=3&per_page=10" />)
      await user.click(screen.getByRole(pickerRole, { name: /Rows per page/ }))
      await user.click(await screen.findByRole("option", { name: "50" }))
      expect(url()).toBe("?per_page=50")
      expect(screen.queryByRole("navigation")).toBeNull()
    })

    it("keeps the page when the same size is picked again", async () => {
      const user = userEvent.setup()
      render(<Orders search="?page=3&per_page=10" />)
      await user.click(screen.getByRole(pickerRole, { name: /Rows per page/ }))
      await user.click(await screen.findByRole("option", { name: "10" }))
      expect(url()).toBe("?page=3&per_page=10")
    })

    it("keeps focus in the nav when the pressed button gets disabled", async () => {
      const user = userEvent.setup()
      render(<Orders />)
      await user.click(button("Last page"))
      expect(document.activeElement).toBe(button("Page 3"))
      await user.click(button("First page"))
      expect(document.activeElement).toBe(button("Page 1"))
    })

    it("hides what there's nothing to do with", () => {
      const { unmount } = render(<Orders data={orders(8)} />)
      expect(screen.getByText("8 rows")).toBeDefined()
      expect(
        screen.queryByRole(pickerRole, { name: /Rows per page/ })
      ).toBeNull()
      expect(screen.queryByRole("navigation")).toBeNull()
      unmount()

      const { container } = render(<Orders data={orders(0)} />)
      expect(
        container.querySelector("[data-slot=data-table-pagination]")
      ).toBeNull()
    })

    it("steps page by page while the backend's total is unknown", () => {
      const { rerender } = render(
        <Orders data={orders(20)} server={{ rowCount: undefined }} />
      )
      expect(screen.getByText("Page 1")).toBeDefined()
      expect(isDisabled(button("Next page"))).toBe(false)
      expect(screen.queryByRole("button", { name: "Last page" })).toBeNull()
      expect(screen.queryByRole("button", { name: "Page 1" })).toBeNull()

      rerender(<Orders data={orders(20)} server={{ rowCount: 20 }} />)
      expect(screen.queryByRole("navigation")).toBeNull()
    })

    it("counts a first page that isn't full as every row", () => {
      render(<Orders data={orders(3)} server={{ rowCount: undefined }} />)
      expect(screen.getByText("3 rows")).toBeDefined()
      expect(
        screen.queryByRole(pickerRole, { name: /Rows per page/ })
      ).toBeNull()
      expect(screen.queryByRole("navigation")).toBeNull()
    })

    it("formats numbers and counts selected rows in the messages' language", async () => {
      const user = userEvent.setup()
      render(
        <Orders
          data={orders(1500)}
          search="?per_page=10"
          messages={viTableMessages}
        />
      )
      expect(screen.getByText("1.500 dòng")).toBeDefined()
      expect(screen.getByText("Trang 1/150")).toBeDefined()
      expect(screen.getByRole("navigation").getAttribute("aria-label")).toBe(
        "Phân trang"
      )
      await user.click(button("Select page"))
      expect(screen.getByText("Đã chọn 10/10")).toBeDefined()
    })
  }
)
