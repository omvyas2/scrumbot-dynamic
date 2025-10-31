import type { StoryWithSuggestions } from "@/types"

export function storyToJiraRow(story: StoryWithSuggestions): Record<string, string> {
  const summary = `${story.asA}: ${story.iWant}`

  const descriptionParts = [`As a ${story.asA}`, `I want ${story.iWant}`, `So that ${story.soThat}`, ""]

  if (story.risks.length > 0) {
    descriptionParts.push("**Risks:**")
    story.risks.forEach((risk) => descriptionParts.push(`- ${risk}`))
    descriptionParts.push("")
  }

  if (story.actionItems.length > 0) {
    descriptionParts.push("**Action Items:**")
    story.actionItems.forEach((item) => descriptionParts.push(`- ${item}`))
    descriptionParts.push("")
  }

  if (story.evidence.length > 0) {
    descriptionParts.push("**Evidence:**")
    story.evidence.forEach((ev) => {
      descriptionParts.push(`[${ev.timestamp}] ${ev.speaker}: "${ev.quote}"`)
    })
  }

  const description = descriptionParts.join("\n")

  return {
    Summary: summary,
    Description: description,
    Assignee: story.assignedTo || "",
    Labels: story.labels.join(", "),
    "Due Date": story.dueDate,
    Estimate: String(story.estimate),
  }
}

export function downloadCSV(stories: StoryWithSuggestions[], sprintId: string) {
  const headers = ["Summary", "Description", "Assignee", "Labels", "Due Date", "Estimate"]
  const rows = stories.map(storyToJiraRow)

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] || ""
          // Escape quotes and wrap in quotes if contains comma, newline, or quote
          if (value.includes(",") || value.includes("\n") || value.includes('"')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        .join(","),
    ),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", `sprint_export_${sprintId}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function downloadMarkdown(stories: StoryWithSuggestions[], sprintId: string) {
  const markdownContent = [
    `# Sprint Export: ${sprintId}`,
    "",
    `**Generated:** ${new Date().toLocaleString()}`,
    `**Total Stories:** ${stories.length}`,
    `**Total Estimate:** ${stories.reduce((sum, s) => sum + s.estimate, 0)} hours`,
    "",
    "---",
    "",
  ]

  stories.forEach((story, index) => {
    markdownContent.push(`## ${index + 1}. ${story.iWant}`)
    markdownContent.push("")
    markdownContent.push(`**As a:** ${story.asA}`)
    markdownContent.push(`**I want:** ${story.iWant}`)
    markdownContent.push(`**So that:** ${story.soThat}`)
    markdownContent.push("")
    markdownContent.push(`**Assignee:** ${story.assignedTo || "Unassigned"}`)
    markdownContent.push(`**Estimate:** ${story.estimate} hours`)
    markdownContent.push(`**Due Date:** ${story.dueDate}`)
    markdownContent.push(`**Labels:** ${story.labels.join(", ")}`)
    markdownContent.push("")

    if (story.risks.length > 0) {
      markdownContent.push("### Risks")
      story.risks.forEach((risk) => markdownContent.push(`- ${risk}`))
      markdownContent.push("")
    }

    if (story.actionItems.length > 0) {
      markdownContent.push("### Action Items")
      story.actionItems.forEach((item) => markdownContent.push(`- [ ] ${item}`))
      markdownContent.push("")
    }

    if (story.evidence.length > 0) {
      markdownContent.push("### Evidence")
      story.evidence.forEach((ev) => {
        markdownContent.push(`- **[${ev.timestamp}] ${ev.speaker}:** "${ev.quote}"`)
      })
      markdownContent.push("")
    }

    markdownContent.push("---")
    markdownContent.push("")
  })

  const blob = new Blob([markdownContent.join("\n")], { type: "text/markdown;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", `sprint_export_${sprintId}.md`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const exportToCSV = downloadCSV
export const exportToMarkdown = downloadMarkdown
