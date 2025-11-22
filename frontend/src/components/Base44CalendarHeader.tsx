"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

type ViewMode = "month" | "week" | "day";

type Props = {
  currentDate: Date;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onNavigate: (action: "prev" | "next" | "today") => void;
};

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
];

export function Base44CalendarHeader({
  currentDate,
  view,
  onViewChange,
  onNavigate,
}: Props) {
  const getTitle = () => {
    if (view === "day") return format(currentDate, "EEEE, MMMM d, yyyy");
    return format(currentDate, "MMMM yyyy");
  };

  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <motion.h1
          key={getTitle()}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-light tracking-tight text-[var(--foreground)]"
        >
          {getTitle()}
        </motion.h1>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onNavigate("prev")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--background)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate("today")}
            className="h-8 rounded-lg px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onNavigate("next")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--background)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-lg bg-[var(--background)] p-1">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onViewChange(mode.id)}
              className="relative rounded-md px-4 py-1.5 text-sm font-medium"
            >
              {view === mode.id && (
                <motion.div
                  layoutId="base44-active-view"
                  className="absolute inset-0 rounded-md bg-[var(--surface)] shadow-sm"
                  transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
                />
              )}
              <span
                className={`relative z-10 ${
                  view === mode.id ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                }`}
              >
                {mode.label}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="flex h-9 items-center rounded-lg bg-[var(--foreground)] px-4 text-sm font-medium text-[var(--background)] shadow-sm hover:bg-[#243a2e]"
        >
          <Plus className="mr-2 h-4 w-4" />
          New event
        </button>
      </div>
    </div>
  );
}


