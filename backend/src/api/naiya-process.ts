import { CalendarEvent } from "@shared/types";
import { extractSummary } from "../lib/llm/extractSummary.js";
import { expandCalendar } from "../lib/llm/expandCalendar.js";
import { SummaryJSON } from "../lib/llm/types.js";
import { v4 as uuidv4 } from "uuid";

type ConflictNote = {
    title: string;
    dateLabel: string;
    originalTime: string;
    newTime?: string;
    status: "resolved" | "unresolved";
    reason?: string;
    outsidePreferred?: boolean;
};

const toMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + (m || 0);
};

const toTime = (minutes: number) => {
    const h = Math.floor(minutes / 60)
        .toString()
        .padStart(2, "0");
    const m = (minutes % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
};

type DayBucket = {
    dayKey: string;
    events: CalendarEvent[];
};

const weekdayOrder: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function buildInfoSummaryMessage(
    summary: SummaryJSON,
    calendar: CalendarEvent[],
    clientDate?: string
): string {
    const items = (summary.events && summary.events.length > 0 ? summary.events : calendar) || [];
    if (items.length === 0) {
        return "I didn’t see anything scheduled yet. Want me to add your plans?";
    }

    const dayLabel = (e: CalendarEvent) => {
        if (e.date) {
            // Parse with midday to avoid timezone shift (date-only strings are UTC by default)
            const d = new Date(`${e.date}T12:00:00`);
            const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
            return { key: dayName, label: dayName, sort: d.getTime() };
        }
        const dayName = e.day || "Day";
        return { key: dayName, label: dayName, sort: weekdayOrder[dayName] ?? 99 };
    };

    const formatLine = (e: CalendarEvent) => {
        const time = e.start && e.end ? `${e.start}-${e.end}` : e.start || "";
        return `${time ? `${time} ` : ""}${e.title}`;
    };

    const sorted = [...items].sort((a, b) => {
        if (a.date && b.date) return (new Date(a.date).getTime()) - (new Date(b.date).getTime());
        if (a.day && b.day) return (weekdayOrder[a.day] || 0) - (weekdayOrder[b.day] || 0);
        if (a.date && b.day) return -1;
        if (a.day && b.date) return 1;
        return 0;
    });

    // Group by weekday label (merge recurring and dated into the same day)
    const grouped: Record<string, { label: string; sort: number; lines: string[] }> = {};
    sorted.forEach((e) => {
        const { key, label, sort } = dayLabel(e);
        if (!grouped[key]) grouped[key] = { label, sort, lines: [] };
        grouped[key].lines.push(`• ${formatLine(e)}`);
        // Keep earliest sort for ordering
        grouped[key].sort = Math.min(grouped[key].sort, sort);
    });

    const dayBlocks = Object.values(grouped)
        .sort((a, b) => a.sort - b.sort)
        .map(({ label, lines }) => {
            const sortedLines = [...lines].sort((a, b) => {
                const getStart = (line: string) => {
                    const match = line.match(/•\s*([0-9]{1,2}:[0-9]{2})/);
                    if (!match) return Number.MAX_SAFE_INTEGER;
                    const [h, m] = match[1].split(":").map(Number);
                    return h * 60 + m;
                };
                return getStart(a) - getStart(b);
            });
            return `${label}:\n${sortedLines.join("\n")}`;
        })
        .join("\n\n");

    const label = clientDate ? "your week" : "your schedule";
    return `Here’s ${label}:\n${dayBlocks}`;
}

const classifyPreferredWindow = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("breakfast")) {
        return { start: 7 * 60, end: 10 * 60 }; // 07:00-10:00
    }
    if (t.includes("lunch") || t.includes("brunch")) {
        return { start: 11 * 60, end: 15 * 60 }; // 11:00-15:00
    }
    if (t.includes("dinner")) {
        return { start: 17 * 60, end: 21 * 60 }; // 17:00-21:00
    }
    if (t.includes("meeting") || t.includes("call")) {
        return { start: 8 * 60, end: 20 * 60 }; // 08:00-20:00
    }
    return null;
};

/**
 * Build day buckets for both recurring (day) and dated (date) events.
 */
function bucketEventsByDay(events: CalendarEvent[]): DayBucket[] {
    const groups: Record<string, CalendarEvent[]> = {};
    events.forEach((ev) => {
        const key = ev.date || ev.day || "unspecified";
        groups[key] = groups[key] || [];
        groups[key].push(ev);
    });
    return Object.entries(groups).map(([dayKey, evs]) => ({ dayKey, events: evs }));
}

/**
 * Find earliest non-overlapping slot on the same day within bounds.
 */
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

/**
 * Detect overlaps and move flexible events to the next open slot on the same day.
 */
function resolveConflicts(events: CalendarEvent[]): { events: CalendarEvent[]; notes: ConflictNote[] } {
    const DAY_START = 6 * 60; // 06:00 (generic fallback)
    const DAY_END = 22 * 60;  // 22:00
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

            // Phase 1: within preferred window (forward from original start/preferred start)
            let slot = findForwardSlot(placed, duration, searchStart, prefEnd);
            let outsidePreferred = false;

            // Phase 2: if not found, search after original start up to day end
            if (!slot) {
                slot = findForwardSlot(placed, duration, Math.max(startMin, DAY_START), DAY_END);
                outsidePreferred = true;
            }

            // Phase 3: if still not found, search from day start (last resort)
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

export async function processNaiyaPipeline(
    message: string,
    calendar: CalendarEvent[],
    clientDate?: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant', content: string }>
) {
    console.log("\n🤖 [NAIYA PIPELINE] Starting...");
    console.log("📝 Message:", message);
    console.log("📅 Client date:", clientDate);
    console.log("💬 Conversation history:", conversationHistory?.length || 0, "messages");

    console.time("Total Pipeline");

    let summary: SummaryJSON;

    // Stage 1: Extract Summary (handles all intent types)
    console.time("Stage 1 (Extract & Reason)");
    console.log("\n[Stage 1] Extracting summary & reasoning...");
    // Let extractSummary handle all cases - it can detect if it's just a question or a modification
    summary = await extractSummary(message, "any", calendar, clientDate, conversationHistory);
    console.log("✅ Summary:", JSON.stringify(summary, null, 2));
    console.timeEnd("Stage 1 (Extract & Reason)");

    const hasActions = summary.actions && summary.actions.length > 0;
    const hasEvents = summary.events && summary.events.length > 0;

    // If this was purely informational (no actions), return the current calendar untouched
    if (!hasActions) {
        console.log("ℹ️  No actions detected; treating as informational query.");
        const fallbackMessage = buildInfoSummaryMessage(summary, calendar, clientDate);
        return {
            events: calendar,
            deadlines: summary.deadlines || [],
            assistantMessage: summary.assistantMessage?.trim() || fallbackMessage,
        };
    }

    // If summary has actions but no events, create fallback events from actions
    // BUT: only for "add" actions, not for delete/modify/exclude_date
    if (hasActions && (!summary.events || summary.events.length === 0)) {
        const addActions = summary.actions.filter(a => a.type === "add");
        if (addActions.length > 0) {
            console.log("⚠️  Actions exist but no events. Creating fallback events from 'add' actions.");
            summary.events = addActions.map(action => ({
                title: action.title,
                day: action.day,
                date: action.date,
                start: action.start || "",
                end: action.end || "",
                type: "other" as const,
                flexibility: action.flexibility || "medium"
            }));
        }
    }

    // If summary has events but no actions, create fallback actions
    if (summary.events && summary.events.length > 0 && (!summary.actions || summary.actions.length === 0)) {
        console.log("⚠️  Events exist but no actions. Creating fallback 'add' actions.");
        summary.actions = summary.events.map(event => ({
            type: "add" as const,
            title: event.title,
            day: event.day,
            date: event.date,
            start: event.start,
            end: event.end,
            flexibility: event.flexibility
        }));
    }

    // Stage 2: Expand Calendar (apply actions to calendar)
    console.time("Stage 2 (Expand)");
    console.log("\n[Stage 2] Expanding calendar...");
    const decision = {
        actions: summary.actions || [],
        reasoning: "Consolidated extraction",
        protected: []
    };
    const updatedEvents = await expandCalendar(decision, calendar);
    console.log(`✅ Updated calendar: ${updatedEvents.length} events`);
    console.timeEnd("Stage 2 (Expand)");

    // Stage 3: Resolve conflicts and capture notes
    console.time("Stage 3 (Conflicts)");
    const { events: conflictFreeEvents, notes: conflictNotes } = resolveConflicts(updatedEvents);
    console.log(`✅ Conflicts processed: ${conflictNotes.length} note(s)`);
    console.timeEnd("Stage 3 (Conflicts)");

    console.timeEnd("Total Pipeline");
    console.log("\n✅ [NAIYA PIPELINE] Complete!\n");

    // Return both events and deadlines
    const deadlinesWithIds = (summary.deadlines || []).map(d => ({
        ...d,
        id: (d as any).id || uuidv4()
    }));

    const needsClarification = conflictNotes.some(
        (n) => n.status === "unresolved" || n.outsidePreferred
    );

    // Build assistant message
    let assistantMessage = summary.assistantMessage || "I’ve updated your schedule.";

    if (needsClarification) {
        const first = conflictNotes.find((n) => n.status === "unresolved" || n.outsidePreferred) || conflictNotes[0];
        const changeHint = first?.newTime ? ` to ${first.newTime}` : "";
        assistantMessage = [
            `I spotted a conflict: ${first?.title} on ${first?.dateLabel} at ${first?.originalTime}${changeHint ? ` (proposed ${changeHint})` : ""}.`,
            "Want me to move it later today or shift it to another day?",
            "I haven’t changed anything yet."
        ].join(" ");
    } else if (conflictNotes.length) {
        const conflictSummary = conflictNotes
            .map((n) =>
                n.status === "resolved"
                    ? `${n.title} on ${n.dateLabel} moved to ${n.newTime} (was ${n.originalTime})${n.outsidePreferred ? "; it’s outside the usual window, want me to adjust?" : ""}.`
                    : `${n.title} on ${n.dateLabel} still overlaps (was ${n.originalTime}).`
            )
            .join(" ");
        assistantMessage = `I adjusted your schedule to avoid conflicts. ${conflictSummary}`;
    }

    const responseEvents = needsClarification ? calendar : conflictFreeEvents;

    return {
        events: responseEvents,
        deadlines: deadlinesWithIds,
        assistantMessage,
    };
}

export async function handleNaiyaProcess(req: Request) {
    try {
        const { message, calendar, currentDate, conversationHistory } = await req.json();

        if (!message || typeof message !== "string") {
            return Response.json(
                { error: "Message is required and must be a string" },
                { status: 400 }
            );
        }

        const currentCalendar: CalendarEvent[] = calendar || [];
        const result = await processNaiyaPipeline(message, currentCalendar, currentDate, conversationHistory);

        return Response.json(result);

    } catch (error: any) {
        console.error("❌ [NAIYA PIPELINE] Error:", error);
        return Response.json(
            {
                error: "Failed to process request",
                details: error.message,
            },
            { status: 500 }
        );
    }
}
