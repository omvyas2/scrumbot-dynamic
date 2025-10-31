# Team Data Setup Guide

This application uses a RAG (Retrieval-Augmented Generation) system to intelligently assign stories to team members based on their skills, capacity, preferences, and history.

## CSV File Formats

### 1. Team Members CSV (`team_members.csv`)
Basic information about team members.

**Required columns:**
- `member_id` - Unique identifier (TEXT, e.g., "alice", "bob")
- `name` - Full name (TEXT, required)
- `role` - Job title/role (TEXT, optional)
- `time_zone` - Timezone (TEXT, optional)
- `seniority` - Seniority level (TEXT, optional)

**Example:**
\`\`\`csv
member_id,name,role,time_zone,seniority
alice,Alice Johnson,Senior Frontend Developer,America/New_York,Senior
bob,Bob Smith,Backend Engineer,America/Los_Angeles,Mid
\`\`\`

### 2. Skills CSV (`member_skills.csv`)
Team member skills and proficiency levels.

**Required columns:**
- `member_id` - References team member ID (TEXT)
- `skill` - Name of the skill (TEXT)
- `level` - Proficiency level 0-10 (INTEGER, required)
- `last_used` - Last time skill was used (DATE, optional, format: YYYY-MM-DD)
- `evidence_links` - Links to evidence/projects (TEXT, optional)

**Example:**
\`\`\`csv
member_id,skill,level,last_used,evidence_links
alice,react,9,2025-01-15,https://github.com/alice/react-project
alice,typescript,8,2025-01-20,
bob,node.js,10,2025-01-18,https://github.com/bob/api-server
bob,postgresql,7,2024-12-10,
\`\`\`

### 3. Capacity CSV (`member_capacity.csv`)
Team member availability per sprint.

**Required columns:**
- `member_id` - References team member ID (TEXT)
- `sprint_id` - Sprint identifier (TEXT)
- `hours_available` - Available hours for this sprint (INTEGER >= 0, required)

**Example:**
\`\`\`csv
member_id,sprint_id,hours_available
alice,SPRINT-2025-Q1,40
bob,SPRINT-2025-Q1,35
alice,SPRINT-2025-Q2,32
\`\`\`

### 4. Preferences CSV (`member_preferences.csv`)
Learning goals and interests (one row per preference).

**Required columns:**
- `member_id` - References team member ID (TEXT)
- `wants_to_learn` - Skill/area they want to learn (TEXT, required)

**Example:**
\`\`\`csv
member_id,wants_to_learn
alice,GraphQL
alice,Next.js 15
alice,AI Integration
bob,Kubernetes
bob,Microservices
bob,Rust
\`\`\`

**Note:** If your CSV has comma-separated values in one cell, the upload will split them automatically.

### 5. History CSV (`story_history.csv`)
Past story completions and performance data.

**Required columns:**
- `member_id` - References team member ID (TEXT)
- `story_id` - Identifier for the completed story (TEXT)
- `tags` - Story tags/categories (TEXT, comma-separated, will be converted to array)
- `outcome` - Result: 'success', 'fail', 'partial', or 'unknown' (TEXT, required)
- `cycle_time_days` - Days taken to complete (INTEGER >= 0, required)
- `quality_notes` - Notes about quality/performance (TEXT, optional)

**Example:**
\`\`\`csv
member_id,story_id,tags,outcome,cycle_time_days,quality_notes
alice,story-123,frontend,ui,success,3,Clean code with comprehensive tests
alice,story-124,ui-design,animation,success,2,Exceeded expectations
bob,story-125,backend,api,success,5,Good performance optimization
bob,story-126,database,migration,partial,8,Complex migration required extra time
\`\`\`

**Data Processing:**
- Tags are split by comma, trimmed, lowercased, and deduplicated
- Outcome values are mapped: anything not 'success', 'fail', or 'partial' becomes 'unknown'
- Empty numeric fields default to 0

## Database Schema

The system uses a **normalized relational schema**:

- `team_members` - Core member info (PK: member_id)
- `sprints` - Sprint periods (PK: sprint_id)
- `skills` - Master skills list (PK: skill)
- `stories` - Master stories list (PK: story_id)
- `member_capacity` - Capacity per member per sprint (PK: member_id, sprint_id)
- `member_preferences` - Learning goals (PK: member_id, wants_to_learn)
- `member_skills` - Skills with proficiency (PK: member_id, skill)
- `story_history` - Completed stories (PK: story_id, member_id)

All foreign keys are enforced with CASCADE deletes for data integrity.

## How It Works

1. **One-Time Upload**: Navigate to `/setup` and upload your 5 CSV files
2. **Data Storage**: Files are parsed, validated, and stored in Supabase with proper normalization
3. **RAG System**: When assigning stories, the AI:
   - Retrieves relevant team member data from Supabase
   - Analyzes story requirements from the transcript
   - Matches skills (with proficiency levels and recency)
   - Considers capacity and current workload
   - Factors in learning preferences
   - Reviews historical performance on similar stories
   - Generates ranked recommendations with detailed justifications
4. **Manual Override**: You can always manually adjust AI assignments in the review page

## Benefits

- **Intelligent Matching**: AI considers multiple factors for optimal assignments
- **Historical Context**: Past story outcomes and cycle times inform future assignments
- **Skill Development**: Learning goals are factored into recommendations
- **Capacity Management**: Prevents overallocation by tracking per-sprint availability
- **Persistent Data**: Upload once, use for all future sprints
- **Data Integrity**: Normalized schema ensures consistency and prevents duplicates
</markdown>
