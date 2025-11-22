"use client";

import { motion } from "framer-motion";
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isToday,
  startOfWeek,
  parseISO,
  getHours,
  getMinutes,
  isSameDay,
} from "date-fns";
import { Clock } from "lucide-react";

type Base44Event = {
  id: string;
  title: string;
  start_date: string; // ISO
  end_date?: string; // ISO
  all_day?: boolean;
  color?: "sage" | "lavender" | "coral" | "sky" | "amber";
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const colorThemes: Record<NonNullable<Base44Event["color"]>, string> = {
  sage: "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--foreground)] hover:bg-[var(--accent-soft)]",
  lavender:
    "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--foreground)] hover:bg-[var(--accent-soft)]",
  coral:
    "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--foreground)] hover:bg-[var(--accent-soft)]",
  sky: "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--foreground)] hover:bg-[var(--accent-soft)]",
  amber:
    "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--foreground)] hover:bg-[var(--accent-soft)]",
};

type Props = {
  currentDate: Date;
  events: Base44Event[];
};

export function Base44WeekView({ currentDate, events }: Props) {
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getEventsForDayAndHour = (day: Date, hour: number) =>
    events.filter((event) => {
      if (event.all_day) return false;
      const eventDate = parseISO(event.start_date);
      return isSameDay(eventDate, day) && getHours(eventDate) === hour;
    });

  const getEventHeight = (event: Base44Event) => {
    if (event.all_day) return "auto";
    const start = parseISO(event.start_date);
    const end = event.end_date ? parseISO(event.end_date) : start;
    const duration = (end.getTime() - start.getTime()) / (1000 * 60);
    return Math.max(duration, 30);
  };

  const getEventTop = (event: Base44Event) => {
    const start = parseISO(event.start_date);
    return getMinutes(start);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--surface)]">
      <div className="flex-1 overflow-auto overscroll-contain relative">
        {/* Sticky Header with days */}
        <div className="sticky top-0 z-20 grid grid-cols-[60px_repeat(7,1fr)] border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="p-4 border-r border-[var(--border)] flex items-center justify-center">
            <Clock className="h-4 w-4 text-[var(--muted)]/70" />
          </div>
          {days.map((day) => {
            const isDayToday = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className="p-4 text-center border-r border-[var(--border)] last:border-r-0"
              >
                <div className="text-xs font-medium text-[var(--muted)] uppercase mb-1 tracking-[0.16em]">
                  {format(day, "EEE")}
                </div>
                <div
                  className={`text-2xl font-light inline-flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                    isDayToday
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "text-[var(--foreground)]"
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[var(--border)] last:border-b-0"
          >
            {/* Hour label */}
            <div className="p-2 border-r border-[var(--border)] text-[10px] text-[var(--muted)] font-medium h-12 flex items-center justify-center">
              {format(new Date().setHours(hour, 0, 0, 0), "h a")}
            </div>

            {/* Day columns */}
            {days.map((day) => {
              const hourEvents = getEventsForDayAndHour(day, hour);
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className="relative border-r border-[var(--border)] last:border-r-0 h-12 hover:bg-[var(--background)] transition-colors"
                >
                  {hourEvents.map((event) => {
                    const theme = colorThemes[event.color ?? "sage"];
                    const height = getEventHeight(event);
                    const top = getEventTop(event);

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`absolute left-0.5 right-0.5 rounded-lg px-2 py-1 text-[10px] font-medium ${theme} border cursor-default transition-all overflow-hidden shadow-sm`}
                        style={{
                          top: `${(top / 60) * 100}%`,
                          height:
                            height === "auto"
                              ? "auto"
                              : `${(height as number / 60) * 100}%`,
                          minHeight: "24px",
                          zIndex: 10,
                        }}
                      >
                        <p className="truncate font-semibold leading-tight">
                          {event.title}
                        </p>
                        <p className="mt-0.5 text-[9px] opacity-70 leading-tight">
                          {format(parseISO(event.start_date), "h:mm a")}
                          {event.end_date &&
                            ` – ${format(parseISO(event.end_date), "h:mm a")}`}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
