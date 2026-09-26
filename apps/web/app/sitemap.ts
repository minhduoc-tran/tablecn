import type { MetadataRoute } from "next"

import { siteConfig } from "@/lib/site-config"
import { source } from "@/lib/source"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteConfig.url, priority: 1 },
    ...source.getPages().map((page) => ({
      url: `${siteConfig.url}${page.url}`,
      priority: 0.8,
    })),
  ]
}
