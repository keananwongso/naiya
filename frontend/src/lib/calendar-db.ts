import { supabase } from "./supabase";
import { CalendarEvent } from "shared/types";

// Hardcoded user ID for demo purposes (must be a valid UUID)
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function loadCalendar(): Promise<CalendarEvent[]> {
    try {
        const { data, error } = await supabase
            .from("calendars")
            .select("events")
            .eq("user_id", DEMO_USER_ID)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                // Row doesn't exist (PGRST116 is "The result contains 0 rows")
                console.log("Creating new calendar row for demo user...");
                await createDemoUserCalendar();
                return [];
            }
            console.error("Error loading calendar:", error.message || error);
            throw error;
        }

        return (data?.events as CalendarEvent[]) || [];
    } catch (error) {
        console.error("Failed to load calendar:", error);
        return [];
    }
}

export async function saveCalendar(events: CalendarEvent[]): Promise<void> {
    try {
        const { error } = await supabase.from("calendars").upsert({
            user_id: DEMO_USER_ID,
            events: events,
            updated_at: new Date().toISOString(),
        });

        if (error) {
            console.error("Error saving calendar (details):", JSON.stringify(error, null, 2));
            console.error("Error message:", error.message);
            console.error("Error code:", error.code);
            console.error("Error details:", error.details);
            console.error("Supabase URL configured:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
            throw error;
        }
        console.log("Calendar saved successfully");
    } catch (error) {
        console.error("Failed to save calendar:", error);
    }
}

async function createDemoUserCalendar() {
    const { error } = await supabase.from("calendars").insert({
        user_id: DEMO_USER_ID,
        events: [],
        updated_at: new Date().toISOString(),
    });

    if (error) {
        console.error("Error creating demo calendar:", error);
    }
}
