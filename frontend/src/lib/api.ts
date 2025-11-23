import { CategoryBuckets, CalendarEvent } from "shared/types";

const API_BASE = "/api";

export class ScheduleAPIError extends Error {
    constructor(
        message: string,
        public statusCode: number,
        public details?: string
    ) {
        super(message);
        this.name = "ScheduleAPIError";
    }
}

async function callAPI<T>(endpoint: string, body: any): Promise<T> {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new ScheduleAPIError(
                data.error || "API request failed",
                response.status,
                data.details
            );
        }

        return data as T;
    } catch (error) {
        if (error instanceof ScheduleAPIError) {
            throw error;
        }
        throw new ScheduleAPIError(
            "Network error",
            0,
            error instanceof Error ? error.message : "Unknown error"
        );
    }
}

export async function parseCategories(text: string): Promise<CategoryBuckets> {
    return callAPI<CategoryBuckets>("/parse-categories", { text });
}

export async function planWeek(buckets: CategoryBuckets): Promise<{
    assistant_message: string;
    plan: {
        studyPlan: Array<{
            deadlineTitle: string;
            hoursNeeded: number;
            dailyDistribution: Record<string, number>;
        }>;
    };
}> {
    return callAPI("/plan-week", buckets);
}

export async function updateCalendar(
    events: CalendarEvent[],
    message: string
): Promise<{
    assistant_message: string;
    calendar: { events: CalendarEvent[] };
}> {
    return callAPI("/update-calendar", { events, message });
}

export async function processNaiya(
    events: CalendarEvent[],
    message: string
): Promise<{
    assistantMessage: string;
    events: CalendarEvent[];
}> {
    return callAPI("/naiya/process", { calendar: events, message });
}

export async function generateScheduleFromText(text: string): Promise<{
    assistant_message: string;
    events: CalendarEvent[];
}> {
    // Full flow: parse → plan → schedule
    const buckets = await parseCategories(text);
    const planResult = await planWeek(buckets);

    // Note: The actual scheduling happens in the backend via scheduleWeek function
    // For now, we'll need to call a combined endpoint or handle this differently
    // This is a placeholder for the full flow
    return {
        assistant_message: planResult.assistant_message,
        events: [], // Will be populated by backend
    };
}
