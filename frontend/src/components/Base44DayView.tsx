"use client";

import { motion } from "framer-motion";
import {
  format,
  parseISO,
  getHours,
  getMinutes,
  isSameDay,
} from "date-fns";

type Base44Event = {
  id: string;
  title: string;
  start_date: string;
  end_date?: string;
  all_day?: boolean;
  color?: "sage" | "lavender" | "coral" | "sky" | "amber";
  description?: string;
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

export function Base44DayView({ currentDate, events }: Props) {
  const getEventsForHour = (hour: number) =>
    events.filter((event) => {
      if (event.all_day) return false;
      const eventDate = parseISO(event.start_date);
      return isSameDay(eventDate, currentDate) && getHours(eventDate) === hour;
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
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[0_24px_60px_rgba(45,71,57,0.12)]">
      <div className="overflow-auto max-h-[700px]">
        {HOURS.map((hour) => {
          const hourEvents = getEventsForHour(hour);

          return (
            <div
              key={hour}
              className="flex border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--background)] transition-colors"
            >
              {/* Time label */}
              <div className="w-24 p-4 border-r border-[var(--border)] flex-shrink-0">
                <p className="text-sm font-medium text-[var(--muted)]">
                  {format(new Date().setHours(hour, 0, 0, 0), "h:mm a")}
                </p>
              </div>

              {/* Event area */}
              <div className="relative flex-1 min-h-[80px] p-2">
                {hourEvents.map((event) => {
                  const theme = colorThemes[event.color ?? "sage"];
                  const height = getEventHeight(event);
                  const top = getEventTop(event);

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      className={`absolute left-2 right-2 rounded-2xl px-4 py-3 ${theme} border shadow-sm`}
                      style={{
                        top: `${(top / 60) * 100}%`,
                        height:
                          height === "auto"
                            ? "auto"
                            : `${(height as number / 60) * 80}px`,
                        minHeight: "60px",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{event.title}</p>
                          <p className="mt-1 text-xs opacity-70">
                            {format(parseISO(event.start_date), "h:mm a")}
                            {event.end_date &&
                              ` – ${format(parseISO(event.end_date), "h:mm a")}`}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


