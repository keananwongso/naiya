"use client";
import { CalendarEvent, DayKey } from "shared/types";
import { useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "naiya";
  text: string;
};

type Props = {
  weekStart: string;
  events: CalendarEvent[];
  transcript: ChatMessage[];
  startHour?: number;
  endHour?: number;
};

const visibleDays: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const formatHour = (hour: number) => {
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = ((hour + 11) % 12) + 1;
  return `${display} ${suffix}`;
};

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const weekLabel = (iso: string) => {
  const start = new Date(iso);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return {
    range: `${startLabel} – ${endLabel}`,
    year: start.getFullYear(),
  };
};

export function CalendarCanvas({
  weekStart,
  events,
  transcript,
  startHour = 9,
  endHour = 21,
}: Props) {
  const [split, setSplit] = useState(0.6); // calendar share on desktop
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragging.current || window.innerWidth < 1024) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = (event.clientX - rect.left) / rect.width;
      const clamped = Math.min(0.8, Math.max(0.35, next));
      setSplit(clamped);
    };

    const handleUp = () => {
      dragging.current = false;
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, []);

  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i,
  );
  const { range, year } = weekLabel(weekStart);
  const totalMinutes = (endHour - startHour) * 60;

  const dayEvents = useMemo(
    () =>
      visibleDays.reduce<Record<DayKey, CalendarEvent[]>>(
        (acc, day) => {
          acc[day] = events.filter((event) => event.day === day);
          return acc;
        },
        {} as Record<DayKey, CalendarEvent[]>,
      ),
    [events],
  );

  const positionStyles = (event: CalendarEvent) => {
    const start = timeToMinutes(event.start);
    const end = timeToMinutes(event.end);
    const top = ((start - startHour * 60) / totalMinutes) * 100;
    const height = ((end - start) / totalMinutes) * 100;
    return {
      top: `${top}%`,
      height: `${height}%`,
      left: "10px",
      right: "10px",
    };
  };

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-white px-3 py-4 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:px-4 md:px-5 lg:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-semibold tracking-tight lg:text-2xl">
            {range}
          </p>
          <span className="text-base font-semibold text-slate-500">{year}</span>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[#f7f3ec] px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
          Live calendar
        </span>
      </div>

      <div
        ref={containerRef}
        className="grid gap-4 lg:grid-cols-[minmax(0,60%)_auto_minmax(0,40%)]"
        style={{
          gridTemplateColumns: `minmax(0, ${Math.round(split * 100)}%) auto minmax(300px, 1fr)`,
        }}
      >
        <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[#fffaf2] p-4">
          <div className="grid grid-cols-[64px_repeat(5,1fr)] items-end gap-x-3 px-1 text-sm font-medium text-[var(--muted)]">
            <div />
            {visibleDays.map((day) => (
              <div key={day} className="text-center tracking-tight">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-x-3 px-1">
            <div className="relative h-[620px]">
              {hours.map((hour, idx) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-[var(--border)]"
                  style={{ top: `${(idx / (hours.length - 1)) * 100}%` }}
                >
                  <span className="-ml-1 -translate-y-2 rounded-full bg-white px-2 text-xs font-medium text-[var(--muted)]">
                    {formatHour(hour)}
                  </span>
                </div>
              ))}
            </div>

            {visibleDays.map((day) => (
              <div
                key={day}
                className="relative h-[620px] overflow-hidden rounded-xl border border-[var(--border)] bg-white"
              >
                {hours.map((_, idx) => (
                  <div
                    key={`${day}-row-${idx}`}
                    className="absolute left-0 right-0 border-t border-[#eee7dc]"
                    style={{ top: `${(idx / (hours.length - 1)) * 100}%` }}
                  />
                ))}

                {dayEvents[day].map((event) => (
                  <div
                    key={event.id}
                    className="absolute rounded-xl border border-[#a9c3a2] bg-[#d8f3dc] px-3 py-2 text-sm font-semibold text-[#2d4739] shadow-[0_14px_36px_rgba(45,71,57,0.16)]"
                    style={positionStyles(event)}
                  >
                    <p className="text-[13px] font-semibold leading-tight">
                      {event.title}
                    </p>
                    <p className="text-xs font-medium text-[#2d4739]">
                      {event.start} – {event.end}
                    </p>
                  </div>
                ))}

                {!dayEvents[day].length && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
                    Free
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="hidden cursor-col-resize items-center justify-center lg:flex">
          <div
            onPointerDown={() => {
              dragging.current = true;
              document.body.style.userSelect = "none";
            }}
            className="flex h-full w-6 items-center justify-center"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize calendar and chat"
          >
            <div className="h-14 w-1.5 rounded-full bg-[var(--border)]" />
          </div>
        </div>

        <div className="flex h-full flex-col gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[0_16px_36px_rgba(45,71,57,0.08)]">
          <div>
            <p className="text-xl font-semibold text-[var(--foreground)]">Naiya Chat</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Tell Naiya about classes, exams, work, gym, and what you want to protect—she’ll adjust
              the calendar and keep your edits locked.
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[#fffaf2] p-4">
            {transcript.map((message, idx) => (
              <div
                key={`${message.role}-${idx}`}
                className={`flex ${
                  message.role === "naiya" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    message.role === "naiya"
                      ? "border-[#a9c3a2] bg-[#d8f3dc] text-[#2d4739]"
                      : "border-[var(--border)] bg-white text-[var(--foreground)]"
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    {message.role === "naiya" ? "Naiya" : "You"}
                  </p>
                  <p className="mt-1">{message.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[#fffaf2] p-3">
            <input
              placeholder="Message Naiya..."
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[#2d4739] focus:outline-none"
            />
            <button className="self-end rounded-lg bg-[#2d4739] px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(45,71,57,0.28)] transition hover:bg-[#243a2e]">
              Send
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
