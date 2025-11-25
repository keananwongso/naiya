import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Get Supabase configuration
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json(
                { error: "Supabase configuration missing" },
                { status: 500 }
            );
        }

        // Call Supabase Edge Function
        const response = await fetch(`${supabaseUrl}/functions/v1/naiya-process`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseAnonKey}`,
                "apikey": supabaseAnonKey,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error("Supabase Edge Function error:", error);
            return NextResponse.json(
                { error: "Backend request failed", details: error },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Naiya process error:", error);
        return NextResponse.json(
            { error: "Failed to process request", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
