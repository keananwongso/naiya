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
import { loadDeadlines, toggleDeadlineComplete, deleteDeadline, Deadline } from "@/lib/deadline-db";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Force rebuild
export default function SchedulePage() {
  // Lifted state
  const [events, setEvents] = useState<CalendarEvent[]>([]); // Start with empty calendar
  const [deadlines, setDeadlines] = useState<Deadline[]>([]); // Deadlines for TODO list
  const [tags, setTags] = useState<Tag[]>([]);
  const [assistantMessage, setAssistantMessage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Ref to access CalendarShell's handleCalendarUpdate
  const calendarUpdateRef = useRef<((message: string) => Promise<void>) | null>(null);

  // Wrapper to handle chat submission and extract deadlines
  const handleChatSubmit = async (message: string) => {
    if (!calendarUpdateRef.current) return;

    setIsProcessing(true);
    try {
      // Call the calendar update which will trigger the API
      await calendarUpdateRef.current(message);

      // Note: We need to intercept the API response to get deadlines
      // For now, this will be handled by modifying how CalendarShell processes responses
    } catch (error) {
      console.error("Chat submit error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Tag handlers
  const handleAddTag = (tag: Tag) => setTags((prev) => [...prev, tag]);
  const handleUpdateTag = (updated: Tag) =>
    setTags((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  const handleDeleteTag = (id: string) =>
    setTags((prev) => prev.filter((t) => t.id !== id));

  const router = useRouter();

  // Load calendar and deadlines on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // Check for user session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }

        const [loadedEvents, loadedDeadlines] = await Promise.all([
          loadCalendar(),
          loadDeadlines()
        ]);
        if (isMounted) {
          setEvents(loadedEvents);
          setDeadlines(loadedDeadlines);
        }
      } catch (error) {
        console.error("Failed to load data from Supabase", error);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [router]);

  // Deadline handlers
  const handleToggleDeadline = async (id: string, completed: boolean) => {
    try {
      await toggleDeadlineComplete(id, completed);
      setDeadlines(prev => prev.map(d => d.id === id ? { ...d, completed } : d));
    } catch (error) {
      console.error("Failed to toggle deadline:", error);
    }
  };

  const handleDeleteDeadline = async (id: string) => {
    try {
      await deleteDeadline(id);
      setDeadlines(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error("Failed to delete deadline:", error);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[var(--background)]">
      {/* Left Sidebar Column */}
      <div className="flex w-[280px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)]">
          <MiniCalendar />
        </div>
        <div className="flex-1 overflow-hidden border-b border-[var(--border)]">
          <TodoList
            deadlines={deadlines}
            onToggleComplete={handleToggleDeadline}
            onDelete={handleDeleteDeadline}
          />
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
