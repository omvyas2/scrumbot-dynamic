import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("transcripts")
      .select("id, filename, segment_count, created_at")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ transcripts: data })
  } catch (error) {
    console.error("[v0] Error fetching transcripts:", error)
    return NextResponse.json({ error: "Failed to fetch transcripts" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { filename, content, parsedSegments } = await request.json()

    if (!filename || !content) {
      return NextResponse.json({ error: "Filename and content are required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("transcripts")
      .insert({
        filename,
        content,
        parsed_segments: parsedSegments,
        segment_count: parsedSegments?.length || 0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ transcript: data })
  } catch (error) {
    console.error("[v0] Error saving transcript:", error)
    return NextResponse.json({ error: "Failed to save transcript" }, { status: 500 })
  }
}
