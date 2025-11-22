"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarEvent, DayKey } from "shared/types";

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
  onEventChange?: (event: CalendarEvent) => void;
  onEventCreate?: (event: Omit<CalendarEvent, "id">) => void;
  onEventDelete?: (id: string) => void;
};

const visibleDays: DayKey[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_COLUMN_HEIGHT = 620; // px, matches h-[620px]

const formatHour = (hour: number) => {
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = ((hour + 11) % 12) + 1;
  return `${display} ${suffix}`;
};

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes: number): string => {
  const hrs = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hrs}:${mins}`;
};

const weekLabel = (iso: string) => {
  const start = new Date(iso);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const label = start.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return {
    label,
  };
};

type DayMeta = {
  key: DayKey;
  date: Date;
  iso: string;
};

const buildDayMeta = (weekStartIso: string): DayMeta[] => {
  const base = new Date(weekStartIso);
  return visibleDays.map((key, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() + index);
    const iso = date.toISOString().split("T")[0] ?? weekStartIso;
    return { key, date, iso };
  });
};

const eventColors: Record<string, string> = {
  class: "border-l-2 border-[var(--accent)] text-[var(--foreground)]",
  commitment: "border-l-2 border-[var(--accent)] text-[var(--foreground)]",
  study: "border-l-2 border-[var(--accent)] text-[var(--foreground)]",
  custom: "border-l-2 border-[var(--accent)] text-[var(--foreground)]",
};

type CalendarEventWithDayIndex = CalendarEvent & { dayIndex: number };

export function CalendarCanvas({
  weekStart,
  events,
  transcript,
  startHour = 9,
  endHour = 21,
  onEventChange,
  onEventCreate,
  onEventDelete,
}: Props) {
  const [split, setSplit] = useState(0.6); // calendar share on desktop
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingSplitter = useRef(false);

  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!draggingSplitter.current || window.innerWidth < 1024) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = (event.clientX - rect.left) / rect.width;
      const clamped = Math.min(0.8, Math.max(0.35, next));
      setSplit(clamped);
    };

    const handleUp = () => {
      draggingSplitter.current = false;
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
  const { label } = weekLabel(weekStart);
  const totalMinutes = (endHour - startHour) * 60;

  const [todayIso] = useState<string | null>(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });

  const dayMeta = useMemo(() => buildDayMeta(weekStart), [weekStart]);

  const dayEvents = useMemo(
    () =>
      visibleDays.reduce<Record<DayKey, CalendarEventWithDayIndex[]>>(
        (acc, day, index) => {
          acc[day] = events
            .filter((event) => event.day === day)
            .map((event) => ({ ...event, dayIndex: index }));
          return acc;
        },
        {} as Record<DayKey, CalendarEventWithDayIndex[]>,
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

  const handleGridDoubleClick = (
    day: DayKey,
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (!onEventCreate) return;
    const bounds = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
    const offsetY = event.clientY - bounds.top;
    const ratio = offsetY / DAY_COLUMN_HEIGHT;
    const minutesFromStart = Math.round(totalMinutes * ratio);
    const snappedStart =
      startHour * 60 + Math.max(0, Math.min(totalMinutes - 60, minutesFromStart));
    const snappedEnd = snappedStart + 60; // 1 hour default

    onEventCreate({
      title: "New block",
      day,
      start: minutesToTime(snappedStart),
      end: minutesToTime(snappedEnd),
      source: "custom",
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    setActiveId(null);
    if (!onEventChange) return;

    const original = events.find((e) => e.id === active.id);
    if (!original) return;

    const originalDayIndex = visibleDays.indexOf(original.day);
    const calendarWidth = containerRef.current?.getBoundingClientRect().width ?? 0;
    const labelColumnWidth = 64; // from grid template
    const dayWidth =
      calendarWidth > labelColumnWidth
        ? (calendarWidth - labelColumnWidth) / visibleDays.length
        : 0;

    const deltaMinutes = (delta.y / DAY_COLUMN_HEIGHT) * totalMinutes;
    const roundedDelta = Math.round(deltaMinutes / 15) * 15; // snap to 15 min

    const startMinutes = timeToMinutes(original.start) + roundedDelta;
    const endMinutes = timeToMinutes(original.end) + roundedDelta;

    const minStart = startHour * 60;
    const maxEnd = endHour * 60;
    const duration = endMinutes - startMinutes;
    if (duration <= 0) return;

    const clampedStart = Math.max(minStart, Math.min(startMinutes, maxEnd - duration));
    const clampedEnd = clampedStart + duration;

    let newDayIndex = originalDayIndex;
    if (dayWidth > 0) {
      const deltaDays = Math.round(delta.x / dayWidth);
      newDayIndex = Math.min(
        visibleDays.length - 1,
        Math.max(0, originalDayIndex + deltaDays),
      );
    }

    const updated: CalendarEvent = {
      ...original,
      day: visibleDays[newDayIndex],
      start: minutesToTime(clampedStart),
      end: minutesToTime(clampedEnd),
    };

    onEventChange(updated);
  };

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-3 py-4 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:px-4 md:px-5 lg:px-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
        <p className="font-medium">{label}</p>
        <span>Click & drag to reschedule · Double-click to add</span>
      </div>

      <DndContext
        onDragEnd={handleDragEnd}
        onDragStart={(event) => setActiveId(String(event.active.id))}
      >
        <div
          ref={containerRef}
          className="grid gap-4 lg:grid-cols-[minmax(0,60%)_auto_minmax(0,40%)]"
          style={{
            gridTemplateColumns: `minmax(0, ${Math.round(split * 100)}%) auto minmax(300px, 1fr)`,
          }}
        >
          <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
            <div className="grid grid-cols-[64px_repeat(7,1fr)] items-end gap-x-3 px-1 text-xs font-medium text-[var(--muted)]">
              <div className="text-right pr-1 text-[11px] uppercase tracking-[0.16em]">
                Time
              </div>
              {dayMeta.map(({ key, date, iso }) => {
                const isToday = todayIso === iso;
                const weekday = date.toLocaleDateString("en-US", {
                  weekday: "short",
                });
                const dayNumber = date.getDate();
                return (
                  <div
                    key={key}
                    className={`flex flex-col items-center rounded-lg py-1 ${
                      isToday ? "bg-sky-50 text-sky-700" : ""
                    }`}
                  >
                    <span className="text-[11px] uppercase tracking-[0.18em]">
                      {weekday}
                    </span>
                    <span className="text-base font-semibold leading-tight">
                      {dayNumber}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-[64px_repeat(7,1fr)] gap-x-3 px-1">
              <div className="relative h-[620px] text-[11px] text-[var(--muted)]">
                {hours.map((hour, idx) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-2 flex items-start justify-end border-t border-[var(--border)]"
                    style={{ top: `${(idx / (hours.length - 1)) * 100}%` }}
                  >
                    <span className="-translate-y-2 rounded bg-[var(--surface)] px-1 py-0.5">
                      {formatHour(hour)}
                    </span>
                  </div>
                ))}
              </div>

              {dayMeta.map(({ key: day, iso }) => {
                const isToday = todayIso === iso;
                return (
                <div
                  key={day}
                  className={`relative h-[620px] overflow-hidden rounded-md border border-[var(--border)] bg-[var(--background)] ${
                    isToday ? "bg-[var(--accent-soft)]" : ""
                  }`}
                  onDoubleClick={(e) => handleGridDoubleClick(day, e)}
                >
                  {hours.map((_, idx) => (
                    <div
                      key={`${day}-row-${idx}`}
                      className="absolute left-0 right-0 border-t border-[var(--border)]/70"
                      style={{ top: `${(idx / (hours.length - 1)) * 100}%` }}
                    />
                  ))}

                  {dayEvents[day].map((event) => (
                    <DraggableEventCard
                      key={event.id}
                      event={event}
                      positionStyles={positionStyles(event)}
                      isActive={activeId === event.id}
                      onDelete={onEventDelete}
                    />
                  ))}

                  {!dayEvents[day].length && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--muted)]/60">
                      Double-click to add a block
                    </div>
                  )}
                </div>
              );})}
            </div>
          </div>

          <div className="hidden cursor-col-resize items-center justify-center lg:flex">
            <div
              onPointerDown={() => {
                draggingSplitter.current = true;
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

          <div className="flex h-full flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_16px_36px_rgba(45,71,57,0.08)]">
            <div>
              <p className="text-xl font-semibold text-[var(--foreground)]">Naiya Chat</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Tell Naiya about classes, exams, work, gym, and what you want to protect—she’ll adjust
                the calendar and keep your edits locked.
              </p>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
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
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
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

            <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <input
                placeholder="Message Naiya..."
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[#2d4739] focus:outline-none"
              />
              <button className="self-end rounded-lg bg-[#2d4739] px-3 py-2 text-xs font-semibold text-[var(--background)] shadow-[0_10px_24px_rgba(45,71,57,0.28)] transition hover:bg-[#243a2e]">
                Send
              </button>
            </div>
          </div>
        </div>
      </DndContext>
    </section>
  );
}

type DraggableEventCardProps = {
  event: CalendarEvent;
  positionStyles: React.CSSProperties;
  isActive: boolean;
  onDelete?: (id: string) => void;
};

function DraggableEventCard({
  event,
  positionStyles,
  isActive,
  onDelete,
}: DraggableEventCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: event.id,
  });

  const style = {
    ...positionStyles,
    transform: transform
      ? CSS.Translate.toString(transform)
      : undefined,
    boxShadow: isActive
      ? "0 16px 40px rgba(45,71,57,0.32)"
      : "0 14px 36px rgba(45,71,57,0.16)",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group absolute cursor-grab rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium shadow-sm hover:shadow-md transition ${
        eventColors[event.source] ?? eventColors.custom
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold leading-tight">
            {event.title}
          </p>
          <p className="mt-0.5 text-[11px] font-medium opacity-80">
            {event.start} – {event.end}
          </p>
        </div>
        {onDelete && !event.locked && (
          <button
            type="button"
            onClick={() => onDelete(event.id)}
            className="mt-0.5 hidden rounded-full border border-[#2d4739]/30 bg-[var(--background)]/80 px-2 py-0.5 text-[10px] font-semibold text-[#2d4739] shadow-sm group-hover:inline-flex"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
