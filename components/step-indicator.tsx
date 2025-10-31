"use client"

import { useStore } from "@/lib/store"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const steps = [
  { id: "landing", label: "Upload" },
  { id: "loading", label: "Process" },
  { id: "review", label: "Review" },
  { id: "lock", label: "Lock" },
] as const

export function StepIndicator() {
  const currentStep = useStore((state) => state.currentStep)

  const currentIndex = steps.findIndex((s) => s.id === currentStep)

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isComplete = index < currentIndex
        const isCurrent = index === currentIndex

        return (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                isComplete && "bg-primary text-primary-foreground",
                isCurrent && "bg-primary/20 text-primary border-2 border-primary",
                !isComplete && !isCurrent && "bg-muted text-muted-foreground",
              )}
            >
              {isComplete ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <span
              className={cn(
                "text-sm font-medium hidden sm:inline",
                isCurrent && "text-foreground",
                !isCurrent && "text-muted-foreground",
              )}
            >
              {step.label}
            </span>

            {index < steps.length - 1 && (
              <div className={cn("w-8 h-0.5 mx-1", index < currentIndex ? "bg-primary" : "bg-muted")} />
            )}
          </div>
        )
      })}
    </div>
  )
}
