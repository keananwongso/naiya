import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const formData = await req.formData()
        const audioFile = formData.get('audio')

        console.log('Received audio file:', audioFile ? 'Yes' : 'No')
        console.log('Audio file type:', audioFile instanceof File ? audioFile.type : 'Not a File')
        console.log('Audio file size:', audioFile instanceof File ? audioFile.size : 'N/A')

        if (!audioFile || !(audioFile instanceof File)) {
            return new Response(
                JSON.stringify({ error: 'No audio file provided' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get OpenAI API key
        const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openaiApiKey) {
            throw new Error('OPENAI_API_KEY not configured')
        }

        // Create form data for OpenAI Whisper API
        const whisperFormData = new FormData()
        whisperFormData.append('file', audioFile)
        whisperFormData.append('model', 'whisper-1')

        console.log('Calling Whisper API...')

        // Call OpenAI Whisper API
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: whisperFormData,
        })

        console.log('Whisper API response status:', response.status)

        if (!response.ok) {
            const error = await response.text()
            console.error('Whisper API error response:', error)
            throw new Error(`Whisper API error: ${error}`)
        }

        const data = await response.json()

        return new Response(
            JSON.stringify({ transcript: data.text }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Transcription error:', error)
        return new Response(
            JSON.stringify({
                error: 'Transcription failed',
                details: error.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
