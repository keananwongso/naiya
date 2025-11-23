import OpenAI from "openai";
import { planWeekPrompt } from "./prompts";
import { PlanWeekIntentSchema } from "@shared/schema";
import { scheduleWeek } from "../scheduler/scheduleWeek";

export async function planWeek(buckets: any) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
        model: "gpt-5.1",
        messages: [
            { role: "system", content: planWeekPrompt },
            { role: "user", content: JSON.stringify(buckets) }
        ]
    });

    const raw = completion.choices[0].message?.content || "{}";
    const json = JSON.parse(raw);

    // 1. Parse LLM Intent
    const intent = PlanWeekIntentSchema.parse(json);

    // 2. Run Deterministic Scheduler
    const result = scheduleWeek(buckets, intent.plan.studyPlan);

    // 3. Return Final Result (combining LLM message with generated calendar)
    return {
        assistant_message: intent.assistant_message,
        calendar: result.calendar
    };
}
