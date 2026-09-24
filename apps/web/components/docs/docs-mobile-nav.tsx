"use client"

import { useState } from "react"
import { MenuIcon } from "lucide-react"
import type * as PageTree from "fumadocs-core/page-tree"

import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"

import { DocsSidebarNav } from "@/components/docs/docs-sidebar-nav"

/** Sidebar navigation in a sheet for screens below `lg` */
export function DocsMobileNav({ tree }: { tree: PageTree.Root }) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 lg:hidden">
          <MenuIcon />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="gap-0 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <div className="px-2 pb-6">
          <DocsSidebarNav tree={tree} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
