import { CalendarEvent } from "@shared/types";
import { classifyIntent } from "../lib/llm/classifyIntent.js";
import { extractSummary } from "../lib/llm/extractSummary.js";
import { expandCalendar } from "../lib/llm/expandCalendar.js";
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

        console.time("Total Pipeline");

        // Stage 1: Classify Intent
        console.time("Stage 1 (Classify)");
        console.log("\n[Stage 1] Classifying intent...");
        const classification = await classifyIntent(message);
        console.log("✅ Classification:", classification);
        console.timeEnd("Stage 1 (Classify)");

        let summary: SummaryJSON;

        // Stage 2: Extract Summary (Consolidated: Extraction + Reasoning + Response)
        console.time("Stage 2 (Extract & Reason)");
        if (classification.needsExtraction) {
            console.log("\n[Stage 2] Extracting summary & reasoning...");
            summary = await extractSummary(message, classification.intent);
            console.log("✅ Summary:", JSON.stringify(summary, null, 2));
        } else {
            // For simple chats, we might still want to run extraction if we want the AI to respond naturally
            // But if intent is strictly chat_only, we might skip complex extraction.
            // However, the new prompt handles "chat_only" too.
            // Let's run it for consistency unless it's a very trivial case, but for now, follow previous logic.
            summary = {
                intent: classification.intent,
                rawMessage: message,
                assistantMessage: "I see. Is there anything else I can help you with?",
                actions: []
            };

            // If it's chat_only, we might want to just let GPT generate a response.
            if (classification.intent === "chat_only") {
                summary = await extractSummary(message, classification.intent);
            }

            console.log("\n[Stage 2] Skipped complex extraction (or handled as chat)");
        }
        console.timeEnd("Stage 2 (Extract & Reason)");

        // Stage 3: Expand Calendar (Deterministic)
        console.time("Stage 3 (Expand)");
        console.log("\n[Stage 3] Expanding calendar...");

        // Adapt SummaryJSON actions to DecisionJSON format expected by expandCalendar
        // actually expandCalendar expects DecisionJSON, but we can adapt it or update expandCalendar.
        // Let's look at expandCalendar.ts. It expects DecisionJSON { actions: ... }
        // Our SummaryJSON has actions: ... so we can pass it directly if types match.
        // The types in SummaryJSON.actions are slightly different (string vs enum for flexibility).
        // We updated types.ts so CalendarAction is shared? No, I defined CalendarAction in types.ts
        // Let's check expandCalendar.ts usage.

        // Fallback: If actions are empty but events exist, auto-generate "add" actions
        if ((!summary.actions || summary.actions.length === 0) && summary.events && summary.events.length > 0) {
            console.log("⚠️ [Stage 2] Actions missing but events found. Auto-generating 'add' actions...");
            summary.actions = summary.events.map(event => ({
                type: "add",
                title: event.title,
                day: event.day,
                start: event.start,
                end: event.end,
                flexibility: event.flexibility || "medium"
            }));
        }

        const decision = {
            actions: summary.actions || [],
            reasoning: "Consolidated extraction",
            protected: []
        };

        const updatedCalendar = await expandCalendar(decision, currentCalendar);
        console.log(`✅ Updated calendar: ${updatedCalendar.length} events`);
        console.timeEnd("Stage 3 (Expand)");

        console.log("✅ Response:", summary.assistantMessage);
        console.log("\n🎉 [NAIYA PIPELINE] Complete!");
        console.timeEnd("Total Pipeline");
        console.log(""); // Empty line

        return Response.json({
            assistantMessage: summary.assistantMessage,
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
