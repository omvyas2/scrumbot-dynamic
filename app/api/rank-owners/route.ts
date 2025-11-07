import { type NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { z } from "zod"
import type { Member, Suggestion } from "@/types"
import { createClient } from "@/lib/supabase/server"

const groq = createGroq({
  apiKey: process.env.API_KEY_GROQ_API_KEY || process.env.GROQ_API_KEY,
})

const RankingSchema = z.object({
  rankings: z.array(
    z.object({
      memberId: z.string(),
      competence: z.number().min(0).max(100),
      availability: z.number().min(0).max(100),
      growthPotential: z.number().min(0).max(100),
      continuity: z.number().min(0).max(100),
      justification: z.array(z.string()).max(5),
    }),
  ),
})

export async function POST(request: NextRequest) {
  try {
    const { story, members, weights } = await request.json()

    if (!story || !members || !weights) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 })
    }

    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: "Invalid or empty members array" }, { status: 400 })
    }

    console.log(`[v0] Ranking ${members.length} members for story: ${story.iWant.substring(0, 50)}...`)

    const supabase = await createClient()
    const csvMemberData: Map<string, any> = new Map()
    let csvDataUsed = false

    try {
      console.log("[v0] Querying Supabase for CSV team data...")

      const { data: allMembers, error: membersError } = await supabase
        .from("team_members")
        .select("member_id, name, role")

      if (membersError) {
        console.error("[v0] Error fetching team members:", membersError)
      } else {
        const nameToIdMap = new Map<string, string>()
        members.forEach((m: Member) => {
          const dbMember = allMembers?.find((dbm) => dbm.name.toLowerCase() === m.name.toLowerCase())
          if (dbMember) {
            nameToIdMap.set(m.id, dbMember.member_id)
          }
        })

        if (nameToIdMap.size > 0) {
          const dbMemberIds = Array.from(nameToIdMap.values())

          const [skillsResult, capacityResult, preferencesResult, historyResult] = await Promise.all([
            supabase.from("member_skills").select("*").in("member_id", dbMemberIds),
            supabase.from("member_capacity").select("*").in("member_id", dbMemberIds),
            supabase.from("member_preferences").select("*").in("member_id", dbMemberIds),
            supabase.from("story_history").select("member_id, outcome").in("member_id", dbMemberIds),
          ])

          console.log("[v0] CSV data fetched:", {
            skills: skillsResult.data?.length || 0,
            capacity: capacityResult.data?.length || 0,
            preferences: preferencesResult.data?.length || 0,
            history: historyResult.data?.length || 0,
          })

          if (skillsResult.data || capacityResult.data || preferencesResult.data || historyResult.data) {
            csvDataUsed = true

            members.forEach((m: Member) => {
              const dbMemberId = nameToIdMap.get(m.id)
              if (!dbMemberId) return

              const memberSkills = skillsResult.data?.filter((s) => s.member_id === dbMemberId) || []
              const memberCapacities = capacityResult.data?.filter((c) => c.member_id === dbMemberId) || []
              const memberPrefs = preferencesResult.data?.filter((p) => p.member_id === dbMemberId) || []
              const memberHistory = historyResult.data?.filter((h) => h.member_id === dbMemberId) || []

              if (
                memberSkills.length > 0 ||
                memberCapacities.length > 0 ||
                memberPrefs.length > 0 ||
                memberHistory.length > 0
              ) {
                csvMemberData.set(m.id, {
                  skills: memberSkills.slice(0, 5).map((s) => `${s.skill}:${s.level}`), // Top 5 skills only
                  capacity: memberCapacities[0]?.hours_available || null,
                  learningGoals: memberPrefs.slice(0, 2).map((p) => p.wants_to_learn), // Top 2 goals only
                  successRate:
                    memberHistory.filter((h) => h.outcome === "success").length / (memberHistory.length || 1),
                })
              }
            })

            console.log(`[v0] ✅ CSV data loaded for ${csvMemberData.size} members`)
          }
        }
      }
    } catch (dbError) {
      console.error("[v0] ❌ Database error:", dbError)
    }

    const memberProfiles = members
      .map((m: Member) => {
        const csvData = csvMemberData.get(m.id)
        if (csvData) {
          return `${m.id}:${csvData.skills.join(",")}|${csvData.capacity}h|${Math.round(csvData.successRate * 100)}%success`
        } else {
          const skills = m.skills.slice(0, 3).map((s) => `${s.name}:${s.level}`)
          const available = m.capacity.hoursPerSprint - m.capacity.currentLoad
          return `${m.id}:${skills.join(",")}|${available}h`
        }
      })
      .join("\n")

    const storyDesc = `${story.iWant.substring(0, 80)} (${story.estimate}h)`

    const { object } = await generateObject({
      model: groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
      schema: RankingSchema,
      prompt: `Rank team for: "${storyDesc}"

Members:
${memberProfiles}

Score each 0-100 on: competence (skill match), availability (hours free), growthPotential (learning fit), continuity (past success).
${csvDataUsed ? "Real CSV data included." : ""}`,
      temperature: 0.2,
      maxTokens: 800,
    })

    console.log(`[v0] ✅ Received structured rankings for ${object.rankings.length} members`)

    const suggestions: Suggestion[] = object.rankings
      .map((ranking) => {
        const member = members.find((m: Member) => m.id === ranking.memberId)
        if (!member) {
          console.warn(`[v0] ⚠️ Member ${ranking.memberId} not found`)
          return null
        }

        const score =
          weights.alpha * ranking.competence +
          weights.beta * ranking.availability +
          weights.gamma * ranking.growthPotential +
          weights.delta * ranking.continuity

        return {
          memberId: member.id,
          name: member.name,
          role: member.role,
          timezone: member.timezone,
          score: Math.round(score * 10) / 10,
          breakdown: {
            competence: Math.round(ranking.competence * 10) / 10,
            availability: Math.round(ranking.availability * 10) / 10,
            growthPotential: Math.round(ranking.growthPotential * 10) / 10,
            continuity: Math.round(ranking.continuity * 10) / 10,
          },
          justification: ranking.justification,
        }
      })
      .filter((s): s is Suggestion => s !== null)
      .sort((a, b) => b.score - a.score)

    console.log(
      `[v0] ✅ Ranked ${suggestions.length} members, top: ${suggestions[0]?.name} (${suggestions[0]?.score}%)`,
    )

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("[v0] ❌ Error:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const isRateLimit = errorMessage.includes("429") || errorMessage.includes("rate_limit")

    if (isRateLimit) {
      return NextResponse.json(
        {
          error: "Groq API rate limit exceeded",
          details: "Please wait 30 seconds and try again",
          isRateLimit: true,
          retryAfter: 30,
        },
        { status: 429 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to rank owners",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
