import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { CalendarEvent, Deadline, LLMExtractionResult } from "../../../shared/types.ts";
import { buildDeepSeekPrompt, buildSystemPrompt } from "./prompts.ts";
import { processExtractedEntities } from "./algorithms.ts";
import { validateLLMResponse, resolveConflicts, sanitizeEvent } from "./validation.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =======================
// DEEPSEEK API CLIENT
// =======================

async function callDeepSeekAPI(
    userMessage: string,
    currentDate: string,
    calendar: CalendarEvent[] = [],
    conversationHistory: Array<{ role: string; content: string }> = []
): Promise<LLMExtractionResult> {
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
        throw new Error('DEEPSEEK_API_KEY not configured');
    }

    // Build the prompt
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildDeepSeekPrompt(userMessage, currentDate, calendar, conversationHistory);

    // Call DeepSeek Chat Completions API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${deepseekApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                ...conversationHistory,
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2000,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`DeepSeek API error: ${error}`);
    }

    const data = await response.json();
    console.log('[DEBUG] DeepSeek raw response:', JSON.stringify(data));

    // Extract message content
    const messageContent = data.choices?.[0]?.message?.content;
    if (!messageContent) {
        throw new Error('No content in DeepSeek response');
    }

    // Clean JSON markers if present
    const cleanContent = messageContent.replace(/```json\n?|```/g, "").trim();
    console.log('[DEBUG] Clean DeepSeek response:', cleanContent);

    // Parse and validate
    try {
        const parsed = JSON.parse(cleanContent);
        return validateLLMResponse(parsed);
    } catch (error: any) {
        console.error('Failed to parse DeepSeek response:', error.message);
        console.error('Raw content:', cleanContent);
        throw new Error(`Invalid JSON from DeepSeek: ${error.message}`);
    }
}

// =======================
// MAIN HANDLER
// =======================

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { message, calendar, currentDate, conversationHistory } = await req.json();

        if (!message || typeof message !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Message is required and must be a string' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get current date
        const today = currentDate ? new Date(currentDate + 'T12:00:00Z') : new Date();
        const todayStr = today.toISOString().split('T')[0];
        const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][today.getDay()];
        console.log('[DEBUG] Current date:', todayStr, dayOfWeek);

        // Step 1: Call DeepSeek to extract entities
        console.log('[DEBUG] Calling DeepSeek API...');
        const extraction = await callDeepSeekAPI(message, todayStr, calendar || [], conversationHistory);
        console.log('[DEBUG] Extraction result:', JSON.stringify({
            eventsCount: extraction.events?.length || 0,
            deadlinesCount: extraction.deadlines?.length || 0,
            modificationsCount: extraction.modifications?.length || 0
        }));

        // If no events/deadlines/modifications, return conversational response only
        if (!extraction.events && !extraction.deadlines && !extraction.modifications) {
            return new Response(
                JSON.stringify({
                    events: calendar || [],
                    deadlines: [],
                    assistantMessage: extraction.message,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        let updatedCalendar = [...(calendar || [])];

        // Step 2: Process extracted events using algorithms
        if (extraction.events && extraction.events.length > 0) {
            console.log('[DEBUG] Processing extracted events with algorithms...');
            const processedEvents = processExtractedEntities(extraction.events, todayStr);
            console.log('[DEBUG] Processed events count:', processedEvents.length);

            // Sanitize and add to calendar
            const sanitizedEvents = processedEvents.map(sanitizeEvent);
            updatedCalendar.push(...sanitizedEvents);
        }

        // Step 3: Handle modifications (delete/update/reschedule)
        if (extraction.modifications && extraction.modifications.length > 0) {
            console.log('[DEBUG] Processing modifications...');
            for (const mod of extraction.modifications) {
                if (mod.action === "delete") {
                    // Remove matching events
                    updatedCalendar = updatedCalendar.filter(e => {
                        const titleMatch = mod.target.title &&
                            e.title.toLowerCase().includes(mod.target.title.toLowerCase());
                        const dateMatch = mod.target.date && e.date === mod.target.date;
                        const dayMatch = mod.target.day && e.day === mod.target.day;
                        const typeMatch = mod.target.type && e.type === mod.target.type;

                        // Remove if all specified targets match
                        return !(titleMatch || dateMatch || dayMatch || typeMatch);
                    });
                } else if (mod.action === "update" || mod.action === "reschedule") {
                    // Find and update matching event
                    const index = updatedCalendar.findIndex(e => {
                        const titleMatch = mod.target.title &&
                            e.title.toLowerCase().includes(mod.target.title.toLowerCase());
                        const dateMatch = mod.target.date && e.date === mod.target.date;
                        const dayMatch = mod.target.day && e.day === mod.target.day;
                        return titleMatch || dateMatch || dayMatch;
                    });

                    if (index !== -1 && mod.changes) {
                        updatedCalendar[index] = {
                            ...updatedCalendar[index],
                            ...(mod.changes.title ? { title: mod.changes.title } : {}),
                            ...(mod.changes.date ? { date: mod.changes.date } : {}),
                            ...(mod.changes.start ? { start: mod.changes.start } : {}),
                            ...(mod.changes.end ? { end: mod.changes.end } : {}),
                            ...(mod.changes.location ? { location: mod.changes.location } : {}),
                            ...(mod.changes.notes ? { notes: mod.changes.notes } : {}),
                        };
                    }
                }
            }
        }

        // Step 4: Resolve conflicts
        console.log('[DEBUG] Resolving conflicts...');
        const { events: conflictFreeEvents, notes: conflictNotes, hasUnresolved } = resolveConflicts(updatedCalendar);
        console.log('[DEBUG] Conflict resolution:', {
            conflictFreeCount: conflictFreeEvents.length,
            conflictNotesCount: conflictNotes.length,
            hasUnresolved
        });

        // Step 5: Build assistant message with conflict information
        let assistantMessage = extraction.message;

        if (hasUnresolved) {
            const unresolvedNotes = conflictNotes.filter(n => n.includes("Unresolvable conflict"));
            if (unresolvedNotes.length > 0) {
                assistantMessage = `${extraction.message}\n\n⚠️ ${unresolvedNotes.join(". ")}`;
            }
        } else if (conflictNotes.length > 0) {
            assistantMessage = `${extraction.message}\n\nℹ️ ${conflictNotes.join(". ")}`;
        }

        // Step 6: Process deadlines
        const processedDeadlines: Deadline[] = [];
        if (extraction.deadlines && extraction.deadlines.length > 0) {
            for (const dl of extraction.deadlines) {
                // Resolve temporal reference for deadline date
                const resolvedDate = dl.date; // TODO: Add temporal resolution if needed

                processedDeadlines.push({
                    id: crypto.randomUUID(),
                    title: dl.title,
                    course: dl.course,
                    date: resolvedDate,
                    completed: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    due_time: dl.due_time,
                    duration: dl.duration,
                    min_chunk_duration: dl.min_chunk_duration,
                    splittable: dl.splittable,
                    buffer_hours: dl.buffer_hours,
                    priority: dl.priority,
                    tags: dl.tags,
                });
            }
        }

        // Step 7: Return response
        const responseData = {
            events: conflictFreeEvents,
            deadlines: processedDeadlines,
            assistantMessage,
        };

        console.log('[DEBUG] Final response:', JSON.stringify({
            eventsCount: responseData.events.length,
            deadlinesCount: responseData.deadlines.length,
            message: responseData.assistantMessage.slice(0, 100) + '...'
        }));

        return new Response(
            JSON.stringify(responseData),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({
                error: 'Failed to process request',
                details: error.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
