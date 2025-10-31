"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useStore } from "@/lib/store"
import { generateStoriesWithSuggestions } from "@/lib/mockRank"

const PROCESSING_STEPS = [
  { label: "Parsing transcript", duration: 1000 },
  { label: "Extracting stories with AI", duration: 3000 }, // Updated label and duration for AI processing
  { label: "Analyzing team capabilities", duration: 2000 }, // Updated label
  { label: "Generating owner recommendations", duration: 3000 }, // Updated label and duration
]

export default function LoadingPage() {
  const router = useRouter()
  const { transcript, teamKB, weights, setStories, setCurrentStep } = useStore()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!transcript.length || !teamKB) {
      router.push("/")
      return
    }

    let stepTimer: NodeJS.Timeout
    let isProcessing = false

    const processSteps = async () => {
      if (currentStepIndex < PROCESSING_STEPS.length) {
        const step = PROCESSING_STEPS[currentStepIndex]
        stepTimer = setTimeout(() => {
          setCurrentStepIndex((prev) => prev + 1)
        }, step.duration)
      } else if (!isProcessing) {
        // All steps complete, generate stories with AI
        isProcessing = true
        try {
          const stories = await generateStoriesWithSuggestions(transcript, teamKB, weights)
          setStories(stories)
          setCurrentStep("review")
          router.push("/review")
        } catch (err) {
          console.error("[v0] Error generating stories:", err)
          setError(err instanceof Error ? err.message : "Failed to generate stories")
        }
      }
    }

    processSteps()

    return () => {
      if (stepTimer) clearTimeout(stepTimer)
    }
  }, [currentStepIndex, transcript, teamKB, weights, router, setStories, setCurrentStep])

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <Card className="p-12 rounded-2xl text-center">
          <div className="h-16 w-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold mb-4">Processing Failed</h2>
          <p className="text-muted-foreground mb-8">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Go Back
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <Card className="p-12 rounded-2xl text-center">
        <Loader2 className="h-16 w-16 mx-auto mb-6 animate-spin text-primary" />
        <h2 className="text-2xl font-bold mb-4">Processing Your Transcript</h2>
        <p className="text-muted-foreground mb-8">AI is analyzing your meeting and generating recommendations...</p>

        <div className="space-y-4">
          {PROCESSING_STEPS.map((step, index) => (
            <div
              key={step.label}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                index < currentStepIndex
                  ? "bg-primary/10 text-primary"
                  : index === currentStepIndex
                    ? "bg-primary/20 text-primary font-medium"
                    : "bg-muted/50 text-muted-foreground"
              }`}
            >
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index < currentStepIndex
                    ? "bg-primary text-primary-foreground"
                    : index === currentStepIndex
                      ? "bg-primary/50 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {index < currentStepIndex ? "✓" : index + 1}
              </div>
              <span>{step.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
