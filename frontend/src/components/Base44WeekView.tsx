"use client";

import {
  DndContext,
  DragEndEvent,
  useDroppable,
  useSensors,
  useSensor,
  PointerSensor,
} from "@dnd-kit/core";
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
  formatISO,
} from "date-fns";
import { Clock, Trash2 } from "lucide-react";
import { DraggableEvent } from "./DraggableEvent";

// Reuse type definition
type Base44Event = {
  id: string;
  originalId: string;
  title: string;
  start_date: string;
  end_date?: string;
  all_day?: boolean;
  color?: string;
  tagId?: string;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

type Props = {
  currentDate: Date;
  events: Base44Event[];
  onEventUpdate: (event: Base44Event) => void;
  onEventDelete?: (id: string) => void;
  onEventCreate?: (event: Base44Event) => void;
  onEventClick?: (event: Base44Event) => void;
};

function DroppableCell({
  id,
  children,
  className,
  onDoubleClick,
}: {
  id: string;
  children?: React.ReactNode;
  className?: string;
  onDoubleClick?: () => void;
}) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={className}
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget) {
          onDoubleClick?.();
        }
      }}
    >
      {children}
    </div>
  );
}

function TrashBin() {
  const { setNodeRef, isOver } = useDroppable({ id: "trash" });
  return (
    <div
      ref={setNodeRef}
      className={`absolute bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all ${isOver
          ? "bg-red-500 text-white scale-110"
          : "bg-[var(--foreground)] text-[var(--background)]"
        }`}
    >
      <Trash2 className="h-5 w-5" />
    </div>
  );
}

export function Base44WeekView({
  currentDate,
  events,
  onEventUpdate,
  onEventDelete,
  onEventCreate,
  onEventClick,
}: Props) {
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const draggedEvent = active.data.current?.event as Base44Event;
    if (!draggedEvent) return;

    if (over.id === "trash") {
      onEventDelete?.(draggedEvent.originalId || draggedEvent.id);
      return;
    }

    const parts = (over.id as string).split("|");
    if (parts[0] !== "cell") return;

    const dayIso = parts[1];
    const newHour = parseInt(parts[2], 10);
    const newDay = parseISO(dayIso);

    const originalStart = parseISO(draggedEvent.start_date);
    const originalMinutes = getMinutes(originalStart);

    const newStart = new Date(newDay);
    newStart.setHours(newHour, originalMinutes, 0, 0);

    const durationMs = draggedEvent.end_date
      ? parseISO(draggedEvent.end_date).getTime() - originalStart.getTime()
      : 60 * 60 * 1000;

    const newEnd = new Date(newStart.getTime() + durationMs);

    onEventUpdate({
      ...draggedEvent,
      start_date: formatISO(newStart),
      end_date: formatISO(newEnd),
    });
  };

  const handleCellDoubleClick = (day: Date, hour: number) => {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 1, 0, 0, 0);

    onEventCreate?.({
      id: "",
      originalId: "",
      title: "New Event",
      start_date: formatISO(start),
      end_date: formatISO(end),
      color: "sage",
    });
  };

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
    <div className="flex flex-col h-full bg-[var(--surface)] relative">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <TrashBin />
        <div className="flex-1 overflow-auto overscroll-contain relative">
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
                    className={`text-2xl font-light inline-flex items-center justify-center w-10 h-10 rounded-full transition-all ${isDayToday
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

          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[var(--border)] last:border-b-0"
            >
              <div className="p-2 border-r border-[var(--border)] text-[10px] text-[var(--muted)] font-medium h-12 flex items-center justify-center">
                {format(new Date().setHours(hour, 0, 0, 0), "h a")}
              </div>

              {days.map((day) => {
                const hourEvents = getEventsForDayAndHour(day, hour);
                const cellId = `cell|${formatISO(day)}|${hour}`;

                return (
                  <DroppableCell
                    key={`${day.toISOString()}-${hour}`}
                    id={cellId}
                    className="relative border-r border-[var(--border)] last:border-r-0 h-12 hover:bg-[var(--background)] transition-colors"
                    onDoubleClick={() => handleCellDoubleClick(day, hour)}
                  >
                    {hourEvents.map((event) => (
                      <DraggableEvent
                        key={event.id}
                        event={event}
                        top={getEventTop(event)}
                        height={getEventHeight(event)}
                        onClick={() => onEventClick?.(event)}
                      />
                    ))}
                  </DroppableCell>
                );
              })}
            </div>
          ))}
        </div>
      </DndContext>
    </div>
  );
}
