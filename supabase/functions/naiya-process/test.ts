/**
 * Unit Tests for Naiya Algorithms
 * Run with: deno test --allow-env supabase/functions/naiya-process/test.ts
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  expandDayPattern,
  distributeFrequency,
  resolveTemporalReference,
  parseTime,
  parseTimeRange,
  parseDuration,
  classifyEvent,
  processExtractedEntities,
} from "./algorithms.ts";
import { Day } from "../../../shared/types.ts";

// ===== 1. PATTERN EXPANSION TESTS =====

Deno.test("expandDayPattern: Mon-Fri", () => {
  const result = expandDayPattern("Mon-Fri");
  assertEquals(result, ["Mon", "Tue", "Wed", "Thu", "Fri"]);
});

Deno.test("expandDayPattern: weekdays", () => {
  const result = expandDayPattern("weekdays");
  assertEquals(result, ["Mon", "Tue", "Wed", "Thu", "Fri"]);
});

Deno.test("expandDayPattern: weekends", () => {
  const result = expandDayPattern("weekends");
  assertEquals(result, ["Sat", "Sun"]);
});

Deno.test("expandDayPattern: Mon/Wed/Fri", () => {
  const result = expandDayPattern("Mon/Wed/Fri");
  assertEquals(result, ["Mon", "Wed", "Fri"]);
});

Deno.test("expandDayPattern: single day", () => {
  const result = expandDayPattern("Monday");
  assertEquals(result, ["Mon"]);
});

Deno.test("expandDayPattern: every day", () => {
  const result = expandDayPattern("every day");
  assertEquals(result, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
});

// ===== 2. FREQUENCY DISTRIBUTION TESTS =====

Deno.test("distributeFrequency: 3x/week", () => {
  const result = distributeFrequency("3x/week");
  assertEquals(result, ["Mon", "Wed", "Fri"]);
});

Deno.test("distributeFrequency: twice a week", () => {
  const result = distributeFrequency("twice a week");
  assertEquals(result, ["Tue", "Thu"]);
});

Deno.test("distributeFrequency: daily", () => {
  const result = distributeFrequency("daily");
  assertEquals(result, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
});

Deno.test("distributeFrequency: once per week", () => {
  const result = distributeFrequency("once per week");
  assertEquals(result, ["Wed"]);
});

Deno.test("distributeFrequency: 5 times a week", () => {
  const result = distributeFrequency("5 times a week");
  assertEquals(result, ["Mon", "Tue", "Wed", "Thu", "Fri"]);
});

// ===== 3. TEMPORAL REFERENCE TESTS =====

Deno.test("resolveTemporalReference: today", () => {
  const result = resolveTemporalReference("today", "2024-12-22");
  assertEquals(result, "2024-12-22");
});

Deno.test("resolveTemporalReference: tomorrow", () => {
  const result = resolveTemporalReference("tomorrow", "2024-12-22");
  assertEquals(result, "2024-12-23");
});

Deno.test("resolveTemporalReference: yesterday", () => {
  const result = resolveTemporalReference("yesterday", "2024-12-22");
  assertEquals(result, "2024-12-21");
});

Deno.test("resolveTemporalReference: in 3 days", () => {
  const result = resolveTemporalReference("in 3 days", "2024-12-22");
  assertEquals(result, "2024-12-25");
});

Deno.test("resolveTemporalReference: in 1 week", () => {
  const result = resolveTemporalReference("in 1 week", "2024-12-22");
  assertEquals(result, "2024-12-29");
});

Deno.test("resolveTemporalReference: next Monday (from Sunday)", () => {
  // December 22, 2024 is a Sunday
  const result = resolveTemporalReference("next Monday", "2024-12-22");
  assertEquals(result, "2024-12-30"); // Next Monday (not this Monday which is tomorrow)
});

Deno.test("resolveTemporalReference: next Friday (from Sunday)", () => {
  // December 22, 2024 is a Sunday
  const result = resolveTemporalReference("next Friday", "2024-12-22");
  assertEquals(result, "2025-01-03"); // Next Friday
});

Deno.test("resolveTemporalReference: this Monday (from Sunday)", () => {
  // December 22, 2024 is a Sunday
  const result = resolveTemporalReference("this Monday", "2024-12-22");
  assertEquals(result, "2024-12-23"); // This coming Monday
});

Deno.test("resolveTemporalReference: 2 weeks from now", () => {
  const result = resolveTemporalReference("2 weeks from now", "2024-12-22");
  assertEquals(result, "2025-01-05");
});

Deno.test("resolveTemporalReference: absolute date", () => {
  const result = resolveTemporalReference("2025-01-01", "2024-12-22");
  assertEquals(result, "2025-01-01");
});

// ===== 4. TIME NORMALIZATION TESTS =====

Deno.test("parseTime: 9am", () => {
  const result = parseTime("9am");
  assertEquals(result, "09:00");
});

Deno.test("parseTime: 3:30pm", () => {
  const result = parseTime("3:30pm");
  assertEquals(result, "15:30");
});

Deno.test("parseTime: morning", () => {
  const result = parseTime("morning");
  assertEquals(result, "09:00");
});

Deno.test("parseTime: afternoon", () => {
  const result = parseTime("afternoon");
  assertEquals(result, "14:00");
});

Deno.test("parseTime: midnight", () => {
  const result = parseTime("midnight");
  assertEquals(result, "00:00");
});

Deno.test("parseTime: already formatted", () => {
  const result = parseTime("14:30");
  assertEquals(result, "14:30");
});

Deno.test("parseTime: 12pm (noon)", () => {
  const result = parseTime("12pm");
  assertEquals(result, "12:00");
});

Deno.test("parseTime: 12am (midnight)", () => {
  const result = parseTime("12am");
  assertEquals(result, "00:00");
});

Deno.test("parseTimeRange: 9am-11am", () => {
  const result = parseTimeRange("9am-11am");
  assertEquals(result, { start: "09:00", end: "11:00" });
});

Deno.test("parseTimeRange: morning to afternoon", () => {
  const result = parseTimeRange("morning to afternoon");
  assertEquals(result, { start: "09:00", end: "14:00" });
});

Deno.test("parseDuration: 1 hour", () => {
  const result = parseDuration("1 hour");
  assertEquals(result, 60);
});

Deno.test("parseDuration: 30 min", () => {
  const result = parseDuration("30 min");
  assertEquals(result, 30);
});

Deno.test("parseDuration: 2h 30m", () => {
  const result = parseDuration("2h 30m");
  assertEquals(result, 150);
});

Deno.test("parseDuration: 1.5 hours", () => {
  const result = parseDuration("1.5 hours");
  assertEquals(result, 90);
});

// ===== 5. EVENT CLASSIFICATION TESTS =====

Deno.test("classifyEvent: gym workout", () => {
  const result = classifyEvent("Morning gym session");
  assertEquals(result, { type: "ROUTINE", flexibility: "medium" });
});

Deno.test("classifyEvent: team meeting", () => {
  const result = classifyEvent("Team standup meeting");
  assertEquals(result, { type: "COMMITMENT", flexibility: "fixed" });
});

Deno.test("classifyEvent: study session", () => {
  const result = classifyEvent("Study for exam");
  assertEquals(result, { type: "STUDY", flexibility: "medium" });
});

Deno.test("classifyEvent: lock in", () => {
  const result = classifyEvent("Lock in coding session");
  assertEquals(result, { type: "LOCKIN", flexibility: "strong" });
});

Deno.test("classifyEvent: generic event", () => {
  const result = classifyEvent("Grocery shopping");
  assertEquals(result, { type: "OTHER", flexibility: "low" });
});

// ===== 6. INTEGRATION TESTS =====

Deno.test("processExtractedEntities: single event with tomorrow", () => {
  const extracted = [
    {
      title: "Team Meeting",
      date: "tomorrow",
      start: "2pm",
      duration: "1 hour",
    },
  ];

  const result = processExtractedEntities(extracted, "2024-12-22");

  assertEquals(result.length, 1);
  assertEquals(result[0].title, "Team Meeting");
  assertEquals(result[0].date, "2024-12-23");
  assertEquals(result[0].start, "14:00");
  assertEquals(result[0].end, "15:00");
  assertExists(result[0].id);
});

Deno.test("processExtractedEntities: recurring event with pattern", () => {
  const extracted = [
    {
      title: "Morning Workout",
      day_pattern: "Mon/Wed/Fri",
      start: "7am",
      end: "8am",
    },
  ];

  const result = processExtractedEntities(extracted, "2024-12-22");

  assertEquals(result.length, 3);
  assertEquals(result[0].day, "Mon");
  assertEquals(result[1].day, "Wed");
  assertEquals(result[2].day, "Fri");
  assertEquals(result[0].start, "07:00");
  assertEquals(result[0].end, "08:00");
});

Deno.test("processExtractedEntities: frequency distribution", () => {
  const extracted = [
    {
      title: "Gym",
      frequency: "3x/week",
      start: "morning",
      duration: "1 hour",
    },
  ];

  const result = processExtractedEntities(extracted, "2024-12-22");

  assertEquals(result.length, 3);
  assertEquals(result[0].day, "Mon");
  assertEquals(result[1].day, "Wed");
  assertEquals(result[2].day, "Fri");
  assertEquals(result[0].start, "09:00");
  assertEquals(result[0].end, "10:00");
});

Deno.test("processExtractedEntities: next Monday event", () => {
  const extracted = [
    {
      title: "Project Kickoff",
      date: "next Monday",
      start: "10am",
      end: "11am",
    },
  ];

  const result = processExtractedEntities(extracted, "2024-12-22");

  assertEquals(result.length, 1);
  assertEquals(result[0].date, "2024-12-30");
  assertEquals(result[0].start, "10:00");
  assertEquals(result[0].end, "11:00");
});

Deno.test("processExtractedEntities: all-day event", () => {
  const extracted = [
    {
      title: "Conference",
      date: "2025-01-15",
      all_day: true,
      start: "9am", // Will still be processed
      end: "5pm",
    },
  ];

  const result = processExtractedEntities(extracted, "2024-12-22");

  assertEquals(result.length, 1);
  assertEquals(result[0].date, "2025-01-15");
  assertEquals(result[0].all_day, true);
});

Deno.test("processExtractedEntities: event with location and priority", () => {
  const extracted = [
    {
      title: "Client Meeting",
      date: "tomorrow",
      start: "2pm",
      end: "3pm",
      location: "Conference Room A",
      priority: "high" as const,
    },
  ];

  const result = processExtractedEntities(extracted, "2024-12-22");

  assertEquals(result.length, 1);
  assertEquals(result[0].location, "Conference Room A");
  assertEquals(result[0].priority, "high");
});

// ===== 7. EDGE CASES =====

Deno.test("expandDayPattern: invalid pattern returns empty", () => {
  const result = expandDayPattern("invalid-pattern");
  assertEquals(result, []);
});

Deno.test("parseTime: invalid time returns null", () => {
  const result = parseTime("not-a-time");
  assertEquals(result, null);
});

Deno.test("resolveTemporalReference: invalid reference returns null", () => {
  const result = resolveTemporalReference("invalid-date", "2024-12-22");
  assertEquals(result, null);
});

Deno.test("processExtractedEntities: event with no date/pattern is skipped", () => {
  const extracted = [
    {
      title: "Invalid Event",
      start: "9am",
      end: "10am",
      // No date or day_pattern
    },
  ];

  const result = processExtractedEntities(extracted, "2024-12-22");

  assertEquals(result.length, 0);
});

console.log("All tests completed!");
