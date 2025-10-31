import type { Member, Story, Suggestion, Weights, TranscriptSegment, StoryWithSuggestions } from "@/types"

interface RateLimitError {
  isRateLimit: boolean
  retryAfterMs?: number
  message: string
}

function parseRateLimitError(error: any): RateLimitError {
  const errorMessage = error?.message || String(error)

  // Check if it's a rate limit error (429)
  if (errorMessage.includes("429") || errorMessage.includes("rate_limit_exceeded")) {
    // Try to extract the wait time from the error message
    // Format: "Please try again in 979.999999ms" or "Please try again in 9.16s"
    const msMatch = errorMessage.match(/try again in ([\d.]+)ms/)
    const sMatch = errorMessage.match(/try again in ([\d.]+)s/)

    let retryAfterMs = 1000 // Default to 1 second
    if (msMatch) {
      retryAfterMs = Math.ceil(Number.parseFloat(msMatch[1]))
    } else if (sMatch) {
      retryAfterMs = Math.ceil(Number.parseFloat(sMatch[1]) * 1000)
    }

    // Add buffer time (20% extra) to ensure we don't retry too early
    retryAfterMs = Math.ceil(retryAfterMs * 1.2)

    return {
      isRateLimit: true,
      retryAfterMs,
      message: errorMessage,
    }
  }

  return {
    isRateLimit: false,
    message: errorMessage,
  }
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      if (response.ok) return response

      // Parse error response
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.details || errorData.error || `Request failed with status ${response.status}`

      // Handle rate limit errors (429)
      if (response.status === 429) {
        const rateLimitInfo = parseRateLimitError(errorMessage)
        const waitTime = rateLimitInfo.retryAfterMs || Math.pow(2, attempt) * 2000

        console.log(`[v0] Rate limit hit. Waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}...`)

        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, waitTime))
          continue
        }
      }

      // If it's a 4xx error (other than 429), don't retry
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(errorMessage)
      }

      // For 5xx errors, retry with exponential backoff
      lastError = new Error(errorMessage)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error")
      console.error(`[v0] Attempt ${attempt + 1}/${maxRetries} failed:`, lastError.message)

      // Check if it's a rate limit error in the catch block
      const rateLimitInfo = parseRateLimitError(lastError)
      if (rateLimitInfo.isRateLimit && attempt < maxRetries - 1) {
        const waitTime = rateLimitInfo.retryAfterMs || Math.pow(2, attempt) * 2000
        console.log(`[v0] Rate limit detected. Waiting ${waitTime}ms before retry...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        continue
      }
    }

    // Wait before retrying (exponential backoff with jitter: 2s, 4s, 8s)
    if (attempt < maxRetries - 1) {
      const baseDelay = Math.pow(2, attempt + 1) * 1000
      const jitter = Math.random() * 1000 // Add up to 1s random jitter
      await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter))
    }
  }

  throw lastError || new Error("All retry attempts failed")
}

export async function extractStoriesFromTranscript(
  transcript: TranscriptSegment[],
): Promise<Omit<Story, "assignedTo">[]> {
  try {
    console.log("[v0] Extracting stories from transcript...")
    const response = await fetchWithRetry(
      "/api/extract-stories",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      },
      3,
    )

    const { stories } = await response.json()
    console.log(`[v0] Successfully extracted ${stories.length} stories`)
    return stories
  } catch (error) {
    console.error("[v0] Error extracting stories:", error)
    throw error
  }
}

export async function rankMembersWithAI(story: Story, members: Member[], weights: Weights): Promise<Suggestion[]> {
  try {
    console.log(`[v0] Ranking members for story: ${story.iWant.substring(0, 50)}...`)
    const response = await fetchWithRetry(
      "/api/rank-owners",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story, members, weights }),
      },
      3,
    )

    const { suggestions } = await response.json()
    console.log(`[v0] Generated ${suggestions.length} suggestions`)
    return suggestions
  } catch (error) {
    console.error("[v0] Error ranking members:", error)
    throw error
  }
}

export async function generateStoriesWithSuggestionsAI(
  transcript: TranscriptSegment[],
  teamKB: { members: Member[] },
  weights: Weights,
): Promise<StoryWithSuggestions[]> {
  console.log("[v0] Starting AI-powered story generation...")

  // Step 1: Extract stories from transcript using AI
  const stories = await extractStoriesFromTranscript(transcript)

  if (stories.length === 0) {
    throw new Error("No stories were extracted from the transcript")
  }

  console.log(`[v0] Processing ${stories.length} stories for ranking...`)

  // Step 2: Rank members for each story SEQUENTIALLY to avoid rate limits
  const storiesWithSuggestions: StoryWithSuggestions[] = []

  for (let i = 0; i < stories.length; i++) {
    const story = stories[i]
    try {
      console.log(`[v0] Processing story ${i + 1}/${stories.length}...`)

      const suggestions = await rankMembersWithAI(story as Story, teamKB.members, weights)

      storiesWithSuggestions.push({
        ...story,
        suggestions,
        assignedTo: undefined,
      } as StoryWithSuggestions)

      // Add a small delay between requests to avoid hitting rate limits
      // Skip delay after the last story
      if (i < stories.length - 1) {
        const delayMs = 1500 // 1.5 second delay between requests
        console.log(`[v0] Waiting ${delayMs}ms before next story...`)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    } catch (error) {
      console.error(`[v0] Failed to rank story "${story.iWant}":`, error)
      // Add story with empty suggestions on failure
      storiesWithSuggestions.push({
        ...story,
        suggestions: [],
        assignedTo: undefined,
      } as StoryWithSuggestions)
    }
  }

  if (storiesWithSuggestions.length === 0) {
    throw new Error("Failed to process any stories")
  }

  console.log(`[v0] Successfully processed ${storiesWithSuggestions.length}/${stories.length} stories`)

  return storiesWithSuggestions
}
