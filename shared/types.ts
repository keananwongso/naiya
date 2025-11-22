export type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type ChronoPreference = "morning" | "afternoon" | "night";

export type EventSource = "class" | "commitment" | "study" | "custom";

export interface QuietHours {
  start: string; // e.g. "22:00"
  end: string; // e.g. "07:30"
}

export interface Preferences {
  chrono: ChronoPreference;
  maxDailyStudyHours: number;
  quietHours: QuietHours;
  mostlyFreeDay?: DayKey;
  notes?: string;
}

export interface ClassMeeting {
  day: DayKey;
  start: string;
  end: string;
  location?: string;
}

export interface CourseInput {
  id: string;
  name: string;
  expectedWeeklyHours: number;
  examDate: string; // ISO string
  weight?: number;
  meetings: ClassMeeting[];
}

export interface Commitment {
  id: string;
  title: string;
  day: DayKey;
  start: string;
  end: string;
  type: "work" | "club" | "gym" | "social" | "other";
  locked?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  day: DayKey;
  start: string;
  end: string;
  source: EventSource;
  courseId?: string;
  locked?: boolean;
  accent?: string;
  details?: string;
}

export interface ScheduleInput {
  weekOf: string;
  school?: string;
  term?: string;
  preferences: Preferences;
  courses: CourseInput[];
  commitments: Commitment[];
}

export interface StudyPlan {
  events: CalendarEvent[];
  notes: string[];
}
