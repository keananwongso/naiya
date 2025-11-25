"use client";

import { useMemo, useState } from "react";
import {
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  format,
  formatISO,
  parseISO,
  startOfMonth,
  startOfWeek,
  subWeeks,
  addHours,
} from "date-fns";
import { CalendarEvent, DayKey, Tag, Recurrence } from "shared/types";
import {
  sampleInput,
  samplePlan,
} from "shared/sampleData";
import { Base44CalendarHeader } from "./Base44CalendarHeader";
import { Base44WeekView } from "./Base44WeekView";
import { EventEditor } from "./EventEditor";
import { updateCalendar, ScheduleAPIError, processNaiya } from "../lib/api";
import { useEffect } from "react";
import { saveCalendar } from "@/lib/calendar-db";

const weekdayKeys: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const filterToWeekdays = (events: CalendarEvent[]) =>
  events.filter((event) => event.day && weekdayKeys.includes(event.day));

type Base44Event = {
  id: string;
  originalId: string;
  title: string;
  start_date: string;
  end_date?: string;
  all_day?: boolean;
  color?: string; // Changed to string to support dynamic tag colors
  tagId?: string;
  recurrence?: Recurrence;
};

const sourceColor: Record<CalendarEvent["source"], Base44Event["color"]> = {
  class: "sky",
  commitment: "sage",
  study: "amber",
  custom: "lavender",
};

const toBase44EventsForRange = (
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date,
) => {
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  const mapped: Base44Event[] = [];

  for (const day of days) {
    const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
      day.getDay()
    ] as DayKey;
    const dateStr = format(day, 'yyyy-MM-dd');

    const matching = events.filter((event) => {
      // Handle recurring events (by day)
      if (event.day) {
        if (event.day !== weekday) return false;
        // Check if this specific date is excluded
        if (Array.isArray(event.excludedDates) && event.excludedDates.includes(dateStr)) return false;
        return true;
      }

      // Handle one-time events (by date)
      if (event.date) {
        return event.date === dateStr;
      }

      return false;
    });

    for (const event of matching) {
      const [sh, sm] = event.start.split(":").map(Number);
      const [eh, em] = event.end.split(":").map(Number);

      const start = new Date(day);
      start.setHours(sh ?? 0, sm ?? 0, 0, 0);

      const end = new Date(day);
      end.setHours(eh ?? sh ?? 0, em ?? sm ?? 0, 0, 0);

      mapped.push({
        id: `${event.id}-${start.toISOString()}`,
        originalId: event.id,
        title: event.title,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        all_day: false,
        color: sourceColor[event.source] ?? "sage",
      });
    }
  }

  return mapped;
};


export function CalendarShell({
  events,
  setEvents,
  tags,
  onCalendarUpdateRef,
  setAssistantMessage: setParentAssistantMessage,
  setIsProcessing: setParentIsProcessing,
}: {
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  tags: Tag[];
  onCalendarUpdateRef?: React.MutableRefObject<((message: string) => Promise<void>) | null>;
  setAssistantMessage?: React.Dispatch<React.SetStateAction<string>>;
  setIsProcessing?: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [weekStartIso, setWeekStartIso] = useState<string>(() => {
    const monday = startOfWeek(parseISO(sampleInput.weekOf), {
      weekStartsOn: 1,
    });
    return formatISO(monday, { representation: "date" });
  });

  const [selectedEvent, setSelectedEvent] = useState<Base44Event | null>(null);
  const [localIsProcessing, setLocalIsProcessing] = useState(false);
  const [localAssistantMessage, setLocalAssistantMessage] = useState<string>("");
  const [apiError, setApiError] = useState<string | null>(null);

  const handleNavigate = (action: "prev" | "next" | "today") => {
    if (action === "today") {
      const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
      setWeekStartIso(formatISO(monday, { representation: "date" }));
      return;
    }

    setWeekStartIso((current) => {
      const base = parseISO(current);
      if (action === "prev") {
        return formatISO(subWeeks(base, 1), { representation: "date" });
      }
      return formatISO(addWeeks(base, 1), { representation: "date" });
    });
  };

  const handleEventUpdate = (updated: Base44Event) => {
    setEvents((prev) => {
      const nextEvents = prev.map((event) => {
        if (event.id === updated.originalId) {
          const newStart = parseISO(updated.start_date);
          const newEnd = updated.end_date
            ? parseISO(updated.end_date)
            : addHours(newStart, 1);

          // Preserve whether this is a recurring or one-time event
          if (event.day) {
            // Recurring event - update day
            return {
              ...event,
              day: format(newStart, "EEE") as DayKey,
              start: format(newStart, "HH:mm"),
              end: format(newEnd, "HH:mm"),
            };
          } else if (event.date) {
            // One-time event - update date
            return {
              ...event,
              date: format(newStart, 'yyyy-MM-dd'),
              start: format(newStart, "HH:mm"),
              end: format(newEnd, "HH:mm"),
            };
          }
        }
        return event;
      });

      saveCalendar(nextEvents).catch((err) =>
        console.error("Failed to save calendar after update", err)
      );
      return nextEvents;
    });
  };

  const handleDeleteEvent = (originalId: string) => {
    setEvents((prev) => {
      const nextEvents = prev.filter((e) => e.id !== originalId);
      saveCalendar(nextEvents).catch((err) =>
        console.error("Failed to save calendar after delete", err)
      );
      return nextEvents;
    });
  };

  const handleCreateEvent = (event: Base44Event, recurrence?: Recurrence) => {
    const newStart = parseISO(event.start_date);
    const newEnd = event.end_date
      ? parseISO(event.end_date)
      : addHours(newStart, 1);

    // Helper to create a single event
    const createSingleEvent = (day: DayKey, startIso: Date, endIso: Date) => ({
      id: `custom-${Date.now()}-${Math.random()}`,
      title: event.title || "New Event",
      day,
      start: format(startIso, "HH:mm"),
      end: format(endIso, "HH:mm"),
      source: "custom" as const,
      tagId: event.tagId,
      recurrence,
      type: "OTHER" as const,
      flexibility: "medium" as const,
    });

    const newEvents: CalendarEvent[] = [];

    if (recurrence?.type === "daily") {
      weekdayKeys.forEach(day => {
        // For simplicity in this weekly view, we just replicate the time for each day
        // In a real date-based system we'd calculate exact dates, but here 'day' is the key
        newEvents.push(createSingleEvent(day, newStart, newEnd));
      });
    } else if (recurrence?.type === "custom" && recurrence.days) {
      (recurrence.days as DayKey[]).forEach(day => {
        newEvents.push(createSingleEvent(day, newStart, newEnd));
      });
    } else {
      // No recurrence or weekly (which is just this one event)
      newEvents.push(createSingleEvent(format(newStart, "EEE") as DayKey, newStart, newEnd));
    }

    setEvents((prev) => {
      const nextEvents = [...prev, ...newEvents];
      saveCalendar(nextEvents).catch((err) =>
        console.error("Failed to save calendar after create", err)
      );
      return nextEvents;
    });
  };

  // Optimistic update predictor - simplified to only handle very obvious deletions
  const predictOptimisticUpdate = (message: string, currentEvents: CalendarEvent[]): CalendarEvent[] | null => {
    // DISABLED: Optimistic updates are too error-prone and cause UI jank
    // The LLM is fast enough that we don't need them
    // Just show a loading state instead
    return null;
  };

  const handleCalendarUpdate = async (message: string) => {
    const setProcessing = setParentIsProcessing || setLocalIsProcessing;
    const setMessage = setParentAssistantMessage || setLocalAssistantMessage;

    setProcessing(true);
    setApiError(null);

    try {
      // Unified Naiya pipeline handles adds/moves/deletes and produces full calendar
      const backendEvents = events.map(e => ({
        ...e,
        flexibility: e.flexibility || (e.type === "COMMITMENT" ? "fixed" : "medium"),
      }));

      const result = await processNaiya(backendEvents, message);
      setMessage(result.assistantMessage);

      if (result.events) {
        // Use LLM result as source of truth
        setEvents(result.events);
        saveCalendar(result.events).catch((err) =>
          console.error("Failed to save calendar after AI update", err)
        );
      }

      // Save deadlines to Supabase if any were returned
      if (result.deadlines && result.deadlines.length > 0) {
        const { addDeadline } = await import("@/lib/deadline-db");

        // Add each deadline individually
        for (const d of result.deadlines) {
          try {
            await addDeadline({
              title: d.title,
              course: d.course,
              dueDate: d.date,
              importance: d.importance || 'medium',
              completed: false,
            });
          } catch (err) {
            console.error("Failed to add deadline:", d.title, err);
          }
        }
        console.log(`Added ${result.deadlines.length} deadline(s) to Supabase`);
      }
    } catch (error) {
      if (error instanceof ScheduleAPIError) {
        setApiError(error.message);
        setMessage(`Error: ${error.message}`);
      } else {
        setApiError("An unexpected error occurred");
        setMessage("Sorry, I encountered an error processing your request.");
      }
      console.error("Calendar update error:", error);
    } finally {
      setProcessing(false);
    }
  };

  // Expose handleCalendarUpdate via ref
  useEffect(() => {
    if (onCalendarUpdateRef) {
      onCalendarUpdateRef.current = handleCalendarUpdate;
    }
  }, [onCalendarUpdateRef, events]);

  const handleSaveEvent = (updated: Base44Event, recurrence?: Recurrence) => {
    // If recurrence changed, we might need to delete old and create new, 
    // but for now let's just update the single event if no recurrence change logic is requested.
    // The user request implies editing recurrence, which is complex for existing events.
    // For this iteration, let's assume editing recurrence on an existing event 
    // applies to THAT event only unless we implement "update series".
    // Given the scope, let's stick to updating the single event properties + tag.

    setEvents((prev) => {
      const updatedEvents = prev.map((event) => {
        if (event.id === updated.originalId) {
          return {
            ...event,
            title: updated.title,
            tagId: updated.tagId,
          };
        }
        return event;
      });

      // If recurrence is requested, generate new events
      if (recurrence && recurrence.type !== "none") {
        const originalEvent = updatedEvents.find(e => e.id === updated.originalId);
        if (originalEvent) {
          const newStart = parseISO(updated.start_date);
          const newEnd = updated.end_date ? parseISO(updated.end_date) : addHours(newStart, 1);

          const createSingleEvent = (day: DayKey, startIso: Date, endIso: Date) => ({
            id: `custom-${Date.now()}-${Math.random()}`,
            title: updated.title || "New Event",
            day,
            start: format(startIso, "HH:mm"),
            end: format(endIso, "HH:mm"),
            source: "custom" as const,
            tagId: updated.tagId,
            recurrence,
            type: "OTHER" as const,
            flexibility: "medium" as const,
          });

          const generatedEvents: CalendarEvent[] = [];

          if (recurrence.type === "daily") {
            weekdayKeys.forEach(day => {
              if (day !== originalEvent.day) { // Don't duplicate the original day
                generatedEvents.push(createSingleEvent(day, newStart, newEnd));
              }
            });
          } else if (recurrence.type === "custom" && recurrence.days) {
            (recurrence.days as DayKey[]).forEach(day => {
              if (day !== originalEvent.day) {
                generatedEvents.push(createSingleEvent(day, newStart, newEnd));
              }
            });
          }

          const combined = [...updatedEvents, ...generatedEvents];
          saveCalendar(combined).catch((err) =>
            console.error("Failed to save calendar after recurrence edit", err)
          );
          return combined;
        }
      }

      saveCalendar(updatedEvents).catch((err) =>
        console.error("Failed to save calendar after edit", err)
      );
      return updatedEvents;
    });
  };

  const currentDate = useMemo(() => parseISO(weekStartIso), [weekStartIso]);

  const base44Events = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    // Custom mapping to use tags
    const mapped: Base44Event[] = [];
    // We can reuse the logic from toBase44EventsForRange but we need to inject it here or modify the helper
    // Let's inline the logic or modify the helper to accept tags.
    // Since the helper is outside, let's move it inside or pass tags to it.
    // Actually, I'll just rewrite the mapping here to be safe and simple.

    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    for (const day of days) {
      const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
        day.getDay()
      ] as DayKey;
      const dateStr = format(day, 'yyyy-MM-dd');

      const matching = events.filter((event) => {
        // Handle recurring events (by day)
        if (event.day) {
          if (event.day !== weekday) return false;
          // Check if this specific date is excluded
          if (Array.isArray(event.excludedDates) && event.excludedDates.includes(dateStr)) return false;
          return true;
        }

        // Handle one-time events (by date)
        if (event.date) {
          return event.date === dateStr;
        }

        return false;
      });
      for (const event of matching) {
        const [sh, sm] = event.start.split(":").map(Number);
        const [eh, em] = event.end.split(":").map(Number);

        const start = new Date(day);
        start.setHours(sh ?? 0, sm ?? 0, 0, 0);

        const end = new Date(day);
        end.setHours(eh ?? sh ?? 0, em ?? sm ?? 0, 0, 0);

        // Find tag color
        const tag = tags.find(t => t.id === event.tagId);
        const color = tag ? tag.color : (sourceColor[event.source] ?? "sage");

        mapped.push({
          id: `${event.id}-${start.toISOString()}`,
          originalId: event.id,
          title: event.title,
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          all_day: false,
          color: color as string, // Cast to string
          tagId: event.tagId,
          recurrence: event.recurrence,
        });
      }
    }
    return mapped;

  }, [events, currentDate, tags]);

  return (
    <div className="flex flex-col h-full relative">
      <Base44CalendarHeader
        currentDate={currentDate}
        onNavigate={handleNavigate}
      />

      <div className="flex-1 overflow-hidden">
        <Base44WeekView
          currentDate={currentDate}
          events={base44Events}
          onEventUpdate={handleEventUpdate}
          onEventDelete={handleDeleteEvent}
          onEventCreate={handleCreateEvent}
          onEventClick={setSelectedEvent}
        />
      </div>

      <EventEditor
        key={selectedEvent?.id ?? "closed"}
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        tags={tags}
      />
    </div>
  );
}
