/**
 * Validation and Edge Case Handling for Naiya
 * Ensures data integrity and handles common scheduling conflicts
 */

import { CalendarEvent, Deadline, LLMExtractionResult } from "../../../shared/types.ts";

// ===== 1. LLM RESPONSE VALIDATION =====

/**
 * Validates and sanitizes LLM extraction result
 */
export function validateLLMResponse(response: unknown): LLMExtractionResult {
  if (!response || typeof response !== "object") {
    throw new Error("Invalid LLM response: not an object");
  }

  const result = response as Record<string, unknown>;

  // Message is required
  if (!result.message || typeof result.message !== "string") {
    throw new Error("Invalid LLM response: missing or invalid 'message' field");
  }

  // Validate events array
  const events = Array.isArray(result.events) ? result.events : [];
  const validatedEvents = events.filter(e => {
    if (!e || typeof e !== "object") return false;
    const event = e as Record<string, unknown>;
    return typeof event.title === "string" && event.title.trim().length > 0;
  });

  // Validate deadlines array
  const deadlines = Array.isArray(result.deadlines) ? result.deadlines : [];
  const validatedDeadlines = deadlines.filter(d => {
    if (!d || typeof d !== "object") return false;
    const deadline = d as Record<string, unknown>;
    return (
      typeof deadline.title === "string" &&
      deadline.title.trim().length > 0 &&
      typeof deadline.date === "string"
    );
  });

  // Validate modifications array
  const modifications = Array.isArray(result.modifications) ? result.modifications : [];
  const validatedModifications = modifications.filter(m => {
    if (!m || typeof m !== "object") return false;
    const mod = m as Record<string, unknown>;
    return (
      typeof mod.action === "string" &&
      ["delete", "update", "reschedule"].includes(mod.action) &&
      mod.target && typeof mod.target === "object"
    );
  });

  return {
    message: result.message as string,
    events: validatedEvents.length > 0 ? validatedEvents as LLMExtractionResult["events"] : undefined,
    deadlines: validatedDeadlines.length > 0 ? validatedDeadlines as LLMExtractionResult["deadlines"] : undefined,
    modifications: validatedModifications.length > 0 ? validatedModifications as LLMExtractionResult["modifications"] : undefined,
    user_preferences: result.user_preferences && typeof result.user_preferences === "object"
      ? result.user_preferences as LLMExtractionResult["user_preferences"]
      : undefined,
  };
}

// ===== 2. EVENT VALIDATION =====

/**
 * Validates individual calendar event
 */
export function validateCalendarEvent(event: CalendarEvent): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Title required
  if (!event.title || event.title.trim().length === 0) {
    errors.push("Event title is required");
  }

  // Must have either date or day
  if (!event.date && !event.day) {
    errors.push("Event must have either 'date' or 'day' specified");
  }

  // Cannot have both date and day
  if (event.date && event.day) {
    errors.push("Event cannot have both 'date' and 'day' specified");
  }

  // Time validation
  if (!event.start || !event.end) {
    errors.push("Event must have both start and end times");
  }

  // Time format validation (HH:MM)
  const timeRegex = /^\d{2}:\d{2}$/;
  if (event.start && !timeRegex.test(event.start)) {
    errors.push(`Invalid start time format: ${event.start} (expected HH:MM)`);
  }
  if (event.end && !timeRegex.test(event.end)) {
    errors.push(`Invalid end time format: ${event.end} (expected HH:MM)`);
  }

  // Date format validation (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (event.date && !dateRegex.test(event.date)) {
    errors.push(`Invalid date format: ${event.date} (expected YYYY-MM-DD)`);
  }

  // Validate time range (end should be after start, unless it spans midnight)
  if (event.start && event.end && !event.spans_midnight) {
    const [startHours, startMinutes] = event.start.split(":").map(Number);
    const [endHours, endMinutes] = event.end.split(":").map(Number);
    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;

    if (endTotal <= startTotal) {
      errors.push(`End time (${event.end}) must be after start time (${event.start})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates deadline
 */
export function validateDeadline(deadline: Deadline): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Title required
  if (!deadline.title || deadline.title.trim().length === 0) {
    errors.push("Deadline title is required");
  }

  // Date required
  if (!deadline.date) {
    errors.push("Deadline date is required");
  }

  // Date format validation
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (deadline.date && !dateRegex.test(deadline.date)) {
    errors.push(`Invalid date format: ${deadline.date} (expected YYYY-MM-DD)`);
  }

  // Time format validation (if provided)
  const timeRegex = /^\d{2}:\d{2}$/;
  if (deadline.due_time && !timeRegex.test(deadline.due_time)) {
    errors.push(`Invalid due_time format: ${deadline.due_time} (expected HH:MM)`);
  }

  // Duration validation
  if (deadline.duration !== undefined && deadline.duration <= 0) {
    errors.push("Duration must be positive");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ===== 3. CONFLICT DETECTION =====

/**
 * Checks if two events overlap
 */
export function eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
  // Must be on same date or same day to overlap
  const sameDate = event1.date && event2.date && event1.date === event2.date;
  const sameDay = event1.day && event2.day && event1.day === event2.day;

  if (!sameDate && !sameDay) {
    return false;
  }

  // Convert times to minutes for comparison
  const [start1Hours, start1Minutes] = event1.start.split(":").map(Number);
  const [end1Hours, end1Minutes] = event1.end.split(":").map(Number);
  const [start2Hours, start2Minutes] = event2.start.split(":").map(Number);
  const [end2Hours, end2Minutes] = event2.end.split(":").map(Number);

  const start1 = start1Hours * 60 + start1Minutes;
  const end1 = end1Hours * 60 + end1Minutes;
  const start2 = start2Hours * 60 + start2Minutes;
  const end2 = end2Hours * 60 + end2Minutes;

  // Check overlap: event1 starts before event2 ends AND event2 starts before event1 ends
  return start1 < end2 && start2 < end1;
}

/**
 * Detects all conflicts in a set of events
 */
export function detectConflicts(events: CalendarEvent[]): Array<{ event1: CalendarEvent; event2: CalendarEvent }> {
  const conflicts: Array<{ event1: CalendarEvent; event2: CalendarEvent }> = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      if (eventsOverlap(events[i], events[j])) {
        conflicts.push({
          event1: events[i],
          event2: events[j],
        });
      }
    }
  }

  return conflicts;
}

// ===== 4. CONFLICT RESOLUTION =====

/**
 * Resolves conflicts based on flexibility and priority
 * Returns adjusted events and conflict notes
 */
export function resolveConflicts(
  events: CalendarEvent[]
): { events: CalendarEvent[]; notes: string[]; hasUnresolved: boolean } {
  const conflicts = detectConflicts(events);
  const notes: string[] = [];
  let hasUnresolved = false;

  if (conflicts.length === 0) {
    return { events, notes, hasUnresolved };
  }

  // Priority order for flexibility (higher = more flexible)
  const flexibilityPriority: Record<string, number> = {
    fixed: 0,
    strong: 1,
    medium: 2,
    low: 3,
    high: 4,
  };

  // Track which events to keep
  const eventMap = new Map<string, CalendarEvent>();
  events.forEach(e => eventMap.set(e.id, e));

  for (const conflict of conflicts) {
    const { event1, event2 } = conflict;

    // Get flexibility scores
    const flex1 = flexibilityPriority[event1.flexibility] ?? 2;
    const flex2 = flexibilityPriority[event2.flexibility] ?? 2;

    // If both are fixed, we have an unresolvable conflict
    if (flex1 === 0 && flex2 === 0) {
      hasUnresolved = true;
      notes.push(
        `⚠️ Unresolvable conflict: "${event1.title}" and "${event2.title}" both have fixed times on ${event1.date || event1.day}`
      );
      continue;
    }

    // Remove the more flexible event
    if (flex1 > flex2) {
      eventMap.delete(event1.id);
      notes.push(
        `Removed "${event1.title}" due to conflict with less flexible "${event2.title}"`
      );
    } else if (flex2 > flex1) {
      eventMap.delete(event2.id);
      notes.push(
        `Removed "${event2.title}" due to conflict with less flexible "${event1.title}"`
      );
    } else {
      // Same flexibility - use priority if available
      const priority1 = event1.priority === "high" ? 3 : event1.priority === "medium" ? 2 : 1;
      const priority2 = event2.priority === "high" ? 3 : event2.priority === "medium" ? 2 : 1;

      if (priority1 > priority2) {
        eventMap.delete(event2.id);
        notes.push(
          `Removed "${event2.title}" due to conflict with higher priority "${event1.title}"`
        );
      } else {
        eventMap.delete(event1.id);
        notes.push(
          `Removed "${event1.title}" due to conflict with higher priority "${event2.title}"`
        );
      }
    }
  }

  return {
    events: Array.from(eventMap.values()),
    notes,
    hasUnresolved,
  };
}

// ===== 5. DEADLINE VALIDATION =====

/**
 * Checks if a deadline is realistic given available time
 */
export function validateDeadlineFeasibility(
  deadline: Deadline,
  events: CalendarEvent[],
  currentDate: string
): { feasible: boolean; reason?: string } {
  // If no duration specified, we can't validate feasibility
  if (!deadline.duration) {
    return { feasible: true };
  }

  // Calculate days until deadline
  const today = new Date(currentDate);
  const dueDate = new Date(deadline.date);
  const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // If deadline is in the past or today with no buffer, warn
  if (daysUntil < 0) {
    return {
      feasible: false,
      reason: "Deadline is in the past",
    };
  }

  if (daysUntil === 0 && deadline.duration > 8) {
    return {
      feasible: false,
      reason: "Not enough time to complete today (requires more than 8 hours)",
    };
  }

  // Calculate available hours per day (assuming 8 productive hours/day)
  const availableHoursPerDay = 8;
  const totalAvailableHours = daysUntil * availableHoursPerDay;

  // Check if duration exceeds available time
  if (deadline.duration > totalAvailableHours) {
    return {
      feasible: false,
      reason: `Requires ${deadline.duration} hours but only ${totalAvailableHours} hours available before deadline`,
    };
  }

  return { feasible: true };
}

// ===== 6. SANITIZATION =====

/**
 * Sanitizes user input to prevent injection attacks
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove angle brackets
    .slice(0, 500); // Limit length
}

/**
 * Sanitizes an entire event object
 */
export function sanitizeEvent(event: CalendarEvent): CalendarEvent {
  return {
    ...event,
    title: sanitizeString(event.title),
    notes: event.notes ? sanitizeString(event.notes) : undefined,
    location: event.location ? sanitizeString(event.location) : undefined,
    description: event.description ? sanitizeString(event.description) : undefined,
  };
}
