import Image from "next/image"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { siteConfig } from "@/lib/site-config"

export function HomeCta() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-24">
      <div className="relative isolate overflow-hidden rounded-3xl border bg-foreground px-6 py-16 text-center text-background md:py-20">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_80%_at_50%_120%,--theme(--color-sky-500/.35),--theme(--color-violet-500/.2),transparent)]"
        />
        <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          Your next list page, in an afternoon
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-background/70">
          Add the blocks, declare your fields and columns, and ship a table that
          users can filter, share and arrange.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" variant="secondary" className="h-10 px-5" asChild>
            <Link href="/docs/table/installation">
              Install the table
              <ArrowRightIcon />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="h-10 px-5 text-background hover:bg-background/10 hover:text-background"
            asChild
          >
            <Link href="/docs/filter">Explore the filter</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

export function HomeFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt=""
            width={20}
            height={20}
            className="size-5 dark:invert"
          />
          <span>
            <span className="font-medium text-foreground">
              {siteConfig.name}
            </span>
            {" · "}MIT licensed. Built on TanStack Table and shadcn/ui.
          </span>
        </div>
        <nav className="flex gap-5">
          <Link href="/docs" className="hover:text-foreground">
            Docs
          </Link>
          <Link href="/docs/filter" className="hover:text-foreground">
            Filter
          </Link>
          <Link href="/docs/table" className="hover:text-foreground">
            Table
          </Link>
          <a
            href={siteConfig.repository}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  )
}
