type SavedTranscript = {
  id: string
  filename: string
  segment_count: number
  created_at: string
}

export async function fetchSavedTranscripts(
  setSavedTranscripts: (transcripts: SavedTranscript[]) => void,
  setIsLoadingTranscripts: (loading: boolean) => void,
) {
  try {
    const response = await fetch("/api/transcripts")
    const data = await response.json()

    if (data.transcripts) {
      setSavedTranscripts(data.transcripts)
    }
  } catch (error) {
    console.error("[v0] Error fetching transcripts:", error)
  } finally {
    setIsLoadingTranscripts(false)
  }
}
