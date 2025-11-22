"use client";

import { Send } from "lucide-react";

type ChatMessage = {
  role: "user" | "naiya";
  text: string;
  tag?: string;
};

type Props = {
  transcript: ChatMessage[];
  notes?: string[];
};

export function ChatPanel({ transcript, notes = [] }: Props) {
  return (
    <section className="flex flex-col h-full bg-[var(--surface)] border-l border-[var(--border)]">
      <div className="p-6 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Chat adjustments
            </p>
            <h2 className="text-xl font-semibold text-slate-900 mt-1">
              Ask in plain language.
            </h2>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-6 flex flex-col gap-3">
        {transcript.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === "naiya" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm ${
                message.role === "naiya"
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)]"
                  : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                <span>{message.role === "naiya" ? "Naiya" : "You"}</span>
                {message.tag && (
                  <span className="rounded-full border border-current px-2 py-0.5 text-[10px]">
                    {message.tag}
                  </span>
                )}
              </div>
              <p className="mt-1">{message.text}</p>
            </div>
          </div>
        ))}

        {notes.length ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/70 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
              What Naiya considered
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {notes.map((note, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="relative">
          <textarea
            placeholder="Ask Naiya to change your schedule..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 pr-12 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
            rows={2}
          />
          <button className="absolute right-2 bottom-2 rounded-lg p-1.5 text-[var(--foreground)] hover:bg-[var(--accent-soft)] transition-colors">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
