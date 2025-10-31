import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { TranscriptSegment, TeamKB, Weights, StoryWithSuggestions } from "@/types"

interface TranscriptSlice {
  transcript: TranscriptSegment[]
  setTranscript: (transcript: TranscriptSegment[]) => void
}

interface TeamSlice {
  teamKB: TeamKB | null
  setTeamKB: (kb: TeamKB) => void
}

interface WeightsSlice {
  weights: Weights
  setWeights: (weights: Weights) => void
}

interface StoriesSlice {
  stories: StoryWithSuggestions[]
  setStories: (stories: StoryWithSuggestions[]) => void
  updateStory: (id: string, updates: Partial<StoryWithSuggestions>) => void
}

interface UISlice {
  currentStep: "landing" | "loading" | "review" | "lock"
  setCurrentStep: (step: UISlice["currentStep"]) => void
  isProcessing: boolean
  setIsProcessing: (processing: boolean) => void
}

type StoreState = TranscriptSlice & TeamSlice & WeightsSlice & StoriesSlice & UISlice

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // Transcript slice
      transcript: [],
      setTranscript: (transcript) => set({ transcript }),

      // Team slice
      teamKB: null,
      setTeamKB: (kb) => set({ teamKB: kb }),

      // Weights slice
      weights: { alpha: 0.3, beta: 0.3, gamma: 0.2, delta: 0.2 },
      setWeights: (weights) => set({ weights }),

      // Stories slice
      stories: [],
      setStories: (stories) => set({ stories }),
      updateStory: (id, updates) =>
        set((state) => ({
          stories: state.stories.map((story) => (story.id === id ? { ...story, ...updates } : story)),
        })),

      // UI slice
      currentStep: "landing",
      setCurrentStep: (step) => set({ currentStep: step }),
      isProcessing: false,
      setIsProcessing: (processing) => set({ isProcessing: processing }),
    }),
    {
      name: "scrumbot-storage",
      partialize: (state) => ({
        transcript: state.transcript,
        teamKB: state.teamKB,
        weights: state.weights,
        stories: state.stories,
      }),
    },
  ),
)
