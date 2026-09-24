import type { ComponentProps, ReactNode } from "react"
import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"

/** Grid wrapper for `<Card />` in MDX */
export function Cards({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("not-prose my-6 grid gap-3 sm:grid-cols-2", className)} {...props} />
}

interface CardProps extends Omit<ComponentProps<"div">, "title"> {
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  href?: string
}

/** Flat card for MDX: border only, no shadow, rounded-md */
export function Card({ title, description, icon, href, children, className, ...props }: CardProps) {
  const content = (
    <>
      {icon && <div className="text-muted-foreground mb-2 [&_svg]:size-4">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
      {children && <div className="text-muted-foreground mt-1 text-sm">{children}</div>}
    </>
  )
  const classes = cn(
    "bg-card text-card-foreground border-foreground/15 block rounded-md border p-4 shadow-none transition-colors",
    href && "hover:bg-accent/50",
    className
  )

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    )
  }

  return (
    <div className={classes} {...props}>
      {content}
    </div>
  )
}
