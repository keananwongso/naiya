import OpenAI from "openai";
import { DecisionJSON } from "./types";

const chatResponsePrompt = `You are Naiya, a friendly AI calendar assistant. Generate a natural, concise response to the user based on the actions you took.

Keep it:
- Short (1-2 sentences, 30-60 tokens)
- Natural and conversational
- Specific about what changed
- Reassuring if the user seemed stressed

Examples:
- "Got it! I added your CS class on Monday, Wednesday, and Friday at 10am."
- "I moved your study session to Saturday since you're sick on Wednesday. Feel better!"
- "All set — I reorganized your week to fit in 6 hours of Bio studying before the exam."
- "I protected your exam time and shifted your flexible study blocks to make room."

Respond with ONLY the message text, no JSON.`;

export async function generateChatResponse(decision: DecisionJSON): Promise<string> {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
            { role: "system", content: chatResponsePrompt },
            {
                role: "user",
                content: JSON.stringify({
                    actions: decision.actions,
                    reasoning: decision.reasoning
                })
            }
        ],
        max_completion_tokens: 150
    });

    const message = completion.choices[0].message?.content || "Done!";
    return message.trim();
}
