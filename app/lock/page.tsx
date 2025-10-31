"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useStore } from "@/lib/store"
import { AlertCircle, ArrowLeft, CheckCircle, Download } from "lucide-react"
import { exportToCSV, exportToMarkdown } from "@/lib/csv"
import { CapacityBar } from "@/components/capacity-bar"

export default function LockPage() {
  const router = useRouter()
  const { stories, teamKB, setCurrentStep } = useStore()
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!stories.length || !teamKB) {
      router.push("/")
      return
    }
    setCurrentStep("lock")
  }, [stories, teamKB, router, setCurrentStep])

  if (!teamKB) return null

  // Calculate workload per member
  const workloadByMember = new Map<string, number>()
  stories.forEach((story) => {
    if (story.assignedTo) {
      const current = workloadByMember.get(story.assignedTo) || 0
      workloadByMember.set(story.assignedTo, current + story.estimate)
    }
  })

  const hasOverCapacity = Array.from(workloadByMember.entries()).some(([memberId, workload]) => {
    const member = teamKB.members.find((m) => m.id === memberId)
    return member && workload > member.capacity.hoursPerSprint
  })

  const hasNeedsClarification = stories.some((story) =>
    story.labels.some((label) => label.toLowerCase().includes("needs-clarification")),
  )

  const handleConfirm = () => {
    exportToCSV(stories, teamKB.sprintId)
    setConfirmed(true)
    setShowConfirmModal(false)
  }

  const handleExportMarkdown = () => {
    exportToMarkdown(stories, teamKB.sprintId)
  }

  if (confirmed) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <Card className="p-12 rounded-2xl text-center">
          <CheckCircle className="h-16 w-16 mx-auto mb-6 text-green-500" />
          <h2 className="text-2xl font-bold mb-4">Sprint Locked Successfully!</h2>
          <p className="text-muted-foreground mb-8">
            Your sprint has been exported as{" "}
            <code className="text-sm bg-muted px-2 py-1 rounded">sprint_export_{teamKB.sprintId}.csv</code> and is ready
            for import into Jira.
          </p>
          <Button onClick={() => router.push("/")} size="lg">
            Start New Sprint
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Lock Sprint</h1>
          <p className="text-muted-foreground">Review final assignments before confirming</p>
        </div>

        {/* Warnings */}
        {(hasOverCapacity || hasNeedsClarification) && (
          <div className="space-y-3 mb-6">
            {hasOverCapacity && (
              <Card className="p-4 rounded-2xl border-orange-500 bg-orange-500/10">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-orange-500">Capacity Warning</p>
                    <p className="text-sm text-muted-foreground">
                      Some team members are over capacity. Consider redistributing work.
                    </p>
                  </div>
                </div>
              </Card>
            )}
            {hasNeedsClarification && (
              <Card className="p-4 rounded-2xl border-orange-500 bg-orange-500/10">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-orange-500">Clarification Needed</p>
                    <p className="text-sm text-muted-foreground">Some stories are marked as needing clarification.</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_350px] gap-6">
          {/* Main Content - Summary Table */}
          <div>
            <Card className="rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Story</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Labels</TableHead>
                    <TableHead className="text-right">Estimate</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stories.map((story) => {
                    const assignedMember = teamKB.members.find((m) => m.id === story.assignedTo)
                    const needsClarification = story.labels.some((label) =>
                      label.toLowerCase().includes("needs-clarification"),
                    )

                    return (
                      <TableRow key={story.id}>
                        <TableCell className="font-medium max-w-[300px]">
                          <p className="truncate">{story.iWant}</p>
                        </TableCell>
                        <TableCell>
                          {assignedMember ? (
                            <div>
                              <p className="font-medium">{assignedMember.name}</p>
                              <p className="text-xs text-muted-foreground">{assignedMember.role}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {story.labels.slice(0, 2).map((label, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {label}
                              </Badge>
                            ))}
                            {story.labels.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{story.labels.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{story.estimate}h</TableCell>
                        <TableCell className="text-sm">{story.dueDate}</TableCell>
                        <TableCell className="text-center">
                          {needsClarification && (
                            <Badge variant="outline" className="text-orange-500 border-orange-500">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Needs Review
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Side Card - Capacity Summary */}
          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <Card className="p-6 rounded-2xl">
              <h3 className="text-lg font-semibold mb-4">Sprint Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Stories</span>
                  <span className="font-semibold">{stories.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Hours</span>
                  <span className="font-semibold">{stories.reduce((sum, s) => sum + s.estimate, 0)}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sprint Capacity</span>
                  <span className="font-semibold">{teamKB.sprintCapacity}h</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 rounded-2xl">
              <h3 className="text-lg font-semibold mb-4">Team Capacity</h3>
              <div className="space-y-4">
                {teamKB.members.map((member) => {
                  const assigned = workloadByMember.get(member.id) || 0
                  return (
                    <div key={member.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                      <CapacityBar assigned={assigned} capacity={member.capacity.hoursPerSprint} />
                    </div>
                  )
                })}
              </div>
            </Card>

            <div className="space-y-3">
              <Button onClick={() => router.push("/review")} variant="outline" size="lg" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Review
              </Button>
              <Button onClick={handleExportMarkdown} variant="outline" size="lg" className="w-full bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Export as Markdown
              </Button>
              <Button onClick={() => setShowConfirmModal(true)} size="lg" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Confirm & Export CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Sprint Lock</DialogTitle>
            <DialogDescription>
              Are you sure you want to lock this sprint? This will export the CSV file and finalize all assignments.
              {(hasOverCapacity || hasNeedsClarification) && (
                <span className="block mt-2 text-orange-500 font-medium">
                  Warning: There are capacity or clarification issues that should be addressed.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Confirm & Export</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
