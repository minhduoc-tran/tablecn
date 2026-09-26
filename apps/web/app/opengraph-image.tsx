import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

import { siteConfig } from "@/lib/site-config"

export const alt = siteConfig.title
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const GRID = 60
const gridLine = { position: "absolute", backgroundColor: "#e4e4e7" } as const

const URL_PARTS = [
  { text: "table-cn.vercel.app/orders?", color: "#71717a" },
  { text: "q=nguyen", color: "#0284c7" },
  { text: "&", color: "#71717a" },
  { text: "status__eq=paid", color: "#16a34a" },
  { text: "&", color: "#71717a" },
  { text: "sort=-amount", color: "#7c3aed" },
]

// Satori can't read woff2 or variable fonts; without a user agent Google Fonts
// answers with a static TTF. Offline builds fall back to the built-in font.
async function loadGoogleFont(family: string, weight: number, text: string) {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`
    ).then((res) => res.text())
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)
    if (!src?.[1]) return null
    return await fetch(src[1]).then((res) => res.arrayBuffer())
  } catch {
    return null
  }
}

export default async function Image() {
  const headline = "Filter. Sort. Share."
  const tagline =
    "A data table for shadcn/ui, with filters, sorting and pages synced to the URL."
  const url = URL_PARTS.map((part) => part.text).join("")

  const [logo, sans, sansBold, mono] = await Promise.all([
    readFile(join(process.cwd(), "public/web-app-manifest-192x192.png")),
    loadGoogleFont("Geist", 400, `${siteConfig.name}${tagline}`),
    loadGoogleFont("Geist", 600, `${siteConfig.name}${headline}`),
    loadGoogleFont("Geist+Mono", 400, url),
  ])

  const fonts = [
    sans && { name: "Geist", data: sans, weight: 400 as const },
    sansBold && { name: "Geist", data: sansBold, weight: 600 as const },
    mono && { name: "Geist Mono", data: mono, weight: 400 as const },
  ].filter((font) => !!font)

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        backgroundColor: "#ffffff",
        fontFamily: "Geist",
        color: "#09090b",
      }}
    >
      {/* The homepage hero's grid and glow. Satori can't tile backgrounds or
            mask them, so the grid is drawn line by line and a white gradient
            on top fades it out. */}
      {Array.from({ length: size.width / GRID + 1 }, (_, i) => (
        <div
          key={`x${i}`}
          style={{
            ...gridLine,
            left: i * GRID,
            top: 0,
            width: 1,
            height: "100%",
          }}
        />
      ))}
      {Array.from({ length: Math.ceil(size.height / GRID) }, (_, i) => (
        <div
          key={`y${i}`}
          style={{
            ...gridLine,
            top: i * GRID,
            left: 0,
            width: "100%",
            height: 1,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundImage:
            "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.75) 45%, #ffffff 80%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -300,
          left: 100,
          width: 1000,
          height: 600,
          display: "flex",
          backgroundImage:
            "radial-gradient(ellipse at center, rgba(56,189,248,0.3) 0%, rgba(167,139,250,0.16) 45%, rgba(255,255,255,0) 70%)",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <img
          src={`data:image/png;base64,${logo.toString("base64")}`}
          width={64}
          height={64}
          alt=""
        />
        <span style={{ fontSize: 44, fontWeight: 600, letterSpacing: -1 }}>
          {siteConfig.name}
        </span>
      </div>

      <div
        style={{
          marginTop: 30,
          display: "flex",
          fontSize: 104,
          fontWeight: 600,
          letterSpacing: -5,
          lineHeight: 1.1,
          backgroundImage:
            "linear-gradient(to right, #0ea5e9, #8b5cf6, #f59e0b)",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {headline}
      </div>

      <div
        style={{
          marginTop: 20,
          display: "flex",
          maxWidth: 820,
          textAlign: "center",
          fontSize: 30,
          lineHeight: 1.4,
          color: "#71717a",
        }}
      >
        {tagline}
      </div>

      <div
        style={{
          marginTop: 44,
          display: "flex",
          alignItems: "center",
          padding: "14px 26px",
          borderRadius: 14,
          border: "1px solid #e4e4e7",
          backgroundColor: "#fafafa",
          fontFamily: "Geist Mono",
          fontSize: 24,
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        }}
      >
        {URL_PARTS.map((part, i) => (
          <span key={i} style={{ color: part.color }}>
            {part.text}
          </span>
        ))}
      </div>
    </div>,
    { ...size, fonts }
  )
}
