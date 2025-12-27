/**
 * Core Scheduling Algorithms for Naiya
 * Handles pattern expansion, frequency distribution, temporal resolution, and event classification
 */

import { Day, CalendarEvent, EventType, Flexibility, ExtractedEvent, ExtractedDeadline } from "../../../shared/types.ts";

// ===== 1. PATTERN EXPANSION =====

/**
 * Expands day patterns into individual days
 * Examples:
 * - "Mon-Fri" → ["Mon", "Tue", "Wed", "Thu", "Fri"]
 * - "Mon/Wed/Fri" → ["Mon", "Wed", "Fri"]
 * - "weekdays" → ["Mon", "Tue", "Wed", "Thu", "Fri"]
 * - "weekends" → ["Sat", "Sun"]
 */
export function expandDayPattern(pattern: string): Day[] {
  const normalized = pattern.toLowerCase().trim();

  // Handle special keywords
  if (normalized === "weekdays" || normalized === "weekday") {
    return ["Mon", "Tue", "Wed", "Thu", "Fri"];
  }
  if (normalized === "weekends" || normalized === "weekend") {
    return ["Sat", "Sun"];
  }
  if (normalized === "every day" || normalized === "daily" || normalized === "everyday") {
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  }

  const dayMap: Record<string, Day> = {
    mon: "Mon", monday: "Mon",
    tue: "Tue", tuesday: "Tue", tues: "Tue",
    wed: "Wed", wednesday: "Wed",
    thu: "Thu", thursday: "Thu", thurs: "Thu",
    fri: "Fri", friday: "Fri",
    sat: "Sat", saturday: "Sat",
    sun: "Sun", sunday: "Sun",
  };

  const allDaysOrdered: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Handle range patterns like "Mon-Fri"
  const rangeMatch = pattern.match(/^(\w+)-(\w+)$/i);
  if (rangeMatch) {
    const [_, start, end] = rangeMatch;
    const startDay = dayMap[start.toLowerCase()];
    const endDay = dayMap[end.toLowerCase()];

    if (startDay && endDay) {
      const startIdx = allDaysOrdered.indexOf(startDay);
      const endIdx = allDaysOrdered.indexOf(endDay);

      if (startIdx !== -1 && endIdx !== -1 && startIdx <= endIdx) {
        return allDaysOrdered.slice(startIdx, endIdx + 1);
      }
    }
  }

  // Handle slash-separated, comma-separated, or space-separated patterns
  // Examples: "Mon/Wed/Fri", "Monday, Wednesday, Friday", "Monday Tuesday Friday"
  const separatedMatch = pattern.split(/[\/,|\s]+/);
  if (separatedMatch.length > 1) {
    const days: Day[] = [];
    for (const part of separatedMatch) {
      const day = dayMap[part.toLowerCase().trim()];
      if (day && !days.includes(day)) {
        days.push(day);
      }
    }
    if (days.length > 0) return days;
  }

  // Single day
  const singleDay = dayMap[normalized];
  if (singleDay) return [singleDay];

  // Fallback: return empty array
  console.warn(`[expandDayPattern] Could not parse pattern: "${pattern}"`);
  return [];
}

// ===== 2. FREQUENCY DISTRIBUTION =====

/**
 * Distributes frequency across week
 * Examples:
 * - "3x/week" → ["Mon", "Wed", "Fri"]
 * - "twice a week" → ["Tue", "Thu"]
 * - "daily" → ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
 */
export function distributeFrequency(frequency: string, preferredDays?: Day[]): Day[] {
  const normalized = frequency.toLowerCase().trim();

  // Extract number from patterns like "3x/week", "twice a week", "2 times per week"
  const numberMap: Record<string, number> = {
    once: 1, twice: 2, thrice: 3,
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  };

  let count = 0;

  // Check for "Nx" or "N times" pattern
  const numberMatch = normalized.match(/(\d+)x|(\d+)\s*times?/);
  if (numberMatch) {
    count = parseInt(numberMatch[1] || numberMatch[2]);
  } else {
    // Check for word numbers
    for (const [word, num] of Object.entries(numberMap)) {
      if (normalized.includes(word)) {
        count = num;
        break;
      }
    }
  }

  // Handle "daily" or "every day"
  if (normalized.includes("daily") || normalized.includes("every day")) {
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  }

  // Default distribution patterns based on count
  const distributionPatterns: Record<number, Day[]> = {
    1: ["Wed"],
    2: ["Tue", "Thu"],
    3: ["Mon", "Wed", "Fri"],
    4: ["Mon", "Tue", "Thu", "Fri"],
    5: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    6: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    7: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  };

  if (count > 0 && count <= 7) {
    return distributionPatterns[count];
  }

  // If preferred days are provided and match count, use them
  if (preferredDays && preferredDays.length === count) {
    return preferredDays;
  }

  console.warn(`[distributeFrequency] Could not parse frequency: "${frequency}"`);
  return [];
}

// ===== 3. TEMPORAL REFERENCE RESOLUTION =====

/**
 * Resolves temporal references to absolute dates
 * Examples:
 * - "tomorrow" → "2024-12-23" (if today is 2024-12-22)
 * - "next Monday" → "2024-12-30"
 * - "in 3 days" → "2024-12-25"
 */
export function resolveTemporalReference(reference: string, currentDate: string): string | null {
  const normalized = reference.toLowerCase().trim();
  const today = new Date(currentDate + "T00:00:00");

  // Helper function to add days
  const addDays = (date: Date, days: number): string => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString().split('T')[0];
  };

  // Helper function to get next occurrence of a day
  const getNextDay = (dayName: string): string | null => {
    const dayMap: Record<string, number> = {
      monday: 1, mon: 1,
      tuesday: 2, tue: 2, tues: 2,
      wednesday: 3, wed: 3,
      thursday: 4, thu: 4, thurs: 4,
      friday: 5, fri: 5,
      saturday: 6, sat: 6,
      sunday: 0, sun: 0,
    };

    const targetDay = dayMap[dayName.toLowerCase()];
    if (targetDay === undefined) return null;

    const currentDay = today.getDay();
    let daysUntil = targetDay - currentDay;

    // If target day is today or in the past this week, get next week's occurrence
    if (daysUntil <= 0) {
      daysUntil += 7;
    }

    return addDays(today, daysUntil);
  };

  // Today
  if (normalized === "today") {
    return currentDate;
  }

  // Tomorrow
  if (normalized === "tomorrow" || normalized === "tmrw") {
    return addDays(today, 1);
  }

  // Yesterday
  if (normalized === "yesterday") {
    return addDays(today, -1);
  }

  // Day after tomorrow
  if (normalized === "day after tomorrow" || normalized === "overmorrow") {
    return addDays(today, 2);
  }

  // This/Next [Day]
  const thisDayMatch = normalized.match(/^(this|next)\s+(\w+)$/);
  if (thisDayMatch) {
    const [_, when, day] = thisDayMatch;
    const nextDate = getNextDay(day);
    if (nextDate) {
      // "this Monday" means this week, "next Monday" means next week
      if (when === "next") {
        return addDays(new Date(nextDate), 7);
      }
      return nextDate;
    }
  }

  // In N days/weeks
  const inMatch = normalized.match(/^in\s+(\d+)\s+(day|week|month)s?$/);
  if (inMatch) {
    const [_, count, unit] = inMatch;
    const num = parseInt(count);

    if (unit === "day") {
      return addDays(today, num);
    } else if (unit === "week") {
      return addDays(today, num * 7);
    } else if (unit === "month") {
      const result = new Date(today);
      result.setMonth(result.getMonth() + num);
      return result.toISOString().split('T')[0];
    }
  }

  // N days/weeks from now
  const fromNowMatch = normalized.match(/^(\d+)\s+(day|week|month)s?\s+from\s+now$/);
  if (fromNowMatch) {
    const [_, count, unit] = fromNowMatch;
    const num = parseInt(count);

    if (unit === "day") {
      return addDays(today, num);
    } else if (unit === "week") {
      return addDays(today, num * 7);
    } else if (unit === "month") {
      const result = new Date(today);
      result.setMonth(result.getMonth() + num);
      return result.toISOString().split('T')[0];
    }
  }

  // Check if it's already a valid date (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(reference)) {
    return reference;
  }

  console.warn(`[resolveTemporalReference] Could not parse reference: "${reference}"`);
  return null;
}

// ===== 4. TIME NORMALIZATION =====

/**
 * Parses time strings to HH:MM format
 * Examples:
 * - "9am" → "09:00"
 * - "3:30pm" → "15:30"
 * - "morning" → "09:00"
 * - "afternoon" → "14:00"
 */
export function parseTime(timeStr: string): string | null {
  const normalized = timeStr.toLowerCase().trim();

  // Time of day keywords
  const timeKeywords: Record<string, string> = {
    morning: "09:00",
    "early morning": "07:00",
    noon: "12:00",
    afternoon: "14:00",
    "late afternoon": "16:00",
    evening: "18:00",
    night: "20:00",
    "late night": "22:00",
    midnight: "00:00",
  };

  if (timeKeywords[normalized]) {
    return timeKeywords[normalized];
  }

  // Parse HH:MM format (already formatted)
  if (/^\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }

  // Parse H:MM or HH:MM with optional am/pm
  const timeMatch = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (timeMatch) {
    let [_, hours, minutes, meridiem] = timeMatch;
    let hour = parseInt(hours);
    const min = minutes ? parseInt(minutes) : 0;

    // Convert 12-hour to 24-hour
    if (meridiem === "pm" && hour !== 12) {
      hour += 12;
    } else if (meridiem === "am" && hour === 12) {
      hour = 0;
    }

    // If no meridiem and hour is 1-11, assume PM for common meeting times
    if (!meridiem && hour >= 1 && hour <= 11) {
      hour += 12;
    }

    return `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
  }

  console.warn(`[parseTime] Could not parse time: "${timeStr}"`);
  return null;
}

/**
 * Parses time range strings
 * Examples:
 * - "9am-11am" → { start: "09:00", end: "11:00" }
 * - "morning to afternoon" → { start: "09:00", end: "14:00" }
 */
export function parseTimeRange(rangeStr: string): { start: string; end: string } | null {
  const normalized = rangeStr.toLowerCase().trim();

  // Split by common delimiters
  const parts = normalized.split(/\s*(?:-|to|until|till)\s*/);
  if (parts.length !== 2) return null;

  const start = parseTime(parts[0]);
  const end = parseTime(parts[1]);

  if (start && end) {
    return { start, end };
  }

  return null;
}

/**
 * Parses duration strings to minutes
 * Examples:
 * - "1 hour" → 60
 * - "30 min" → 30
 * - "2h 30m" → 150
 */
export function parseDuration(durationStr: string): number | null {
  const normalized = durationStr.toLowerCase().trim();

  let totalMinutes = 0;

  // Match hours
  const hoursMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|h)s?/);
  if (hoursMatch) {
    totalMinutes += parseFloat(hoursMatch[1]) * 60;
  }

  // Match minutes
  const minutesMatch = normalized.match(/(\d+)\s*(?:minute|min|m)s?/);
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1]);
  }

  return totalMinutes > 0 ? totalMinutes : null;
}

// ===== 5. EVENT CLASSIFICATION =====

/**
 * Classifies events based on title and context
 * Returns appropriate EventType and Flexibility
 */
export function classifyEvent(title: string, context?: string): { type: EventType; flexibility: Flexibility } {
  const normalized = title.toLowerCase();
  const fullText = context ? `${normalized} ${context.toLowerCase()}` : normalized;

  // ROUTINE patterns
  const routineKeywords = ["workout", "gym", "exercise", "run", "jog", "meditation", "breakfast", "lunch", "dinner", "meal"];
  if (routineKeywords.some(kw => fullText.includes(kw))) {
    return { type: "ROUTINE", flexibility: "medium" };
  }

  // COMMITMENT patterns (fixed events)
  const commitmentKeywords = ["meeting", "class", "lecture", "appointment", "interview", "session", "call", "standup"];
  if (commitmentKeywords.some(kw => fullText.includes(kw))) {
    return { type: "COMMITMENT", flexibility: "fixed" };
  }

  // STUDY patterns
  const studyKeywords = ["study", "homework", "assignment", "project", "research", "reading", "review", "practice"];
  if (studyKeywords.some(kw => fullText.includes(kw))) {
    return { type: "STUDY", flexibility: "medium" };
  }

  // LOCKIN patterns (deep focus sessions)
  const lockinKeywords = ["lock in", "lockin", "focus", "deep work", "coding", "writing"];
  if (lockinKeywords.some(kw => fullText.includes(kw))) {
    return { type: "LOCKIN", flexibility: "strong" };
  }

  // Default to OTHER
  return { type: "OTHER", flexibility: "low" };
}

// ===== 6. MAIN PROCESSING PIPELINE =====

/**
 * Processes extracted entities from LLM into structured calendar events
 */
export function processExtractedEntities(
  extractedEvents: ExtractedEvent[],
  currentDate: string
): CalendarEvent[] {
  const processedEvents: CalendarEvent[] = [];

  for (const extracted of extractedEvents) {
    // Classify event
    const { type, flexibility } = classifyEvent(
      extracted.title,
      extracted.notes
    );

    // Handle temporal resolution
    let absoluteDate: string | null = null;
    if (extracted.date) {
      absoluteDate = resolveTemporalReference(extracted.date, currentDate);
    }

    // Handle day patterns
    let days: Day[] = [];
    if (extracted.day_pattern) {
      days = expandDayPattern(extracted.day_pattern);
    }

    // Handle frequency
    if (extracted.frequency) {
      days = distributeFrequency(extracted.frequency);
    }

    // Parse time
    let start = "09:00";
    let end = "10:00";

    if (extracted.start && extracted.end) {
      start = parseTime(extracted.start) || start;
      end = parseTime(extracted.end) || end;
    } else if (extracted.start && extracted.duration) {
      start = parseTime(extracted.start) || start;
      const durationMinutes = parseDuration(extracted.duration) || 60;
      const [hours, minutes] = start.split(":").map(Number);
      const endMinutes = hours * 60 + minutes + durationMinutes;
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      end = `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
    }

    // Generate events
    if (absoluteDate) {
      // One-time event
      processedEvents.push({
        id: crypto.randomUUID(),
        title: extracted.title,
        type: extracted.type || type,
        date: absoluteDate,
        start,
        end,
        flexibility: extracted.flexibility || flexibility,
        source: "custom",
        location: extracted.location,
        notes: extracted.notes,
        all_day: extracted.all_day,
        priority: extracted.priority,
      });
    } else if (days.length > 0) {
      // Recurring events
      for (const day of days) {
        processedEvents.push({
          id: crypto.randomUUID(),
          title: extracted.title,
          type: extracted.type || type,
          day,
          start,
          end,
          flexibility: extracted.flexibility || flexibility,
          source: "custom",
          location: extracted.location,
          notes: extracted.notes,
          all_day: extracted.all_day,
          priority: extracted.priority,
        });
      }
    } else {
      console.warn(`[processExtractedEntities] Could not determine date/day for event: ${extracted.title}`);
    }
  }

  return processedEvents;
}
