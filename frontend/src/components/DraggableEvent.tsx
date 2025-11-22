"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format, parseISO } from "date-fns";

type Base44Event = {
  id: string;
  title: string;
  start_date: string;
  end_date?: string;
  all_day?: boolean;
  color?: string;
};

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
  event: Base44Event;
  top: number;
  height: number | string;
  onClick?: () => void;
};

export function DraggableEvent({ event, top, height, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: event.id,
      data: { event },
    });

  // Use dynamic color if available, otherwise fallback to sage
  const colorVar = event.color ? `var(--color-${event.color}-500)` : "var(--accent)";

  const style: React.CSSProperties = {
    top: `${(top / 60) * 100}%`,
    height: height === "auto" ? "auto" : `${(height as number / 60) * 100}%`,
    minHeight: "24px",
    zIndex: isDragging ? 50 : 10,
    transform: CSS.Translate.toString(transform),
    position: "absolute",
    left: "2px",
    right: "2px",
    backgroundColor: colorVar,
    borderColor: "rgba(45, 71, 57, 0.1)", // Subtle border
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`rounded-lg px-2 py-1 text-[10px] font-medium text-[var(--foreground)] border cursor-grab active:cursor-grabbing transition-colors overflow-hidden shadow-sm touch-none hover:brightness-95`}
    >
      <p className="truncate font-semibold leading-tight">{event.title}</p>
      <p className="mt-0.5 text-[9px] opacity-70 leading-tight">
        {format(parseISO(event.start_date), "h:mm a")}
        {event.end_date && ` – ${format(parseISO(event.end_date), "h:mm a")}`}
      </p>
    </div>
  );
}
