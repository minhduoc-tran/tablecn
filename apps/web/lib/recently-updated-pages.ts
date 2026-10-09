import { source } from "@/lib/source"

const RECENT_DAYS = 14

/**
 * URLs of the pages whose frontmatter `updated` date is under two weeks old,
 * for the sidebar's dot. Checked when the docs are built, so a dot goes away
 * on the first deploy after that.
 */
export function getRecentlyUpdatedUrls(now = Date.now()): string[] {
  const since = now - RECENT_DAYS * 24 * 60 * 60 * 1000
  return source
    .getPages()
    .filter((page) => (page.data.updated?.getTime() ?? 0) >= since)
    .map((page) => page.url)
}
