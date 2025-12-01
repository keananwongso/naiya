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
import { Clock, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { DraggableEvent } from "./DraggableEvent";
import { RecurringEditModal } from "./RecurringEditModal";
import { useState, useEffect } from "react";
import { addHours, addDays, subDays } from "date-fns";
import { getCurrentTimeInMinutes } from "@/lib/dateUtils";

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
  recurrence?: any; // Using any to avoid importing Recurrence type here if not needed, or import it.
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

function TrashBin({ isDragging }: { isDragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "trash" });

  if (!isDragging) return null;

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

  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [pendingResize, setPendingResize] = useState<{
    event: Base44Event;
    start: Date;
    end: Date;
  } | null>(null);
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(getCurrentTimeInMinutes());
  const [isDragging, setIsDragging] = useState(false);

  // Mobile: track the start day for 3-day view
  const [mobileStartDay, setMobileStartDay] = useState<Date>(() => {
    const today = days.find(d => isToday(d));
    // Start from today if it exists, otherwise from the first day
    return today || days[0];
  });

  // Swipe gesture state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimeMinutes(getCurrentTimeInMinutes());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Debug: log the time indicator position
  useEffect(() => {
    const calculatedTop = (currentTimeMinutes / 60) * 48 + 88;
    console.log('Time indicator debug:', {
      currentTimeMinutes,
      hours: currentTimeMinutes / 60,
      calculatedPixels: (currentTimeMinutes / 60) * 48,
      withOffset: calculatedTop,
      currentTime: new Date().toLocaleTimeString()
    });
  }, [currentTimeMinutes]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleResizeEnd = (event: Base44Event, topDelta: number, heightDelta: number) => {
    const start = parseISO(event.start_date);
    const end = event.end_date ? parseISO(event.end_date) : addHours(start, 1);

    const newStart = new Date(start.getTime() + topDelta * 60000);
    const newEnd = new Date(end.getTime() + (topDelta + heightDelta) * 60000);

    if (event.recurrence && event.recurrence.type !== "none") {
      setPendingResize({ event, start: newStart, end: newEnd });
      setRecurringModalOpen(true);
    } else {
      onEventUpdate({
        ...event,
        start_date: format(newStart, "yyyy-MM-dd'T'HH:mm:ss"),
        end_date: format(newEnd, "yyyy-MM-dd'T'HH:mm:ss"),
      });
    }
  };

  const handleRecurrenceConfirm = (mode: "single" | "future" | "all") => {
    if (pendingResize) {
      // For now, we just update the single event regardless of mode as per user instruction "This will connect to the backend later on"
      // But we should probably log the mode or handle it if we can.
      // Since Base44WeekView just calls onEventUpdate, it's up to the parent to handle the mode.
      // But onEventUpdate currently only takes the event.
      // We might need to extend onEventUpdate to accept options, or just update this one event for now.

      console.log(`Applying resize with mode: ${mode}`);

      onEventUpdate({
        ...pendingResize.event,
        start_date: format(pendingResize.start, "yyyy-MM-dd'T'HH:mm:ss"),
        end_date: format(pendingResize.end, "yyyy-MM-dd'T'HH:mm:ss"),
      });
    }
    setRecurringModalOpen(false);
    setPendingResize(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
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
    const hour = parseInt(parts[2], 10);
    const newDay = parseISO(dayIso);

    // Calculate 15-minute increments based on delta.y
    const pixelsPerHour = 48;
    const minutesPerPixel = 60 / pixelsPerHour;

    const originalStart = parseISO(draggedEvent.start_date);
    const minutesDelta = Math.round(delta.y * minutesPerPixel / 15) * 15;

    const newStartTime = new Date(originalStart.getTime() + minutesDelta * 60000);

    const originalStartDay = new Date(originalStart);
    originalStartDay.setHours(0, 0, 0, 0);

    const targetDay = new Date(newDay);
    targetDay.setHours(0, 0, 0, 0);

    const dayDiffMs = targetDay.getTime() - originalStartDay.getTime();

    const finalStart = new Date(newStartTime.getTime() + dayDiffMs);

    const minutes = finalStart.getMinutes();
    const snappedMinutes = Math.round(minutes / 15) * 15;
    finalStart.setMinutes(snappedMinutes, 0, 0);

    const durationMs = draggedEvent.end_date
      ? parseISO(draggedEvent.end_date).getTime() - originalStart.getTime()
      : 60 * 60 * 1000;

    const finalEnd = new Date(finalStart.getTime() + durationMs);

    // Check recurrence for drag as well? User said "when i finish dragging... if its a weekly recurring event..."
    // So yes, drag should also trigger it.
    if (draggedEvent.recurrence && draggedEvent.recurrence.type !== "none") {
      setPendingResize({ event: draggedEvent, start: finalStart, end: finalEnd });
      setRecurringModalOpen(true);
    } else {
      onEventUpdate({
        ...draggedEvent,
        start_date: format(finalStart, "yyyy-MM-dd'T'HH:mm:ss"),
        end_date: format(finalEnd, "yyyy-MM-dd'T'HH:mm:ss"),
      });
    }
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
      start_date: format(start, "yyyy-MM-dd'T'HH:mm:ss"),
      end_date: format(end, "yyyy-MM-dd'T'HH:mm:ss"),
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

  // On mobile, show 3 days starting from mobileStartDay; on desktop show all 7 days
  const visibleDays = days; // Desktop always shows all days
  const mobile3Days = [
    mobileStartDay,
    addDays(mobileStartDay, 1),
    addDays(mobileStartDay, 2),
  ]; // Mobile shows 3 days

  const handlePrevDays = () => {
    setMobileStartDay(prev => subDays(prev, 3)); // Jump back 3 days
  };

  const handleNextDays = () => {
    setMobileStartDay(prev => addDays(prev, 3)); // Jump forward 3 days
  };

  // Swipe gesture detection (minimum 50px swipe)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNextDays(); // Swipe left = go forward in time
    } else if (isRightSwipe) {
      handlePrevDays(); // Swipe right = go back in time
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--surface)] relative">
      {/* Mobile: No separate day navigation bar - swipe to navigate */}

      <DndContext
        sensors={sensors}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(event) => {
          handleDragEnd(event);
          setIsDragging(false);
        }}
        onDragCancel={() => setIsDragging(false)}
      >
        <TrashBin isDragging={isDragging} />
        <div
          className="flex-1 overflow-auto overscroll-contain relative"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Header: 3 columns on mobile, 7 on desktop */}
          <div className="sticky top-0 z-20 grid grid-cols-[60px_repeat(3,1fr)] md:grid-cols-[60px_repeat(7,1fr)] border-b border-[var(--border)] bg-[var(--surface)]">
            <div className="p-3 md:p-4 border-r border-[var(--border)] flex items-center justify-center">
              <Clock className="h-4 w-4 text-[var(--muted)]/70" />
            </div>
            {/* Mobile: Show 3 days */}
            {mobile3Days.map((day) => {
              const isDayToday = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className="md:hidden p-2 text-center border-r border-[var(--border)] last:border-r-0"
                >
                  <div className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider">
                    {format(day, "EEE")}
                  </div>
                  <div
                    className={`text-lg font-light inline-flex items-center justify-center w-7 h-7 rounded-full transition-all ${isDayToday
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "text-[var(--foreground)]"
                      }`}
                  >
                    {format(day, "d")}
                  </div>
                </div>
              );
            })}
            {/* Desktop: Show all 7 days */}
            {visibleDays.map((day) => {
              const isDayToday = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className="hidden md:block p-4 text-center border-r border-[var(--border)] last:border-r-0"
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
              className="grid grid-cols-[60px_repeat(3,1fr)] md:grid-cols-[60px_repeat(7,1fr)] border-b border-[var(--border)] last:border-b-0"
            >
              <div className="p-2 border-r border-[var(--border)] text-[10px] text-[var(--muted)] font-medium h-12 flex items-center justify-center">
                {format(new Date().setHours(hour, 0, 0, 0), "h a")}
              </div>

              {/* Mobile: Show 3 days */}
              {mobile3Days.map((day) => {
                const hourEvents = getEventsForDayAndHour(day, hour);
                const cellId = `cell|${format(day, "yyyy-MM-dd'T'HH:mm:ssXXX")}|${hour}`;

                return (
                  <DroppableCell
                    key={`${day.toISOString()}-${hour}`}
                    id={cellId}
                    className="md:hidden relative border-r border-[var(--border)] last:border-r-0 h-12 hover:bg-[var(--background)] transition-colors"
                    onDoubleClick={() => handleCellDoubleClick(day, hour)}
                  >
                    {hourEvents.map((event) => (
                      <DraggableEvent
                        key={event.id}
                        event={event}
                        top={getEventTop(event)}
                        height={getEventHeight(event)}
                        onClick={() => onEventClick?.(event)}
                        onResizeEnd={(topDelta, heightDelta) => handleResizeEnd(event, topDelta, heightDelta)}
                      />
                    ))}
                  </DroppableCell>
                );
              })}

              {/* Desktop: Show all 7 days */}
              {visibleDays.map((day) => {
                const hourEvents = getEventsForDayAndHour(day, hour);
                const cellId = `cell|${format(day, "yyyy-MM-dd'T'HH:mm:ssXXX")}|${hour}`;

                return (
                  <DroppableCell
                    key={`${day.toISOString()}-${hour}`}
                    id={cellId}
                    className="hidden md:block relative border-r border-[var(--border)] last:border-r-0 h-12 hover:bg-[var(--background)] transition-colors"
                    onDoubleClick={() => handleCellDoubleClick(day, hour)}
                  >
                    {hourEvents.map((event) => (
                      <DraggableEvent
                        key={event.id}
                        event={event}
                        top={getEventTop(event)}
                        height={getEventHeight(event)}
                        onClick={() => onEventClick?.(event)}
                        onResizeEnd={(topDelta, heightDelta) => handleResizeEnd(event, topDelta, heightDelta)}
                      />
                    ))}
                  </DroppableCell>
                );
              })}
            </div>
          ))}

          {/* Current time indicator - red line */}
          {/* Desktop: show when any day is today */}
          {days.some(day => isToday(day)) && (
            <div
              className="hidden md:block absolute left-[60px] right-0 z-30 pointer-events-none"
              style={{
                // Each hour row is 48px tall (h-12 = 48px)
                // Current time in minutes / 60 = hours from midnight
                // Multiply by 48 to get pixels from top of grid (which starts at midnight/12 AM)
                // The sticky header height needs to be accounted for
                top: `calc(${(currentTimeMinutes / 60) * 48}px + 93px)`,
              }}
            >
              <div className="relative h-0.5 bg-red-500">
                <div className="absolute -left-1.5 -top-1 h-3 w-3 rounded-full bg-red-500" />
              </div>
            </div>
          )}
          {/* Mobile: show when any of the 3 visible days is today */}
          {mobile3Days.some(day => isToday(day)) && (
            <div
              className="md:hidden absolute left-[60px] right-0 z-30 pointer-events-none"
              style={{
                top: `calc(${(currentTimeMinutes / 60) * 48}px + 93px)`,
              }}
            >
              <div className="relative h-0.5 bg-red-500">
                <div className="absolute -left-1.5 -top-1 h-3 w-3 rounded-full bg-red-500" />
              </div>
            </div>
          )}
        </div>
      </DndContext>

      <RecurringEditModal
        isOpen={recurringModalOpen}
        onClose={() => {
          setRecurringModalOpen(false);
          setPendingResize(null);
        }}
        onConfirm={handleRecurrenceConfirm}
      />
    </div>
  );
}
