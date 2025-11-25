import { supabase } from "./supabase";
import { CalendarEvent } from "shared/types";

export async function loadCalendar(): Promise<CalendarEvent[]> {
    try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.error("No user logged in - cannot load calendar");
            return [];
        }

        // Load from Supabase
        const { data, error } = await supabase
            .from("calendars")
            .select("events")
            .eq("user_id", user.id)
            .single();

        if (error) {
            // If row doesn't exist, return empty array
            if (error.code === "PGRST116") {
                console.log("No calendar found for user, returning empty array");
                return [];
            }
            console.error("Supabase load error:", error);
            return [];
        }

        console.log("Calendar loaded from Supabase successfully");
        return (data?.events as CalendarEvent[]) || [];
    } catch (error) {
        console.error("Failed to load calendar:", error);
        return [];
    }
}

export async function saveCalendar(events: CalendarEvent[]): Promise<void> {
    try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error("No user logged in - cannot save calendar");
            return;
        }

        const { error } = await supabase.from("calendars").upsert({
            user_id: user.id,
            events: events,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'user_id'  // Specify which column to match on for upsert
        });

        if (error) {
            console.error("Supabase save error:", error);
            return;
        }

        console.log("Calendar saved to Supabase successfully");
    } catch (error) {
        console.error("Failed to save calendar to Supabase:", error);
    }
}
