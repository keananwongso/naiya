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

        // If summary has actions but no events, create fallback events from actions
        if (summary.actions && summary.actions.length > 0 && (!summary.events || summary.events.length === 0)) {
            console.log("⚠️  Actions exist but no events. Creating fallback events from actions.");
            summary.events = summary.actions.map(action => ({
                title: action.title,
                day: action.day,
                start: action.start,
                end: action.end,
                type: "other" as const,
                flexibility: action.flexibility
            }));
        }

        // If summary has events but no actions, create fallback actions
        if (summary.events && summary.events.length > 0 && (!summary.actions || summary.actions.length === 0)) {
            console.log("⚠️  Events exist but no actions. Creating fallback 'add' actions.");
            summary.actions = summary.events.map(event => ({
                type: "add" as const,
                title: event.title,
                day: event.day,
                start: event.start,
                end: event.end,
                flexibility: event.flexibility
            }));
        }

        // Stage 3: Expand Calendar (apply actions to calendar)
        console.time("Stage 3 (Expand)");
        console.log("\n[Stage 3] Expanding calendar...");
        const decision = {
            actions: summary.actions || [],
            reasoning: "Consolidated extraction",
            protected: []
        };
        const updatedEvents = await expandCalendar(decision, currentCalendar);
        console.log(`✅ Updated calendar: ${updatedEvents.length} events`);
        console.timeEnd("Stage 3 (Expand)");

        console.timeEnd("Total Pipeline");
        console.log("\n✅ [NAIYA PIPELINE] Complete!\n");

        // Return both events and deadlines
        return Response.json({
            events: updatedEvents,
            deadlines: summary.deadlines || [],  // Return deadlines separately
            assistantMessage: summary.assistantMessage || "I've updated your schedule.",
        });

    } catch (error: any) {
        console.error("❌ [NAIYA PIPELINE] Error:", error);
        return Response.json(
            {
                error: "Failed to process request",
                details: error.message,
            },
            { status: 500 }
        );
    }
}
