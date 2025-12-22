import { CalendarEvent } from "shared/types";

const CALENDAR_STORAGE_KEY = "naiya_calendar_events";

export async function loadCalendar(): Promise<CalendarEvent[]> {
    try {
        // Use localStorage for demo (no auth required)
        if (typeof window === "undefined") return [];

        const stored = localStorage.getItem(CALENDAR_STORAGE_KEY);
        if (!stored) {
            console.log("No calendar found in localStorage, returning empty array");
            return [];
        }

        console.log("Calendar loaded from localStorage successfully");
        return JSON.parse(stored) as CalendarEvent[];
    } catch (error) {
        console.error("Failed to load calendar:", error);
        return [];
    }
}

export async function saveCalendar(events: CalendarEvent[]): Promise<void> {
    try {
        // Use localStorage for demo (no auth required)
        if (typeof window === "undefined") return;

        localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(events));
        console.log("Calendar saved to localStorage successfully");
    } catch (error) {
        console.error("Failed to save calendar to localStorage:", error);
    }
}
