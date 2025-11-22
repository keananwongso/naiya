"use client";

import { motion } from "framer-motion";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

type Base44Event = {
  id: string;
  title: string;
  start_date: string;
  end_date?: string;
  all_day?: boolean;
  color?: "sage" | "lavender" | "coral" | "sky" | "amber";
};

const colorThemes: Record<NonNullable<Base44Event["color"]>, string> = {
  sage: "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--foreground)]",
  lavender:
    "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--foreground)]",
  coral:
    "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--foreground)]",
  sky: "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--foreground)]",
  amber:
    "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--foreground)]",
};

type Props = {
  currentDate: Date;
  events: Base44Event[];
};

export function Base44MonthView({ currentDate, events }: Props) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date) =>
    events.filter((event) =>
      isSameDay(parseISO(event.start_date), day),
    );

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_24px_60px_rgba(45,71,57,0.12)]">
      <div className="grid grid-cols-7 gap-px rounded-2xl border border-[var(--border)] bg-[var(--background)] text-[11px] text-[var(--muted)]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
          <div
            key={label}
            className="bg-[var(--surface)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
          >
            {label}
          </div>
        ))}
        {days.map((day) => {
          const inMonth =
            day.getMonth() === currentDate.getMonth();
          const dayEvents = getEventsForDay(day);
          return (
            <div
              key={day.toISOString()}
              className="flex min-h-[90px] flex-col gap-1 bg-[var(--surface)] px-2.5 py-2"
            >
              <span
                className={`self-end text-[11px] ${
                  inMonth ? "text-[var(--foreground)]" : "text-[var(--muted)]/40"
                }`}
              >
                {format(day, "d")}
              </span>
              <div className="flex-1 space-y-1">
                {dayEvents.slice(0, 3).map((event) => {
                  const theme = colorThemes[event.color ?? "sage"];
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-md border px-2 py-1 text-[11px] font-medium ${theme} truncate`}
                    >
                      {event.title}
                    </motion.div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] font-medium text-[var(--muted)]/70">
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


