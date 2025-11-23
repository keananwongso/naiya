"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

type Props = {
  currentDate: Date;
  onNavigate: (action: "prev" | "next" | "today") => void;
};

export function Base44CalendarHeader({
  currentDate,
  onNavigate,
}: Props) {
  const getTitle = () => {
    return format(currentDate, "MMMM yyyy");
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
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
  );
}
