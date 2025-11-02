import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const [membersResult, skillsResult, capacityResult, preferencesResult, historyResult] = await Promise.all([
      supabase.from("team_members").select("member_id", { count: "exact", head: true }),
      supabase.from("member_skills").select("member_id", { count: "exact", head: true }),
      supabase.from("member_capacity").select("member_id", { count: "exact", head: true }),
      supabase.from("member_preferences").select("member_id", { count: "exact", head: true }),
      supabase.from("story_history").select("story_id", { count: "exact", head: true }),
    ])

    const status = {
      hasData: false,
      counts: {
        team_members: membersResult.count || 0,
        skills: skillsResult.count || 0,
        capacity: capacityResult.count || 0,
        preferences: preferencesResult.count || 0,
        history: historyResult.count || 0,
      },
    }

    // Consider data loaded if we have at least team members
    status.hasData = status.counts.team_members > 0

    console.log("[v0] Team data status:", status)

    return NextResponse.json(status)
  } catch (error) {
    console.error("[v0] Error checking team data status:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check status" },
      { status: 500 },
    )
  }
}
