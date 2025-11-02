"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileText, Sparkles, User, CheckCircle2, Trash2, Clock, Database, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { WeightTuner } from "@/components/weight-tuner"
import { useStore } from "@/lib/store"
import { parseTranscript, detectFormat } from "@/lib/parseTranscript"
import { extractTeamFromTranscript } from "@/lib/extractTeamFromTranscript"
import { DEMO_KB, DEMO_TRANSCRIPT } from "@/lib/fixtures"
import { toast } from "sonner"
import { fetchSavedTranscripts } from "@/lib/fetchSavedTranscripts" // Import fetchSavedTranscripts

type SavedTranscript = {
  id: string
  filename: string
  segment_count: number
  created_at: string
}

type TeamDataStatus = {
  hasData: boolean
  counts: {
    team_members: number
    skills: number
    capacity: number
    preferences: number
    history: number
  }
}

export default function LandingPage() {
  const router = useRouter()
  const { setTranscript, setTeamKB, teamKB, setCurrentStep, transcript } = useStore()

  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; segments: number } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [savedTranscripts, setSavedTranscripts] = useState<SavedTranscript[]>([])
  const [isLoadingTranscripts, setIsLoadingTranscripts] = useState(true)
  const [teamDataStatus, setTeamDataStatus] = useState<TeamDataStatus | null>(null)
  const [isLoadingTeamStatus, setIsLoadingTeamStatus] = useState(true)

  useEffect(() => {
    fetchSavedTranscripts(setSavedTranscripts, setIsLoadingTranscripts)
    fetchTeamDataStatus()
  }, [])

  const fetchTeamDataStatus = async () => {
    try {
      const response = await fetch("/api/team-data/status")
      const data = await response.json()
      setTeamDataStatus(data)
      console.log("[v0] Team data status loaded:", data)
    } catch (error) {
      console.error("[v0] Error fetching team data status:", error)
    } finally {
      setIsLoadingTeamStatus(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    try {
      const content = await file.text()
      const format = detectFormat(file.name)
      const segments = parseTranscript(content, format)

      if (segments.length === 0) {
        toast.error("No transcript segments found. Please check the file format.")
        return
      }

      setTranscript(segments)
      setUploadedFile({ name: file.name, segments: segments.length })

      const teamMembers = extractTeamFromTranscript(segments)
      const dynamicTeamKB = {
        sprintId: `SPRINT-${new Date().getFullYear()}-${Math.ceil((new Date().getMonth() + 1) / 3)}`,
        sprintCapacity: teamMembers.reduce((sum, m) => sum + m.capacity.hoursPerSprint, 0),
        members: teamMembers,
      }
      setTeamKB(dynamicTeamKB)

      // Save to Supabase
      const response = await fetch("/api/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          content,
          parsedSegments: segments,
        }),
      })

      if (!response.ok) throw new Error("Failed to save transcript")

      toast.success(`Successfully uploaded ${file.name} with ${segments.length} segments`)

      // Refresh the list
      await fetchSavedTranscripts(setSavedTranscripts, setIsLoadingTranscripts)
    } catch (error) {
      console.error("[v0] Error parsing file:", error)
      toast.error("Failed to parse or save transcript file")
    } finally {
      setIsUploading(false)
    }
  }

  const loadSavedTranscript = async (id: string) => {
    try {
      const response = await fetch(`/api/transcripts/${id}`)
      const data = await response.json()

      if (data.transcript) {
        const segments = data.transcript.parsed_segments
        setTranscript(segments)
        setUploadedFile({
          name: data.transcript.filename,
          segments: segments.length,
        })

        const teamMembers = extractTeamFromTranscript(segments)
        const dynamicTeamKB = {
          sprintId: `SPRINT-${new Date().getFullYear()}-${Math.ceil((new Date().getMonth() + 1) / 3)}`,
          sprintCapacity: teamMembers.reduce((sum, m) => sum + m.capacity.hoursPerSprint, 0),
          members: teamMembers,
        }
        setTeamKB(dynamicTeamKB)

        toast.success(`Loaded ${data.transcript.filename}`)
      }
    } catch (error) {
      console.error("[v0] Error loading transcript:", error)
      toast.error("Failed to load transcript")
    }
  }

  const deleteSavedTranscript = async (id: string, filename: string) => {
    try {
      const response = await fetch(`/api/transcripts/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete")

      toast.success(`Deleted ${filename}`)
      await fetchSavedTranscripts(setSavedTranscripts, setIsLoadingTranscripts)
    } catch (error) {
      console.error("[v0] Error deleting transcript:", error)
      toast.error("Failed to delete transcript")
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const loadDemoData = () => {
    setTranscript(DEMO_TRANSCRIPT)
    setTeamKB(DEMO_KB)
    setUploadedFile({ name: "Demo transcript", segments: DEMO_TRANSCRIPT.length })
    toast.success("Demo data loaded")
  }

  const handleProcess = () => {
    const transcript = useStore.getState().transcript

    if (transcript.length === 0) {
      toast.error("Please upload or paste a transcript first")
      return
    }

    if (!teamKB) {
      toast.error("Please load demo data or wait for team data to be loaded")
      return
    }

    setCurrentStep("loading")
    router.push("/loading")
  }

  const displayTeam = teamKB?.members || []

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-3 text-balance">Sprint Planning Assistant</h1>
        <p className="text-lg text-muted-foreground text-pretty">
          Upload meeting transcripts and let AI suggest optimal story owners
        </p>
      </div>

      {!isLoadingTeamStatus && (
        <Card className="mb-6 rounded-2xl overflow-hidden">
          {teamDataStatus?.hasData ? (
            <div className="flex items-start gap-4 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <Database className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-green-900 dark:text-green-100 mb-1">Team Data Loaded</p>
                <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                  AI will use your CSV data for intelligent story assignments: {teamDataStatus.counts.team_members}{" "}
                  members, {teamDataStatus.counts.skills} skills, {teamDataStatus.counts.capacity} capacity records,{" "}
                  {teamDataStatus.counts.preferences} preferences, {teamDataStatus.counts.history} history entries
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/setup")}
                  className="text-green-700 dark:text-green-300 h-auto p-0 hover:bg-transparent"
                >
                  Update team data
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
              <Database className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">No Team Data Found</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                  Upload your team CSV files to enable AI-powered story assignments based on skills, capacity,
                  preferences, and history.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/setup")}
                  className="text-amber-700 dark:text-amber-300 h-auto p-0 hover:bg-transparent"
                >
                  Go to Team Setup
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* File Upload */}
          <Card className="p-6 rounded-2xl">
            <Label className="text-lg font-semibold mb-4 block">Transcript Upload</Label>

            {uploadedFile && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-green-900 dark:text-green-100 truncate">{uploadedFile.name}</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {uploadedFile.segments} segments parsed successfully
                  </p>
                </div>
              </div>
            )}

            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop your transcript file here, or click to browse
              </p>
              <input
                type="file"
                accept=".srt,.vtt,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                }}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <Button asChild variant="outline" disabled={isUploading}>
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  {isUploading ? "Uploading..." : "Choose File"}
                </label>
              </Button>
              <p className="text-xs text-muted-foreground mt-2">Supports .srt, .vtt, and .txt formats</p>
            </div>

            {savedTranscripts.length > 0 && (
              <div className="mt-6">
                <Label className="text-sm font-medium mb-3 block">Previously Uploaded</Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {savedTranscripts.map((transcript) => (
                    <div
                      key={transcript.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                    >
                      <button
                        onClick={() => loadSavedTranscript(transcript.id)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{transcript.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {transcript.segment_count} segments • {new Date(transcript.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSavedTranscript(transcript.id, transcript.filename)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isLoadingTranscripts && (
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">Loading saved transcripts...</p>
              </div>
            )}

            {transcript.length > 0 && (
              <div className="mt-6">
                <Label className="text-sm font-medium mb-3 block">Transcript Preview</Label>
                <div className="border rounded-lg p-4 bg-muted/30 max-h-[400px] overflow-y-auto space-y-3">
                  {transcript.map((segment, index) => (
                    <div key={index} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-3 w-3 text-primary" />
                        <span className="font-mono text-xs font-semibold text-primary">{segment.timestamp}</span>
                        <span className="font-semibold text-foreground">{segment.speaker}</span>
                      </div>
                      <p className="text-muted-foreground pl-5">{segment.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6 rounded-2xl">
            <Label className="text-lg font-semibold mb-4 block">Team Members</Label>
            {displayTeam.length > 0 ? (
              <div className="space-y-3">
                {displayTeam.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{member.capacity.hoursPerSprint}h</p>
                      <p className="text-xs text-muted-foreground">capacity</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Upload a transcript to see team members</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Team members are automatically extracted from transcript speakers
            </p>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <WeightTuner />

          <Card className="p-6 rounded-2xl">
            <Button onClick={loadDemoData} variant="outline" className="w-full bg-transparent" size="lg">
              <Sparkles className="h-4 w-4 mr-2" />
              Load Demo Data
            </Button>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Try ScrumBot with sample transcript and team data
            </p>
          </Card>

          <Button onClick={handleProcess} size="lg" className="w-full">
            Process Transcript
          </Button>
        </div>
      </div>
    </div>
  )
}
