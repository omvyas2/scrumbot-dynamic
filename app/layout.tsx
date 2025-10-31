import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { TopNav } from "@/components/top-nav"
import "./globals.css"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "ScrumBot",
  description: "AI-powered sprint planning assistant",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Suspense fallback={<div>Loading...</div>}>
          <TopNav />
          <main className="min-h-screen pt-16">{children}</main>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
