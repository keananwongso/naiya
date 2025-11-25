import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import API handlers
import { handleParseCategories } from "./api/parse-categories.js";
import { handlePlanWeek } from "./api/plan-week.js";
import { handleUpdateCalendar } from "./api/update-calendar.js";
import { handleNaiyaProcess } from "./api/naiya-process.js";
import { transcribeAudio } from "./lib/llm/transcribe.js";

const app = new Hono();

// Enable CORS for frontend
app.use("/*", cors({
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    credentials: true,
}));

// NEW: Unified Naiya Pipeline Endpoint
app.post("/api/naiya/process", async (c) => {
    const body = await c.req.json();
    console.log("\n📥 [NAIYA-PROCESS] Request:", JSON.stringify(body, null, 2));

    const req = new Request(c.req.url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: c.req.raw.headers,
    });
    const response = await handleNaiyaProcess(req);
    const result = await response.json();

    console.log("📤 [NAIYA-PROCESS] Response:", JSON.stringify(result, null, 2));
    return c.json(result);
});

// NEW: Brain Dump Audio Endpoint
app.post("/brain-dump/audio", async (c) => {
    console.log("\n🎙️ [BRAIN-DUMP] Audio received");
    try {
        const body = await c.req.parseBody();
        const audioFile = body['audio'];

        if (!audioFile || !(audioFile instanceof File)) {
            return c.json({ error: "No audio file provided" }, 400);
        }

        // Validate size (25MB limit)
        if (audioFile.size > 25 * 1024 * 1024) {
            console.error("❌ File too large:", audioFile.size);
            return c.json({ error: "File size exceeds 25MB limit" }, 400);
        }

        console.log(`📦 File size: ${audioFile.size} bytes`);

        // Transcribe
        const transcript = await transcribeAudio(audioFile);
        console.log("📝 Transcript:", transcript);

        // Return transcript as plain text JSON
        return c.json({ transcript });

    } catch (error: any) {
        console.error("❌ [BRAIN-DUMP] Error:", error);
        return c.json({ error: "Transcription failed", details: error.message }, 500);
    }
});

// API Routes - wrap handlers for Hono
app.post("/api/parse-categories", async (c) => {
    const body = await c.req.json();
    console.log("\n📥 [PARSE-CATEGORIES] Request:", JSON.stringify(body, null, 2));

    const req = new Request(c.req.url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: c.req.raw.headers,
    });
    const response = await handleParseCategories(req);
    const result = await response.json();

    console.log("📤 [PARSE-CATEGORIES] Response:", JSON.stringify(result, null, 2));
    return c.json(result);
});

app.post("/api/plan-week", async (c) => {
    const body = await c.req.json();
    console.log("\n📥 [PLAN-WEEK] Request:", JSON.stringify(body, null, 2));

    const req = new Request(c.req.url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: c.req.raw.headers,
    });
    const response = await handlePlanWeek(req);
    const result = await response.json();

    console.log("📤 [PLAN-WEEK] Response:", JSON.stringify(result, null, 2));
    return c.json(result);
});

app.post("/api/update-calendar", async (c) => {
    const body = await c.req.json();
    console.log("\n📥 [UPDATE-CALENDAR] Request:", JSON.stringify(body, null, 2));

    const req = new Request(c.req.url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: c.req.raw.headers,
    });
    const response = await handleUpdateCalendar(req);
    const result = await response.json();

    console.log("📤 [UPDATE-CALENDAR] Response:", JSON.stringify(result, null, 2));
    return c.json(result);
});

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

const port = Number(process.env.PORT) || 3001; // Default to 3001 to avoid conflict with Next.js on 3000

console.log(`Starting server on port ${port}...`);

try {
    const server = serve({
        fetch: app.fetch,
        port,
    });

    // Surface listener errors (e.g., port in use) with a clearer message
    server.on("error", (err: NodeJS.ErrnoException) => {
        if (err?.code === "EADDRINUSE") {
            console.error(
                `Port ${port} is already in use. Set PORT to a free port (e.g., 3101) or stop the other process.`
            );
        } else {
            console.error("Server error:", err);
        }
        process.exit(1);
    });

    console.log(`Server is running on port ${port}`);
} catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error?.code === "EADDRINUSE") {
        console.error(
            `Port ${port} is already in use. Set PORT to a free port (e.g., 3101) or stop the other process.`
        );
    } else {
        console.error("Failed to start server:", error);
    }
    process.exit(1);
}
