import OpenAI from "openai";
import { IntentClassification } from "./types";

const classificationPrompt = `You are Naiya's intent classifier. Analyze the user's message and classify it into ONE of these categories:

1. **brain_dump**: User is dumping lots of information at once (multiple events, tasks, constraints)
   Example: "I have CS class MWF at 10, chem lab on thursdays, and a bio exam next friday"

2. **add_event**: User wants to add one or more new events
   Example: "I have a dentist appointment next tuesday at 2pm"

3. **modify_event**: User wants to change existing event(s)
   Example: "Move my friday study session to saturday"

4. **cancel_day**: User is blocking out a day (sick, travel, busy)
   Example: "I'm sick on wednesday" or "I'm traveling next week"

5. **small_command**: Quick single action (move one thing, delete one thing)
   Example: "Delete my gym session" or "Cancel monday's meeting"

6. **chat_only**: Just chatting, asking questions, no calendar changes needed
   Example: "How's my week looking?" or "Thanks!"

Respond with ONLY a JSON object:
{
  "intent": "brain_dump" | "add_event" | "modify_event" | "cancel_day" | "small_command" | "chat_only",
  "needsExtraction": boolean
}

Set needsExtraction to true if the message contains specific events, times, or constraints that need to be extracted.
Set needsExtraction to false for chat_only or very simple commands.`;

export async function classifyIntent(message: string): Promise<IntentClassification> {
   const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

   const completion = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
         { role: "system", content: classificationPrompt },
         { role: "user", content: message }
      ],
      max_completion_tokens: 1000
   });

   const raw = completion.choices[0].message?.content || "{}";
   const result = JSON.parse(raw) as IntentClassification;

   return result;
}
