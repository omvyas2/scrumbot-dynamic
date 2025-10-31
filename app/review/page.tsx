"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { Download, Lock, RefreshCw } from "lucide-react"
import { exportToCSV } from "@/lib/csv"
import { StoryCard } from "@/components/story-card"
import { WeightTuner } from "@/components/weight-tuner"
import { WorkloadSummary } from "@/components/workload-summary"
import { rankMembersWithAI } from "@/lib/aiRank"

export default function ReviewPage() {
  const router = useRouter()
  const { stories, teamKB, weights, setCurrentStep, updateStory, setStories } = useStore()

  useEffect(() => {
    if (!stories.length || !teamKB) {
      router.push("/")
      return
    }
    setCurrentStep("review")
  }, [stories, teamKB, router, setCurrentStep])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        handleExportCSV()
      }
      if (e.key === "r" || e.key === "R") {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
        handleReRank()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [stories, teamKB])

  if (!teamKB) return null

  const handleExportCSV = () => {
    exportToCSV(stories, teamKB.sprintId)
  }

  const handleReRank = async () => {
    try {
      const rerankedStories = await Promise.all(
        stories.map(async (story) => ({
          ...story,
          suggestions: await rankMembersWithAI(story, teamKB.members, weights),
        })),
      )
      setStories(rerankedStories)
    } catch (error) {
      console.error("[v0] Re-ranking failed:", error)
      alert("Failed to re-rank stories. Please try again.")
    }
  }

  const handleProceedToLock = () => {
    setCurrentStep("lock")
    router.push("/lock")
  }

  const hasNeedsClarification = stories.some((story) =>
    story.labels.some((label) => label.toLowerCase().includes("needs-clarification")),
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Top Actions Bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Review Stories</h1>
              <p className="text-sm text-muted-foreground">
                Edit stories and assign owners • Press <kbd className="px-1.5 py-0.5 text-xs border rounded">R</kbd> to
                re-rank
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleReRank} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-rank
              </Button>
              <Button onClick={handleExportCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={handleProceedToLock} size="sm">
                <Lock className="h-4 w-4 mr-2" />
                Lock Sprint
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          {/* Left Column - Story Cards */}
          <div className="space-y-6">
            {hasNeedsClarification && (
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-sm font-medium text-orange-500">
                  ⚠️ Some stories need clarification before locking the sprint
                </p>
              </div>
            )}

            {stories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                members={teamKB.members}
                onUpdate={(updates) => updateStory(story.id, updates)}
              />
            ))}
          </div>

          {/* Right Column - Weight Tuner & Workload Summary */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <WeightTuner />
            <WorkloadSummary members={teamKB.members} stories={stories} />
          </div>
        </div>
      </div>

      {/* Sticky Footer for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <div className="flex gap-2">
          <Button onClick={handleReRank} variant="outline" size="sm" className="flex-1 bg-transparent">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleProceedToLock} size="sm" className="flex-1">
            <Lock className="h-4 w-4 mr-2" />
            Lock Sprint
          </Button>
        </div>
      </div>
    </div>
  )
}
