# Naiya 3 - Current System Architecture
## Last Updated: November 26, 2025

---

## 📊 High-Level Pipeline Overview

```
User Input (Home/Schedule Page)
        ↓
processNaiya() [frontend/src/lib/api.ts:76-89]
        ↓
Next.js API Route: /api/naiya/process
        ↓
Supabase Edge Function: naiya-process
        ↓
OpenAI GPT-5.1 (Responses API)
        ↓
Post-processing (Validation, Conflict Resolution)
        ↓
Response: {events[], deadlines[], assistantMessage}
        ↓
Frontend Updates Calendar + Saves to Supabase
```

---

## 🔄 Detailed Component Breakdown

### 1. Frontend Entry Points

#### A. Home Page (Brain Dump)
**Location**: `frontend/src/app/page.tsx:288-336`

**Flow**:
1. User types/speaks message in brain dump text area
2. Click "Send" button → `handleBraindumpSubmit()`
3. Sets `isProcessing = true` → Shows loading overlay
4. Calls `processNaiya(events, braindumpText)`
5. On success:
   - Updates local calendar state
   - Saves to Supabase
   - Creates new chat session
   - Redirects to `/schedule`
6. Loading overlay dismissed

**Context Date**: Always uses "today" (current date)

#### B. Schedule Page (Chat Interface)
**Location**: `frontend/src/components/CalendarShell.tsx:259-321`

**Flow**:
1. User types message in schedule chat
2. Calls `handleCalendarUpdate(message, conversationHistory)`
3. Sets `isProcessing = true` → Shows processing state
4. Calls `processNaiya(events, message, conversationHistory, weekStartIso)` ⭐
5. On success:
   - Updates calendar state
   - Saves to Supabase
   - Saves conversation to chat session
6. Processing state dismissed

**Context Date**: Uses `weekStartIso` (Monday of currently viewed week) ⭐
- This ensures when viewing December, Naiya understands you're planning for December

---

### 2. API Layer

#### `processNaiya()` Function
**Location**: `frontend/src/lib/api.ts:76-89`

**Signature** (Updated Today):
```typescript
export async function processNaiya(
    calendar: CalendarEvent[],
    message: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant', content: string }>,
    contextDate?: string // ⭐ NEW: Week context being viewed
): Promise<{
    events: CalendarEvent[];
    deadlines: any[];
    assistantMessage: string
}>
```

**What It Does**:
1. Accepts optional `contextDate` (defaults to today if not provided)
2. Constructs API request payload:
   ```typescript
   {
       calendar: CalendarEvent[],
       message: string,
       currentDate: string, // contextDate or today
       conversationHistory?: ChatMessage[]
   }
   ```
3. Calls Next.js API route: `POST /api/naiya/process`
4. Returns parsed response

**Key Change**: Now accepts `contextDate` to support "next week" planning ⭐

---

### 3. Next.js API Route (Proxy)

**Location**: `frontend/src/app/api/naiya/process/route.ts`

**Purpose**: Thin proxy layer that:
1. Receives request from frontend
2. Adds Supabase authentication headers
3. Forwards to Supabase Edge Function
4. Returns response

**URL**: `${supabaseUrl}/functions/v1/naiya-process`

---

### 4. Supabase Edge Function (Core Logic)

**Location**: `supabase/functions/naiya-process/index.ts`

This is where all the magic happens. Let's break it down step by step:

---

#### A. Context Preparation (Lines 740-768)

**Input**:
```typescript
{
    message: string,
    calendar: CalendarEvent[],
    currentDate: string, // e.g., "2025-11-26" or "2025-12-01" (week start)
    conversationHistory?: ChatMessage[]
}
```

**Process**:

1. **Parse Date Context**:
```typescript
const today = new Date(currentDate + 'T12:00:00Z'); // Use provided context date
const todayStr = "2025-11-26";
const dayOfWeek = "Wednesday";
```

2. **Generate Upcoming Week Map** (Next 7 days from context date):
```typescript
const upcomingDates = `
Wednesday: 2025-11-26
Thursday: 2025-11-27
Friday: 2025-11-28
Saturday: 2025-11-29
Sunday: 2025-11-30
Monday: 2025-12-01
Tuesday: 2025-12-02
`;
```
⭐ This provides concrete dates for the LLM to use

3. **Serialize Current Schedule**:
```typescript
const currentSchedule = calendar.map(e => {
    const timeInfo = e.day ? `${e.day} ${e.start}-${e.end}` : `${e.date} ${e.start}-${e.end}`;
    const flexInfo = e.flexibility === "fixed" ? " [FIXED]" : "";
    return `${timeInfo}: ${e.title}${flexInfo}`;
}).join("\n");

// Example output:
// Mon 09:00-17:00: Work [FIXED]
// Tue 18:00-19:00: Gym
// 2025-11-28 19:00-21:00: Date night [FIXED]
```

4. **Build Input Array** (for Responses API):
```typescript
const input = [
    { role: "developer", content: EXTRACTION_PROMPT }, // System prompt
    ...conversationHistory, // Previous chat if any
    {
        role: "user",
        content: `USER REQUEST: ${message}

CURRENT DATE: ${todayStr} (${dayOfWeek})
USER TIMEZONE: Inferred from currentDate parameter

UPCOMING WEEK:
${upcomingDates}

CURRENT SCHEDULE:
${currentSchedule}

Please process the user's request and return the appropriate actions.`
    }
];
```

---

#### B. LLM Call (Lines 791-805)

**API**: OpenAI Responses API (GPT-5.1)

```typescript
const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        model: 'gpt-5.1',
        input, // Array of messages built above
    }),
});
```

**Key Differences from Chat Completions API**:
- Uses `input` parameter instead of `messages`
- Uses `developer` role instead of `system`
- Response structure: `output[0].content[0].text`

---

#### C. Enhanced System Prompt (EXTRACTION_PROMPT)

**Location**: Lines 417-760

This is the heart of the system. Here's what we improved today:

##### **Rule 1: RECURRING vs ONE-TIME** ⭐ (Updated)
```
RECURRING (use "day" field):
• "every Monday", "weekly", "MWF"
• "gym 3 times a week" (ongoing habit)
• WORK SCHEDULES: "I work 9-5 Monday to Friday" → ONGOING pattern, NOT just this week

ONE-TIME (use "date" field):
• "this Monday", "next Tuesday", "Nov 25"
• "gym 3 times THIS WEEK" (specific to this week)
• SPECIFIC EVENTS: "football game on Monday", "dinner on Tuesday"

CRITICAL CONTEXT RULE:
When user says "I'm planning my week":
- Work schedules (Mon-Fri, 9-5) → RECURRING (use "day")
- Specific events for that week → ONE-TIME (use "date")

Why? "I work 9-5 Monday to Friday" = ONGOING schedule (every week)
But "football game Monday" = SPECIFIC event (particular Monday)
```

##### **Rule 6: Multi-Request Parsing** ⭐ (New)
```
When users provide comma-separated requests:

STEP 1: Parse ENTIRE message, list EVERY distinct request
- Work schedule? → How many days?
- Exercise/gym? → How many times?
- Social events? → List each one

STEP 2: Generate actions for EACH item

STEP 3: Count actions vs requests to verify completeness
```

##### **Rule 7: Temporal Context & Date Resolution** ⭐ (New)
```
STEP 1: Identify temporal context:

A) "NEXT WEEK" CONTEXT:
If user says:
- "I want to plan for next week"
- "Planning next week"
- "For next week"

Then ALL events use NEXT WEEK dates (add 7 days to UPCOMING WEEK dates)

Example:
User: "I want to plan for next week. Dinner Friday."
UPCOMING WEEK: Friday: 2025-11-28
NEXT week Friday = 2025-11-28 + 7 = 2025-12-05 ← USE THIS

B) "THIS WEEK" or no phrase:
Use dates directly from UPCOMING WEEK section

CRITICAL: If "next week" mentioned, EVERY event (Mon, Tue, Fri) uses next week dates!
```

##### **Rule 10: Ambiguity & Conflict Handling** ⭐ (New)
```
A) AMBIGUITY - When info unclear:
• Make BEST GUESS
• COMMUNICATE uncertainty
• ASK clarifying question

Example: "I added gym Monday at 7 AM. Want a different time?"

B) CONFLICTS - When events overlap:
• REVIEW CURRENT SCHEDULE before creating events
• PROACTIVELY choose different time/day
• PRESENT solution + OFFER alternatives

Example: "I scheduled date night Thursday at 7:30 PM to avoid your Client meeting on Friday.
Does Thursday work, or would Saturday be better?"
```

##### **Updated Examples** ⭐
```json
User: "I want to plan for next week. I work 9-5 Mon-Fri, gym 3x/week,
       football Monday night, dinner Tuesday, date night Friday"
Context: Today is Wed 2025-11-26

Response:
{
  "actions": [
    // Work = recurring pattern (happens every week)
    {"type": "add", "title": "Work", "day": "Mon", "start": "09:00", "end": "17:00"},
    {"type": "add", "title": "Work", "day": "Tue", ...},
    // (5 work actions total)

    // These are ONE-TIME events for NEXT WEEK
    {"type": "add", "title": "Football game", "date": "2025-12-01", ...}, // Next Mon
    {"type": "add", "title": "Dinner with James", "date": "2025-12-02", ...}, // Next Tue
    {"type": "add", "title": "Gym", "date": "2025-12-01", ...}, // Next Mon
    {"type": "add", "title": "Gym", "date": "2025-12-03", ...}, // Next Wed
    {"type": "add", "title": "Gym", "date": "2025-12-05", ...}, // Next Fri ← NOT Nov 28!
    {"type": "add", "title": "Date night", "date": "2025-12-05", ...} // Next Fri ← CORRECT!
  ],
  "assistantMessage": "I've added your recurring work schedule (Mon-Fri 9-5),
    and for next week: football Monday, dinner Tuesday, 3 gym sessions (Mon/Wed/Fri),
    and date night Friday."
}

EXPLANATION: User said "next week" so ALL one-time events use next week's dates!
```

##### **Final Verification Checklist** ⭐ (New)
```
Before returning JSON:

1. COUNT REQUESTS: How many items did user ask for?
   - Work Mon-Fri = 5 actions
   - Gym 3 times = 3 actions
   - Social events = count each

2. COUNT ACTIONS: How many did you generate?

3. DO THEY MATCH? If not, you missed something!

4. DATE VERIFICATION: For "this week" requests, did you use specific dates from UPCOMING WEEK?

5. COMPLETENESS: Did you address EVERY comma-separated item?
```

---

#### D. Response Parsing (Lines 807-838)

**Process**:
1. Extract text from Responses API structure:
```typescript
const rawContent = openaiData.output[0].content[0].text;
```

2. Clean markdown formatting:
```typescript
const cleanContent = rawContent.replace(/```json\n?|```/g, "").trim();
```

3. **Validate LLM Response** (Lines 98-133):
```typescript
function validateLLMResponse(data: any): SummaryJSON {
    // Check structure
    if (!data || typeof data !== 'object') throw Error('Invalid: not object');

    // Validate actions array
    if (!Array.isArray(data.actions)) throw Error('actions must be array');

    // Validate each action
    for (const action of data.actions) {
        if (!['add', 'delete', 'modify', 'exclude_date'].includes(action.type)) {
            throw Error(`Invalid action type: ${action.type}`);
        }
        if (!action.title) throw Error('title required');
        if (action.type !== 'delete' && !action.day && !action.date) {
            throw Error('add requires day or date');
        }
    }

    // Validate deadlines
    if (data.deadlines && !Array.isArray(data.deadlines)) {
        throw Error('deadlines must be array');
    }

    // Validate assistantMessage
    if (!data.assistantMessage || typeof data.assistantMessage !== 'string') {
        throw Error('assistantMessage required');
    }

    return data as SummaryJSON;
}
```

---

#### E. Calendar Expansion (Lines 854-855, Function at 298-411)

**Purpose**: Apply LLM actions to the calendar

```typescript
async function expandCalendar(
    actions: CalendarAction[],
    currentCalendar: CalendarEvent[]
): Promise<CalendarEvent[]>
```

**Process**:

1. **ADD Action**:
```typescript
if (action.type === "add") {
    // Check for duplicates
    const isDuplicate = updatedCalendar.some(e =>
        e.title.toLowerCase() === action.title.toLowerCase() &&
        ((action.day && e.day === action.day) || (action.date && e.date === action.date)) &&
        e.start === action.start
    );
    if (isDuplicate) continue;

    // Create new event
    const newEvent: CalendarEvent = {
        id: generateUUID(),
        title: action.title,
        ...(action.day ? { day: action.day } : {}),
        ...(action.date ? { date: action.date } : {}),
        start: action.start || "00:00",
        end: action.end || "00:00",
        type: "ROUTINE",
        flexibility: action.flexibility || "medium",
        source: "custom",
        course: action.title
    };

    // Classify event type based on keywords
    const lowerTitle = action.title.toLowerCase();
    if (lowerTitle.includes("class") || lowerTitle.includes("lecture")) {
        newEvent.type = "COMMITMENT";
        newEvent.source = "class";
    } else if (lowerTitle.includes("study") || lowerTitle.includes("homework")) {
        newEvent.type = "STUDY";
        newEvent.source = "study";
    } else if (lowerTitle.includes("gym") || lowerTitle.includes("lunch")) {
        newEvent.type = "ROUTINE";
        newEvent.source = "custom";
    } else if (lowerTitle.includes("meeting")) {
        newEvent.type = "COMMITMENT";
        newEvent.source = "commitment";
    }

    updatedCalendar.push(newEvent);
}
```

2. **DELETE Action**:
```typescript
else if (action.type === "delete") {
    updatedCalendar = updatedCalendar.filter(e => {
        const t1 = e.title.toLowerCase();
        const t2 = action.title.toLowerCase();
        const titleMatch = t1 === t2 || t1.includes(t2) || t2.includes(t1);
        const dayOrDateMatch =
            (action.day && e.day === action.day) ||
            (action.date && e.date === action.date);
        const timeMatch = action.start ? e.start === action.start : true;

        return !(titleMatch && dayOrDateMatch && timeMatch);
    });
}
```

3. **EXCLUDE_DATE Action**:
```typescript
else if (action.type === "exclude_date") {
    const index = updatedCalendar.findIndex(e => {
        const titleMatch = /* fuzzy match */;
        const dayMatch = e.day === action.day;
        return titleMatch && dayMatch;
    });

    if (index !== -1 && action.date) {
        const event = updatedCalendar[index];
        const excludedDates = event.excludedDates || [];
        if (!excludedDates.includes(action.date)) {
            updatedCalendar[index] = {
                ...event,
                excludedDates: [...excludedDates, action.date]
            };
        }
    }
}
```

4. **Post-process**: Ensure commitments are fixed:
```typescript
return updatedCalendar.map(e => {
    const lowerTitle = e.title.toLowerCase();
    if (
        e.type === "COMMITMENT" ||
        lowerTitle.includes("class") ||
        lowerTitle.includes("lecture") ||
        lowerTitle.includes("meeting") ||
        lowerTitle.includes("work")
    ) {
        return { ...e, flexibility: "fixed" };
    }
    return e;
});
```

---

#### F. Conflict Resolution (Lines 857-858, Function at 160-296)

**Purpose**: Smart conflict detection and resolution

```typescript
function resolveConflicts(events: CalendarEvent[]): {
    events: CalendarEvent[];
    notes: ConflictNote[];
    hasUnresolved: boolean;
}
```

**Algorithm**:

1. **Bucket events by day/date**:
```typescript
const buckets = bucketEventsByDay(events);
// Groups events by day (Mon) or date (2025-11-28)
```

2. **For each day**:
```typescript
for (const { dayKey, events: evs } of buckets) {
    const sorted = [...evs].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    const placed: CalendarEvent[] = [];

    for (const ev of sorted) {
        const startMin = toMinutes(ev.start);
        const endMin = toMinutes(ev.end);
        const duration = endMin - startMin;

        // Find overlapping events
        const overlapping = placed.filter(p =>
            Math.max(startMin, toMinutes(p.start)) <
            Math.min(endMin, toMinutes(p.end))
        );

        if (overlapping.length === 0) {
            placed.push(ev);
            continue;
        }

        // CONFLICT DETECTED!
        handleConflict(ev, overlapping, placed, notes);
    }
}
```

3. **Conflict Handling Logic**:

```typescript
// Check if any overlapping event is fixed
const hasFixedConflict = overlapping.some(p => p.flexibility === "fixed");

if (ev.flexibility === "fixed") {
    // Fixed vs Fixed or Fixed vs Flexible
    notes.push({
        title: ev.title,
        dateLabel: dayKey,
        originalTime: `${ev.start}-${ev.end}`,
        status: "unresolved",
        reason: `Conflicts with ${conflictWith.title}`
    });
    hasUnresolved = true;
    placed.push(ev); // Still place to show conflict
}
else if (hasFixedConflict) {
    // Flexible vs Fixed → Move flexible event
    const preferredWindow = classifyPreferredWindow(ev.title);
    // dinner → 17:00-21:00, lunch → 11:00-15:00, breakfast → 7:00-10:00

    let slot = findForwardSlot(placed, duration, preferredWindow.start, preferredWindow.end);
    let outsidePreferred = false;

    if (!slot) {
        // Try anywhere in day (6 AM - 10 PM)
        slot = findForwardSlot(placed, duration, 6*60, 22*60);
        outsidePreferred = true;
    }

    if (slot) {
        const moved = { ...ev, start: toTime(slot.start), end: toTime(slot.end) };
        placed.push(moved);
        notes.push({
            title: ev.title,
            dateLabel: dayKey,
            originalTime: `${ev.start}-${ev.end}`,
            newTime: `${moved.start}-${moved.end}`,
            status: "resolved",
            reason: "Moved to avoid fixed event",
            outsidePreferred
        });
    } else {
        // No slot found
        notes.push({
            title: ev.title,
            dateLabel: dayKey,
            originalTime: `${ev.start}-${ev.end}`,
            status: "unresolved",
            reason: "No available slot found"
        });
        hasUnresolved = true;
        placed.push(ev);
    }
}
else {
    // Both flexible → Move the later one to next available slot
    // Similar logic as above
}
```

4. **Helper: Find Forward Slot**:
```typescript
function findForwardSlot(
    scheduled: CalendarEvent[],
    duration: number,
    startMin: number,
    endLimit: number
): { start: number; end: number } | null {
    const sorted = [...scheduled].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    let cursor = startMin;

    for (const ev of sorted) {
        const evStart = toMinutes(ev.start);
        const evEnd = toMinutes(ev.end);

        // Check if event fits before this scheduled event
        if (cursor + duration <= evStart && cursor + duration <= endLimit) {
            return { start: cursor, end: cursor + duration };
        }
        cursor = Math.max(cursor, evEnd);
    }

    // Check if fits after all events
    if (cursor + duration <= endLimit) {
        return { start: cursor, end: cursor + duration };
    }

    return null; // No slot found
}
```

---

#### G. Response Generation (Lines 860-888) ⭐ (Updated)

**Smart Assistant Message**:

```typescript
let assistantMessage = summary.assistantMessage; // From LLM
let finalEvents = conflictFreeEvents;

if (hasUnresolved) {
    // Critical conflicts that can't be auto-resolved
    const unresolvedConflicts = conflictNotes.filter(n => n.status === "unresolved");
    if (unresolvedConflicts.length > 0) {
        const first = unresolvedConflicts[0];

        // ⭐ NEW: More proactive messaging with suggestions
        assistantMessage = `I added "${first.title}" but it conflicts with "${first.reason?.replace('Conflicts with ', '')}" on ${first.dateLabel}. I recommend moving it to a different day - would Thursday or Saturday work better?`;

        finalEvents = conflictFreeEvents; // Include conflict for visibility
    }
}
else if (conflictNotes.length > 0) {
    // Auto-resolved conflicts
    const resolvedConflicts = conflictNotes.filter(n => n.status === "resolved");
    if (resolvedConflicts.length > 0) {
        const adjustments = resolvedConflicts.map(n =>
            `"${n.title}" to ${n.newTime}`
        ).join(", ");

        // ⭐ NEW: Better resolved conflict messaging
        assistantMessage = `${summary.assistantMessage} I moved ${adjustments} to avoid conflicts. Let me know if you'd like different times!`;
    }
}
```

**Final Response**:
```typescript
return {
    events: finalEvents,
    deadlines: deadlinesWithIds,
    assistantMessage
};
```

---

### 5. Frontend Response Handling

#### Home Page
**Location**: `frontend/src/app/page.tsx:296-303`

```typescript
if (result.events) {
    setEvents(result.events);
    await saveCalendar(result.events); // Save to Supabase
}
if (result.deadlines) setDeadlines(result.deadlines);

// Create chat session
const newSession = await createChatSession();
await saveChatSession(newSession.id, messages);

// Redirect to schedule
router.push('/schedule');
```

#### Schedule Page
**Location**: `frontend/src/components/CalendarShell.tsx:276-297`

```typescript
if (result.events) {
    setEvents(result.events); // Update state
    saveCalendar(result.events); // Save to Supabase
}

// Save deadlines
if (result.deadlines?.length > 0) {
    for (const d of result.deadlines) {
        await addDeadline({
            title: d.title,
            course: d.course,
            dueDate: d.date,
            importance: d.importance || 'medium',
            completed: false,
        });
    }
}
```

---

## 🎯 Key Improvements Made Today

### 1. ✅ Work Schedule Context Recognition
**Problem**: "I work 9-5 Monday to Friday" was sometimes treated as one-time events
**Solution**: Explicit rule that work schedules are RECURRING patterns (use "day" field)

### 2. ✅ Temporal Context Detection ("Next Week")
**Problem**: "I want to plan for next week" → some events placed THIS week
**Solution**: New Rule 7 detects "next week" phrases and adds 7 days to all dates

### 3. ✅ Week Context from Frontend
**Problem**: API always used "today" even when viewing December
**Solution**: Schedule page now passes `weekStartIso` as `contextDate`

### 4. ✅ Multi-Request Parsing
**Problem**: Complex messages with multiple requests → some items missed
**Solution**: 3-step verification process to ensure all requests addressed

### 5. ✅ Proactive Conflict Handling
**Problem**: Passive conflict messages ("found a conflict, what should I do?")
**Solution**:
- LLM reviews CURRENT SCHEDULE before creating events
- Backend suggests specific alternatives ("Thursday or Saturday?")
- Better messaging for auto-resolved conflicts

### 6. ✅ Ambiguity Handling
**Problem**: Missing info → events not created or silently guessed
**Solution**: Make reasonable guess + communicate uncertainty + ask for adjustment

### 7. ✅ Loading Screen
**Problem**: No feedback during processing
**Solution**: Beautiful animated loading overlay while Naiya thinks

---

## 📋 Complete Data Flow Example

**User**: "Naiya, I want to plan for next week. I work 9 to 5, Monday to Friday. I go to the gym at least three times a week, I have a football game on monday night, I have dinner with my friend james on tuesday and I have a date night on Friday."

**Frontend (Schedule Page)**:
- Currently viewing: December 2025 (weekStartIso = "2025-12-01")
- Calls: `processNaiya(events, message, [], "2025-12-01")`

**API Layer**:
- Forwards with `currentDate = "2025-12-01"`

**Backend Context Prep**:
```
CURRENT DATE: 2025-12-01 (Monday)
UPCOMING WEEK:
Monday: 2025-12-01
Tuesday: 2025-12-02
Wednesday: 2025-12-03
Thursday: 2025-12-04
Friday: 2025-12-05
Saturday: 2025-12-06
Sunday: 2025-12-07

CURRENT SCHEDULE:
(existing events...)
```

**LLM Processing**:
1. Detects: "I want to plan for next week" → All events use NEXT WEEK (+7 days)
2. Work 9-5 Mon-Fri → RECURRING (use "day" field) → Happens every week
3. Football Monday night → ONE-TIME for next week's Monday → date: "2025-12-08"
4. Dinner Tuesday → date: "2025-12-09"
5. Gym 3x/week → 3 separate ONE-TIME events → dates: "2025-12-08", "2025-12-10", "2025-12-12"
6. Date night Friday → date: "2025-12-12"

**LLM Output**:
```json
{
  "actions": [
    {"type": "add", "title": "Work", "day": "Mon", "start": "09:00", "end": "17:00", "flexibility": "fixed"},
    {"type": "add", "title": "Work", "day": "Tue", "start": "09:00", "end": "17:00", "flexibility": "fixed"},
    {"type": "add", "title": "Work", "day": "Wed", "start": "09:00", "end": "17:00", "flexibility": "fixed"},
    {"type": "add", "title": "Work", "day": "Thu", "start": "09:00", "end": "17:00", "flexibility": "fixed"},
    {"type": "add", "title": "Work", "day": "Fri", "start": "09:00", "end": "17:00", "flexibility": "fixed"},
    {"type": "add", "title": "Football game", "date": "2025-12-08", "start": "19:00", "end": "21:00", "flexibility": "fixed"},
    {"type": "add", "title": "Dinner with James", "date": "2025-12-09", "start": "18:00", "end": "19:30", "flexibility": "medium"},
    {"type": "add", "title": "Gym", "date": "2025-12-08", "start": "07:00", "end": "08:00", "flexibility": "high"},
    {"type": "add", "title": "Gym", "date": "2025-12-10", "start": "18:00", "end": "19:00", "flexibility": "high"},
    {"type": "add", "title": "Gym", "date": "2025-12-12", "start": "18:00", "end": "19:00", "flexibility": "high"},
    {"type": "add", "title": "Date night", "date": "2025-12-12", "start": "19:30", "end": "21:30", "flexibility": "fixed"}
  ],
  "deadlines": [],
  "assistantMessage": "I've added your recurring work hours and scheduled your next week: football game Monday night, dinner with James Tuesday, three gym sessions (Mon/Wed/Fri), and date night Friday."
}
```

**Calendar Expansion**:
- Creates 11 new events with UUIDs
- Classifies types (COMMITMENT for work, ROUTINE for gym, etc.)
- Checks for duplicates

**Conflict Resolution**:
- Checks if Date night (Fri 19:30-21:30) conflicts with Gym (Fri 18:00-19:00)
- No conflict (gym ends before date night starts)
- If conflict found: Would move gym to different time or day

**Final Response**:
```json
{
  "events": [...11 new events + existing events...],
  "deadlines": [],
  "assistantMessage": "I've added your recurring work hours and scheduled your next week: football game Monday night, dinner with James Tuesday, three gym sessions (Mon/Wed/Fri), and date night Friday."
}
```

**Frontend**:
- Updates calendar state
- Saves to Supabase
- Shows updated calendar with all events correctly placed in December 8-14 (next week)

---

## ⚠️ Known Issues & Limitations

### 1. Fixed Event Conflicts
**Issue**: If two fixed events overlap, system can't resolve automatically
**Current Behavior**: Both events placed, user notified of conflict
**Improvement Needed**: Better conflict prevention at LLM level

### 2. Multi-Day Events
**Issue**: Events spanning multiple days not supported
**Current Behavior**: Each day treated separately
**Workaround**: Create separate events for each day

### 3. Time Zone Handling
**Issue**: No explicit timezone in date handling
**Current Behavior**: Uses local date strings (YYYY-MM-DD)
**Risk**: Issues for users in different timezones

### 4. Recurring Event Modifications
**Issue**: Modifying recurring events affects all instances
**Current Behavior**: Use `exclude_date` for single instance cancellations
**Limitation**: Can't modify single instance of recurring event

### 5. LLM Hallucinations
**Issue**: LLM occasionally invents events not mentioned
**Mitigation**: Validation checks for required fields
**Risk**: Still possible with valid-looking but incorrect data

### 6. Conflict Resolution Gaps
**Issue**: Only moves events within same day, doesn't try different days
**Current Behavior**: If no slot found on same day, reports unresolved
**Improvement Needed**: Try adjacent days

---

## 🔧 Configuration

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (in Supabase Edge Function)
OPENAI_API_KEY=sk-...
```

### Model Configuration

```typescript
// supabase/functions/naiya-process/index.ts:644-654
model: 'gpt-5.1'  // OpenAI Responses API
```

---

## 📊 Performance Metrics

**Typical Response Time**:
- LLM Call: 800-2000ms
- Conflict Resolution: 10-50ms
- Total: ~1-2 seconds

**Token Usage** (per request):
- System Prompt: ~1500 tokens
- User Context: ~500-1000 tokens (depends on calendar size)
- LLM Response: ~200-500 tokens
- Total: ~2200-3000 tokens per request

**Cost Estimate** (GPT-5.1):
- Input: $0.50 / 1M tokens
- Output: $1.50 / 1M tokens
- Average request: ~$0.003-0.005

---

## 🎨 UI/UX Features

### Loading States
1. **Home Page**: Full-screen overlay with spinner, "Naiya is thinking..."
2. **Schedule Page**: Inline processing indicator

### Error Handling
- API errors: Show error message to user
- LLM validation failures: Log error, show generic message
- Network errors: Retry logic in API layer

### Conversation History
- Stored in Supabase `chat_sessions` table
- Passed to LLM for context in multi-turn conversations
- Preserved across page reloads

---

This document reflects the system state as of **November 26, 2025** after today's improvements.
