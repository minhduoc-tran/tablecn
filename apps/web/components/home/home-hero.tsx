import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { CopyCommand } from "@/components/home/copy-command"
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
        <CopyCommand
          command="npx shadcn@latest add @tablecn/data-table"
          className="animate-in delay-300 duration-700 fill-mode-both fade-in"
        />
      </div>
    </section>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}
