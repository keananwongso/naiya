import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =======================
// TYPE DEFINITIONS
// =======================

interface CalendarEvent {
    id: string;
    title: string;
    day?: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
    date?: string; // YYYY-MM-DD
    start: string;
    end: string;
    type: string;
    flexibility: "fixed" | "strong" | "medium" | "low" | "high";
    source?: string;
    course?: string;
    excludedDates?: string[];
}

interface CalendarAction {
    type: "add" | "delete" | "modify" | "exclude_date";
    title: string;
    day?: string;
    date?: string;
    start?: string;
    end?: string;
    flexibility?: string;
}

interface SummaryJSON {
    actions: CalendarAction[];
    deadlines?: Array<{
        title: string;
        date: string;
        importance?: string;
    }>;
    assistantMessage: string;
}

interface ConflictNote {
    title: string;
    dateLabel: string;
    originalTime: string;
    newTime?: string;
    status: "resolved" | "unresolved";
    reason?: string;
    outsidePreferred?: boolean;
}

// =======================
// HELPER FUNCTIONS
// =======================

function generateUUID(): string {
    return crypto.randomUUID();
}

const toMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + (m || 0);
};

const toTime = (minutes: number) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, "0");
    const m = (minutes % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
};

const weekdayOrder: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function bucketEventsByDay(events: CalendarEvent[]) {
    const groups: Record<string, CalendarEvent[]> = {};
    events.forEach((ev) => {
        const key = ev.date || ev.day || "unspecified";
        groups[key] = groups[key] || [];
        groups[key].push(ev);
    });
    return Object.entries(groups).map(([dayKey, evs]) => ({ dayKey, events: evs }));
}

function classifyPreferredWindow(title: string) {
    const t = title.toLowerCase();
    if (t.includes("breakfast")) return { start: 7 * 60, end: 10 * 60 };
    if (t.includes("lunch") || t.includes("brunch")) return { start: 11 * 60, end: 15 * 60 };
    if (t.includes("dinner")) return { start: 17 * 60, end: 21 * 60 };
    if (t.includes("meeting") || t.includes("call")) return { start: 8 * 60, end: 20 * 60 };
    return null;
}

function validateLLMResponse(data: any): SummaryJSON {
    // Validate structure
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid response: not an object');
    }

    // Validate actions
    if (!Array.isArray(data.actions)) {
        throw new Error('Invalid response: actions must be an array');
    }

    for (const action of data.actions) {
        if (!action.type || !['add', 'delete', 'modify', 'exclude_date'].includes(action.type)) {
            throw new Error(`Invalid action type: ${action.type}`);
        }
        if (!action.title || typeof action.title !== 'string') {
            throw new Error('Invalid action: title is required');
        }
        // Validate day/date present
        if (action.type !== 'delete' && !action.day && !action.date) {
            throw new Error(`Invalid action: ${action.type} requires either day or date`);
        }
    }

    // Validate deadlines if present
    if (data.deadlines && !Array.isArray(data.deadlines)) {
        throw new Error('Invalid response: deadlines must be an array');
    }

    // Validate assistantMessage
    if (!data.assistantMessage || typeof data.assistantMessage !== 'string') {
        throw new Error('Invalid response: assistantMessage is required');
    }

    return data as SummaryJSON;
}

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
        if (cursor + duration <= evStart && cursor + duration <= endLimit) {
            return { start: cursor, end: cursor + duration };
        }
        cursor = Math.max(cursor, evEnd);
    }

    if (cursor + duration <= endLimit) {
        return { start: cursor, end: cursor + duration };
    }

    return null;
}

function resolveConflicts(events: CalendarEvent[]): { events: CalendarEvent[]; notes: ConflictNote[]; hasUnresolved: boolean } {
    const DAY_START = 6 * 60;
    const DAY_END = 22 * 60;
    const notes: ConflictNote[] = [];
    const result: CalendarEvent[] = [];
    let hasUnresolved = false;

    const buckets = bucketEventsByDay(events);

    for (const { dayKey, events: evs } of buckets) {
        const sorted = [...evs].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
        const placed: CalendarEvent[] = [];

        for (const ev of sorted) {
            const startMin = toMinutes(ev.start);
            const endMin = toMinutes(ev.end);
            const duration = Math.max(endMin - startMin, 15);

            // Find all overlapping events
            const overlapping = placed.filter(
                (p) => Math.max(startMin, toMinutes(p.start)) < Math.min(endMin, toMinutes(p.end))
            );

            if (overlapping.length === 0) {
                placed.push(ev);
                continue;
            }

            // Check if any overlapping event is fixed
            const hasFixedConflict = overlapping.some(p => p.flexibility === "fixed");

            if (ev.flexibility === "fixed") {
                // Fixed event conflicts with something
                const conflictWith = overlapping[0];
                notes.push({
                    title: ev.title,
                    dateLabel: dayKey,
                    originalTime: `${ev.start}-${ev.end}`,
                    status: "unresolved",
                    reason: `Conflicts with ${conflictWith.flexibility === "fixed" ? "fixed event" : ""} "${conflictWith.title}"`,
                });
                hasUnresolved = true;
                // Still place it - user needs to see the conflict
                placed.push(ev);
                continue;
            }

            if (hasFixedConflict) {
                // Flexible event conflicts with fixed event - try to move it
                const preferredWindow = classifyPreferredWindow(ev.title);
                const searchStart = preferredWindow?.start ?? DAY_START;
                const prefEnd = preferredWindow?.end ?? DAY_END;

                let slot = findForwardSlot(placed, duration, Math.max(searchStart, DAY_START), prefEnd);
                let outsidePreferred = false;

                if (!slot) {
                    slot = findForwardSlot(placed, duration, DAY_START, DAY_END);
                    outsidePreferred = true;
                }

                if (slot) {
                    const moved: CalendarEvent = {
                        ...ev,
                        start: toTime(slot.start),
                        end: toTime(slot.end),
                    };
                    placed.push(moved);
                    notes.push({
                        title: ev.title,
                        dateLabel: dayKey,
                        originalTime: `${ev.start}-${ev.end}`,
                        newTime: `${moved.start}-${moved.end}`,
                        status: "resolved",
                        reason: "Moved to avoid fixed event",
                        outsidePreferred,
                    });
                } else {
                    notes.push({
                        title: ev.title,
                        dateLabel: dayKey,
                        originalTime: `${ev.start}-${ev.end}`,
                        status: "unresolved",
                        reason: "No available slot found",
                    });
                    hasUnresolved = true;
                    placed.push(ev);
                }
            } else {
                // Both flexible - move the later one
                const preferredWindow = classifyPreferredWindow(ev.title);
                const searchStart = Math.max(endMin, preferredWindow?.start ?? DAY_START, DAY_START);
                const prefEnd = preferredWindow?.end ?? DAY_END;

                let slot = findForwardSlot(placed, duration, searchStart, prefEnd);
                let outsidePreferred = false;

                if (!slot) {
                    slot = findForwardSlot(placed, duration, DAY_START, DAY_END);
                    outsidePreferred = true;
                }

                if (slot) {
                    const moved: CalendarEvent = {
                        ...ev,
                        start: toTime(slot.start),
                        end: toTime(slot.end),
                    };
                    placed.push(moved);
                    notes.push({
                        title: ev.title,
                        dateLabel: dayKey,
                        originalTime: `${ev.start}-${ev.end}`,
                        newTime: `${moved.start}-${moved.end}`,
                        status: "resolved",
                        reason: "Moved to next available slot",
                        outsidePreferred,
                    });
                } else {
                    notes.push({
                        title: ev.title,
                        dateLabel: dayKey,
                        originalTime: `${ev.start}-${ev.end}`,
                        status: "unresolved",
                        reason: "No available slot found",
                    });
                    hasUnresolved = true;
                    placed.push(ev);
                }
            }
        }

        result.push(...placed);
    }

    return { events: result, notes, hasUnresolved };
}

async function expandCalendar(actions: CalendarAction[], currentCalendar: CalendarEvent[]): Promise<CalendarEvent[]> {
    let updatedCalendar = [...currentCalendar];

    for (const action of actions) {
        if (action.type === "add") {
            const isDuplicate = updatedCalendar.some(e =>
                e.title.toLowerCase() === action.title.toLowerCase() &&
                ((action.day && e.day === action.day) || (action.date && e.date === action.date)) &&
                e.start === (action.start || "00:00") &&
                e.end === (action.end || "00:00")
            );

            if (isDuplicate) continue;

            const newEvent: CalendarEvent = {
                id: generateUUID(),
                title: action.title,
                ...(action.day ? { day: action.day as any } : {}),
                ...(action.date ? { date: action.date } : {}),
                start: action.start || "00:00",
                end: action.end || "00:00",
                type: "ROUTINE",
                flexibility: (action.flexibility as any) || "medium",
                source: "custom",
                course: action.title
            };

            const lowerTitle = action.title.toLowerCase();
            if (lowerTitle.includes("class") || lowerTitle.includes("lecture") || /^[a-z]{3,4}\s?\d{3}/.test(lowerTitle)) {
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
            } else if (lowerTitle.includes("work") || lowerTitle.includes("shift")) {
                newEvent.type = "COMMITMENT";
                newEvent.source = "work";
            }

            updatedCalendar.push(newEvent);

        } else if (action.type === "delete") {
            updatedCalendar = updatedCalendar.filter(e => {
                const t1 = e.title.toLowerCase();
                const t2 = action.title.toLowerCase();
                const titleMatch = t1 === t2 || t1.includes(t2) || t2.includes(t1);
                const dayOrDateMatch = (action.day && e.day === action.day) || (action.date && e.date === action.date);
                // Relaxed time match: if action has no start, ignore time. If it has start, require match.
                const timeMatch = action.start ? e.start === action.start : true;
                return !(titleMatch && dayOrDateMatch && timeMatch);
            });

        } else if (action.type === "modify") {
            // Fallback for modify: find and update
            const index = updatedCalendar.findIndex(e => {
                const t1 = e.title.toLowerCase();
                const t2 = action.title.toLowerCase();
                const titleMatch = t1 === t2 || t1.includes(t2) || t2.includes(t1);
                const dayOrDateMatch = (action.day && e.day === action.day) || (action.date && e.date === action.date);
                return titleMatch && dayOrDateMatch;
            });

            if (index !== -1) {
                updatedCalendar[index] = {
                    ...updatedCalendar[index],
                    ...(action.start ? { start: action.start } : {}),
                    ...(action.end ? { end: action.end } : {}),
                    ...(action.flexibility ? { flexibility: action.flexibility as any } : {}),
                };
            }

        } else if (action.type === "exclude_date") {
            const index = updatedCalendar.findIndex(e => {
                const t1 = e.title.toLowerCase();
                const t2 = action.title.toLowerCase();
                const titleMatch = t1 === t2 || t1.includes(t2) || t2.includes(t1);
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
    }

    // Post-process to ensure commitments are fixed
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
}

// =======================
// LLM EXTRACTION PROMPT
// =======================

const EXTRACTION_PROMPT = `You are Naiya, an AI assistant that helps organize weekly schedules.

Your job is to process the user's natural-language message and determine what calendar changes they want.

You MUST return ONLY a JSON object with this exact structure:

{
  "actions": [
    {
      "type": "add|delete|exclude_date",
      "title": "string",
      "day": "Mon|Tue|Wed|Thu|Fri|Sat|Sun",  // For RECURRING events only
      "date": "YYYY-MM-DD",  // For ONE-TIME events only
      "start": "HH:MM",
      "end": "HH:MM",
      "flexibility": "fixed|medium|high"
    }
  ],
  "deadlines": [
    {
      "title": "string",
      "date": "YYYY-MM-DD",
      "importance": "low|medium|high"
    }
  ],
  "assistantMessage": "string"
}

=========================
CRITICAL RULES
=========================
1. RECURRING vs ONE-TIME:
   • RECURRING (use "day"): "every Monday", "weekly", "Mondays and Wednesdays", "MWF"
   • ONE-TIME (use "date"): "this Monday", "next Tuesday", "Nov 25", "tomorrow", "Friday" (when referring to upcoming specific date)

2. ACTIONS:
   • "add": Create new event. Infer reasonable times if not specified (e.g., lunch=12:00-13:00, dinner=18:00-19:30).
   • "delete": Remove event. Match by title and day/date. Time is optional for matching.
   • "modify": DO NOT USE. To modify an event, generate a "delete" action for the old event and an "add" action for the new version.
   • "exclude_date": Cancel ONE instance of a recurring event. Requires both "day" and "date".

3. FLEXIBILITY:
   • "fixed": Cannot be moved (classes, appointments, commitments)
   • "medium": Can be moved if needed (meals, personal tasks)
   • "high": Very flexible (study time, exercise)

4. ASSISTANT MESSAGE:
   • Keep it brief (1-2 sentences), friendly, natural.
   • Don't mention technical details like "actions" or "flexibility".

5. IMPORTANT CONTEXT:
   • You will receive the user's current schedule in the context.
   • You will receive conversation history if this is part of an ongoing chat.
   • Use the provided date context to resolve relative dates accurately.

6. FREQUENCY & REPETITION (CRITICAL):
   • If the user says "X times a week" (e.g., "gym 3 times"), you MUST generate EXACTLY X separate "add" actions.
   • Do NOT generate fewer events than requested.
   • Distribute them logically throughout the week (e.g., Mon, Wed, Fri) unless specific days are requested.
   • If the user says "every day", generate 7 actions (one for each day).

7. LIFE-BALANCE & WEEKLY PLANNING:
   • When users describe their whole week, carefully listen to their specific needs and requests.
   • ALWAYS prioritize the user's explicit requests over general guidelines.

   • Work schedules:
     – Treat as fixed commitments (flexibility "fixed").
     – If user says "work 9–5", create events from 09:00–17:00.

   • Deadlines:
     – Add the deadline to the deadlines array.
     – Schedule preparatory work blocks earlier in the week to ensure completion.
     – Balance intensity to avoid burnout.

   • Gym / exercise:
     – Pay close attention to the EXACT number the user requests (e.g., "3 times" means 3 sessions, not 2).
     – Typical duration: 45–90 minutes.
     – Place outside work hours, commonly morning or evening.

   • Social time / date nights:
     – Honor the user's relationships and social needs.
     – Schedule as medium/fixed flexibility depending on context.
     – Keep evenings free when requested.

   • Sleep / rest:
     – Respect work-life boundaries.
     – Avoid heavy scheduling after 22:00 unless user specifically requests it.
     – Ensure some evenings are light or free.

=========================
EXAMPLES (GUIDELINES ONLY)
=========================
These examples show the JSON structure. DO NOT copy the content. Your output must match the USER'S request, not these examples.

User: "I have dinner with Sarah on Friday"
Context: Today is Tuesday Nov 25, upcoming Friday is Nov 28
Response:
{
  "actions": [{"type": "add", "title": "Dinner with Sarah", "date": "2025-11-28", "start": "18:00", "end": "19:30", "flexibility": "medium"}],
  "deadlines": [],
  "assistantMessage": "I've added dinner with Sarah on Friday evening."
}

User: "Move my gym session to Wednesday"
Context: User has "Gym Session" on Mon at 12:30-13:30
Response:
{
  "actions": [
    {"type": "delete", "title": "Gym Session", "day": "Mon"},
    {"type": "add", "title": "Gym Session", "day": "Wed", "start": "12:30", "end": "13:30", "flexibility": "medium"}
  ],
  "deadlines": [],
  "assistantMessage": "I've moved your gym session to Wednesday."
}

User: "Cancel my family dinner next Tuesday, I have a meeting"
Context: User has recurring "Family Dinner" on Tue at 19:00, next Tuesday is Nov 27
Response:
{
  "actions": [
    {"type": "exclude_date", "title": "Family Dinner", "day": "Tue", "date": "2025-11-27"},
    {"type": "add", "title": "Meeting", "date": "2025-11-27", "start": "19:00", "end": "20:00", "flexibility": "fixed"}
  ],
  "deadlines": [],
  "assistantMessage": "I've canceled your family dinner for next Tuesday and added the meeting."
}

User: "Naiya, here's what I have in mind right now. work 9–5 monday to friday, proposals due Friday, supplier meeting Wednesday lunch, gym at least 3 times, and a date night with my partner."
Context: Today is Monday 2025-11-24, upcoming Friday is 2025-11-28
Response:
{
  "actions": [
    {"type": "add", "title": "Work", "day": "Mon", "start": "09:00", "end": "17:00", "flexibility": "fixed"},
    {"type": "add", "title": "Work", "day": "Tue", "start": "09:00", "end": "17:00", "flexibility": "fixed"},
    {"type": "add", "title": "Work", "day": "Wed", "start": "09:00", "end": "17:00", "flexibility": "fixed"},
    {"type": "add", "title": "Work", "day": "Thu", "start": "09:00", "end": "17:00", "flexibility": "fixed"},
    {"type": "add", "title": "Work", "day": "Fri", "start": "09:00", "end": "17:00", "flexibility": "fixed"},
    {"type": "add", "title": "Supplier meeting", "day": "Wed", "start": "12:00", "end": "13:00", "flexibility": "fixed"},
    {"type": "add", "title": "Proposal work", "day": "Mon", "start": "18:00", "end": "20:00", "flexibility": "high"},
    {"type": "add", "title": "Proposal work", "day": "Tue", "start": "18:00", "end": "20:00", "flexibility": "high"},
    {"type": "add", "title": "Proposal work", "day": "Thu", "start": "18:00", "end": "19:30", "flexibility": "high"},
    {"type": "add", "title": "Gym", "day": "Mon", "start": "07:00", "end": "08:00", "flexibility": "high"},
    {"type": "add", "title": "Gym", "day": "Wed", "start": "18:00", "end": "19:00", "flexibility": "high"},
    {"type": "add", "title": "Gym", "day": "Fri", "start": "18:00", "end": "19:00", "flexibility": "high"},
    {"type": "add", "title": "Date night", "day": "Fri", "start": "19:30", "end": "21:30", "flexibility": "fixed"}
  ],
  "deadlines": [
    {"title": "Proposals due", "date": "2025-11-28", "importance": "high"}
  ],
  "assistantMessage": "I've scheduled your work hours, the supplier meeting, three gym sessions throughout the week, proposal work blocks before Friday, and a date night on Friday evening."
}

Return ONLY the JSON object. No markdown. No explanations.`;

// =======================
// MAIN HANDLER
// =======================

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { message, calendar, currentDate, conversationHistory } = await req.json()

        if (!message || typeof message !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Message is required and must be a string' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openaiApiKey) {
            throw new Error('OPENAI_API_KEY not configured')
        }

        // Get current date for context with proper timezone handling
        const today = currentDate ? new Date(currentDate + 'T12:00:00Z') : new Date();
        const todayStr = today.toISOString().split('T')[0];
        const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][today.getDay()];

        // Generate next 7 days mapping for context
        const upcomingDates = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
            return `${dayName}: ${d.toISOString().split('T')[0]}`;
        }).join("\n");

        // Build current schedule summary with better formatting
        const currentSchedule = (calendar || []).map((e: any) => {
            const timeInfo = e.day ? `${e.day} ${e.start}-${e.end}` : `${e.date} ${e.start}-${e.end}`;
            const flexInfo = e.flexibility === "fixed" ? " [FIXED]" : "";
            return `${timeInfo}: ${e.title}${flexInfo}`;
        }).join("\n") || "No events scheduled";

        // Build input array for Responses API (uses "developer" role instead of "system")
        const input: any[] = [
            { role: "developer", content: EXTRACTION_PROMPT }
        ];

        // Add conversation history if available (preserves multi-turn context)
        if (conversationHistory && conversationHistory.length > 0) {
            input.push(...conversationHistory);
        }

        // Create comprehensive context message
        const contextMessage = `USER REQUEST: ${message}

CURRENT DATE: ${todayStr} (${dayOfWeek})
USER TIMEZONE: Inferred from currentDate parameter

UPCOMING WEEK:
${upcomingDates}

CURRENT SCHEDULE:
${currentSchedule}

Please process the user's request and return the appropriate actions.`;

        input.push({
            role: "user",
            content: contextMessage
        });

        // Call OpenAI Responses API (GPT-5.1) - uses "input" parameter, not "messages"
        const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-5.1',
                input,
            }),
        })

        if (!openaiResponse.ok) {
            const error = await openaiResponse.text()
            throw new Error(`OpenAI API error: ${error}`)
        }

        const openaiData = await openaiResponse.json()

        // Extract text from Responses API output structure:
        // output[0].content[0].text
        let rawContent = "";
        if (Array.isArray(openaiData.output) && openaiData.output.length > 0) {
            const message = openaiData.output[0];
            if (message.content && Array.isArray(message.content) && message.content.length > 0) {
                const contentItem = message.content[0];
                if (contentItem.text) {
                    rawContent = contentItem.text;
                }
            }
        }

        if (!rawContent) {
            console.error("Failed to extract text from OpenAI response:", JSON.stringify(openaiData));
            throw new Error("No text content found in OpenAI response");
        }

        const cleanContent = rawContent.replace(/```json\n?|```/g, "").trim();

        // Parse and validate LLM response
        let summary: SummaryJSON;
        try {
            const parsed = JSON.parse(cleanContent);
            summary = validateLLMResponse(parsed);
        } catch (validationError: any) {
            console.error('LLM response validation failed:', validationError.message);
            console.error('Raw response:', cleanContent);
            throw new Error(`Invalid LLM response: ${validationError.message}`);
        }

        const hasActions = summary.actions && summary.actions.length > 0;

        // If no actions, return current calendar untouched
        if (!hasActions) {
            return new Response(
                JSON.stringify({
                    events: calendar || [],
                    deadlines: summary.deadlines || [],
                    assistantMessage: summary.assistantMessage || "Got it! Let me know if you need anything else.",
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Expand calendar with actions
        const updatedEvents = await expandCalendar(summary.actions, calendar || []);

        // Resolve conflicts
        const { events: conflictFreeEvents, notes: conflictNotes, hasUnresolved } = resolveConflicts(updatedEvents);

        let assistantMessage = summary.assistantMessage;
        let finalEvents = conflictFreeEvents;

        // Improve conflict messaging
        if (hasUnresolved) {
            // Critical conflicts that can't be auto-resolved
            const unresolvedConflicts = conflictNotes.filter(n => n.status === "unresolved");
            if (unresolvedConflicts.length > 0) {
                const first = unresolvedConflicts[0];
                assistantMessage = `I found a conflict: "${first.title}" on ${first.dateLabel} at ${first.originalTime} conflicts with existing events. ${first.reason}. Would you like me to try a different time or day?`;
                // Return calendar WITH the conflicting event so user can see it
                finalEvents = conflictFreeEvents;
            }
        } else if (conflictNotes.length > 0) {
            // Auto-resolved conflicts - inform user
            const resolvedConflicts = conflictNotes.filter(n => n.status === "resolved");
            if (resolvedConflicts.length > 0) {
                const adjustments = resolvedConflicts.map(n =>
                    `"${n.title}" moved to ${n.newTime}${n.outsidePreferred ? " (outside usual time)" : ""}`
                ).join(", ");
                assistantMessage = `${summary.assistantMessage} I adjusted some times to avoid conflicts: ${adjustments}.`;
            }
        }

        // Add IDs to deadlines
        const deadlinesWithIds = (summary.deadlines || []).map(d => ({
            ...d,
            id: (d as any).id || generateUUID(),
            completed: false,
        }));

        return new Response(
            JSON.stringify({
                events: finalEvents || [],
                deadlines: deadlinesWithIds,
                assistantMessage,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({
                error: 'Failed to process request',
                details: error.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
