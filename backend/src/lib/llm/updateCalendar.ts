import OpenAI from "openai";
import { updateCalendarPrompt } from "./prompts";
import { UpdateCalendarIntentSchema } from "@shared/schema";
import { CalendarEvent } from "@shared/types";
import { v4 as uuidv4 } from "uuid";

export async function updateCalendar(events: any[], message: string) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Sanitize input: Remove 'locked' and ensure 'flexibility' exists
    const sanitizedEvents = events.map((e: any) => {
        const { locked, ...rest } = e;
        if (!rest.flexibility) {
            if (rest.type === "COMMITMENT") rest.flexibility = "fixed";
            else if (rest.type === "ROUTINE") rest.flexibility = "strong";
            else rest.flexibility = "medium";
        }
        return rest;
    });

    // Get current date for context
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][today.getDay()];

    const completion = await client.chat.completions.create({
        model: "gpt-5.1",
        messages: [
            { role: "system", content: updateCalendarPrompt },
            {
                role: "user", content: JSON.stringify({
                    events: sanitizedEvents,
                    message,
                    currentDate: todayStr,
                    currentDayOfWeek: dayOfWeek
                })
            }
        ]
    });

    const raw = completion.choices[0].message?.content || "{}";
    const json = JSON.parse(raw);

    // 1. Parse Intent
    const result = UpdateCalendarIntentSchema.parse(json);
    const intent = result.intent;

    let updatedEvents = [...sanitizedEvents];

    // 2. Apply Logic
    if (intent.type === "unknown") {
        // Don't change anything, just return the message asking for clarification
        return {
            assistant_message: result.assistant_message,
            calendar: { events: updatedEvents }
        };
    }

    if (intent.type === "move" && intent.targetEventId) {
        updatedEvents = updatedEvents.map((event: any) => {
            if (event.id === intent.targetEventId) {
                // Check Fixed Rule
                if (event.flexibility === "fixed" && !intent.explicitlyModifiesFixed) {
                    // Skip modification
                    return event;
                }

                // Apply changes
                return {
                    ...event,
                    start: intent.newStart || event.start,
                    end: intent.newEnd || event.end,
                    day: intent.newDate ? new Date(intent.newDate).toLocaleDateString('en-US', { weekday: 'short' }) : event.day, // Simple day mapping, might need robust logic
                    // If newDate is provided, we might need to map it to Day type. 
                    // For now assuming LLM handles day or we keep it simple. 
                    // Wait, schema says 'day' is Mon/Tue... 
                    // If intent gives newDate (YYYY-MM-DD), we need to derive day.
                };
            }
            return event;
        });

        // If we need to handle day mapping better:
        if (intent.newDate) {
            const date = new Date(intent.newDate);
            const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const newDay = dayMap[date.getDay()];

            updatedEvents = updatedEvents.map((event: any) => {
                if (event.id === intent.targetEventId) {
                    if (event.flexibility === "fixed" && !intent.explicitlyModifiesFixed) return event;
                    return { ...event, day: newDay };
                }
                return event;
            });
        }
    } else if (intent.type === "delete" && intent.targetEventId) {
        const target = updatedEvents.find((e: any) => e.id === intent.targetEventId);
        if (target) {
            if (target.flexibility === "fixed" && !intent.explicitlyModifiesFixed) {
                // Skip delete
            } else {
                updatedEvents = updatedEvents.filter((e: any) => e.id !== intent.targetEventId);
            }
        }
    } else if (intent.type === "create") {
        // Check if this is a recurring event (has days array)
        if (intent.days && intent.days.length > 0) {
            // Create one event for each day
            intent.days.forEach((day: any) => {
                updatedEvents.push({
                    id: uuidv4(),
                    title: intent.newTitle || "New Event",
                    type: "ROUTINE", // Recurring events are ROUTINE type
                    day: day,
                    start: intent.newStart || "09:00",
                    end: intent.newEnd || "10:00",
                    flexibility: intent.flexibility || "strong",
                    source: "custom" as const,
                });
            });
        } else {
            // Single event
            updatedEvents.push({
                id: uuidv4(),
                title: intent.newTitle || "New Event",
                type: "OTHER",
                day: intent.newDate ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(intent.newDate).getDay()] : "Mon",
                start: intent.newStart || "09:00",
                end: intent.newEnd || "10:00",
                flexibility: intent.flexibility || "medium",
                source: "custom" as const,
            });
        }
    }

    return {
        assistant_message: result.assistant_message,
        calendar: { events: updatedEvents }
    };
}
