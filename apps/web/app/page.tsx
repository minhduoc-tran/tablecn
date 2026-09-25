import { SiteHeader } from "@/components/docs/site-header"
import { HomeBento } from "@/components/home/home-bento"
import { HomeCode } from "@/components/home/home-code"
import { HomeCta, HomeFooter } from "@/components/home/home-cta"
import { HomeDemo } from "@/components/home/home-demo"
import { HomeHero } from "@/components/home/home-hero"
import { HomeStack } from "@/components/home/home-stack"
import { source } from "@/lib/source"

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader tree={source.getPageTree()} />
      <main className="flex-1">
        <HomeHero />
        <HomeDemo />
        <HomeBento />
        <HomeCode />
        <HomeStack />
        <HomeCta />
      </main>
      <HomeFooter />
    </div>
  )
}
