import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Forward to Supabase Edge Function
        const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3001";
        const response = await fetch(`${backendUrl}/functions/v1/naiya-process`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.text();
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
