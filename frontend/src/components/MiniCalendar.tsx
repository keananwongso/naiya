"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

type Props = {
  className?: string;
  currentDate?: Date;
  onDateSelect?: (date: Date) => void;
};

export function MiniCalendar({ className, currentDate = new Date(), onDateSelect }: Props) {
  const [viewDate, setViewDate] = useState(currentDate);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handlePrevMonth = () => setViewDate(subMonths(viewDate, 1));
  const handleNextMonth = () => setViewDate(addMonths(viewDate, 1));

  return (
    <div className={`p-3 ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-[var(--foreground)]">
          {format(viewDate, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-0.5">
          <button
            onClick={handlePrevMonth}
            className="rounded p-0.5 hover:bg-[var(--background)] text-[var(--muted)]"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button
            onClick={handleNextMonth}
            className="rounded p-0.5 hover:bg-[var(--background)] text-[var(--muted)]"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px]">
        {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
          <div key={day} className="py-0.5 font-medium text-[var(--muted)]">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, viewDate);
          const isDayToday = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect?.(day)}
              className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors text-[10px] mx-auto
                ${
                  !isCurrentMonth
                    ? "text-[var(--muted)] opacity-50"
                    : "text-[var(--foreground)]"
                }
                ${
                  isDayToday
                    ? "bg-[var(--accent)] text-[var(--foreground)] font-semibold"
                    : "hover:bg-[var(--background)]"
                }
              `}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
