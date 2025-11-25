import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get("audio");

        if (!audioFile) {
            return NextResponse.json(
                { error: "No audio file provided" },
                { status: 400 }
            );
        }

        // Get Supabase configuration
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json(
                { error: "Supabase configuration missing" },
                { status: 500 }
            );
        }

        // Forward to Supabase Edge Function
        const supabaseFormData = new FormData();
        supabaseFormData.append("audio", audioFile);

        const response = await fetch(`${supabaseUrl}/functions/v1/brain-dump-audio`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${supabaseAnonKey}`,
                "apikey": supabaseAnonKey,
            },
            body: supabaseFormData,
        });

        if (!response.ok) {
            const error = await response.text();
            console.error("Supabase Edge Function error:", error);
            return NextResponse.json(
                { error: "Transcription failed", details: error },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Audio transcription error:", error);
        return NextResponse.json(
            { error: "Failed to process audio", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
