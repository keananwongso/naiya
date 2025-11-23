export type Day =
  | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type DayKey = Day;

export type Flexibility = "fixed" | "strong" | "medium" | "low";

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
  day: Day;
  start: string;
  end: string;
  flexibility: Flexibility;
  course?: string;
  // Frontend specific fields
  source: "class" | "commitment" | "study" | "custom";
  tagId?: string;
  notes?: string;
  recurrence?: Recurrence;
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
