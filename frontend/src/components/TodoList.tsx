"use client";

import { CheckCircle2, Plus, Circle, Trash2 } from "lucide-react";
import { Deadline } from "@/lib/deadline-db";
import { format, isPast, parseISO } from "date-fns";

type Props = {
  deadlines: Deadline[];
  onToggleComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onAdd?: () => void;
};

export function TodoList({ deadlines, onToggleComplete, onDelete, onAdd }: Props) {
  // Sort deadlines: incomplete first, then by due date
  const sortedDeadlines = [...deadlines].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const isOverdue = (deadline: Deadline) => {
    if (deadline.completed) return false;
    return isPast(parseISO(deadline.dueDate));
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
          To Do
        </h3>
        {onAdd && (
          <button
            onClick={onAdd}
            className="text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto overscroll-contain">
        {sortedDeadlines.length === 0 ? (
          <div className="text-sm text-[var(--muted)] text-center py-8">
            No deadlines yet
          </div>
        ) : (
          sortedDeadlines.map((deadline) => (
            <div
              key={deadline.id}
              className="group flex items-start gap-3 rounded-lg p-2 hover:bg-[var(--background)] transition-colors"
            >
              <button
                onClick={() => onToggleComplete(deadline.id, !deadline.completed)}
                className="text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors mt-0.5"
              >
                {deadline.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm block ${deadline.completed
                      ? "text-[var(--muted)] line-through"
                      : isOverdue(deadline)
                        ? "text-red-600 font-medium"
                        : "text-[var(--foreground)]"
                    }`}
                >
                  {deadline.title}
                </span>
                {deadline.course && (
                  <span className="text-xs text-[var(--muted)] block mt-0.5">
                    {deadline.course}
                  </span>
                )}
                <span className={`text-xs block mt-0.5 ${isOverdue(deadline) ? "text-red-500" : "text-[var(--muted)]"
                  }`}>
                  Due: {format(parseISO(deadline.dueDate), "MMM d, yyyy")}
                  {isOverdue(deadline) && " (Overdue)"}
                </span>
              </div>
              <button
                onClick={() => onDelete(deadline.id)}
                className="opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-red-500 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

