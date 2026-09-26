import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { RootProvider } from "fumadocs-ui/provider/next"

import { DocsSearchDialog } from "@/components/docs/docs-search-dialog"
import { siteConfig } from "@/lib/site-config"

import "./globals.css"
import { cn } from "@workspace/ui/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

// The og:image comes from `opengraph-image.tsx` next to this file
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.title, template: `%s – ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "shadcn/ui",
    "data table",
    "TanStack Table",
    "filter builder",
    "React",
    "Next.js",
    "URL state",
  ],
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable
      )}
    >
      <body className="flex min-h-svh flex-col">
        {/* Provides theming (next-themes, `d` hotkey) and docs search */}
        <RootProvider
          theme={{ disableTransitionOnChange: true }}
          search={{ SearchDialog: DocsSearchDialog }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  )
}
