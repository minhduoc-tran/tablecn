/** Site-wide metadata and top navigation links */
export const siteConfig = {
  name: "tablecn",
  /** Origin of this site; the shadcn registry is served from `${url}/r/…` */
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  ),
  repository: "https://github.com/minhduoc-tran/tablecn",
  navItems: [
    { href: "/docs", label: "Docs" },
    { href: "/docs/filter", label: "Filter" },
    { href: "/docs/table", label: "Table" },
    { href: "/docs/components/button", label: "Components" },
  ],
} as const
