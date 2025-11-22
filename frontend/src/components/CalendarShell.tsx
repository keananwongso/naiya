"use client";

import { useMemo, useState } from "react";
import {
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  formatISO,
  parseISO,
  startOfMonth,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { CalendarEvent, DayKey } from "shared/types";
import {
  sampleInput,
  samplePlan,
} from "shared/sampleData";
import { Base44CalendarHeader } from "./Base44CalendarHeader";
import { Base44WeekView } from "./Base44WeekView";

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
        return formatISO(subWeeks(base, 1), { representation: "date" });
      }
      return formatISO(addWeeks(base, 1), { representation: "date" });
    });
  };

  const currentDate = useMemo(() => parseISO(weekStartIso), [weekStartIso]);

  const base44Events = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return toBase44EventsForRange(events, monthStart, monthEnd);
  }, [events, currentDate]);

  return (
    <div className="flex flex-col h-full">
      <Base44CalendarHeader
        currentDate={currentDate}
        onNavigate={handleNavigate}
      />

      <div className="flex-1 overflow-hidden">
        <Base44WeekView currentDate={currentDate} events={base44Events} />
      </div>
    </div>
  );
}
