import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { parseCSV, csvRowToObject } from "@/lib/csv-parser"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string

    if (!file || !type) {
      return NextResponse.json({ error: "Missing file or type" }, { status: 400 })
    }

    const content = await file.text()
    const { headers, rows } = parseCSV(content)

    const supabase = await createClient()
    let rowCount = 0

    switch (type) {
      case "team_members": {
        await supabase.from("team_members").delete().neq("member_id", "")

        const members = rows.map((values) => {
          const obj = csvRowToObject(headers, values)
          return {
            member_id: obj.member_id,
            name: obj.name,
            role: obj.role || null,
            time_zone: obj.time_zone || null,
            seniority: obj.seniority || null,
          }
        })

        const { error } = await supabase.from("team_members").insert(members)
        if (error) throw error
        rowCount = members.length
        break
      }

      case "skills": {
        // First, extract unique skills and insert into skills table
        const skillsSet = new Set<string>()
        const memberSkillsData: Array<{
          member_id: string
          skill: string
          level: number
          last_used: string | null
          evidence_links: string | null
        }> = []

        rows.forEach((values) => {
          const obj = csvRowToObject(headers, values)
          const skill = obj.skill?.trim().toLowerCase()
          if (skill) {
            skillsSet.add(skill)
            memberSkillsData.push({
              member_id: obj.member_id,
              skill: skill,
              level: coerceToInt(obj.level, 5, 0, 10),
              last_used: coerceToDate(obj.last_used),
              evidence_links: obj.evidence_links || null,
            })
          }
        })

        // Insert skills (ignore conflicts)
        const skillsArray = Array.from(skillsSet).map((skill) => ({ skill }))
        await supabase.from("skills").upsert(skillsArray, { onConflict: "skill" })

        // Clear and insert member_skills
        await supabase.from("member_skills").delete().neq("member_id", "")
        const { error } = await supabase.from("member_skills").insert(memberSkillsData)
        if (error) throw error
        rowCount = memberSkillsData.length
        break
      }

      case "capacity": {
        // First, extract unique sprint_ids and insert into sprints table
        const sprintsSet = new Set<string>()
        const capacityData: Array<{
          member_id: string
          sprint_id: string
          hours_available: number
        }> = []

        rows.forEach((values) => {
          const obj = csvRowToObject(headers, values)
          const sprintId = obj.sprint_id?.trim()
          if (sprintId) {
            sprintsSet.add(sprintId)
            capacityData.push({
              member_id: obj.member_id,
              sprint_id: sprintId,
              hours_available: coerceToInt(obj.hours_available, 0, 0),
            })
          }
        })

        // Insert sprints (ignore conflicts)
        const sprintsArray = Array.from(sprintsSet).map((sprint_id) => ({ sprint_id }))
        await supabase.from("sprints").upsert(sprintsArray, { onConflict: "sprint_id" })

        // Clear and insert member_capacity
        await supabase.from("member_capacity").delete().neq("member_id", "")
        const { error } = await supabase.from("member_capacity").insert(capacityData)
        if (error) throw error
        rowCount = capacityData.length
        break
      }

      case "preferences": {
        await supabase.from("member_preferences").delete().neq("member_id", "")

        const preferences: Array<{ member_id: string; wants_to_learn: string }> = []

        rows.forEach((values) => {
          const obj = csvRowToObject(headers, values)
          const wantsToLearn = obj.wants_to_learn?.trim()
          if (wantsToLearn) {
            // Split by comma if multiple preferences in one cell
            const items = wantsToLearn
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
            items.forEach((item) => {
              preferences.push({
                member_id: obj.member_id,
                wants_to_learn: item,
              })
            })
          }
        })

        const { error } = await supabase.from("member_preferences").insert(preferences)
        if (error) throw error
        rowCount = preferences.length
        break
      }

      case "history": {
        // First, extract unique story_ids and insert into stories table
        const storiesSet = new Set<string>()
        const historyData: Array<{
          story_id: string
          member_id: string
          tags: string[]
          outcome: string
          cycle_time_days: number
          quality_notes: string | null
        }> = []

        rows.forEach((values) => {
          const obj = csvRowToObject(headers, values)
          const storyId = obj.story_id?.trim()
          if (storyId) {
            storiesSet.add(storyId)

            // Parse tags: split by comma, trim, lowercase, dedupe
            const tagsRaw = obj.tags || ""
            const tags = Array.from(
              new Set(
                tagsRaw
                  .split(",")
                  .map((t) => t.trim().toLowerCase())
                  .filter(Boolean),
              ),
            )

            // Map outcome to valid values
            const outcomeRaw = obj.outcome?.toLowerCase() || "unknown"
            const outcome = ["success", "fail", "partial"].includes(outcomeRaw) ? outcomeRaw : "unknown"

            historyData.push({
              story_id: storyId,
              member_id: obj.member_id,
              tags,
              outcome,
              cycle_time_days: coerceToInt(obj.cycle_time_days, 0, 0),
              quality_notes: obj.quality_notes || null,
            })
          }
        })

        // Insert stories (ignore conflicts)
        const storiesArray = Array.from(storiesSet).map((story_id) => ({ story_id }))
        await supabase.from("stories").upsert(storiesArray, { onConflict: "story_id" })

        // Clear and insert story_history
        await supabase.from("story_history").delete().neq("story_id", "")
        const { error } = await supabase.from("story_history").insert(historyData)
        if (error) throw error
        rowCount = historyData.length
        break
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }

    // Log the upload
    await supabase.from("csv_upload_metadata").insert({
      file_type: type,
      filename: file.name,
      rows_imported: rowCount,
    })

    return NextResponse.json({ success: true, rowCount })
  } catch (error) {
    console.error("[v0] Error uploading CSV:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 })
  }
}

function coerceToInt(value: string | undefined, defaultValue: number, min?: number, max?: number): number {
  if (!value || value.trim() === "") return defaultValue
  const num = Number.parseInt(value, 10)
  if (Number.isNaN(num)) return defaultValue
  if (min !== undefined && num < min) return min
  if (max !== undefined && num > max) return max
  return num
}

function coerceToDate(value: string | undefined): string | null {
  if (!value || value.trim() === "") return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().split("T")[0]
}
