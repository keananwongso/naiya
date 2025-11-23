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
                start: action.start,
                end: action.end,
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
                    start: action.start,
                    end: action.end,
                    flexibility: action.flexibility || updatedCalendar[index].flexibility
                };
            }

        } else if (action.type === "delete") {
            // Find event to delete by title and day
            updatedCalendar = updatedCalendar.filter(e =>
                !(e.title.toLowerCase() === action.title.toLowerCase() && e.day === action.day)
            );
        }
    }

    return updatedCalendar;
}
