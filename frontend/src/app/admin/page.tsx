"use client";

import { useState } from "react";
import { loadCalendar, saveCalendar } from "@/lib/calendar-db";
import { CalendarEvent } from "shared/types";

export default function AdminPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLoadCalendar = async () => {
    setLoading(true);
    setMessage("Loading calendar...");
    try {
      const loadedEvents = await loadCalendar();
      setEvents(loadedEvents);
      setMessage(`✅ Loaded ${loadedEvents.length} events`);
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeduplicateEvents = async () => {
    if (events.length === 0) {
      setMessage("❌ No events loaded. Click 'Load Calendar' first.");
      return;
    }

    setLoading(true);
    setMessage("Deduplicating events...");

    try {
      // Track unique events by their signature
      const uniqueEvents = new Map<string, CalendarEvent>();
      let duplicateCount = 0;

      for (const event of events) {
        // Create a unique signature for the event
        const signature = [
          event.title.toLowerCase().trim(),
          event.day || event.date || 'no-time',
          event.start,
          event.end,
        ].join('|');

        if (!uniqueEvents.has(signature)) {
          uniqueEvents.set(signature, event);
        } else {
          duplicateCount++;
        }
      }

      const deduplicatedEvents = Array.from(uniqueEvents.values());
      setEvents(deduplicatedEvents);
      setMessage(`✅ Removed ${duplicateCount} duplicates. ${deduplicatedEvents.length} events remaining.`);
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCalendar = async () => {
    if (events.length === 0) {
      setMessage("❌ No events to save.");
      return;
    }

    setLoading(true);
    setMessage("Saving to Supabase...");

    try {
      await saveCalendar(events);
      setMessage(`✅ Saved ${events.length} events to Supabase!`);
    } catch (error) {
      setMessage(`❌ Error saving: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("⚠️ Are you sure you want to DELETE ALL events from Supabase?")) {
      return;
    }

    setLoading(true);
    setMessage("Clearing all events...");

    try {
      await saveCalendar([]);
      setEvents([]);
      setMessage("✅ All events cleared from Supabase!");
    } catch (error) {
      setMessage(`❌ Error clearing: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReseed = async () => {
    if (!confirm("⚠️ This will REPLACE all events with fresh sample data. Continue?")) {
      return;
    }

    setLoading(true);
    setMessage("Reseeding with sample data...");

    try {
      const sampleEvents: CalendarEvent[] = [
        {
          id: "stats-mon",
          title: "Stats",
          day: "Mon",
          start: "14:00",
          end: "16:30",
          type: "ROUTINE",
          flexibility: "low",
          source: "class",
          course: "Stats"
        },
        {
          id: "stats-wed",
          title: "Stats",
          day: "Wed",
          start: "11:00",
          end: "12:00",
          type: "ROUTINE",
          flexibility: "low",
          source: "class",
          course: "Stats"
        },
        {
          id: "stats-fri",
          title: "Stats",
          day: "Fri",
          start: "14:00",
          end: "15:00",
          type: "ROUTINE",
          flexibility: "low",
          source: "class",
          course: "Stats"
        },
        {
          id: "psych-tue",
          title: "Psych",
          day: "Tue",
          start: "11:00",
          end: "12:00",
          type: "ROUTINE",
          flexibility: "low",
          source: "class",
          course: "Psych"
        },
        {
          id: "calc-thu",
          title: "Calc",
          day: "Thu",
          start: "10:00",
          end: "13:45",
          type: "ROUTINE",
          flexibility: "low",
          source: "class",
          course: "Calc"
        },
        {
          id: "gym-mon",
          title: "Gym",
          day: "Mon",
          start: "20:00",
          end: "21:00",
          type: "ROUTINE",
          flexibility: "high",
          source: "custom",
          course: "Gym"
        },
        {
          id: "gym-thu",
          title: "Gym",
          day: "Thu",
          start: "07:00",
          end: "08:00",
          type: "ROUTINE",
          flexibility: "high",
          source: "custom",
          course: "Gym"
        }
      ];

      await saveCalendar(sampleEvents);
      setEvents(sampleEvents);
      setMessage(`✅ Reseeded with ${sampleEvents.length} sample events!`);
    } catch (error) {
      setMessage(`❌ Error reseeding: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">🛠️ Admin Panel</h1>

        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded-lg border ${
            message.includes("❌")
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-green-50 border-green-200 text-green-800"
          }`}>
            {message}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleLoadCalendar}
            disabled={loading}
            className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            1️⃣ Load Calendar
          </button>

          <button
            onClick={handleDeduplicateEvents}
            disabled={loading || events.length === 0}
            className="px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            2️⃣ Deduplicate
          </button>

          <button
            onClick={handleSaveCalendar}
            disabled={loading || events.length === 0}
            className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            3️⃣ Save to Supabase
          </button>

          <button
            onClick={handleReseed}
            disabled={loading}
            className="px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🌱 Reseed with Sample Data
          </button>

          <button
            onClick={handleClearAll}
            disabled={loading}
            className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed col-span-2"
          >
            🗑️ Clear All Events
          </button>
        </div>

        {/* Event List */}
        {events.length > 0 && (
          <div className="border rounded-lg p-4 bg-white">
            <h2 className="text-xl font-semibold mb-4">
              Current Events ({events.length})
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.map((event, idx) => {
                const timeInfo = event.day
                  ? `${event.day} ${event.start}-${event.end}`
                  : `${event.date} ${event.start}-${event.end}`;

                return (
                  <div
                    key={event.id}
                    className="p-2 border-l-4 border-blue-400 bg-gray-50 text-sm"
                  >
                    <span className="font-mono text-gray-500">#{idx + 1}</span>{" "}
                    <span className="font-semibold">{event.title}</span> - {timeInfo}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold mb-2">📋 Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li><strong>Load Calendar</strong> - Fetches your current events from Supabase</li>
            <li><strong>Deduplicate</strong> - Removes duplicate events (same title, day/date, time)</li>
            <li><strong>Save to Supabase</strong> - Saves the deduplicated events back to database</li>
            <li><strong>Reseed</strong> - Replaces all events with fresh sample data</li>
            <li><strong>Clear All</strong> - Deletes everything (⚠️ dangerous!)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
