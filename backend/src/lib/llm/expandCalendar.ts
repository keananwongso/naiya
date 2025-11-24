import { CalendarAction } from "./types";
import { CalendarEvent } from "@shared/types";
import { v4 as uuidv4 } from "uuid";

export interface DecisionWrapper {
    actions: CalendarAction[];
    reasoning?: string;
    protected?: string[];
}

export async function expandCalendar(decision: DecisionWrapper, currentCalendar: CalendarEvent[]): Promise<CalendarEvent[]> {
    // Clone current calendar to avoid mutation
    let updatedCalendar = [...currentCalendar];

    // Apply actions in order
    for (const action of decision.actions) {
        if (action.type === "add") {
            const newEvent: CalendarEvent = {
                id: uuidv4(),
                title: action.title,
                day: action.day,
                start: action.start || "00:00",
                end: action.end || "00:00",
                type: "ROUTINE", // Default type, could be inferred from title/source
                flexibility: action.flexibility || "medium",
                source: "custom", // Default source
                course: action.title // Assuming title is course for now if class
            };

            // Infer type/source based on title keywords (simple heuristic)
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

        } else if (action.type === "modify") {
            // Find event to modify by title and roughly day/time if possible
            // Since we don't have ID, we look for a match.
            // The prompt gives us the TARGET state. So we might need to find an event that looks similar?
            // Or maybe the prompt implies "Change the event that IS this to BE this"?
            // Actually, "modify" usually implies "Change X to Y".
            // But the schema has only one set of fields.
            // If the user says "Move Math from 10am to 12pm", the LLM might output:
            // { type: "modify", title: "Math", day: "Mon", start: "12:00", end: "13:00" }
            // So we look for "Math" on "Mon" (maybe at old time? but we don't have old time).
            // We'll look for an event with the same title on the same day (or any day if unique).

            const index = updatedCalendar.findIndex(e =>
                e.title.toLowerCase() === action.title.toLowerCase() &&
                (e.day === action.day || !action.day) // If day matches or not specified (though schema says day is required)
            );

            if (index !== -1) {
                updatedCalendar[index] = {
                    ...updatedCalendar[index],
                    day: action.day,
                    start: action.start || updatedCalendar[index].start,
                    end: action.end || updatedCalendar[index].end,
                    flexibility: action.flexibility || updatedCalendar[index].flexibility
                };
            }

        } else if (action.type === "delete") {
            // Find event to delete by title, day, and optionally time
            updatedCalendar = updatedCalendar.filter(e => {
                // Loose title matching: check if one includes the other
                const t1 = e.title.toLowerCase();
                const t2 = action.title.toLowerCase();
                const titleMatch = t1 === t2 || t1.includes(t2) || t2.includes(t1);

                const dayMatch = e.day === action.day;

                // If action has a start time, require it to match (exact or close?)
                // For now, exact match on start string.
                // The LLM is instructed to extract from currentSchedule, so it should match.
                const timeMatch = action.start ? e.start === action.start : true;

                // Return false to keep the event (if it matches, we filter it out)
                return !(titleMatch && dayMatch && timeMatch);
            });

        } else if (action.type === "exclude_date") {
            // Find the recurring event and add the date to excludedDates
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
