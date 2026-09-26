import type { ParamKind } from "@/components/home/url-tokens"

export type CalloutSide = "left" | "right" | "top"

export interface Point {
  x: number
  y: number
}

export interface CalloutDef {
  id: string
  label: string
  side: CalloutSide
  /** Colors the dot like the URL param it writes, as in the legend. */
  kind?: ParamKind
  /** Where the line ends, in viewport coordinates; `null` hides the callout. */
  target: (demo: HTMLElement) => Point | null
}

const TOOLBAR = "[data-slot=data-table-toolbar]"

function rectOf(demo: HTMLElement, selector: string) {
  return demo.querySelector(selector)?.getBoundingClientRect() ?? null
}

/** The table's scroll box: a point outside it is scrolled out of view. */
function inView(demo: HTMLElement, point: Point) {
  const box = rectOf(demo, "[data-slot=data-table]")
  if (!box) return null
  const inside =
    point.x >= box.left - 1 &&
    point.x <= box.right + 1 &&
    point.y >= box.top - 1 &&
    point.y <= box.bottom + 1
  return inside ? point : null
}

/** Skips controls hidden at this width, like the last-page button. */
function lastVisible(demo: HTMLElement, selector: string) {
  const rects = [...demo.querySelectorAll(selector)].map((el) =>
    el.getBoundingClientRect()
  )
  return rects.reverse().find((r) => r.width > 0) ?? null
}

/** Header cells in screen order, without the selection column. */
function dataHeader(demo: HTMLElement, index: number) {
  const cells = demo.querySelectorAll(
    "thead th[data-column-id]:not([data-column-id=select])"
  )
  return cells[index]?.getBoundingClientRect() ?? null
}

// Top targets sit on headers under the toolbar's empty middle, so their lines
// come down without crossing the search box or the buttons.
export const CALLOUTS: CalloutDef[] = [
  {
    id: "search",
    label: "Search, accents ignored",
    side: "left",
    kind: "search",
    target: (demo) => {
      const r = rectOf(demo, "[data-slot=data-table-search]")
      return r && { x: r.left, y: r.top + r.height / 2 }
    },
  },
  {
    id: "select",
    label: "Select rows",
    side: "left",
    target: (demo) => {
      const r = rectOf(demo, "thead [role=checkbox]")
      return r && { x: r.left, y: r.top + r.height / 2 }
    },
  },
  {
    id: "pin",
    label: "Pinned column",
    side: "left",
    // Along a row's bottom border, so the line runs over the grid, not text.
    target: (demo) => {
      const cells = demo.querySelectorAll(
        "tbody td[data-pinned=start]:not([data-column-id=select])"
      )
      const r = cells[1]?.getBoundingClientRect()
      return r ? inView(demo, { x: r.left, y: r.bottom }) : null
    },
  },
  {
    id: "filter",
    label: "Filter builder",
    side: "top",
    kind: "filter",
    target: (demo) => {
      const r = rectOf(demo, `${TOOLBAR} [aria-haspopup=dialog]`)
      return r && { x: r.left + r.width / 2, y: r.top }
    },
  },
  {
    id: "reorder",
    label: "Drag to reorder",
    side: "top",
    target: (demo) => {
      const r = dataHeader(demo, 2)
      return r ? inView(demo, { x: r.left + r.width / 2, y: r.top }) : null
    },
  },
  {
    id: "resize",
    label: "Drag to resize",
    side: "top",
    target: (demo) => {
      const r = dataHeader(demo, 2)
      return r ? inView(demo, { x: r.right, y: r.top }) : null
    },
  },
  {
    id: "menu",
    label: "Right-click: pin, color, hide",
    side: "top",
    // Where the header's ⋯ button shows on hover.
    target: (demo) => {
      const r = dataHeader(demo, 3)
      return r ? inView(demo, { x: r.right - 14, y: r.top }) : null
    },
  },
  {
    id: "columns",
    label: "Show and hide columns",
    side: "right",
    target: (demo) => {
      const r = lastVisible(demo, `${TOOLBAR} [aria-haspopup]`)
      return r && { x: r.right, y: r.top + r.height / 2 }
    },
  },
  {
    id: "sort",
    label: "Click to sort",
    side: "right",
    kind: "sort",
    // The last header whose title is fully in view, so the line crosses no text.
    target: (demo) => {
      const box = rectOf(demo, "[data-slot=data-table]")
      const titles = [
        ...demo.querySelectorAll(
          "thead th:not([data-column-id=select]) div > button:first-child"
        ),
      ]
      for (const title of titles.reverse()) {
        const r = title.getBoundingClientRect()
        if (box && r.width > 0 && r.right <= box.right - 24) {
          return { x: r.right + 6, y: r.top + r.height / 2 }
        }
      }
      return null
    },
  },
  {
    id: "pages",
    label: "Pages in the URL",
    side: "right",
    kind: "page",
    target: (demo) => {
      const r = lastVisible(demo, "[data-slot=data-table-pagination] button")
      return r && { x: r.right, y: r.top + r.height / 2 }
    },
  },
]
