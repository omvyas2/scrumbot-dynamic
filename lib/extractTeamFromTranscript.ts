import type { TranscriptSegment, TeamMember } from "@/types"

/**
 * Extract unique speakers from transcript and generate team members
 */
export function extractTeamFromTranscript(segments: TranscriptSegment[]): TeamMember[] {
  // Get unique speakers
  const uniqueSpeakers = Array.from(new Set(segments.map((s) => s.speaker).filter((s) => s !== "Unknown")))

  // Generate team members from speakers
  return uniqueSpeakers.map((speaker, index) => ({
    id: `member-${index + 1}`,
    name: speaker,
    role: inferRole(speaker),
    timezone: "UTC",
    skills: [],
    history: [],
    capacity: {
      hoursPerSprint: 40,
      currentLoad: 0,
    },
    preferences: {
      wants_to_learn: [],
      prefers_not: [],
    },
  }))
}

/**
 * Infer role from speaker name/title
 */
function inferRole(speaker: string): string {
  const lowerSpeaker = speaker.toLowerCase()

  if (lowerSpeaker.includes("product") || lowerSpeaker.includes("pm")) {
    return "Product Manager"
  }
  if (lowerSpeaker.includes("design")) {
    return "Designer"
  }
  if (lowerSpeaker.includes("tech lead") || lowerSpeaker.includes("architect")) {
    return "Tech Lead"
  }
  if (lowerSpeaker.includes("frontend") || lowerSpeaker.includes("fe")) {
    return "Frontend Engineer"
  }
  if (lowerSpeaker.includes("backend") || lowerSpeaker.includes("be")) {
    return "Backend Engineer"
  }
  if (lowerSpeaker.includes("fullstack") || lowerSpeaker.includes("full stack")) {
    return "Full Stack Engineer"
  }
  if (lowerSpeaker.includes("devops")) {
    return "DevOps Engineer"
  }
  if (lowerSpeaker.includes("qa") || lowerSpeaker.includes("test")) {
    return "QA Engineer"
  }
  if (lowerSpeaker.includes("engineer") || lowerSpeaker.includes("developer")) {
    return "Software Engineer"
  }

  return "Team Member"
}
