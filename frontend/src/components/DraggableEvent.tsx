"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format, parseISO } from "date-fns";
import React from "react";

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
  onResizeEnd?: (topDeltaMinutes: number, heightDeltaMinutes: number) => void;
};

export function DraggableEvent({ event, top, height, onClick, onResizeEnd }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: event.id,
      data: { event },
    });

  // Use dynamic color if available, otherwise fallback to sage
  const colorVar = event.color ? `var(--color-${event.color}-500)` : "var(--accent)";

  const [isResizing, setIsResizing] = React.useState(false);
  const [resizeState, setResizeState] = React.useState<{ topDelta: number; heightDelta: number } | null>(null);

  const handleResizeStart = (e: React.PointerEvent, direction: "top" | "bottom") => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);

    const startY = e.clientY;
    const startHeight = typeof height === "number" ? height : 60;
    const pixelsPerMinute = 48 / 60;
    const startHeightPx = startHeight * pixelsPerMinute;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - startY;

      if (direction === "bottom") {
        const newHeightPx = Math.max(24, startHeightPx + deltaY);
        const heightDeltaPx = newHeightPx - startHeightPx;
        setResizeState({ topDelta: 0, heightDelta: heightDeltaPx / pixelsPerMinute });
      } else {
        // Top resize: moving down (positive delta) reduces height, moving up (negative delta) increases height
        // But we also need to move the top position.
        // However, we can't easily change 'top' prop visually without affecting layout flow if not careful,
        // but here we are absolute positioned.

        // Max height reduction is limited by min height (24px)
        // If we move down by X, height reduces by X.
        // newHeight = startHeight - deltaY

        let effectiveDeltaY = deltaY;
        if (startHeightPx - deltaY < 24) {
          effectiveDeltaY = startHeightPx - 24;
        }

        const topDeltaPx = effectiveDeltaY;
        const heightDeltaPx = -effectiveDeltaY;

        setResizeState({
          topDelta: topDeltaPx / pixelsPerMinute,
          heightDelta: heightDeltaPx / pixelsPerMinute
        });
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      setIsResizing(false);
      setResizeState(null);

      const deltaY = upEvent.clientY - startY;
      let finalTopDelta = 0;
      let finalHeightDelta = 0;

      if (direction === "bottom") {
        const newHeightPx = Math.max(24, startHeightPx + deltaY);
        finalHeightDelta = (newHeightPx - startHeightPx) / pixelsPerMinute;
      } else {
        let effectiveDeltaY = deltaY;
        if (startHeightPx - deltaY < 24) {
          effectiveDeltaY = startHeightPx - 24;
        }
        finalTopDelta = effectiveDeltaY / pixelsPerMinute;
        finalHeightDelta = -effectiveDeltaY / pixelsPerMinute;
      }

      // Snap to 15 mins
      const snappedTopDelta = Math.round(finalTopDelta / 15) * 15;
      const snappedHeightDelta = Math.round(finalHeightDelta / 15) * 15;

      if (snappedTopDelta !== 0 || snappedHeightDelta !== 0) {
        onResizeEnd?.(snappedTopDelta, snappedHeightDelta);
      }

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const currentTopDelta = isResizing && resizeState ? resizeState.topDelta : 0;
  const currentHeightDelta = isResizing && resizeState ? resizeState.heightDelta : 0;

  const currentHeight = (typeof height === "number" ? height : 60) + currentHeightDelta;
  const currentTop = top + currentTopDelta;

  const style: React.CSSProperties = {
    top: `${(currentTop / 60) * 100}%`,
    height: `${(currentHeight / 60) * 100}%`,
    minHeight: "24px",
    zIndex: isDragging || isResizing ? 50 : 10,
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
      className={`rounded-lg px-2 py-1 text-[10px] font-medium text-[var(--foreground)] border cursor-grab active:cursor-grabbing transition-colors overflow-hidden shadow-sm touch-none hover:brightness-95 group`}
    >
      {/* Top Resize Handle */}
      <div
        className="absolute top-0 left-0 right-0 h-3 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-start justify-center pt-0.5"
        onPointerDown={(e) => handleResizeStart(e, "top")}
      >
        <div className="w-4 h-1 bg-[var(--foreground)]/20 rounded-full" />
      </div>

      <p className="truncate font-semibold leading-tight pointer-events-none mt-1">{event.title}</p>
      <p className="mt-0.5 text-[9px] opacity-70 leading-tight pointer-events-none">
        {format(parseISO(event.start_date), "h:mm a")}
        {event.end_date && ` – ${format(parseISO(event.end_date), "h:mm a")}`}
      </p>

      {/* Bottom Resize Handle */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity z-20"
        onPointerDown={(e) => handleResizeStart(e, "bottom")}
      >
        <div className="mx-auto w-4 h-1 bg-[var(--foreground)]/20 rounded-full mt-0.5" />
      </div>
    </div>
  );
}
