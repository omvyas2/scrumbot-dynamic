"use client"

import { Bot, Settings } from "lucide-react"
import { StepIndicator } from "./step-indicator"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function TopNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">ScrumBot</h1>
        </div>

        <div className="flex items-center gap-4">
          <StepIndicator />
          <Button asChild variant="ghost" size="sm">
            <Link href="/setup">
              <Settings className="h-4 w-4 mr-2" />
              Team Setup
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}
