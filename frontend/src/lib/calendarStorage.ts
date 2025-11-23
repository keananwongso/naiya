import { CalendarEvent } from "shared/types";
import { supabase } from "./supabaseClient";
import { getUserId } from "./user";

type PersistedEvent = Pick<
  CalendarEvent,
  "id" | "title" | "type" | "day" | "start" | "end" | "flexibility" | "course"
> &
  Partial<Pick<CalendarEvent, "source" | "tagId" | "notes" | "recurrence">>;

const sanitizeEvents = (events: CalendarEvent[]): PersistedEvent[] =>
  events.map((event) => ({
    id: event.id,
    title: event.title,
    type: event.type ?? "OTHER",
    day: event.day,
    start: event.start,
    end: event.end,
    flexibility: event.flexibility ?? "medium",
    course: event.course,
    // Preserve optional frontend fields so UI keeps colors/notes
    source: event.source ?? "custom",
    tagId: event.tagId,
    notes: event.notes,
    recurrence: event.recurrence,
  }));

const hydrateEvents = (events: PersistedEvent[] | null): CalendarEvent[] => {
  if (!events) return [];
  return events.map((event) => ({
    ...event,
    source: event.source ?? "custom",
    flexibility: event.flexibility ?? "medium",
    type: event.type ?? "OTHER",
  })) as CalendarEvent[];
};

export async function loadCalendar(): Promise<CalendarEvent[]> {
  const userId = getUserId();
  const { data, error } = await supabase
    .from("calendars")
    .select("events")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("[Supabase] Failed to load calendar", error);
    // If no row exists yet, create a starter row to reduce future errors
    if ((error as any)?.code === "PGRST116") {
      await supabase.from("calendars").upsert({
        id: userId, // ensure primary key is set if table expects it
        user_id: userId,
        events: [],
        updated_at: new Date().toISOString(),
      });
    }
    return [];
  }

  console.log("[Supabase] Loaded calendar for user", userId);
  return hydrateEvents((data as any)?.events || []);
}

export async function saveCalendar(events: CalendarEvent[]): Promise<void> {
  const userId = getUserId();
  const payload = sanitizeEvents(events);
  const { error } = await supabase
    .from("calendars")
    .upsert(
      {
        id: userId, // ensure primary key exists
        user_id: userId,
        events: payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error(
      "[Supabase] Failed to save calendar",
      error,
      (error as any)?.message,
      (error as any)?.details
    );
  } else {
    console.log(
      `[Supabase] Saved calendar for user ${userId} (${payload.length} events)`
    );
  }
}
