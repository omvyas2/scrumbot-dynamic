import type { Member, Story, Suggestion, Weights, TranscriptSegment, StoryWithSuggestions } from "@/types"
import { makeDemoStories } from "@/lib/fixtures"

/**
 * Mock ranking algorithm for owner suggestions
 * Uses keyword overlap and capacity calculations
 */
export function rankMembers(story: Story, members: Member[], weights: Weights): Suggestion[] {
  const storyKeywords = extractKeywords(story)

  const suggestions = members.map((member) => {
    const competence = calculateCompetence(member, storyKeywords)
    const availability = calculateAvailability(member)
    const growthPotential = calculateGrowthPotential(member, storyKeywords)
    const continuity = calculateContinuity(member, storyKeywords)

    const score = Math.min(
      100,
      weights.alpha * competence +
        weights.beta * availability +
        weights.gamma * growthPotential +
        weights.delta * continuity,
    )

    const justification = generateJustification({
      competence,
      availability,
      growthPotential,
      continuity,
    })

    return {
      memberId: member.id,
      name: member.name,
      role: member.role,
      timezone: member.timezone,
      score: Math.round(score * 10) / 10,
      breakdown: {
        competence: Math.round(competence * 10) / 10,
        availability: Math.round(availability * 10) / 10,
        growthPotential: Math.round(growthPotential * 10) / 10,
        continuity: Math.round(continuity * 10) / 10,
      },
      justification,
    }
  })

  return suggestions.sort((a, b) => b.score - a.score)
}

function extractKeywords(story: Story): string[] {
  const text = `${story.asA} ${story.iWant} ${story.soThat} ${story.labels.join(" ")}`
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 3)
}

function calculateCompetence(member: Member, keywords: string[]): number {
  const skillNames = member.skills.map((s) => s.name.toLowerCase())
  const skillLevels = member.skills.reduce((acc, s) => acc + s.level, 0)
  const maxSkillLevel = member.skills.length * 5

  const overlap = keywords.filter((kw) => skillNames.some((skill) => skill.includes(kw) || kw.includes(skill))).length

  const overlapScore = keywords.length > 0 ? (overlap / keywords.length) * 100 : 50
  const levelScore = maxSkillLevel > 0 ? (skillLevels / maxSkillLevel) * 100 : 50

  return (overlapScore + levelScore) / 2
}

function calculateAvailability(member: Member): number {
  const { hoursPerSprint, currentLoad } = member.capacity
  const available = Math.max(0, hoursPerSprint - currentLoad)
  const maxHours = 16 // reasonable max per sprint

  return Math.min(100, (available / maxHours) * 100)
}

function calculateGrowthPotential(member: Member, keywords: string[]): number {
  const wantsToLearn = member.preferences.wants_to_learn.map((w) => w.toLowerCase())

  const overlap = keywords.filter((kw) => wantsToLearn.some((want) => want.includes(kw) || kw.includes(want))).length

  if (keywords.length === 0) return 50

  return (overlap / keywords.length) * 100
}

function calculateContinuity(member: Member, keywords: string[]): number {
  const projectNames = member.history.map((h) => h.projectName.toLowerCase())
  const roles = member.history.map((h) => h.role.toLowerCase())
  const allHistory = [...projectNames, ...roles]

  const overlap = keywords.filter((kw) => allHistory.some((hist) => hist.includes(kw) || kw.includes(hist))).length

  if (keywords.length === 0) return 50

  return (overlap / keywords.length) * 100
}

function generateJustification(breakdown: {
  competence: number
  availability: number
  growthPotential: number
  continuity: number
}): string[] {
  const justifications: string[] = []

  if (breakdown.competence > 70) {
    justifications.push("Strong skill match for this story")
  } else if (breakdown.competence > 40) {
    justifications.push("Moderate skill alignment")
  }

  if (breakdown.availability > 70) {
    justifications.push("High availability this sprint")
  } else if (breakdown.availability < 30) {
    justifications.push("Limited capacity available")
  }

  if (breakdown.growthPotential > 60) {
    justifications.push("Aligns with learning goals")
  }

  if (breakdown.continuity > 60) {
    justifications.push("Previous experience with similar work")
  }

  if (justifications.length === 0) {
    justifications.push("Available team member")
  }

  return justifications
}

export async function generateStoriesWithSuggestions(
  transcript: TranscriptSegment[],
  teamKB: { members: Member[] },
  weights: Weights,
): Promise<StoryWithSuggestions[]> {
  try {
    // Try to use AI-powered extraction
    const { generateStoriesWithSuggestionsAI } = await import("@/lib/aiRank")
    return await generateStoriesWithSuggestionsAI(transcript, teamKB, weights)
  } catch (error) {
    console.error("[v0] AI extraction failed, falling back to demo data:", error)
    // Fallback to demo stories if AI fails
    const baseStories = makeDemoStories()
    return baseStories.map((story: any) => ({
      ...story,
      suggestions: rankMembers(story, teamKB.members, weights),
      assignedTo: undefined,
    }))
  }
}
