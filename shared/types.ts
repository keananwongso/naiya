export type Day =
  | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type DayKey = Day;

export type Flexibility = "fixed" | "strong" | "medium" | "low" | "high";

export interface RoutineItem {
  title: string;
  days: Day[];
  start: string; // HH:MM
  end: string;
  flexibility?: Flexibility;
}

export interface DeadlineItem {
  title: string;
  course?: string;
  date: string; // YYYY-MM-DD
  importance?: "low" | "medium" | "high";
  flexibility?: Flexibility;
}

export interface LockInItem {
  title: string;
  day: Day;
  start: string;
  end: string;
  flexibility?: Flexibility;
}

export interface OtherEventItem {
  title: string;
  date: string;
  start: string;
  end: string;
  flexibility?: Flexibility;
}

export interface Preferences {
  wake: string;  // "08:00"
  sleep: string; // "23:00"
  maxStudyHoursPerDay?: number;
}

export interface CategoryBuckets {
  routineSchedule: RoutineItem[];
  deadlines: DeadlineItem[];
  lockInSessions: LockInItem[];
  otherEvents: OtherEventItem[];
  preferences: Preferences;
}

export type EventType =
  | "ROUTINE"
  | "COMMITMENT"
  | "STUDY"
  | "LOCKIN"
  | "OTHER";

export interface CalendarEvent {
  id: string;
  title: string;
  type: EventType;

  // Recurring events use 'day', one-time events use 'date'
  // Exactly one of these must be set
  day?: Day;  // Optional: "Mon" | "Tue" | ... (for weekly recurring events)
  date?: string;  // Optional: "YYYY-MM-DD" (for one-time events)

  start: string;
  end: string;
  flexibility: Flexibility;
  course?: string; // e.g. "CPSC 110"
  // Frontend specific fields
  source: "class" | "study" | "commitment" | "custom";
  excludedDates?: string[]; // ISO dates (YYYY-MM-DD) to skip for recurring events
  tagId?: string;
  notes?: string;
  recurrence?: Recurrence;

  // Extended fields for DeepSeek integration
  all_day?: boolean; // True if event spans entire day
  spans_midnight?: boolean; // True if end time < start time (e.g., 22:00 - 02:00)
  timezone?: string; // IANA timezone (e.g., "America/Los_Angeles")
  busy_status?: "free" | "busy" | "tentative"; // Availability status
  location?: string; // Physical or virtual location
  description?: string; // Additional event details
  priority?: "low" | "medium" | "high"; // Event priority
}

export interface CalendarJSON {
  events: CalendarEvent[];
}

export interface StudyPlanItem {
  deadlineTitle: string;
  hoursNeeded: number;
  dailyDistribution: Partial<Record<Day, number>>;
}

export interface PlanWeekIntent {
  assistant_message: string;
  plan: {
    studyPlan: StudyPlanItem[];
  };
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Recurrence {
  type: "none" | "daily" | "weekly" | "custom";
  days?: DayKey[];
}

export interface CourseInput {
  id: string;
  name: string;
  expectedWeeklyHours: number;
  examDate: string;
  meetings: Array<{
    day: DayKey;
    start: string;
    end: string;
    location: string;
  }>;
}

export interface ScheduleInput {
  weekOf: string;
  school?: string;
  term?: string;
  preferences: {
    chrono: string;
    quietHours: { start: string; end: string };
    maxDailyStudyHours: number;
    mostlyFreeDay?: DayKey;
  };
  courses: CourseInput[];
  commitments: Array<{
    id: string;
    title: string;
    day: DayKey;
    start: string;
    end: string;
    type?: string;
    locked?: boolean;
  }>;
}

export interface StudyPlan {
  events: CalendarEvent[];
  notes: string[];
}

// Deadline interface for database storage
export interface Deadline {
  id: string;
  title: string;
  course?: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  createdAt: string;
  updatedAt: string;

  // Extended fields for DeepSeek integration
  due_time?: string; // HH:MM format for specific deadline time
  duration?: number; // Estimated hours to complete
  min_chunk_duration?: number; // Minimum continuous work session (hours)
  splittable?: boolean; // Can be broken into multiple sessions
  buffer_hours?: number; // Hours before deadline to finish by
  priority?: "low" | "medium" | "high"; // Urgency level
  tags?: string[]; // Categorization tags
}

// DeepSeek LLM Extraction Result Types
export interface ExtractedEvent {
  title: string;
  type?: EventType;
  date?: string; // YYYY-MM-DD or temporal reference like "tomorrow", "next Monday"
  day_pattern?: string; // "Mon-Fri", "Mon/Wed/Fri", "weekdays", "weekends"
  frequency?: string; // "3x/week", "daily", "twice a week"
  start?: string; // HH:MM or natural language like "morning", "after lunch"
  end?: string; // HH:MM or natural language
  duration?: string; // "1 hour", "30 min", "2h"
  all_day?: boolean;
  flexibility?: Flexibility;
  location?: string;
  notes?: string;
  priority?: "low" | "medium" | "high";
}

export interface ExtractedDeadline {
  title: string;
  course?: string;
  date: string; // YYYY-MM-DD or temporal reference
  due_time?: string; // HH:MM
  duration?: number; // Hours
  min_chunk_duration?: number;
  splittable?: boolean;
  buffer_hours?: number;
  priority?: "low" | "medium" | "high";
  tags?: string[];
}

export interface ExtractedModification {
  action: "delete" | "update" | "reschedule";
  target: {
    title?: string; // Event title to match
    date?: string; // Specific date
    day?: Day; // Day of week
    type?: EventType; // Event type
  };
  changes?: {
    title?: string;
    date?: string;
    start?: string;
    end?: string;
    location?: string;
    notes?: string;
  };
  reason?: string;
}

export interface LLMExtractionResult {
  message: string; // Conversational response to user
  events?: ExtractedEvent[]; // New events to add
  deadlines?: ExtractedDeadline[]; // New deadlines to track
  modifications?: ExtractedModification[]; // Changes to existing items
  user_preferences?: {
    wake_time?: string;
    sleep_time?: string;
    max_study_hours?: number;
    timezone?: string;
  };
}
