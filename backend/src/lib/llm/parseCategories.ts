import OpenAI from "openai";
import { parseCategoriesPrompt } from "./prompts";
import { CategoryBucketsSchema } from "@shared/schema";

export async function parseCategories(input: string) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
        model: "gpt-5.1",
        messages: [
            { role: "system", content: parseCategoriesPrompt },
            { role: "user", content: input }
        ]
    });

    const raw = completion.choices[0].message?.content || "{}";
    const json = JSON.parse(raw);
    return CategoryBucketsSchema.parse(json);
}
