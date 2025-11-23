import OpenAI from "openai";
import { SummaryJSON, IntentType } from "./types";

const extractionPrompt = `You are Naiya, an AI that organizes a user’s weekly schedule.

Your job is to process the user’s natural-language message and output a single structured JSON object that contains:

1. events: recurring or fixed events (classes, work, routine)
2. deadlines: exams, assignments, due dates
3. tasks: tasks that need hours allocated
4. preferences: wake time, sleep time, study windows
5. actions: additions/updates/deletions Naiya should perform
6. assistantMessage: a short natural-language summary to show the user

You MUST return ONLY JSON. No chain-of-thought. No explanations.

=========================
JSON SCHEMA (STRICT)
=========================
{
  "events": [
    {
      "title": "string",
      "day": "Mon|Tue|Wed|Thu|Fri|Sat|Sun",
      "start": "HH:MM",
      "end": "HH:MM",
      "type": "class|personal|routine|other",
      "flexibility": "fixed|strong|medium|low|high"
    }
  ],
  "deadlines": [
    {
      "title": "string",
      "date": "YYYY-MM-DD",
      "type": "exam|project|assignment",
      "flexibility": "fixed"
    }
  ],
  "tasks": [
    {
      "title": "string",
      "estimatedTimeHours": number,
      "dueDate": "YYYY-MM-DD",
      "flexibility": "medium|low|high"
    }
  ],
  "preferences": {
    "wake": "HH:MM",
    "sleep": "HH:MM",
    "studyStartAfter": "HH:MM",
    "studyEndBy": "HH:MM"
  },
  "actions": [
    {
      "type": "add|delete|modify",
      "title": "string",
      "day": "Mon|Tue|Wed|Thu|Fri|Sat|Sun",
      "start": "HH:MM",
      "end": "HH:MM",
      "flexibility": "fixed|strong|medium|low|high"
    }
  ],
  "assistantMessage": "string"
}

=========================
RULES
=========================
• ALWAYS fill the JSON correctly.  
• If uncertain, leave fields empty rather than hallucinating.  
• Automatically normalize:
    - day names → Mon/Tue/...
    - times → 24-hour HH:MM
    - vague times (“morning”) → approximate (07:00)
• Detect which items are recurring vs one-off.
• Extract total study HOURS from phrases like:
      “I need 8 hours”, “study a bit”, “review”, etc.
• FLEXIBILITY:
      class = low
      exam date = fixed
      self-planned study blocks = medium
      gym / routine personal = high
• CRITICAL: You MUST generate an "add" action in the 'actions' array for EVERY event you extract in the 'events' array.
• Output a short assistantMessage summarizing what you understood.

=========================
RESPONSE FORMAT
=========================
Return ONLY ONE JSON block. No markdown. No commentary.`;

export async function extractSummary(message: string, intent: IntentType): Promise<SummaryJSON> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Get current date for context
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][today.getDay()];

  const completion = await client.chat.completions.create({
    model: "gpt-5.1",
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
    max_completion_tokens: 1500
  });

  const raw = completion.choices[0].message?.content || "{}";
  let result: SummaryJSON;

  try {
    result = JSON.parse(raw) as SummaryJSON;
  } catch (e) {
    console.error("Failed to parse LLM output:", raw);
    // Fallback
    result = {
      assistantMessage: "I'm sorry, I had trouble processing that. Could you try again?",
      actions: []
    };
  }

  // Ensure rawMessage is set
  result.rawMessage = message;
  result.intent = intent;

  return result;
}
