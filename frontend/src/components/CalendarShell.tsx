"use client";

import { useMemo, useState } from "react";
import {
  addWeeks,
  addMonths,
  addDays,
  eachDayOfInterval,
  endOfMonth,
  formatISO,
  parseISO,
  startOfMonth,
  startOfWeek,
  subWeeks,
  subMonths,
  subDays,
} from "date-fns";
import { CalendarEvent, DayKey } from "shared/types";
import {
  sampleInput,
  samplePlan,
  sampleTranscript,
} from "shared/sampleData";
import { Base44CalendarHeader } from "./Base44CalendarHeader";
import { Base44WeekView } from "./Base44WeekView";
import { Base44MonthView } from "./Base44MonthView";
import { Base44DayView } from "./Base44DayView";

type ViewMode = "week" | "month" | "day";

const weekdayKeys: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const filterToWeekdays = (events: CalendarEvent[]) =>
  events.filter((event) => weekdayKeys.includes(event.day));

type Base44Event = {
  id: string;
  title: string;
  start_date: string;
  end_date?: string;
  all_day?: boolean;
  color?: "sage" | "lavender" | "coral" | "sky" | "amber";
};

const dayOffset: Record<DayKey, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
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

    const matching = events.filter((event) => event.day === weekday);
    for (const event of matching) {
      const [sh, sm] = event.start.split(":").map(Number);
      const [eh, em] = event.end.split(":").map(Number);

      const start = new Date(day);
      start.setHours(sh ?? 0, sm ?? 0, 0, 0);

      const end = new Date(day);
      end.setHours(eh ?? sh ?? 0, em ?? sm ?? 0, 0, 0);

      mapped.push({
        id: `${event.id}-${start.toISOString()}`,
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

export function CalendarShell() {
  const [view, setView] = useState<ViewMode>("week");
  const [weekStartIso, setWeekStartIso] = useState<string>(() => {
    const monday = startOfWeek(parseISO(sampleInput.weekOf), {
      weekStartsOn: 1,
    });
    return formatISO(monday, { representation: "date" });
  });

  const [events, setEvents] = useState<CalendarEvent[]>(() =>
    filterToWeekdays(samplePlan.events),
  );

  const handleNavigate = (action: "prev" | "next" | "today") => {
    if (action === "today") {
      const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
      setWeekStartIso(formatISO(monday, { representation: "date" }));
      return;
    }

    setWeekStartIso((current) => {
      const base = parseISO(current);
      if (action === "prev") {
        if (view === "month") return formatISO(subMonths(base, 1), { representation: "date" });
        if (view === "day") return formatISO(subDays(base, 1), { representation: "date" });
        return formatISO(subWeeks(base, 1), { representation: "date" });
      }
      if (view === "month") return formatISO(addMonths(base, 1), { representation: "date" });
      if (view === "day") return formatISO(addDays(base, 1), { representation: "date" });
      return formatISO(addWeeks(base, 1), { representation: "date" });
    });
  };

  const upsertEvent = (updated: CalendarEvent) => {
    setEvents((prev) =>
      prev.map((event) => (event.id === updated.id ? updated : event)),
    );
  };

  const createEvent = (partial: Omit<CalendarEvent, "id">) => {
    setEvents((prev) => {
      const id = `custom-${prev.length + 1}`;
      const next: CalendarEvent = {
        ...partial,
        id,
        source: partial.source ?? "custom",
      };
      return [...prev, next];
    });
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== id));
  };

  const currentDate = useMemo(() => parseISO(weekStartIso), [weekStartIso]);

  const base44Events = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return toBase44EventsForRange(events, monthStart, monthEnd);
  }, [events, currentDate]);

  return (
    <div className="space-y-4">
      <Base44CalendarHeader
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onNavigate={handleNavigate}
      />

      {view === "week" && (
        <Base44WeekView currentDate={currentDate} events={base44Events} />
      )}

      {view === "month" && (
        <Base44MonthView currentDate={currentDate} events={base44Events} />
      )}

      {view === "day" && (
        <Base44DayView currentDate={currentDate} events={base44Events} />
      )}
    </div>
  );
}

