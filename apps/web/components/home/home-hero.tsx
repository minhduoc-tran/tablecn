import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { GitHubIcon } from "@/components/docs/github-icon"
import { InstallCommandTabs } from "@/components/home/install-command-tabs"
import { siteConfig } from "@/lib/site-config"

export function HomeHero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Grid that fades out from the top, and a soft glow behind the title. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] mask-[radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)] bg-size-[56px_56px] opacity-70"
      />
      <div
        aria-hidden
        className="absolute top-[-12rem] left-1/2 -z-10 h-[32rem] w-[56rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,--theme(--color-sky-400/.22),--theme(--color-violet-400/.14),transparent)] blur-2xl"
      />
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-7 px-4 pt-20 pb-16 text-center md:pt-28">
        <Link
          href="/docs"
          className="group inline-flex animate-in items-center gap-2 rounded-full border bg-background/80 py-1 ps-1 pe-3 text-xs shadow-xs backdrop-blur duration-500 fade-in slide-in-from-bottom-2 hover:bg-muted"
        >
          <span className="rounded-full bg-foreground px-2 py-0.5 font-medium text-background">
            New
          </span>
          The data table block is here
          <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <h1 className="max-w-4xl animate-in text-4xl leading-[1.05] font-semibold tracking-tighter text-balance duration-700 fade-in slide-in-from-bottom-3 sm:text-6xl md:text-7xl">
          <span className="block">tablecn</span>
          <span className="block bg-linear-to-r from-sky-500 via-violet-500 to-amber-500 bg-clip-text text-transparent">
            Filter. Sort. Share.
          </span>
        </h1>
        <p className="max-w-2xl animate-in text-base text-balance text-muted-foreground delay-100 duration-700 fill-mode-both fade-in slide-in-from-bottom-3 md:text-lg">
          A data table for shadcn/ui, with filters, sorting and pages synced to
          the URL.
        </p>
        <div className="flex animate-in flex-wrap items-center justify-center gap-3 delay-200 duration-700 fill-mode-both fade-in slide-in-from-bottom-3">
          <Button size="lg" className="h-10 px-5" asChild>
            <Link href="/docs">
              Get started
              <ArrowRightIcon />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-10 px-5" asChild>
            <a href={siteConfig.repository} target="_blank" rel="noreferrer">
              <GitHubIcon />
              GitHub
            </a>
          </Button>
        </div>
        <InstallCommandTabs
          // A direct URL (Radix UI) until `@tablecn` is in the shadcn registry
          // directory (shadcn-ui/ui#12020); then `add @tablecn/data-table`,
          // which picks the user's style.
          command={`npx shadcn@latest add ${siteConfig.url}/r/radix/data-table.json`}
          className="w-full max-w-3xl animate-in text-left delay-300 duration-700 fill-mode-both fade-in"
        />
      </div>
    </section>
  )
}
