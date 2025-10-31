import { Card } from "@/components/ui/card"
import { CapacityBar } from "@/components/capacity-bar"
import type { Member, StoryWithSuggestions } from "@/types"

interface WorkloadSummaryProps {
  members: Member[]
  stories: StoryWithSuggestions[]
}

export function WorkloadSummary({ members, stories }: WorkloadSummaryProps) {
  // Calculate workload per member
  const workloadByMember = new Map<string, number>()
  stories.forEach((story) => {
    if (story.assignedTo) {
      const current = workloadByMember.get(story.assignedTo) || 0
      workloadByMember.set(story.assignedTo, current + story.estimate)
    }
  })

  return (
    <Card className="p-6 rounded-2xl">
      <h3 className="text-lg font-semibold mb-4">Team Workload</h3>
      <div className="space-y-4">
        {members.map((member) => {
          const assigned = workloadByMember.get(member.id) || 0
          return (
            <div key={member.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
              </div>
              <CapacityBar assigned={assigned} capacity={member.capacity.hoursPerSprint} />
            </div>
          )
        })}
      </div>
    </Card>
  )
}
