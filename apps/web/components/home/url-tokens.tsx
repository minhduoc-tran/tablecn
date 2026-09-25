import { cn } from "@workspace/ui/lib/utils"

export type ParamKind = "filter" | "sort" | "page"

/** Who wrote a query param: the filter builder, a sort header or the pagination. */
export function paramKind(key: string): ParamKind {
  if (key === "sort") return "sort"
  if (key === "page" || key === "per_page") return "page"
  return "filter"
}

export const PARAM_COLORS: Record<ParamKind, { text: string; dot: string }> = {
  filter: { text: "text-sky-600 dark:text-sky-400", dot: "bg-sky-500" },
  sort: { text: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500" },
  page: { text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
}

function decode(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "))
  } catch {
    return value
  }
}

/** A query string with each param colored by what wrote it. */
export function UrlTokens({
  search,
  className,
}: {
  search: string
  className?: string
}) {
  const params = search.replace(/^\?/, "").split("&").filter(Boolean)
  if (params.length === 0) return null
  return (
    <span className={cn("font-mono", className)}>
      <span className="text-muted-foreground">?</span>
      {params.map((param, index) => {
        const [key = "", ...rest] = param.split("=")
        return (
          <span key={index}>
            {index > 0 && <span className="text-muted-foreground">&amp;</span>}
            <span className={PARAM_COLORS[paramKind(decode(key))].text}>
              {decode(key)}
              {rest.length > 0 && `=${decode(rest.join("="))}`}
            </span>
          </span>
        )
      })}
    </span>
  )
}
