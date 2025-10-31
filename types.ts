// Core type definitions for ScrumBot

export interface TranscriptSegment {
  timestamp: string // e.g., "00:01:23.456"
  speaker: string
  text: string
}

export interface QuoteEvidence {
  timestamp: string
  speaker: string
  quote: string
}

export interface Story {
  id: string
  asA: string
  iWant: string
  soThat: string
  risks: string[]
  actionItems: string[]
  labels: string[]
  evidence: QuoteEvidence[]
  estimate: number // story points
  dueDate: string // ISO date string
  assignedTo?: string // member ID
}

export interface Suggestion {
  memberId: string
  name: string
  role: string
  timezone: string
  score: number // 0-100
  breakdown: {
    competence: number
    availability: number
    growthPotential: number
    continuity: number
  }
  justification: string[]
}

export interface Skill {
  name: string
  level: number // 1-5
}

export interface ProjectHistory {
  projectName: string
  role: string
  duration: string
}

export interface Capacity {
  hoursPerSprint: number
  currentLoad: number // hours already committed
}

export interface Preference {
  wants_to_learn: string[]
  prefers_not: string[]
}

export interface Member {
  id: string
  name: string
  role: string
  timezone: string
  skills: Skill[]
  history: ProjectHistory[]
  capacity: Capacity
  preferences: Preference
}

export interface TeamKB {
  members: Member[]
  sprintId: string
  sprintCapacity: number // total team hours
}

export interface Weights {
  alpha: number // competence
  beta: number // availability
  gamma: number // growth potential
  delta: number // continuity
}

export interface StoryWithSuggestions extends Story {
  suggestions: Suggestion[]
}
