import type { TranscriptSegment } from "@/types"

/**
 * Parse SRT/VTT transcript files with robust timestamp handling
 * Supports both comma and dot separators for milliseconds
 */
export function parseTranscript(content: string, format: "srt" | "vtt" | "txt"): TranscriptSegment[] {
  if (format === "txt") {
    return parsePlainText(content)
  }

  const segments: TranscriptSegment[] = []
  const lines = content.split("\n")

  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()

    // Skip empty lines and sequence numbers (SRT) or NOTE lines (VTT)
    if (!line || /^\d+$/.test(line) || line.startsWith("NOTE") || line === "WEBVTT") {
      i++
      continue
    }

    // Look for timestamp line (supports both , and . for milliseconds)
    const timestampMatch = line.match(/(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})/)
    if (timestampMatch) {
      const timestamp = timestampMatch[1].replace(",", ".")
      i++

      // Collect text lines until next timestamp or empty line
      const textLines: string[] = []
      while (i < lines.length && lines[i].trim() && !lines[i].includes("-->")) {
        textLines.push(lines[i].trim())
        i++
      }

      const fullText = textLines.join(" ")

      // Try to extract speaker (format: "Speaker: text" or "<v Speaker>text")
      let speaker = "Unknown"
      let text = fullText

      const speakerMatch = fullText.match(/^([^:]+):\s*(.+)$/) || fullText.match(/^<v\s+([^>]+)>\s*(.+)$/)
      if (speakerMatch) {
        speaker = speakerMatch[1].trim()
        text = speakerMatch[2].trim()
      }

      segments.push({ timestamp, speaker, text })
    } else {
      i++
    }
  }

  return segments
}

function parsePlainText(content: string): TranscriptSegment[] {
  const lines = content.split("\n").filter((line) => line.trim())

  return lines.map((line, index) => {
    // Try to extract speaker from "Speaker: text" format
    const speakerMatch = line.match(/^([^:]+):\s*(.+)$/)

    if (speakerMatch) {
      return {
        timestamp: `00:${String(index).padStart(2, "0")}:00.000`,
        speaker: speakerMatch[1].trim(),
        text: speakerMatch[2].trim(),
      }
    }

    return {
      timestamp: `00:${String(index).padStart(2, "0")}:00.000`,
      speaker: "Unknown",
      text: line.trim(),
    }
  })
}

export function detectFormat(filename: string): "srt" | "vtt" | "txt" {
  const ext = filename.toLowerCase().split(".").pop()
  if (ext === "srt") return "srt"
  if (ext === "vtt") return "vtt"
  return "txt"
}
