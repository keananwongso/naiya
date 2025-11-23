import OpenAI from "openai";
import { SummaryJSON, IntentType } from "./types";

const extractionPrompt = `You are Naiya's data extraction engine. Extract structured information from the user's message.

Extract:
1. **events**: One event object per day/time combination
2. **deadlines**: Due dates for assignments, exams, projects
3. **constraints**: Days the user is sick, traveling, or unavailable
4. **tasks**: Things that need time allocated (studying, projects)
5. **preferences**: Wake/sleep times, study preferences
6. **emotionalState**: User's mood (stressed, calm, overwhelmed, neutral)

CRITICAL RULES FOR EVENTS:
- Each event object represents ONE day and ONE time block
- NEVER group multiple days into the same event if times differ
- If a user says "Tue/Thu at 9-10, but Friday at 12-1", output THREE separate events
- Use "day" field (singular) for each event: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"
- Times in HH:MM format: "10:00", "14:30"

FEW-SHOT EXAMPLE:

USER: "I have LING100 on Tuesday and Thursday from 9 to 10, but Friday it's 12 to 1"

OUTPUT:
{
  "intent": "add_event",
  "events": [
    { "title": "LING100", "day": "Tue", "start": "09:00", "end": "10:00", "type": "class", "flexibility": "medium" },
    { "title": "LING100", "day": "Thu", "start": "09:00", "end": "10:00", "type": "class", "flexibility": "medium" },
    { "title": "LING100", "day": "Fri", "start": "12:00", "end": "13:00", "type": "class", "flexibility": "medium" }
  ],
  "emotionalState": "neutral",
  "rawMessage": "I have LING100 on Tuesday and Thursday from 9 to 10, but Friday it's 12 to 1"
}

Respond with ONLY valid JSON matching this structure:
{
  "intent": "brain_dump" | "add_event" | "modify_event" | "cancel_day" | "small_command" | "chat_only",
  "events": [
    {
      "title": "Event Name",
      "day": "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun",
      "start": "HH:MM",
      "end": "HH:MM",
      "type": "class" | "meeting" | "personal",
      "flexibility": "low" | "medium" | "high"
    }
  ],
  "deadlines": [...],
  "constraints": [...],
  "tasks": [...],
  "preferences": {...},
  "emotionalState": "neutral",
  "rawMessage": "..."
}

Omit any fields that don't apply. Be precise with times and dates.`;

export async function extractSummary(message: string, intent: IntentType): Promise<SummaryJSON> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Get current date for context
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][today.getDay()];

  const completion = await client.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: extractionPrompt },
      {
        role: "user",
        content: JSON.stringify({
          message,
          currentDate: todayStr,
          currentDayOfWeek: dayOfWeek,
          intent
        })
      }
    ],
    max_completion_tokens: 1000
  });

  const raw = completion.choices[0].message?.content || "{}";
  const result = JSON.parse(raw) as SummaryJSON;

  // Ensure rawMessage is set
  result.rawMessage = message;
  result.intent = intent;

  return result;
}
