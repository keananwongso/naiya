# Naiya 3 - System Architecture
## Last Updated: December 26, 2025

---

## 🎯 Overview

Naiya is an AI scheduling assistant that transforms natural language into organized calendar events. It uses a **hybrid architecture** combining DeepSeek AI for understanding messy human input with deterministic algorithms for reliable scheduling logic.

**Key Innovation**: Split responsibilities between AI (what humans are good at) and algorithms (what computers are good at).

---

## 📊 High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│  User: "I have gym Monday Tuesday Friday at 5-6pm"          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  DeepSeek LLM (Entity Extraction)                           │
│  "What does the user want?"                                 │
│                                                              │
│  Output: {                                                  │
│    day_pattern: "Monday Tuesday Friday",                    │
│    start: "5pm",                                            │
│    end: "6pm"                                               │
│  }                                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Algorithms (Pattern Expansion & Scheduling)                │
│  "How do we make this happen?"                              │
│                                                              │
│  1. Parse "Monday Tuesday Friday" → [Mon, Tue, Fri]         │
│  2. Convert "5pm" → "17:00"                                 │
│  3. Create 3 calendar events                                │
│  4. Check for conflicts                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Result: 3 gym events on Mon/Tue/Fri at 17:00-18:00        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture Components

### 1. Frontend (Next.js + React)

**What it does:**
- Displays calendar and chat interface
- Sends user messages to backend
- Updates UI with new events

**Key files:**
- `frontend/src/app/page.tsx` - Home page with "brain dump"
- `frontend/src/app/schedule/page.tsx` - Calendar view with chat
- `frontend/src/components/CalendarShell.tsx` - Calendar logic

### 2. API Layer (Next.js API Routes)

**What it does:**
- Thin proxy between frontend and Supabase
- Adds authentication headers
- Forwards requests to Edge Functions

**Key file:**
- `frontend/src/app/api/naiya/process/route.ts`

### 3. Backend (Supabase Edge Functions)

**What it does:**
- Calls DeepSeek AI to understand user intent
- Runs scheduling algorithms
- Returns clean calendar events

**Architecture:**
```
Edge Function (Deno)
├── prompts.ts        - DeepSeek prompt (what to extract)
├── algorithms.ts     - Scheduling logic (how to schedule)
├── validation.ts     - Conflict resolution (how to fix overlaps)
└── index.ts          - Main orchestrator (ties everything together)
```

---

## 🧠 The Hybrid Approach

### Why Hybrid?

**Before (Pure LLM):**
- ❌ $450/month API costs
- ❌ 2.6s average response time
- ❌ Impossible to test
- ❌ Unpredictable behavior

**After (LLM + Algorithms):**
- ✅ $24/month API costs (95% reduction)
- ✅ 1.6s average response time (38% faster)
- ✅ 60+ unit tests
- ✅ Predictable, reliable logic

### Division of Labor

| Task | Handled By | Why |
|------|------------|-----|
| Understand "tmrw at 9ish" | **LLM** | Humans are fuzzy, AI understands context |
| Convert "9ish" → "21:00" | **Algorithm** | Precise time parsing needs deterministic rules |
| Detect "Mon-Fri" pattern | **LLM** | Pattern recognition is AI's strength |
| Expand to 5 individual days | **Algorithm** | Simple iteration, no AI needed |
| Understand "I'm free then" | **LLM** | Context from conversation history |
| Find available time slot | **Algorithm** | Precise conflict detection |

---

## 🔄 Request Processing Flow

### Detailed Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│  1. USER INPUT                                              │
│  "I have gym Monday Tuesday Friday at 5-6pm"                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  2. index.ts (Main Handler)                                 │
│  - Receives request from frontend                           │
│  - Calls DeepSeek API                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  3. prompts.ts (LLM Prompt Builder)                         │
│  - buildSystemPrompt() → Instructions for DeepSeek          │
│  - buildDeepSeekPrompt() → User message + context           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  4. DeepSeek API (External Service)                         │
│  Returns: {                                                 │
│    "message": "Got it!",                                    │
│    "events": [{                                             │
│      "title": "gym",                                        │
│      "day_pattern": "Monday Tuesday Friday",                │
│      "start": "5pm",                                        │
│      "end": "6pm"                                           │
│    }]                                                       │
│  }                                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  5. validation.ts::validateLLMResponse()                    │
│  - Checks DeepSeek output is safe                           │
│  - Returns clean LLMExtractionResult                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  6. algorithms.ts::processExtractedEntities()               │
│  - Calls expandDayPattern("Monday Tuesday Friday")          │
│     → Returns ["Mon", "Tue", "Fri"]                         │
│  - Calls normalizeTime("5pm") → "17:00"                     │
│  - Calls normalizeTime("6pm") → "18:00"                     │
│  - Creates 3 separate CalendarEvent objects                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  7. validation.ts::sanitizeEvent()                          │
│  - Removes dangerous characters from each event             │
│  - Returns clean events                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  8. validation.ts::resolveConflicts()                       │
│  - Checks new events vs existing calendar                   │
│  - Detects overlaps                                         │
│  - Keeps less flexible event                                │
│  - Returns conflict-free calendar                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  9. index.ts (Main Handler)                                 │
│  - Sends response back to frontend                          │
│  Returns: {                                                 │
│    "events": [3 gym events],                                │
│    "deadlines": [],                                         │
│    "assistantMessage": "Got it! I've added..."              │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

### File Responsibilities

| File | Type | What It Does |
|------|------|--------------|
| **index.ts** | Orchestrator | Main handler that calls everything in order |
| **prompts.ts** | LLM Interface | Builds prompts for DeepSeek AI |
| **algorithms.ts** | Algorithm | Pattern expansion, time normalization, temporal resolution |
| **validation.ts** | Algorithm | Conflict detection, security sanitization, data validation |

---

## 🎨 Key Features

### 1. **Smart Clarification**

Instead of guessing, Naiya asks when information is missing:

**Ambiguous:**
```
User: "I have gym"
Naiya: "When do you usually go to the gym? Which days and what time?"
```

**Clear:**
```
User: "gym Monday Wednesday Friday at 5pm"
Naiya: "Got it! Added gym sessions." ✅ Creates events
```

### 2. **Two Event Types**

**ONE-TIME events:**
- Birthdays, dinners, appointments
- Uses `date` field: "tomorrow", "next Friday", "2025-01-15"
- Example: "dinner tomorrow at 7pm"

**RECURRING events:**
- Gym, classes, work schedules
- Uses `day_pattern` or `frequency`: "Monday Tuesday Friday", "3x/week"
- Example: "I work 9-5 Monday to Friday"

### 3. **Conflict Resolution**

Automatically handles overlapping events:

```
Existing: Work (Mon-Fri 9am-5pm) [fixed]
New: Gym (Mon 10am-11am) [medium flexibility]

Result: Gym moved to Mon 6pm-7pm
Message: "I moved gym to 6pm to avoid your work schedule"
```

Priority levels:
1. **fixed** - Cannot move (work, classes)
2. **strong** - Hard to move (important meetings)
3. **medium** - Can move (gym, study)
4. **high** - Easy to move (flexible activities)

---

## 🗄️ Database Schema

All data stored in Supabase PostgreSQL with Row Level Security (RLS):

### Tables

**calendars** - User's schedule
```
user_id  → UUID (who owns this)
events   → JSONB[] (array of calendar events)
```

**deadlines** - Assignments and projects
```
user_id     → UUID
title       → string
due_date    → date
completed   → boolean
```

**chat_sessions** - Conversation history
```
user_id  → UUID
messages → JSONB[] (chat messages)
```

**Security:** All tables enforce `auth.uid() = user_id` - users can only access their own data.

---

## 🔐 Security

- **Row Level Security (RLS)**: Database-level isolation between users
- **API Key Protection**: DeepSeek key hidden in Edge Functions (never sent to frontend)
- **Input Sanitization**: XSS protection in validation layer
- **Demo Mode**: Uses localStorage (no auth required for testing)

---

## 📁 Project Structure

```
naiya/
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx              # Home (brain dump)
│   │   ├── schedule/page.tsx     # Calendar view
│   │   └── api/naiya/process/    # API proxy
│   ├── src/components/
│   │   └── CalendarShell.tsx     # Main calendar logic
│   └── src/lib/
│       ├── api.ts                # API client
│       └── supabase.ts           # Supabase client
│
├── supabase/
│   ├── functions/
│   │   └── naiya-process/
│   │       ├── index.ts          # Main handler (253 lines)
│   │       ├── prompts.ts        # LLM prompts (160 lines)
│   │       ├── algorithms.ts     # Scheduling logic (520 lines)
│   │       ├── validation.ts     # Conflict resolution (330 lines)
│   │       └── test.ts           # Unit tests (430 lines, 60+ tests)
│   └── migrations/               # Database schema
│
├── shared/
│   └── types.ts                  # TypeScript types
│
└── docs/
    ├── ARCHITECTURE.md           # This file
    └── SETUP.md                  # Development setup
```

---

## 🚀 December 26, 2025 Updates

### Critical Fixes

#### 1. **Space-Separated Day Patterns** ✅
**Problem:** "Monday Tuesday Friday" couldn't be parsed

**Fix:** Updated algorithm to handle space-separated patterns

**Result:**
- ✅ `"Monday Tuesday Friday"` works
- ✅ `"Mon/Wed/Fri"` works
- ✅ `"Monday, Wednesday, Friday"` works

#### 2. **Clarified date vs day_pattern** ✅
**Problem:** DeepSeek confused one-time events with recurring events

**Fix:** Added explicit rules and examples to prompt

**Result:**
- ✅ "dinner tomorrow" → one-time event (uses `date`)
- ✅ "gym Monday Friday" → recurring events (uses `day_pattern`)

#### 3. **Smart Clarification** ✅
**Problem:** Created events even when info was missing

**Fix:** Added logic to ask questions when details are unclear

**Result:**
- ✅ "I have gym" → Asks "Which days and what time?"
- ✅ "meeting Monday" → Asks "One-time or recurring?"

#### 4. **Confirmation Handling** ✅
**Problem:** Saying "yes" created duplicate events

**Fix:** Added confirmation detection to prompt

**Result:**
- ✅ User confirms "yes" → No duplicate created
- ✅ Acknowledgment only: "Perfect! It's in your schedule."

---

## 📊 Performance Metrics

| Metric | GPT-5.1 | DeepSeek + Algorithms |
|--------|---------|----------------------|
| Monthly Cost | $450 | $24 |
| Avg Response Time | 2.6s | 1.6s |
| Unit Tests | 0 | 60+ |
| Lines of AI Logic | 745 (prompt) | 1,683 (code) |
| Maintainability | ❌ Fragile | ✅ Testable |

---

## 🔮 Future Enhancements

- **Multi-day events** - Events spanning multiple days
- **Timezone support** - Explicit timezone handling
- **Smart rescheduling** - Try different days if same day has no slots
- **Deadline-aware scheduling** - Auto-schedule study time before deadlines
- **Calendar sync** - Import from Google Calendar, Outlook

---

## 🤝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

**Quick Start:**
1. Fork the repo
2. Follow [docs/SETUP.md](SETUP.md) for local setup
3. Make changes with tests
4. Open a PR

---

**Built with ❤️ as a technical portfolio project**
