import { format, startOfWeek, endOfWeek } from "date-fns";
import { Day } from "shared/types";

/**
 * Get the current day of the week as a Day type
 */
export function getCurrentDay(): Day {
    const dayIndex = new Date().getDay();
    const days: Day[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[dayIndex];
}

/**
 * Get the current time in HH:MM format
 */
export function getCurrentTime(): string {
    return format(new Date(), "HH:mm");
}

/**
 * Check if a given date is today
 */
export function isToday(date: Date): boolean {
    const today = new Date();
    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
}

/**
 * Get the start and end dates of the current week
 */
export function getCurrentWeekRange(): { start: Date; end: Date } {
    const now = new Date();
    return {
        start: startOfWeek(now, { weekStartsOn: 0 }), // Sunday
        end: endOfWeek(now, { weekStartsOn: 0 }),
    };
}

/**
 * Format a week range for display
 */
export function formatWeekRange(start: Date, end: Date): string {
    const startMonth = format(start, "MMM");
    const endMonth = format(end, "MMM");
    const year = format(end, "yyyy");

    if (startMonth === endMonth) {
        return `${startMonth} ${start.getDate()}-${end.getDate()}, ${year}`;
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`;
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

/**
 * Get the current time as minutes since midnight
 */
export function getCurrentTimeInMinutes(): number {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return hours * 60 + minutes;
}
