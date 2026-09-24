import { DocsSidebarNav } from "@/components/docs/docs-sidebar-nav"
import { SiteHeader } from "@/components/docs/site-header"
import { source } from "@/lib/source"

export default function Layout({ children }: LayoutProps<"/docs">) {
  const tree = source.getPageTree()

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader tree={tree} />
      <div className="mx-auto flex w-full max-w-[1400px] flex-1">
        <aside className="sticky top-[calc(3.5rem+0.6rem)] hidden h-[calc(100svh-10rem)] w-64 shrink-0 flex-col lg:flex">
          {/* Vertical divider that fades out at both ends */}
          <div className="via-border absolute top-12 right-2 bottom-0 h-full w-px bg-linear-to-b from-transparent to-transparent" />
          <div className="no-scrollbar mx-auto w-48 flex-1 overflow-y-auto pt-8 pb-12">
            <DocsSidebarNav tree={tree} />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
