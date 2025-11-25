import {
    CategoryBuckets,
    CalendarEvent,
    StudyPlanItem,
    Day,
    Flexibility
} from "@shared/types";
import { v4 as uuidv4 } from "uuid";

const DAYS: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Helper to parse HH:MM to minutes from midnight
function parseTime(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

// Helper to format minutes to HH:MM
function formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

interface TimeSlot {
    start: number;
    end: number;
}

export function scheduleWeek(
    buckets: CategoryBuckets,
    studyPlan: StudyPlanItem[]
): { assistant_message: string; calendar: { events: CalendarEvent[] } } {
    let events: CalendarEvent[] = [];

    // 1. Place Routine Events (Fixed/Strong)
    buckets.routineSchedule.forEach(item => {
        item.days.forEach(day => {
            events.push({
                id: uuidv4(),
                title: item.title,
                type: "ROUTINE",
                day: day,
                start: item.start,
                end: item.end,
                flexibility: item.flexibility || "strong",
                source: "custom"
            });
        });
    });

    // 2. Place Lock-In Sessions (Medium)
    buckets.lockInSessions.forEach(item => {
        events.push({
            id: uuidv4(),
            title: item.title,
            type: "LOCKIN",
            day: item.day,
            start: item.start,
            end: item.end,
            flexibility: item.flexibility || "medium",
            source: "study"
        });
    });

    // 3. Place Other Events (Medium)
    buckets.otherEvents.forEach(item => {
        // Need to determine day of week from date string YYYY-MM-DD
        const date = new Date(item.date);
        // Adjust for local timezone if necessary, but assuming input date is correct day
        // getDay() returns 0 for Sun, 1 for Mon...
        const dayIndex = date.getDay();
        // Map 0->Sun, 1->Mon, etc. to our Day type
        // Our Day type: Mon, Tue, Wed, Thu, Fri, Sat, Sun
        // JS getDay: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
        const dayMap: Day[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const day = dayMap[dayIndex];

        events.push({
            id: uuidv4(),
            title: item.title,
            type: "OTHER",
            date: item.date, // Use date instead of day for one-time events
            start: item.start,
            end: item.end,
            flexibility: item.flexibility || "medium",
            source: "custom"
        });
    });

    // 4. Place Deadlines (Fixed, All Day - represented as specific time or just metadata?)
    // Prompt says "Deadlines become all-day events with flexibility: 'fixed'".
    // Let's assume 09:00 to 09:00 or similar marker, or just a specific block.
    // For visualization, maybe 00:00 to 23:59? Or just a 1 hour block at start of day?
    // Let's use 08:00-09:00 for now as a placeholder if not specified.
    buckets.deadlines.forEach(item => {
        // Ensure date string is treated as local time or consistent
        // Appending T00:00:00 to ensure it's parsed as local time if it's just YYYY-MM-DD
        // (In some environments YYYY-MM-DD is UTC, in others local)
        const dateStr = item.date.includes("T") ? item.date : `${item.date}T00:00:00`;
        const date = new Date(dateStr);

        if (isNaN(date.getTime())) {
            console.error(`Invalid date for deadline ${item.title}: ${item.date}`);
        }

        const dayIndex = date.getDay();
        const dayMap: Day[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        let day = dayMap[dayIndex];

        if (!day) {
            console.error(`Could not determine day for date: ${item.date} (Index: ${dayIndex})`);
            day = "Mon"; // Fallback
        }

        events.push({
            id: uuidv4(),
            title: `DEADLINE: ${item.title}`,
            type: "COMMITMENT",
            date: item.date, // Use date for deadlines
            start: "00:00",
            end: "23:59", // All day
            flexibility: "fixed",
            course: item.course,
            source: "commitment"
        });
    });

    // 5. Generate Study Blocks based on Study Plan
    studyPlan.forEach(plan => {
        Object.entries(plan.dailyDistribution).forEach(([dayStr, hours]) => {
            const day = dayStr as Day;
            if (!hours || hours <= 0) return;

            const minutesNeeded = hours * 60;
            const placed = placeStudyBlock(events, day, minutesNeeded, buckets.preferences);

            if (placed) {
                events.push({
                    id: uuidv4(),
                    title: `Study: ${plan.deadlineTitle}`,
                    type: "STUDY",
                    day: day,
                    start: formatTime(placed.start),
                    end: formatTime(placed.end),
                    flexibility: "medium",
                    course: plan.deadlineTitle, // Or infer course
                    source: "study"
                });
            } else {
                // Could not place study block - maybe log or add to assistant message
                console.warn(`Could not place ${hours} hours for ${plan.deadlineTitle} on ${day}`);
            }
        });
    });

    return {
        assistant_message: "I've generated your schedule based on your requirements.",
        calendar: { events }
    };
}

function placeStudyBlock(
    existingEvents: CalendarEvent[],
    day: Day,
    durationMinutes: number,
    prefs: { wake: string; sleep: string }
): TimeSlot | null {
    const dayEvents = existingEvents.filter(e => e.day === day);
    const wakeTime = parseTime(prefs.wake);
    const sleepTime = parseTime(prefs.sleep);

    // Sort events by start time
    dayEvents.sort((a, b) => parseTime(a.start) - parseTime(b.start));

    // Find gaps
    let currentStart = wakeTime;

    for (const event of dayEvents) {
        const eventStart = parseTime(event.start);
        const eventEnd = parseTime(event.end);

        if (eventStart - currentStart >= durationMinutes) {
            return { start: currentStart, end: currentStart + durationMinutes };
        }

        currentStart = Math.max(currentStart, eventEnd);
    }

    // Check after last event
    if (sleepTime - currentStart >= durationMinutes) {
        return { start: currentStart, end: currentStart + durationMinutes };
    }

    return null;
}
