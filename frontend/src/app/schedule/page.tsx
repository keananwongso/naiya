"use client";

import { useState, useRef } from "react";
import { CalendarShell } from "@/components/CalendarShell";
import { MiniCalendar } from "@/components/MiniCalendar";
import { TodoList } from "@/components/TodoList";
import { ChatPanel } from "@/components/ChatPanel";
import { TagsManager } from "@/components/TagsManager";
import { sampleTranscript, samplePlan } from "shared/sampleData";
import { CalendarEvent, Tag } from "shared/types";
import { useEffect } from "react";
import { loadCalendar } from "@/lib/calendar-db";

// Force rebuild
export default function SchedulePage() {
  // Lifted state
  const [events, setEvents] = useState<CalendarEvent[]>([]); // Start with empty calendar
  const [tags, setTags] = useState<Tag[]>([]);
  const [assistantMessage, setAssistantMessage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Ref to access CalendarShell's handleCalendarUpdate
  const calendarUpdateRef = useRef<((message: string) => Promise<void>) | null>(null);

  const handleAddTag = (tag: Tag) => setTags((prev) => [...prev, tag]);
  const handleUpdateTag = (updated: Tag) =>
    setTags((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  const handleDeleteTag = (id: string) =>
    setTags((prev) => prev.filter((t) => t.id !== id));

  const handleChatSubmit = async (message: string) => {
    if (calendarUpdateRef.current) {
      await calendarUpdateRef.current(message);
    }
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const loaded = await loadCalendar();
        if (isMounted) setEvents(loaded);
      } catch (error) {
        console.error("Failed to load calendar from Supabase", error);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden bg-[var(--background)]">
      {/* Left Sidebar Column */}
      <div className="flex w-[280px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)]">
          <MiniCalendar />
        </div>
        <div className="flex-1 overflow-hidden border-b border-[var(--border)]">
          <TodoList />
        </div>
        <div className="flex-1 overflow-hidden bg-[var(--surface)]">
          <TagsManager
            tags={tags}
            onAddTag={handleAddTag}
            onUpdateTag={handleUpdateTag}
            onDeleteTag={handleDeleteTag}
          />
        </div>
      </div>

      {/* Main Calendar Column */}
      <main className="flex-1 min-w-0 bg-[var(--surface)]">
        <CalendarShell
          events={events}
          setEvents={setEvents}
          tags={tags}
          onCalendarUpdateRef={calendarUpdateRef}
          setAssistantMessage={setAssistantMessage}
          setIsProcessing={setIsProcessing}
        />
      </main>

      {/* Right Chat Column */}
      <div className="w-[400px] shrink-0">
        <ChatPanel
          onSubmit={handleChatSubmit}
          assistantMessage={assistantMessage}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  );
}
