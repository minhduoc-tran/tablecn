import Image from "next/image"
import Link from "next/link"
import type * as PageTree from "fumadocs-core/page-tree"

import { Button } from "@workspace/ui/components/button"

import { DocsMobileNav } from "@/components/docs/docs-mobile-nav"
import { DocsSearchButton } from "@/components/docs/docs-search-button"
import { ThemeToggleButton } from "@/components/docs/theme-toggle-button"
import { siteConfig } from "@/lib/site-config"

/** Sticky top header for the docs, modeled after ui.shadcn.com */
export function SiteHeader({ tree }: { tree: PageTree.Root }) {
  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-40 w-full backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-2 px-4 lg:px-6">
        <DocsMobileNav tree={tree} />
        <Link href="/" className="me-2 flex items-center gap-2 font-semibold">
          {/* Same artwork as the favicon; inverted in dark mode */}
          <Image src="/logo.png" alt="" width={24} height={24} className="size-6 dark:invert" priority />
          {siteConfig.name}
        </Link>
        <nav className="hidden items-center gap-0.5 md:flex">
          {siteConfig.navItems.map((item) => (
            <Button key={item.href} variant="ghost" size="sm" asChild>
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <DocsSearchButton />
          <ThemeToggleButton />
        </div>
      </div>
    </header>
  )
}
