import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import type { Member, Suggestion } from "@/types"
import { createClient } from "@/lib/supabase/server"

const groq = createGroq({
  apiKey: process.env.API_KEY_GROQ_API_KEY || process.env.GROQ_API_KEY,
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
    console.log(
      "[v0] Member IDs being queried:",
      members.map((m: Member) => m.id),
    )
    console.log(
      "[v0] Member names being queried:",
      members.map((m: Member) => m.name),
    )

    const supabase = await createClient()
    const memberIds = members.map((m: Member) => m.id)
    const memberNames = members.map((m: Member) => m.name)

    let enhancedMemberContext = ""
    let csvDataUsed = false

    try {
      console.log("[v0] Querying Supabase for CSV team data...")

      const { data: allMembers, error: membersError } = await supabase
        .from("team_members")
        .select("member_id, name, role")

      if (membersError) {
        console.error("[v0] Error fetching team members:", membersError)
      } else {
        console.log(
          "[v0] Available members in database:",
          allMembers?.map((m) => ({ id: m.member_id, name: m.name })),
        )
      }

      const [skillsResult, capacityResult, preferencesResult, historyResult] = await Promise.all([
        supabase
          .from("member_skills")
          .select("*")
          .or(`member_id.in.(${memberIds.join(",")})`),
        supabase
          .from("member_capacity")
          .select("*")
          .or(`member_id.in.(${memberIds.join(",")})`),
        supabase
          .from("member_preferences")
          .select("*")
          .or(`member_id.in.(${memberIds.join(",")})`),
        supabase
          .from("story_history")
          .select("*")
          .or(`member_id.in.(${memberIds.join(",")})`),
      ])

      if (skillsResult.error) console.error("[v0] Skills query error:", skillsResult.error)
      if (capacityResult.error) console.error("[v0] Capacity query error:", capacityResult.error)
      if (preferencesResult.error) console.error("[v0] Preferences query error:", preferencesResult.error)
      if (historyResult.error) console.error("[v0] History query error:", historyResult.error)

      console.log("[v0] Supabase query results:", {
        skills: skillsResult.data?.length || 0,
        capacity: capacityResult.data?.length || 0,
        preferences: preferencesResult.data?.length || 0,
        history: historyResult.data?.length || 0,
      })

      if ((!skillsResult.data || skillsResult.data.length === 0) && allMembers && allMembers.length > 0) {
        console.log("[v0] No matches by ID, attempting to match by name...")

        // Create a mapping of transcript names to database member_ids
        const nameToIdMap = new Map<string, string>()
        members.forEach((m: Member) => {
          const dbMember = allMembers.find((dbm) => dbm.name.toLowerCase() === m.name.toLowerCase())
          if (dbMember) {
            nameToIdMap.set(m.id, dbMember.member_id)
            console.log(
              `[v0] Mapped transcript member "${m.name}" (${m.id}) to database member_id: ${dbMember.member_id}`,
            )
          }
        })

        if (nameToIdMap.size > 0) {
          const dbMemberIds = Array.from(nameToIdMap.values())
          console.log("[v0] Retrying queries with mapped member IDs:", dbMemberIds)

          const [skillsResult2, capacityResult2, preferencesResult2, historyResult2] = await Promise.all([
            supabase.from("member_skills").select("*").in("member_id", dbMemberIds),
            supabase.from("member_capacity").select("*").in("member_id", dbMemberIds),
            supabase.from("member_preferences").select("*").in("member_id", dbMemberIds),
            supabase.from("story_history").select("*").in("member_id", dbMemberIds),
          ])

          console.log("[v0] Retry query results:", {
            skills: skillsResult2.data?.length || 0,
            capacity: capacityResult2.data?.length || 0,
            preferences: preferencesResult2.data?.length || 0,
            history: historyResult2.data?.length || 0,
          })

          // Use the retry results and update member references
          if (skillsResult2.data || capacityResult2.data || preferencesResult2.data || historyResult2.data) {
            skillsResult.data = skillsResult2.data || []
            capacityResult.data = capacityResult2.data || []
            preferencesResult.data = preferencesResult2.data || []
            historyResult.data = historyResult2.data || []

            // Build enhanced context with mapped IDs
            if (
              skillsResult.data.length > 0 ||
              capacityResult.data.length > 0 ||
              preferencesResult.data.length > 0 ||
              historyResult.data.length > 0
            ) {
              csvDataUsed = true
              enhancedMemberContext = "\n\n=== ADDITIONAL TEAM DATA FROM CSV FILES (PRIORITIZE THIS DATA) ===\n"

              members.forEach((m: Member) => {
                const dbMemberId = nameToIdMap.get(m.id)
                if (!dbMemberId) return

                const memberSkills = skillsResult.data.filter((s) => s.member_id === dbMemberId)
                const memberCapacities = capacityResult.data.filter((c) => c.member_id === dbMemberId)
                const memberPrefs = preferencesResult.data.filter((p) => p.member_id === dbMemberId)
                const memberHistory = historyResult.data.filter((h) => h.member_id === dbMemberId)

                if (
                  memberSkills.length > 0 ||
                  memberCapacities.length > 0 ||
                  memberPrefs.length > 0 ||
                  memberHistory.length > 0
                ) {
                  enhancedMemberContext += `\n${m.name} (Database ID: ${dbMemberId}):\n`

                  if (memberSkills.length > 0) {
                    enhancedMemberContext += `  CSV Skills: ${memberSkills
                      .map((s) => {
                        let skillStr = `${s.skill}:${s.level}/10`
                        if (s.last_used) skillStr += ` (last used: ${s.last_used})`
                        return skillStr
                      })
                      .join(", ")}\n`
                  }

                  if (memberCapacities.length > 0) {
                    memberCapacities.forEach((cap) => {
                      enhancedMemberContext += `  CSV Capacity (${cap.sprint_id}): ${cap.hours_available}h available\n`
                    })
                  }

                  if (memberPrefs.length > 0) {
                    const learningGoals = memberPrefs.map((p) => p.wants_to_learn)
                    enhancedMemberContext += `  CSV Learning Goals: ${learningGoals.join(", ")}\n`
                  }

                  if (memberHistory.length > 0) {
                    enhancedMemberContext += `  CSV Story History:\n`
                    memberHistory.forEach((h) => {
                      enhancedMemberContext += `    - Story ${h.story_id}: ${h.outcome} in ${h.cycle_time_days} days`
                      if (h.tags && h.tags.length > 0) {
                        enhancedMemberContext += ` [tags: ${h.tags.join(", ")}]`
                      }
                      if (h.quality_notes) {
                        enhancedMemberContext += ` - ${h.quality_notes}`
                      }
                      enhancedMemberContext += `\n`
                    })
                  }
                }
              })

              console.log("[v0] ✅ Enhanced context with CSV data from Supabase (matched by name)")
              console.log("[v0] CSV context preview:", enhancedMemberContext.substring(0, 500))
            }
          }
        }
      } else if (
        skillsResult.data &&
        (skillsResult.data.length > 0 ||
          capacityResult.data.length > 0 ||
          preferencesResult.data.length > 0 ||
          historyResult.data.length > 0)
      ) {
        // Original logic for direct ID matches
        csvDataUsed = true
        enhancedMemberContext = "\n\n=== ADDITIONAL TEAM DATA FROM CSV FILES (PRIORITIZE THIS DATA) ===\n"

        members.forEach((m: Member) => {
          const memberSkills = skillsResult.data.filter((s) => s.member_id === m.id)
          const memberCapacities = capacityResult.data.filter((c) => c.member_id === m.id)
          const memberPrefs = preferencesResult.data.filter((p) => p.member_id === m.id)
          const memberHistory = historyResult.data.filter((h) => h.member_id === m.id)

          if (
            memberSkills.length > 0 ||
            memberCapacities.length > 0 ||
            memberPrefs.length > 0 ||
            memberHistory.length > 0
          ) {
            enhancedMemberContext += `\n${m.name} (${m.id}):\n`

            if (memberSkills.length > 0) {
              enhancedMemberContext += `  CSV Skills: ${memberSkills
                .map((s) => {
                  let skillStr = `${s.skill}:${s.level}/10`
                  if (s.last_used) skillStr += ` (last used: ${s.last_used})`
                  return skillStr
                })
                .join(", ")}\n`
            }

            if (memberCapacities.length > 0) {
              memberCapacities.forEach((cap) => {
                enhancedMemberContext += `  CSV Capacity (${cap.sprint_id}): ${cap.hours_available}h available\n`
              })
            }

            if (memberPrefs.length > 0) {
              const learningGoals = memberPrefs.map((p) => p.wants_to_learn)
              enhancedMemberContext += `  CSV Learning Goals: ${learningGoals.join(", ")}\n`
            }

            if (memberHistory.length > 0) {
              enhancedMemberContext += `  CSV Story History:\n`
              memberHistory.forEach((h) => {
                enhancedMemberContext += `    - Story ${h.story_id}: ${h.outcome} in ${h.cycle_time_days} days`
                if (h.tags && h.tags.length > 0) {
                  enhancedMemberContext += ` [tags: ${h.tags.join(", ")}]`
                }
                if (h.quality_notes) {
                  enhancedMemberContext += ` - ${h.quality_notes}`
                }
                enhancedMemberContext += `\n`
              })
            }
          }
        })

        console.log("[v0] ✅ Enhanced context with CSV data from Supabase")
        console.log("[v0] CSV context preview:", enhancedMemberContext.substring(0, 500))
      }

      if (!csvDataUsed) {
        console.log("[v0] ⚠️ No CSV data found in Supabase, using transcript-based data only")
        console.log("[v0] Possible reasons:")
        console.log("[v0]   1. CSV files haven't been uploaded to /setup")
        console.log("[v0]   2. Member IDs in CSV don't match transcript member IDs")
        console.log("[v0]   3. Database tables are empty")
      }
    } catch (dbError) {
      console.error("[v0] ❌ Could not fetch CSV data from Supabase:", dbError)
      console.log("[v0] Continuing with transcript-based data only")
    }

    const memberContext = members
      .map(
        (m: Member) => `
ID: ${m.id}
Name: ${m.name}
Role: ${m.role}
Skills: ${m.skills.map((s) => `${s.name}:${s.level}/5`).join(", ")}
History: ${m.history.map((h) => `${h.projectName}(${h.role})`).join(", ")}
Capacity: ${m.capacity.hoursPerSprint - m.capacity.currentLoad}h available of ${m.capacity.hoursPerSprint}h
Learning Goals: ${m.preferences.wants_to_learn.join(", ")}
Prefers Not: ${m.preferences.prefers_not.join(", ")}
`,
      )
      .join("\n---\n")

    const storyContext = `
STORY DETAILS:
As a: ${story.asA}
I want: ${story.iWant}
So that: ${story.soThat}
Estimate: ${story.estimate}h
Labels: ${story.labels.join(", ")}
Risks: ${story.risks.join("; ") || "None"}
Action Items: ${story.actionItems.join("; ") || "None"}
`

    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      prompt: `You are analyzing team members to recommend story assignments. Score each member 0-100 on these criteria:

SCORING WEIGHTS: α=${weights.alpha} (competence), β=${weights.beta} (availability), γ=${weights.gamma} (growth), δ=${weights.delta} (continuity)

CRITERIA:
1. COMPETENCE (0-100): How well do their skills match the story requirements?
2. AVAILABILITY (0-100): How much capacity do they have available?
3. GROWTH (0-100): How well does this align with their learning goals?
4. CONTINUITY (0-100): How much related experience do they have from past projects?

TEAM MEMBERS (from transcript):
${memberContext}
${enhancedMemberContext}

${storyContext}

${csvDataUsed ? "⚠️ CRITICAL: CSV data is available above and MUST be prioritized over transcript data. Use CSV skills (rated /10), capacity, preferences, and history to make accurate recommendations. The CSV data is more detailed and reliable." : "Note: Only transcript data is available. Make recommendations based on the information provided."}

OUTPUT FORMAT (JSON array):
[
  {
    "memberId": "alice",
    "competence": 85,
    "availability": 75,
    "growthPotential": 60,
    "continuity": 90,
    "justification": ["Strong React and TypeScript skills match frontend requirements", "Has led similar dashboard projects", "Available capacity for this sprint"]
  }
]

CRITICAL INSTRUCTIONS:
- Use EXACTLY the ID field from each member profile above (e.g., "alice", "bob", "carol", "david", "emma", "frank")
- DO NOT modify or create new IDs - use the exact ID string shown in "ID: xxx" for each member
- Score ALL ${members.length} members in the response
- Provide 2-5 specific, actionable justifications per member
- Base scores on the story requirements and member profiles
- ${csvDataUsed ? "PRIORITIZE CSV data when making scoring decisions" : ""}
- Return ONLY a valid JSON array. No markdown, no explanations, no extra text.`,
      temperature: 0.3,
      maxTokens: 2000,
    })

    console.log(`[v0] AI ranking response received (CSV data used: ${csvDataUsed}), processing...`)

    let rankings: Array<{
      memberId: string
      competence: number
      availability: number
      growthPotential: number
      continuity: number
      justification: string[]
    }>

    try {
      // Extract JSON from response (in case AI adds extra text)
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        console.error("[v0] No JSON array found in AI response:", text.substring(0, 500))
        throw new Error("No JSON array found in response")
      }
      rankings = JSON.parse(jsonMatch[0])

      // Validate rankings structure
      if (!Array.isArray(rankings) || rankings.length === 0) {
        throw new Error("Invalid rankings format or empty array")
      }

      // Validate each ranking has required fields
      rankings.forEach((ranking, index) => {
        if (
          !ranking.memberId ||
          typeof ranking.competence !== "number" ||
          typeof ranking.availability !== "number" ||
          typeof ranking.growthPotential !== "number" ||
          typeof ranking.continuity !== "number" ||
          !Array.isArray(ranking.justification)
        ) {
          throw new Error(`Ranking ${index} is missing required fields or has invalid types`)
        }
      })
    } catch (parseError) {
      console.error("[v0] Failed to parse AI ranking response:", text.substring(0, 1000))
      return NextResponse.json(
        {
          error: "Failed to parse AI response",
          details: parseError instanceof Error ? parseError.message : "Invalid JSON format",
          rawResponse: text.substring(0, 500),
        },
        { status: 500 },
      )
    }

    const suggestions: Suggestion[] = rankings
      .map((ranking) => {
        const member = members.find((m: Member) => m.id === ranking.memberId)
        if (!member) {
          console.warn(`[v0] Member ID ${ranking.memberId} not found in members list`)
          return null
        }

        // Clamp scores to 0-100 range
        const competence = Math.max(0, Math.min(100, ranking.competence))
        const availability = Math.max(0, Math.min(100, ranking.availability))
        const growthPotential = Math.max(0, Math.min(100, ranking.growthPotential))
        const continuity = Math.max(0, Math.min(100, ranking.continuity))

        // Calculate weighted final score
        const score =
          weights.alpha * competence +
          weights.beta * availability +
          weights.gamma * growthPotential +
          weights.delta * continuity

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
          justification: ranking.justification.slice(0, 5), // Limit to 5 justifications
        }
      })
      .filter((s): s is Suggestion => s !== null)
      .sort((a, b) => b.score - a.score)

    console.log(`[v0] Successfully ranked ${suggestions.length} members`)

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("[v0] Error ranking owners:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const isRateLimit = errorMessage.includes("429") || errorMessage.includes("rate_limit")

    return NextResponse.json(
      {
        error: isRateLimit ? "Rate limit exceeded. Please wait a moment and try again." : "Failed to rank owners",
        details: errorMessage,
        isRateLimit,
      },
      { status: isRateLimit ? 429 : 500 },
    )
  }
}
