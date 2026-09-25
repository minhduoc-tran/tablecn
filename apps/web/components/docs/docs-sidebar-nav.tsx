"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type * as PageTree from "fumadocs-core/page-tree"

import { cn } from "@workspace/ui/lib/utils"

interface SidebarGroup {
  label: string
  items: PageTree.Item[]
}

/**
 * Groups the Fumadocs page tree for the sidebar, in meta.json order:
 * a top-level `---Label---` separator starts a group for the pages after it,
 * and each folder becomes its own group.
 */
function getSidebarGroups(tree: PageTree.Root): SidebarGroup[] {
  const groups: SidebarGroup[] = []
  let current: SidebarGroup | undefined

  for (const node of tree.children) {
    if (node.type === "separator") {
      current = { label: String(node.name ?? ""), items: [] }
      groups.push(current)
    } else if (node.type === "page") {
      if (!current) {
        current = { label: "Sections", items: [] }
        groups.push(current)
      }
      current.items.push(node)
    } else if (node.type === "folder") {
      current = undefined
      const items = [
        ...(node.index ? [node.index] : []),
        ...node.children.filter((child): child is PageTree.Item => child.type === "page"),
      ]
      groups.push({ label: String(node.name), items })
    }
  }

  return groups.filter((group) => group.items.length > 0)
}

/** shadcn-style docs sidebar navigation, shared by desktop sidebar and mobile sheet */
export function DocsSidebarNav({
  tree,
  onNavigate,
}: {
  tree: PageTree.Root
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-6">
      {getSidebarGroups(tree).map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="text-muted-foreground px-2 py-1 text-xs font-medium">{group.label}</p>
          {group.items.map((item) => {
            const isActive = pathname === item.url

            return (
              <Link
                key={item.url}
                href={item.url}
                onClick={onNavigate}
                data-active={isActive}
                className={cn(
                  "hover:bg-accent/60 flex h-[30px] w-fit items-center rounded-lg px-2 text-[0.8rem] font-medium transition-colors",
                  "data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                )}
              >
                {item.name}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
