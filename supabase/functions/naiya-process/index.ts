import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { message, calendar, currentDate, conversationHistory } = await req.json()

        if (!message || typeof message !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Message is required and must be a string' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get OpenAI API key from environment
        const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openaiApiKey) {
            throw new Error('OPENAI_API_KEY not configured')
        }

        // Call OpenAI to process the request
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are Naiya, a helpful AI assistant that manages calendars. 
Current date: ${currentDate || new Date().toISOString().split('T')[0]}

Analyze the user's message and return a JSON response with:
- events: array of calendar events to add/modify
- deadlines: array of deadlines extracted
- assistantMessage: friendly response to the user

Calendar event format:
{
  "id": "unique-id",
  "title": "Event Title",
  "start": "HH:MM",
  "end": "HH:MM",
  "day": "Mon|Tue|Wed|Thu|Fri|Sat|Sun" (for recurring),
  "date": "YYYY-MM-DD" (for one-time),
  "type": "CLASS|COMMITMENT|STUDY|OTHER",
  "flexibility": "fixed|medium|flexible",
  "source": "custom"
}

Current calendar: ${JSON.stringify(calendar || [])}`
                    },
                    ...(conversationHistory || []),
                    { role: 'user', content: message }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.7,
            }),
        })

        if (!openaiResponse.ok) {
            const error = await openaiResponse.text()
            throw new Error(`OpenAI API error: ${error}`)
        }

        const openaiData = await openaiResponse.json()
        const aiResponse = JSON.parse(openaiData.choices[0].message.content)

        // Return the processed result
        return new Response(
            JSON.stringify({
                events: aiResponse.events || calendar || [],
                deadlines: aiResponse.deadlines || [],
                assistantMessage: aiResponse.assistantMessage || "I've processed your request!",
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({
                error: 'Failed to process request',
                details: error.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
