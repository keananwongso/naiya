"use client";

import { dayNames, orderByStart } from "shared/generator";
import { CalendarEvent } from "shared/types";
import { getCurrentDay, getCurrentTimeInMinutes, timeToMinutes } from "@/lib/dateUtils";
import { useEffect, useState } from "react";

type Props = {
  events: CalendarEvent[];
  title?: string;
};

const sourceStyles: Record<string, string> = {
  class:
    "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)] shadow-[0_14px_40px_rgba(45,71,57,0.16)]",
  commitment:
    "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)] shadow-[0_14px_40px_rgba(45,71,57,0.16)]",
  study:
    "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)] shadow-[0_14px_40px_rgba(45,71,57,0.16)]",
  custom: "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]",
};

const sourceLabel: Record<string, string> = {
  class: "Class",
  commitment: "Commitment",
  study: "Study",
  custom: "Event",
};

export function ScheduleGrid({ events, title }: Props) {
  const [currentDay, setCurrentDay] = useState(getCurrentDay());
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(getCurrentTimeInMinutes());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDay(getCurrentDay());
      setCurrentTimeMinutes(getCurrentTimeInMinutes());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Calculate position of time indicator (0-100%)
  const getTimeIndicatorPosition = () => {
    // Assuming calendar shows 12 AM to 12 AM (24 hours)
    const startMinutes = 0; // 12 AM
    const endMinutes = 24 * 60; // 12 AM next day
    const position = ((currentTimeMinutes - startMinutes) / (endMinutes - startMinutes)) * 100;
    return Math.max(0, Math.min(100, position));
  };

  return (
    <section className="card rounded-3xl p-6">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Weekly calendar
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">
            {title ?? "One place for the week"}
          </h2>
          <p className="text-sm text-slate-600">
            Naiya blends classes, commitments, and suggested study blocks into a
            single source of truth. Drag to tweak later.
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-slate-800">
          Drag, resize, regenerate
        </div>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        {dayNames.slice(0, 5).map((day) => {
          const dayEvents = events
            .filter((event) => event.day === day)
            .sort(orderByStart);
          const isCurrentDay = day === currentDay;

          return (
            <div
              key={day}
              className={`rounded-2xl border p-4 shadow-sm relative ${isCurrentDay
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]/20 ring-2 ring-[var(--accent)]/30"
                  : "border-slate-200/80 bg-[var(--surface)]/80"
                }`}
            >
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${isCurrentDay ? "bg-[var(--accent)] animate-pulse" : "bg-[var(--accent)]"
                    }`} />
                  <p className={`text-sm font-semibold ${isCurrentDay ? "text-[var(--accent)]" : "text-slate-900"
                    }`}>
                    {day}
                    {isCurrentDay && <span className="ml-2 text-xs text-slate-500">(Today)</span>}
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {dayEvents.length} items
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`rounded-xl border px-3 py-2 text-sm transition hover:-translate-y-0.5 ${sourceStyles[event.source] ?? sourceStyles.custom}`}
                  >
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em]">
                      <span>{sourceLabel[event.source] ?? "Event"}</span>
                      {event.flexibility === "fixed" && (
                        <span className="rounded-full border border-current px-2 py-0.5 text-[10px]">
                          Fixed
                        </span>
                      )}
                    </div>
                    <p className="text-base font-semibold leading-tight text-slate-900">
                      {event.title}
                    </p>
                    <p className="text-sm text-slate-700">
                      {event.start} - {event.end}
                    </p>
                    {event.course && (
                      <p className="text-xs text-slate-600">{event.course}</p>
                    )}
                  </div>
                ))}
                {!dayEvents.length && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-[var(--background)] px-3 py-4 text-sm text-slate-500">
                    Free to schedule
                  </div>
                )}
              </div>

              {/* Current time indicator */}
              {isCurrentDay && (
                <div
                  className="absolute left-4 right-4 flex items-center pointer-events-none"
                  style={{ top: `${getTimeIndicatorPosition()}%` }}
                >
                  <div className="h-0.5 w-full bg-red-500 relative">
                    <div className="absolute left-0 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                    <div className="absolute right-0 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {dayNames.slice(5).map((day) => {
          const dayEvents = events
            .filter((event) => event.day === day)
            .sort(orderByStart);
          const isCurrentDay = day === currentDay;

          return (
            <div
              key={day}
              className={`rounded-2xl border p-4 shadow-sm relative ${isCurrentDay
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]/20 ring-2 ring-[var(--accent)]/30"
                  : "border-slate-200/80 bg-[var(--surface)]/80"
                }`}
            >
              <div className="flex items-baseline justify-between">
                <p className={`text-sm font-semibold ${isCurrentDay ? "text-[var(--accent)]" : "text-slate-900"
                  }`}>
                  {day}
                  {isCurrentDay && <span className="ml-2 text-xs text-slate-500">(Today)</span>}
                </p>
                <span className="text-xs text-slate-500">
                  {dayEvents.length} items
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`rounded-xl border px-3 py-2 text-sm transition hover:-translate-y-0.5 ${sourceStyles[event.source] ?? sourceStyles.custom}`}
                  >
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em]">
                      <span>{sourceLabel[event.source] ?? "Event"}</span>
                      {event.flexibility === "fixed" && (
                        <span className="rounded-full border border-current px-2 py-0.5 text-[10px]">
                          Fixed
                        </span>
                      )}
                    </div>
                    <p className="text-base font-semibold leading-tight text-slate-900">
                      {event.title}
                    </p>
                    <p className="text-sm text-slate-700">
                      {event.start} - {event.end}
                    </p>
                  </div>
                ))}
                {!dayEvents.length && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-[var(--background)] px-3 py-4 text-sm text-slate-500">
                    Free to schedule
                  </div>
                )}
              </div>

              {/* Current time indicator */}
              {isCurrentDay && (
                <div
                  className="absolute left-4 right-4 flex items-center pointer-events-none"
                  style={{ top: `${getTimeIndicatorPosition()}%` }}
                >
                  <div className="h-0.5 w-full bg-red-500 relative">
                    <div className="absolute left-0 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                    <div className="absolute right-0 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
