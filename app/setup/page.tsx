"use client"

import { useState } from "react"
import { Upload, CheckCircle2, AlertCircle, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

type CSVType = "team_members" | "skills" | "capacity" | "preferences" | "history"

interface UploadStatus {
  type: CSVType
  status: "pending" | "uploading" | "success" | "error"
  message?: string
  rowCount?: number
}

const CSV_TYPES: { type: CSVType; label: string; description: string }[] = [
  { type: "team_members", label: "Team Members", description: "Basic info: id, name, role, timezone, email" },
  { type: "skills", label: "Skills", description: "Member skills: member_id, skill_name, skill_level (1-5)" },
  { type: "capacity", label: "Capacity", description: "Availability: member_id, hours_per_sprint, current_load" },
  {
    type: "preferences",
    label: "Preferences",
    description: "Learning goals: member_id, wants_to_learn, prefers_not",
  },
  {
    type: "history",
    label: "History",
    description: "Past projects: member_id, project_name, project_role, duration, technologies",
  },
]

export default function SetupPage() {
  const [uploadStatuses, setUploadStatuses] = useState<Record<CSVType, UploadStatus>>(
    CSV_TYPES.reduce(
      (acc, { type }) => ({
        ...acc,
        [type]: { type, status: "pending" },
      }),
      {} as Record<CSVType, UploadStatus>,
    ),
  )

  const handleFileUpload = async (type: CSVType, file: File) => {
    setUploadStatuses((prev) => ({
      ...prev,
      [type]: { type, status: "uploading" },
    }))

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", type)

      const response = await fetch("/api/team-data/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Upload failed")
      }

      setUploadStatuses((prev) => ({
        ...prev,
        [type]: {
          type,
          status: "success",
          message: `Successfully imported ${data.rowCount} rows`,
          rowCount: data.rowCount,
        },
      }))

      toast.success(`${CSV_TYPES.find((t) => t.type === type)?.label} uploaded successfully`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed"
      setUploadStatuses((prev) => ({
        ...prev,
        [type]: {
          type,
          status: "error",
          message: errorMessage,
        },
      }))
      toast.error(errorMessage)
    }
  }

  const allUploaded = Object.values(uploadStatuses).every((status) => status.status === "success")

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3 text-balance">Team Data Setup</h1>
        <p className="text-lg text-muted-foreground text-pretty">
          Upload your team CSV files once. This data will be used by the AI to make intelligent story assignments.
        </p>
      </div>

      <Card className="p-6 rounded-2xl mb-6">
        <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg mb-6">
          <Database className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">One-Time Setup</p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Upload your CSV files below. The data will be stored in Supabase and used for all future story
              assignments. You can re-upload files to update the data.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {CSV_TYPES.map(({ type, label, description }) => {
            const status = uploadStatuses[type]
            return (
              <div key={type} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <Label className="text-base font-semibold mb-1 block">{label}</Label>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {status.status === "success" && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    )}
                    {status.status === "error" && <AlertCircle className="h-5 w-5 text-destructive" />}
                  </div>
                </div>

                {status.status === "success" && status.message && (
                  <div className="mb-3 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded text-sm text-green-700 dark:text-green-300">
                    {status.message}
                  </div>
                )}

                {status.status === "error" && status.message && (
                  <div className="mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                    {status.message}
                  </div>
                )}

                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(type, file)
                  }}
                  className="hidden"
                  id={`file-${type}`}
                  disabled={status.status === "uploading"}
                />
                <Button
                  asChild
                  variant="outline"
                  disabled={status.status === "uploading"}
                  className="w-full bg-transparent"
                >
                  <label htmlFor={`file-${type}`} className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    {status.status === "uploading"
                      ? "Uploading..."
                      : status.status === "success"
                        ? "Re-upload"
                        : "Upload CSV"}
                  </label>
                </Button>
              </div>
            )
          })}
        </div>
      </Card>

      {allUploaded && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 mb-4">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">All data uploaded successfully!</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Your team data is now stored in Supabase and ready to use for AI-powered story assignments.
          </p>
          <Button onClick={() => (window.location.href = "/")} size="lg">
            Go to Dashboard
          </Button>
        </div>
      )}
    </div>
  )
}
