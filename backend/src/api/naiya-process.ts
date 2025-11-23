import { CalendarEvent } from "@shared/types";
import { classifyIntent } from "../lib/llm/classifyIntent.js";
import { extractSummary } from "../lib/llm/extractSummary.js";
import { reasonPlan } from "../lib/llm/reasonPlan.js";
import { expandCalendar } from "../lib/llm/expandCalendar.js";
import { generateChatResponse } from "../lib/llm/generateChatResponse.js";
import { SummaryJSON } from "../lib/llm/types.js";

export async function handleNaiyaProcess(req: Request) {
    try {
        const { message, calendar } = await req.json();

        if (!message || typeof message !== "string") {
            return Response.json(
                { error: "Message is required and must be a string" },
                { status: 400 }
            );
        }

        const currentCalendar: CalendarEvent[] = calendar || [];

        console.log("\n🤖 [NAIYA PIPELINE] Starting...");
        console.log("📝 Message:", message);

        // Stage 1: Classify Intent (GPT-5 Mini, ~50 tokens)
        console.log("\n[Stage 1] Classifying intent...");
        const classification = await classifyIntent(message);
        console.log("✅ Classification:", classification);

        let summary: SummaryJSON;

        // Stage 2: Extract Summary (GPT-5 Mini, ~200 tokens) - only if needed
        if (classification.needsExtraction) {
            console.log("\n[Stage 2] Extracting summary...");
            summary = await extractSummary(message, classification.intent);
            console.log("✅ Summary:", JSON.stringify(summary, null, 2));
        } else {
            // For chat_only or simple commands, create minimal summary
            summary = {
                intent: classification.intent,
                rawMessage: message
            };
            console.log("\n[Stage 2] Skipped extraction (not needed)");
        }

        // Stage 3: Reason about changes (GPT-5.1, ~100 tokens)
        console.log("\n[Stage 3] Reasoning about changes...");
        const decision = await reasonPlan(summary, currentCalendar);
        console.log("✅ Decision:", JSON.stringify(decision, null, 2));

        // Stage 4: Expand to full calendar (GPT-5 Mini, ~500 tokens)
        console.log("\n[Stage 4] Expanding calendar...");
        const updatedCalendar = await expandCalendar(decision, currentCalendar);
        console.log(`✅ Updated calendar: ${updatedCalendar.length} events`);

        // Stage 5: Generate chat response (GPT-5 Mini, ~50 tokens)
        console.log("\n[Stage 5] Generating response...");
        const assistantMessage = await generateChatResponse(decision);
        console.log("✅ Response:", assistantMessage);

        console.log("\n🎉 [NAIYA PIPELINE] Complete!\n");

        return Response.json({
            assistantMessage,
            events: updatedCalendar
        });

    } catch (error) {
        console.error("❌ [NAIYA PIPELINE] Error:", error);
        return Response.json(
            {
                error: "Failed to process request",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}
