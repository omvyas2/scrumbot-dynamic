"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TagEditor } from "@/components/tag-editor"
import { AlertCircle, Calendar, Clock } from "lucide-react"
import type { StoryWithSuggestions, Member } from "@/types"

interface StoryCardProps {
  story: StoryWithSuggestions
  members: Member[]
  onUpdate: (updates: Partial<StoryWithSuggestions>) => void
}

export function StoryCard({ story, members, onUpdate }: StoryCardProps) {
  const [activeTab, setActiveTab] = useState("risks")
  const hasNeedsClarification = story.labels.some((label) => label.toLowerCase().includes("needs-clarification"))

  const assignedMember = members.find((m) => m.id === story.assignedTo)

  return (
    <Card className="p-6 rounded-2xl">
      {hasNeedsClarification && (
        <div className="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
          <p className="text-sm text-orange-500 font-medium">This story needs clarification</p>
        </div>
      )}

      <div className="space-y-4">
        {/* User Story Fields */}
        <div className="space-y-3">
          <div>
            <Label htmlFor={`asA-${story.id}`} className="text-xs text-muted-foreground">
              As a
            </Label>
            <Input
              id={`asA-${story.id}`}
              value={story.asA}
              onChange={(e) => onUpdate({ asA: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor={`iWant-${story.id}`} className="text-xs text-muted-foreground">
              I want
            </Label>
            <Textarea
              id={`iWant-${story.id}`}
              value={story.iWant}
              onChange={(e) => onUpdate({ iWant: e.target.value })}
              className="mt-1 min-h-[60px]"
            />
          </div>
          <div>
            <Label htmlFor={`soThat-${story.id}`} className="text-xs text-muted-foreground">
              So that
            </Label>
            <Textarea
              id={`soThat-${story.id}`}
              value={story.soThat}
              onChange={(e) => onUpdate({ soThat: e.target.value })}
              className="mt-1 min-h-[60px]"
            />
          </div>
        </div>

        {/* Tabs for Risks/Actions/Labels/Evidence */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="risks">Risks</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="labels">Labels</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
          </TabsList>

          <TabsContent value="risks" className="mt-4">
            <TagEditor tags={story.risks} onChange={(risks) => onUpdate({ risks })} placeholder="Add risk..." />
          </TabsContent>

          <TabsContent value="actions" className="mt-4">
            <TagEditor
              tags={story.actionItems}
              onChange={(actionItems) => onUpdate({ actionItems })}
              placeholder="Add action item..."
            />
          </TabsContent>

          <TabsContent value="labels" className="mt-4">
            <TagEditor tags={story.labels} onChange={(labels) => onUpdate({ labels })} placeholder="Add label..." />
          </TabsContent>

          <TabsContent value="evidence" className="mt-4 space-y-2">
            {story.evidence.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No evidence available</p>
            ) : (
              story.evidence.map((ev, index) => (
                <div key={index} className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="font-mono text-xs text-muted-foreground mb-1">
                    {ev.timestamp} - {ev.speaker}
                  </p>
                  <p className="text-foreground">{ev.quote}</p>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Estimate and Due Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`estimate-${story.id}`} className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Estimate (hours)
            </Label>
            <Input
              id={`estimate-${story.id}`}
              type="number"
              value={story.estimate}
              onChange={(e) => onUpdate({ estimate: Number.parseFloat(e.target.value) || 0 })}
              className="mt-1"
              min="0"
              step="0.5"
            />
          </div>
          <div>
            <Label htmlFor={`dueDate-${story.id}`} className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Due Date
            </Label>
            <Input
              id={`dueDate-${story.id}`}
              type="date"
              value={story.dueDate}
              onChange={(e) => onUpdate({ dueDate: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        {/* Suggestions List */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Suggested Owners</Label>
          <div className="space-y-2 mb-3">
            {story.suggestions.slice(0, 3).map((suggestion, index) => (
              <div
                key={suggestion.memberId}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <p className="font-medium">{suggestion.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{suggestion.role}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {suggestion.justification.slice(0, 2).map((reason, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold text-primary">{Math.round(suggestion.score)}%</p>
                  <p className="text-xs text-muted-foreground">match</p>
                </div>
              </div>
            ))}
          </div>

          {/* Override Select */}
          <div>
            <Label htmlFor={`assignedTo-${story.id}`} className="text-xs text-muted-foreground mb-1 block">
              Assigned Owner (Override)
            </Label>
            <Select value={story.assignedTo || ""} onValueChange={(value) => onUpdate({ assignedTo: value })}>
              <SelectTrigger id={`assignedTo-${story.id}`}>
                <SelectValue placeholder="Select owner..." />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} - {member.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assignedMember && <p className="text-xs text-muted-foreground mt-1">Assigned to {assignedMember.name}</p>}
          </div>
        </div>
      </div>
    </Card>
  )
}
