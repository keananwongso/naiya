"use client";

import { MiniCalendar } from "./MiniCalendar";
import { TodoList } from "./TodoList";

type Props = {
  className?: string;
};

export function Sidebar({ className }: Props) {
  return (
    <aside className={`flex flex-col bg-[var(--surface)] border-r border-[var(--border)] ${className}`}>
      <div className="border-b border-[var(--border)]">
        <MiniCalendar />
      </div>
      <div className="flex-1 overflow-hidden">
        <TodoList />
      </div>
    </aside>
  );
}

