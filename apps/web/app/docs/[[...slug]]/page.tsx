import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getBreadcrumbItems } from "fumadocs-core/breadcrumb"
import { findNeighbour } from "fumadocs-core/page-tree"
import { TOCProvider } from "fumadocs-ui/components/toc"
import { DocsBody } from "fumadocs-ui/layouts/docs/page"
import { createRelativeLink } from "fumadocs-ui/mdx"

import { DocsBreadcrumb } from "@/components/docs/docs-breadcrumb"
import {
  DocsPagerFooter,
  DocsPagerIconButtons,
} from "@/components/docs/docs-pager"
import { DocsTableOfContents } from "@/components/docs/docs-table-of-contents"
import { siteConfig } from "@/lib/site-config"
import { source } from "@/lib/source"
import { getMDXComponents } from "@/mdx-components"

export default async function Page(props: PageProps<"/docs/[[...slug]]">) {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  const MDX = page.data.body
  const tree = source.getPageTree()
  const neighbours = findNeighbour(tree, page.url)
  const breadcrumbItems = [
    { name: "Docs", url: "/docs" },
    ...getBreadcrumbItems(page.url, tree, { includePage: true }),
  ]

  return (
    <TOCProvider toc={page.data.toc}>
      <div className="flex">
        <article className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-10">
          <div className="mx-auto flex w-full max-w-[42rem] flex-col gap-2">
            <DocsBreadcrumb items={breadcrumbItems} />
            <div className="flex items-start justify-between gap-4">
              <h1 className="scroll-m-20 text-3xl font-semibold tracking-tight sm:text-4xl">
                {page.data.title}
              </h1>
              <DocsPagerIconButtons neighbours={neighbours} />
            </div>
            {page.data.description && (
              <p className="text-base text-muted-foreground">
                {page.data.description}
              </p>
            )}
            <DocsBody className="mt-6">
              <MDX
                components={getMDXComponents({
                  a: createRelativeLink(source, page),
                })}
              />
            </DocsBody>
            <DocsPagerFooter neighbours={neighbours} />
          </div>
        </article>
        <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-64 shrink-0 overflow-y-auto py-10 xl:block">
          <DocsTableOfContents />
        </aside>
      </div>
    </TOCProvider>
  )
}

export async function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(
  props: PageProps<"/docs/[[...slug]]">
): Promise<Metadata> {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  // Setting `openGraph` replaces the root one, so the shared image is kept here
  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical: page.url },
    openGraph: {
      type: "article",
      siteName: siteConfig.name,
      title: page.data.title,
      description: page.data.description,
      url: page.url,
      images: "/opengraph-image",
    },
    twitter: {
      card: "summary_large_image",
      title: page.data.title,
      description: page.data.description,
      images: "/opengraph-image",
    },
  }
}
