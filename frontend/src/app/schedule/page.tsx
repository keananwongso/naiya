"use client";

import { useState, useRef } from "react";
import { CalendarShell } from "@/components/CalendarShell";
import { MiniCalendar } from "@/components/MiniCalendar";
import { TodoList } from "@/components/TodoList";
import { ChatPanelWithSessions } from "@/components/ChatPanelWithSessions";
import { TagsManager } from "@/components/TagsManager";
import { sampleTranscript, samplePlan } from "shared/sampleData";
import { CalendarEvent, Tag } from "shared/types";
import { useEffect } from "react";
import { loadCalendar } from "@/lib/calendar-db";
import { loadDeadlines, toggleDeadlineComplete, deleteDeadline, Deadline } from "@/lib/deadline-db";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Menu, X, MessageSquare } from "lucide-react";

// Force rebuild
export default function SchedulePage() {
  // Lifted state
  const [events, setEvents] = useState<CalendarEvent[]>([]); // Start with empty calendar
  const [deadlines, setDeadlines] = useState<Deadline[]>([]); // Deadlines for TODO list
  const [tags, setTags] = useState<Tag[]>([]);
  const [assistantMessage, setAssistantMessage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Mobile sidebar state
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);

  // Ref to access CalendarShell's handleCalendarUpdate
  const calendarUpdateRef = useRef<((message: string, conversationHistory?: Array<{ role: 'user' | 'assistant', content: string }>) => Promise<void>) | null>(null);

  // Wrapper to handle chat submission and extract deadlines
  const handleChatSubmit = async (message: string, conversationHistory?: Array<{ role: 'user' | 'assistant', content: string }>) => {
    if (!calendarUpdateRef.current) return;

    setIsProcessing(true);
    try {
      // Call the calendar update which will trigger the API with conversation history
      await calendarUpdateRef.current(message, conversationHistory);

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

  // Load calendar and deadlines on mount and when page becomes visible
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
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
    };

    // Load data initially
    loadData();

    // Reload data when page becomes visible (e.g., after navigation)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
      }
    };

    // Reload data when window gets focus (e.g., navigating back from another page)
    const handleFocus = () => {
      loadData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Listen for storage events (when braindump completes from home page)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'calendar-updated' && e.newValue === 'true') {
        loadData();
        localStorage.removeItem('calendar-updated');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also check on mount if flag is set (same-window navigation)
    if (localStorage.getItem('calendar-updated') === 'true') {
      loadData();
      localStorage.removeItem('calendar-updated');
    }

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
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
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--background)]">
      {/* Mobile Menu Bar - Hidden on Desktop */}
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 md:hidden">
        <button
          onClick={() => setShowLeftSidebar(!showLeftSidebar)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent-soft)]"
        >
          {showLeftSidebar ? <X size={20} /> : <Menu size={20} />}
          <span>Menu</span>
        </button>
        <button
          onClick={() => setShowChatPanel(!showChatPanel)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent-soft)]"
        >
          <MessageSquare size={20} />
          <span>Chat</span>
        </button>
      </div>

      {/* Main Content - Flex Row on Desktop, Column on Mobile */}
      <div className="flex flex-1 overflow-hidden md:flex-row">
        {/* Left Sidebar Column - Full width on mobile when open, fixed 280px on desktop */}
        <div className={`
          ${showLeftSidebar ? 'flex' : 'hidden'}
          md:flex
          w-full md:w-[280px]
          shrink-0
          flex-col
          border-r border-[var(--border)]
          bg-[var(--surface)]
          absolute md:relative
          z-20 md:z-auto
          h-full
        `}>
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

        {/* Right Chat Column - Full width on mobile when open, fixed 400px on desktop */}
        <div className={`
          ${showChatPanel ? 'flex' : 'hidden'}
          md:flex
          w-full md:w-[400px]
          shrink-0
          absolute md:relative
          z-20 md:z-auto
          h-full
        `}>
          <ChatPanelWithSessions
            onSubmit={handleChatSubmit}
            assistantMessage={assistantMessage}
            isProcessing={isProcessing}
          />
        </div>
      </div>
    </div>
  );
}
