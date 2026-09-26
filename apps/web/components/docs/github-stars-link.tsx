import { Button } from "@workspace/ui/components/button"

import { GitHubIcon } from "@/components/docs/github-icon"
import { siteConfig } from "@/lib/site-config"

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
})

// Refetched at most hourly, which keeps the unauthenticated API (60 requests
// an hour) enough. Any failure just leaves the count out.
async function getStars() {
  const repo = new URL(siteConfig.repository).pathname
  try {
    const res = await fetch(`https://api.github.com/repos${repo}`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const { stargazers_count } = (await res.json()) as {
      stargazers_count?: number
    }
    return typeof stargazers_count === "number" ? stargazers_count : null
  } catch {
    return null
  }
}

/** Header link to the repository, with its star count. */
export async function GitHubStarsLink() {
  const stars = await getStars()
  return (
    <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2" asChild>
      <a
        href={siteConfig.repository}
        target="_blank"
        rel="noreferrer"
        aria-label={stars === null ? "GitHub" : `GitHub, ${stars} stars`}
      >
        <GitHubIcon />
        {stars !== null && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {compact.format(stars)}
          </span>
        )}
      </a>
    </Button>
  )
}
