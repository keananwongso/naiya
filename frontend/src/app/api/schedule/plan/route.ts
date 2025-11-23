import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Forward to backend server
        const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
        const response = await fetch(`${backendUrl}/api/plan-week`, {
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
        console.error("Plan week error:", error);
        return NextResponse.json(
            { error: "Failed to plan week", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
