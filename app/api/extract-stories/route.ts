import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import type { TranscriptSegment, Story } from "@/types"

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json()

    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json({ error: "Invalid transcript data" }, { status: 400 })
    }

    if (transcript.length === 0) {
      return NextResponse.json({ error: "Transcript is empty" }, { status: 400 })
    }

    console.log(`[v0] Processing transcript with ${transcript.length} segments`)

    // Format transcript for AI processing
    const transcriptText = transcript
      .map((seg: TranscriptSegment) => `[${seg.timestamp}] ${seg.speaker}: ${seg.text}`)
      .join("\n")

    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"), // Faster model with lower token usage
      prompt: `You are an expert Scrum Master analyzing sprint planning meetings. Extract user stories from the transcript.

REQUIREMENTS:
1. Extract complete user stories with "As a / I want / So that" format
2. Include context: risks, action items, evidence, labels
3. Use exact timestamps and quotes from transcript
4. Estimate story points (1,2,3,5,8,13,21)

OUTPUT FORMAT (JSON array):
[
  {
    "asA": "role/persona",
    "iWant": "feature description",
    "soThat": "business value",
    "risks": ["risk 1", "risk 2"],
    "actionItems": ["action 1", "action 2"],
    "labels": ["frontend", "backend", etc.],
    "evidence": [
      {
        "timestamp": "00:01:23.456",
        "speaker": "Speaker Name",
        "quote": "exact quote"
      }
    ],
    "estimate": 8
  }
]

ESTIMATION:
- 1-2: Simple, <4 hours
- 3-5: Medium, 1-2 days
- 8-13: Complex, 3-5 days
- 21: Epic, needs breakdown

LABELS: frontend, backend, api, database, security, performance, etc.

TRANSCRIPT:
${transcriptText}

Return ONLY valid JSON array. No markdown, no extra text.`,
      temperature: 0.3,
      maxTokens: 3000, // Reduced token limit
    })

    console.log("[v0] AI response received, parsing...")

    // Parse the AI response
    let stories: Omit<Story, "id" | "dueDate">[]
    try {
      // Extract JSON from response (in case AI adds extra text)
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        console.error("[v0] No JSON array found in AI response:", text.substring(0, 500))
        throw new Error("No JSON array found in response")
      }
      stories = JSON.parse(jsonMatch[0])

      // Validate stories structure
      if (!Array.isArray(stories) || stories.length === 0) {
        throw new Error("Invalid stories format or empty array")
      }

      // Validate each story has required fields
      stories.forEach((story, index) => {
        if (!story.asA || !story.iWant || !story.soThat) {
          throw new Error(`Story ${index} is missing required fields`)
        }
      })
    } catch (parseError) {
      console.error("[v0] Failed to parse AI response:", text.substring(0, 1000))
      return NextResponse.json(
        {
          error: "Failed to parse AI response",
          details: parseError instanceof Error ? parseError.message : "Invalid JSON format",
          rawResponse: text.substring(0, 500),
        },
        { status: 500 },
      )
    }

    // Add IDs and due dates
    const storiesWithMetadata: Story[] = stories.map((story, index) => ({
      ...story,
      id: `story-${Date.now()}-${index}`,
      dueDate: new Date(Date.now() + (14 + index * 3) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    }))

    console.log(`[v0] Successfully extracted ${storiesWithMetadata.length} stories`)

    return NextResponse.json({ stories: storiesWithMetadata })
  } catch (error) {
    console.error("[v0] Error extracting stories:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const isRateLimit = errorMessage.includes("429") || errorMessage.includes("rate_limit")

    return NextResponse.json(
      {
        error: isRateLimit ? "Rate limit exceeded. Please wait a moment and try again." : "Failed to extract stories",
        details: errorMessage,
        isRateLimit,
      },
      { status: isRateLimit ? 429 : 500 },
    )
  }
}
