import type { TeamKB, TranscriptSegment, StoryWithSuggestions } from "@/types"

export const DEMO_KB: TeamKB = {
  sprintId: "SPRINT-2024-Q1",
  sprintCapacity: 240,
  members: [
    {
      id: "alice",
      name: "Alice Chen",
      role: "Senior Frontend Engineer",
      timezone: "PST",
      skills: [
        { name: "React", level: 5 },
        { name: "TypeScript", level: 5 },
        { name: "CSS", level: 4 },
      ],
      history: [
        { projectName: "Dashboard Redesign", role: "Lead Developer", duration: "6 months" },
        { projectName: "Component Library", role: "Contributor", duration: "3 months" },
      ],
      capacity: { hoursPerSprint: 40, currentLoad: 10 },
      preferences: {
        wants_to_learn: ["Three.js", "WebGL", "Animation"],
        prefers_not: ["Backend", "DevOps"],
      },
    },
    {
      id: "bob",
      name: "Bob Martinez",
      role: "Full Stack Engineer",
      timezone: "EST",
      skills: [
        { name: "Node.js", level: 4 },
        { name: "PostgreSQL", level: 4 },
        { name: "React", level: 3 },
      ],
      history: [
        { projectName: "API Gateway", role: "Backend Lead", duration: "8 months" },
        { projectName: "Auth System", role: "Developer", duration: "4 months" },
      ],
      capacity: { hoursPerSprint: 40, currentLoad: 20 },
      preferences: {
        wants_to_learn: ["GraphQL", "Microservices"],
        prefers_not: ["Mobile"],
      },
    },
    {
      id: "carol",
      name: "Carol Kim",
      role: "Junior Developer",
      timezone: "CST",
      skills: [
        { name: "JavaScript", level: 3 },
        { name: "HTML", level: 4 },
        { name: "CSS", level: 3 },
      ],
      history: [{ projectName: "Marketing Site", role: "Junior Developer", duration: "2 months" }],
      capacity: { hoursPerSprint: 32, currentLoad: 8 },
      preferences: {
        wants_to_learn: ["React", "TypeScript", "Testing"],
        prefers_not: [],
      },
    },
    {
      id: "david",
      name: "David Okonkwo",
      role: "Backend Engineer",
      timezone: "GMT",
      skills: [
        { name: "Python", level: 5 },
        { name: "Django", level: 4 },
        { name: "PostgreSQL", level: 5 },
      ],
      history: [
        { projectName: "Payment Processing", role: "Backend Developer", duration: "10 months" },
        { projectName: "Data Pipeline", role: "Lead Engineer", duration: "5 months" },
      ],
      capacity: { hoursPerSprint: 40, currentLoad: 15 },
      preferences: {
        wants_to_learn: ["Rust", "Kubernetes"],
        prefers_not: ["Frontend"],
      },
    },
    {
      id: "emma",
      name: "Emma Rodriguez",
      role: "DevOps Engineer",
      timezone: "PST",
      skills: [
        { name: "AWS", level: 5 },
        { name: "Docker", level: 5 },
        { name: "Terraform", level: 4 },
      ],
      history: [
        { projectName: "Infrastructure Migration", role: "DevOps Lead", duration: "12 months" },
        { projectName: "CI/CD Pipeline", role: "Engineer", duration: "6 months" },
      ],
      capacity: { hoursPerSprint: 40, currentLoad: 25 },
      preferences: {
        wants_to_learn: ["Service Mesh", "Observability"],
        prefers_not: ["Frontend Development"],
      },
    },
    {
      id: "frank",
      name: "Frank Zhang",
      role: "QA Engineer",
      timezone: "EST",
      skills: [
        { name: "Test Automation", level: 4 },
        { name: "Selenium", level: 4 },
        { name: "Jest", level: 3 },
      ],
      history: [
        { projectName: "E2E Test Suite", role: "QA Lead", duration: "8 months" },
        { projectName: "Performance Testing", role: "QA Engineer", duration: "4 months" },
      ],
      capacity: { hoursPerSprint: 40, currentLoad: 12 },
      preferences: {
        wants_to_learn: ["Playwright", "Load Testing"],
        prefers_not: [],
      },
    },
  ],
}

export const DEMO_TRANSCRIPT: TranscriptSegment[] = [
  {
    timestamp: "00:00:15.000",
    speaker: "Product Manager",
    text: "We need to build a user dashboard where customers can see their order history.",
  },
  {
    timestamp: "00:00:32.500",
    speaker: "Designer",
    text: "I think we should include filters for date range and order status.",
  },
  {
    timestamp: "00:01:05.200",
    speaker: "Tech Lead",
    text: "We will need to integrate with the orders API and handle pagination.",
  },
  {
    timestamp: "00:01:45.800",
    speaker: "Product Manager",
    text: "Also, users should be able to export their order history as CSV.",
  },
  {
    timestamp: "00:02:20.000",
    speaker: "Designer",
    text: "For the settings page, users need to update their profile information and notification preferences.",
  },
  {
    timestamp: "00:03:10.500",
    speaker: "Tech Lead",
    text: "The notification preferences should sync with our email service provider.",
  },
]

export function makeDemoStories(): Omit<StoryWithSuggestions, "suggestions">[] {
  return [
    {
      id: "story-1",
      asA: "customer",
      iWant: "to view my order history in a dashboard",
      soThat: "I can track my past purchases",
      risks: ["API performance with large order volumes", "Pagination complexity"],
      actionItems: ["Design dashboard mockups", "Implement orders API integration", "Add date filters"],
      labels: ["frontend", "dashboard", "orders"],
      evidence: [
        {
          timestamp: "00:00:15.000",
          speaker: "Product Manager",
          quote: "We need to build a user dashboard where customers can see their order history.",
        },
        {
          timestamp: "00:00:32.500",
          speaker: "Designer",
          quote: "I think we should include filters for date range and order status.",
        },
      ],
      estimate: 8,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    },
    {
      id: "story-2",
      asA: "customer",
      iWant: "to export my order history as CSV",
      soThat: "I can analyze my spending in Excel",
      risks: ["Large datasets may timeout", "CSV formatting edge cases"],
      actionItems: ["Implement CSV generation", "Add download button", "Test with large datasets"],
      labels: ["frontend", "export", "orders"],
      evidence: [
        {
          timestamp: "00:01:45.800",
          speaker: "Product Manager",
          quote: "Also, users should be able to export their order history as CSV.",
        },
      ],
      estimate: 5,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    },
    {
      id: "story-3",
      asA: "customer",
      iWant: "to update my profile and notification preferences",
      soThat: "I can control how I receive updates",
      risks: ["Email service integration complexity", "Validation requirements"],
      actionItems: ["Design settings UI", "Integrate email service API", "Add form validation"],
      labels: ["frontend", "settings", "notifications"],
      evidence: [
        {
          timestamp: "00:02:20.000",
          speaker: "Designer",
          quote: "For the settings page, users need to update their profile information and notification preferences.",
        },
        {
          timestamp: "00:03:10.500",
          speaker: "Tech Lead",
          quote: "The notification preferences should sync with our email service provider.",
        },
      ],
      estimate: 13,
      dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    },
  ]
}
