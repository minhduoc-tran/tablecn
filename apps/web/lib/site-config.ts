/** Site-wide metadata and top navigation links */
export const siteConfig = {
  name: "tablecn",
  /** Origin of this site; the shadcn registry is served from `${url}/r/…` */
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  navItems: [
    { href: "/docs", label: "Docs" },
    { href: "/docs/filter", label: "Filter" },
    { href: "/docs/components/button", label: "Components" },
  ],
} as const
