import OpenAI from "openai";
import { SummaryJSON, DecisionJSON } from "./types";
import { CalendarEvent } from "@shared/types";

const reasoningPrompt = `You are Naiya's reasoning engine. Your job is to make smart decisions about calendar changes.

You receive:
1. A summary of what the user wants (events, deadlines, constraints, tasks)
2. The current calendar state

Your job:
- For NEW events in the summary: create "add" actions for each one
- For MODIFICATIONS: create "move" or "delete" actions
- Enforce flexibility rules:
  * **fixed**: NEVER move unless user explicitly says to change it
  * **strong**: Avoid moving unless necessary
  * **medium**: Can move freely
  * **low**: Prefer to move these first
- Distribute study hours intelligently
- Resolve conflicts
- Protect important commitments

CRITICAL: If the summary contains events, you MUST create "add" actions for them. Each event in the summary represents ONE day.

Output a DecisionJSON with specific actions:

{
  "actions": [
    { "type": "add", "title": "CS Class", "day": "Mon", "start": "10:00", "end": "12:00", "flexibility": "medium" },
    { "type": "add", "title": "CS Class", "day": "Wed", "start": "10:00", "end": "12:00", "flexibility": "medium" },
    { "type": "add", "title": "LING100", "day": "Fri", "start": "12:00", "end": "13:00", "flexibility": "medium" }
  ],
  "reasoning": "Added all events from the brain dump to the calendar.",
  "protected": []
}

ALWAYS return valid JSON with an "actions" array, even if it's empty. Never return an empty object.`;

export async function reasonPlan(summary: SummaryJSON, currentCalendar: CalendarEvent[]): Promise<DecisionJSON> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await client.chat.completions.create({
    model: "gpt-5.1",
    messages: [
      { role: "system", content: reasoningPrompt },
      {
        role: "user",
        content: JSON.stringify({
          summary,
          currentCalendar: currentCalendar.map(e => ({
            id: e.id,
            title: e.title,
            day: e.day,
            start: e.start,
            end: e.end,
            type: e.type,
            flexibility: e.flexibility
          }))
        })
      }
    ],
    temperature: 0.3,
    max_completion_tokens: 800
  });

  const raw = completion.choices[0].message?.content || "{}";
  const result = JSON.parse(raw) as DecisionJSON;

  return result;
}
