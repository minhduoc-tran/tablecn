/** Site-wide metadata and top navigation links */
export const siteConfig = {
  name: "tablecn",
  /** Origin of this site; the shadcn registry is served from `${url}/r/…` */
  url: getSiteUrl(),
  repository: "https://github.com/minhduoc-tran/tablecn",
  navItems: [
    { href: "/docs", label: "Docs" },
    { href: "/docs/table/columns", label: "Table" },
    { href: "/docs/filter/fields", label: "Filter" },
    { href: "/docs/components/table", label: "Components" },
  ],
} as const

// On Vercel the production domain is known without any setup. A bare host
// (Vercel's own variable, or a value typed without it) gets `https://`.
function getSiteUrl() {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    "http://localhost:3000"
  return (/^https?:\/\//.test(url) ? url : `https://${url}`).replace(/\/$/, "")
}
