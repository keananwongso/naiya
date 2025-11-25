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
    events?: any[];
    deadlines?: any[];
    tasks?: any[];
    actions?: CalendarAction[];
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

function resolveConflicts(events: CalendarEvent[]): { events: CalendarEvent[]; notes: ConflictNote[] } {
    const DAY_START = 6 * 60;
    const DAY_END = 22 * 60;
    const notes: ConflictNote[] = [];
    const result: CalendarEvent[] = [];

    const buckets = bucketEventsByDay(events);

    for (const { dayKey, events: evs } of buckets) {
        const sorted = [...evs].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
        const placed: CalendarEvent[] = [];

        for (const ev of sorted) {
            const startMin = toMinutes(ev.start);
            const endMin = toMinutes(ev.end);
            const duration = Math.max(endMin - startMin, 15);
            const overlaps = placed.some(
                (p) => Math.max(startMin, toMinutes(p.start)) < Math.min(endMin, toMinutes(p.end))
            );

            if (!overlaps) {
                placed.push(ev);
                continue;
            }

            if (ev.flexibility === "fixed") {
                notes.push({
                    title: ev.title,
                    dateLabel: dayKey,
                    originalTime: `${ev.start}-${ev.end}`,
                    status: "unresolved",
                    reason: "Fixed time could not be moved",
                });
                placed.push(ev);
                continue;
            }

            const preferredWindow = classifyPreferredWindow(ev.title);
            const searchStart = Math.max(startMin, preferredWindow?.start ?? DAY_START, DAY_START);
            const prefEnd = preferredWindow?.end ?? DAY_END;

            let slot = findForwardSlot(placed, duration, searchStart, prefEnd);
            let outsidePreferred = false;

            if (!slot) {
                slot = findForwardSlot(placed, duration, Math.max(startMin, DAY_START), DAY_END);
                outsidePreferred = true;
            }

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
                    reason: "No free slot same day within hours",
                });
                placed.push(ev);
            }
        }

        result.push(...placed);
    }

    return { events: result, notes };
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
            }

            updatedCalendar.push(newEvent);

        } else if (action.type === "delete") {
            updatedCalendar = updatedCalendar.filter(e => {
                const t1 = e.title.toLowerCase();
                const t2 = action.title.toLowerCase();
                const titleMatch = t1 === t2 || t1.includes(t2) || t2.includes(t1);
                const dayOrDateMatch = (action.day && e.day === action.day) || (action.date && e.date === action.date);
                const timeMatch = action.start ? e.start === action.start : true;
                return !(titleMatch && dayOrDateMatch && timeMatch);
            });

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

    return updatedCalendar;
}

// =======================
// LLM EXTRACTION PROMPT
// =======================

const EXTRACTION_PROMPT = `You are Naiya, an AI that organizes a user's weekly schedule.

Your job is to process the user's natural-language message and output a single structured JSON object that contains:

1. events: recurring or fixed events (classes, work, routine)
2. deadlines: exams, assignments, due dates
3. tasks: tasks that need hours allocated
4. actions: additions/updates/deletions Naiya should perform
5. assistantMessage: a short natural-language summary to show the user

You MUST return ONLY JSON. No chain-of-thought. No explanations.

=========================
JSON SCHEMA (STRICT)
=========================
{
  "events": [
    {
      "title": "string",
      "day": "Mon|Tue|Wed|Thu|Fri|Sat|Sun",  // For RECURRING events
      "date": "YYYY-MM-DD",  // For ONE-TIME events
      // NOTE: Use EITHER 'day' OR 'date', never both
      "start": "HH:MM",
      "end": "HH:MM",
      "type": "class|personal|routine|other",
      "flexibility": "fixed|strong|medium|low|high"
    }
  ],
  "deadlines": [
    {
      "title": "string",
      "date": "YYYY-MM-DD",
      "type": "exam|project|assignment",
      "flexibility": "fixed"
    }
  ],
  "actions": [
    {
      "type": "add|delete|modify|exclude_date",
      "title": "string",
      "day": "Mon|Tue|Wed|Thu|Fri|Sat|Sun",  // For recurring
      "date": "YYYY-MM-DD",  // For one-time
      "start": "HH:MM",
      "end": "HH:MM",
      "flexibility": "fixed|strong|medium|low|high"
    }
  ],
  "assistantMessage": "string"
}

=========================
CRITICAL RULES
=========================
• RECURRING vs ONE-TIME detection:
    RECURRING (use "day"): "every Monday", "weekly", "Stats class MWF"
    ONE-TIME (use "date"): "this Monday", "next Tuesday", "Nov 25", "tomorrow"

• You MUST generate an "add" action for EVERY event you extract.

• For RESCHEDULING: Generate BOTH "delete" (old time) AND "add" (new time) actions.

• For CANCELLATIONS: Use "exclude_date" for single instance of recurring events, "delete" for one-time events.

• Keep assistantMessage brief (1-2 sentences), friendly, and conversational.

• IMPORTANT: When returning the calendar, return the COMPLETE updated calendar with ALL events (both existing and new/modified).

=========================
RESPONSE FORMAT
=========================
Return ONLY ONE JSON block. No markdown. No commentary.`;

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

        // Get current date for context
        const today = currentDate ? new Date(currentDate + 'T12:00:00') : new Date();
        const todayStr = today.toISOString().split('T')[0];
        const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][today.getDay()];

        // Generate next 7 days mapping for context
        const upcomingDates = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
            return `${dayName}: ${d.toISOString().split('T')[0]}`;
        }).join(", ");

        // Build messages array
        const messages: any[] = [
            { role: "system", content: EXTRACTION_PROMPT }
        ];

        if (conversationHistory && conversationHistory.length > 0) {
            messages.push(...conversationHistory);
        }

        const currentSchedule = (calendar || []).map((e: any) => {
            const timeInfo = e.day ? `${e.day} ${e.start}-${e.end}` : `${e.date} ${e.start}-${e.end}`;
            return `${timeInfo}: ${e.title}`;
        }).join("\n");

        messages.push({
            role: "user",
            content: JSON.stringify({
                message,
                currentDate: todayStr,
                currentDayOfWeek: dayOfWeek,
                upcomingWeek: upcomingDates,
                currentSchedule,
            })
        });

        // Call OpenAI
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages,
                response_format: { type: 'json_object' },
                temperature: 0.7,
                max_tokens: 1500,
            }),
        })

        if (!openaiResponse.ok) {
            const error = await openaiResponse.text()
            throw new Error(`OpenAI API error: ${error}`)
        }

        const openaiData = await openaiResponse.json()
        const rawContent = openaiData.choices[0].message.content;
        const cleanContent = rawContent.replace(/```json\n?|```/g, "").trim();
        const summary: SummaryJSON = JSON.parse(cleanContent);

        const hasActions = summary.actions && summary.actions.length > 0;

        // If no actions, return current calendar untouched
        if (!hasActions) {
            return new Response(
                JSON.stringify({
                    events: calendar || [],
                    deadlines: summary.deadlines || [],
                    assistantMessage: summary.assistantMessage || "I've processed your request!",
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Expand calendar with actions
        const updatedEvents = await expandCalendar(summary.actions || [], calendar || []);

        // Resolve conflicts
        const { events: conflictFreeEvents, notes: conflictNotes } = resolveConflicts(updatedEvents);

        const needsClarification = conflictNotes.some(n => n.status === "unresolved" || n.outsidePreferred);
        let assistantMessage = summary.assistantMessage || "I've updated your schedule.";

        if (needsClarification) {
            const first = conflictNotes.find(n => n.status === "unresolved" || n.outsidePreferred);
            const changeHint = first?.newTime ? ` to ${first.newTime}` : "";
            assistantMessage = `I spotted a conflict: ${first?.title} on ${first?.dateLabel} at ${first?.originalTime}${changeHint ? ` (proposed ${changeHint})` : ""}. Want me to move it later today or shift it to another day? I haven't changed anything yet.`;
        } else if (conflictNotes.length) {
            const conflictSummary = conflictNotes.map(n =>
                n.status === "resolved"
                    ? `${n.title} on ${n.dateLabel} moved to ${n.newTime} (was ${n.originalTime})${n.outsidePreferred ? "; it's outside the usual window, want me to adjust?" : ""}.`
                    : `${n.title} on ${n.dateLabel} still overlaps (was ${n.originalTime}).`
            ).join(" ");
            assistantMessage = `I adjusted your schedule to avoid conflicts. ${conflictSummary}`;
        }

        const responseEvents = needsClarification ? calendar : conflictFreeEvents;

        const deadlinesWithIds = (summary.deadlines || []).map(d => ({
            ...d,
            id: (d as any).id || generateUUID()
        }));

        return new Response(
            JSON.stringify({
                events: responseEvents || [],
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
