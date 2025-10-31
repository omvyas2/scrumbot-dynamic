import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase.from("transcripts").select("*").eq("id", id).single()

    if (error) throw error

    return NextResponse.json({ transcript: data })
  } catch (error) {
    console.error("[v0] Error fetching transcript:", error)
    return NextResponse.json({ error: "Failed to fetch transcript" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase.from("transcripts").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting transcript:", error)
    return NextResponse.json({ error: "Failed to delete transcript" }, { status: 500 })
  }
}
