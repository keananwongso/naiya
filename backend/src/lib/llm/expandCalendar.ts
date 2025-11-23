import OpenAI from "openai";
import { DecisionJSON } from "./types";
import { CalendarEvent } from "@shared/types";
import { v4 as uuidv4 } from "uuid";

const expansionPrompt = `You are Naiya's calendar expansion engine. Apply the given actions to the current calendar and output the complete updated calendar.

Input:
1. Current calendar (CalendarEvent[])
2. Actions to apply (DecisionJSON)

Your job:
- Apply each action in order
- For "add" actions: create new CalendarEvent objects (one per day)
- For "move" actions: update the specified event
- For "delete" actions: remove the specified event
- For "block_day" actions: add a blocking event for that day
- For "distribute_study" actions: create study blocks across specified days

IMPORTANT: Each "add" action represents ONE day. Do not try to combine multiple days into one event.

Output the COMPLETE calendar as CalendarEvent[] array.

CalendarEvent schema:
{
  "id": "uuid",
  "title": "Event Title",
  "type": "ROUTINE" | "COMMITMENT" | "STUDY" | "LOCKIN" | "OTHER",
  "day": "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun",
  "start": "HH:MM",
  "end": "HH:MM",
  "flexibility": "fixed" | "strong" | "medium" | "low",
  "source": "class" | "commitment" | "study" | "custom",
  "course"?: "optional course name"
}

For recurring events (days array), create separate CalendarEvent for each day.
Preserve all existing events unless they're being moved or deleted.
Return ONLY the JSON array of events.`;

export async function expandCalendar(decision: DecisionJSON, currentCalendar: CalendarEvent[]): Promise<CalendarEvent[]> {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
            { role: "system", content: expansionPrompt },
            {
                role: "user",
                content: JSON.stringify({
                    currentCalendar,
                    actions: decision.actions
                })
            }
        ],
        max_completion_tokens: 2000
    });

    const raw = completion.choices[0].message?.content || "[]";
    let events = JSON.parse(raw) as CalendarEvent[];

    // Ensure all events have IDs
    events = events.map(e => ({
        ...e,
        id: e.id || uuidv4(),
        source: e.source || "custom" as const,
        flexibility: e.flexibility || "medium" as const
    }));

    return events;
}
