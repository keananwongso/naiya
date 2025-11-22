"use client";

import { CheckCircle2, Plus, Circle } from "lucide-react";
import { useState } from "react";

type Todo = {
  id: string;
  text: string;
  completed: boolean;
};

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: "1", text: "Review lecture notes", completed: false },
    { id: "2", text: "Submit assignment", completed: true },
    { id: "3", text: "Email professor", completed: false },
  ]);

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
          To Do
        </h3>
        <button className="text-[var(--muted)] hover:text-[var(--foreground)]">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto overscroll-contain">
        {todos.map((todo) => (
          <div
            key={todo.id}
            className="group flex items-center gap-3 rounded-lg p-2 hover:bg-[var(--background)] transition-colors cursor-pointer"
            onClick={() => toggleTodo(todo.id)}
          >
            <button className="text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors">
              {todo.completed ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </button>
            <span
              className={`text-sm ${
                todo.completed
                  ? "text-[var(--muted)] line-through"
                  : "text-[var(--foreground)]"
              }`}
            >
              {todo.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

