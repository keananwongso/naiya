import {
  CalendarEvent,
  CourseInput,
  DayKey,
  ScheduleInput,
  StudyPlan,
  Flexibility,
} from "./types";

const dayOrder: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const chronoSlots: Record<string, string[]> = {
  morning: ["07:30", "09:00", "10:30", "12:00"],
  afternoon: ["12:30", "14:00", "15:30", "17:15"],
  night: ["16:30", "18:00", "19:45", "21:00"],
};

const fallbackSlots = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:30"];
const studyBlockMinutes = 90;
const bufferMinutes = 15;

type DayLedger = Record<
  DayKey,
  { events: Array<{ start: number; end: number; source: string }>; study: number }
>;

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
  const hrs = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hrs}:${mins}`;
};

const diffInDays = (start: Date, end: Date): number => {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / msPerDay));
};

const withinQuietHours = (start: number, end: number, quietStart: number, quietEnd: number) =>
  start >= quietEnd && end <= quietStart;

const hasConflict = (ledger: DayLedger, day: DayKey, start: number, end: number) =>
  ledger[day].events.some(
    (event) =>
      start < event.end + bufferMinutes && end + bufferMinutes > event.start,
  );

const createLedger = (): DayLedger =>
  dayOrder.reduce(
    (acc, day) => {
      acc[day] = { events: [], study: 0 };
      return acc;
    },
    {} as DayLedger,
  );

const addEventToLedger = (
  ledger: DayLedger,
  day: DayKey,
  start: number,
  end: number,
  source: string,
) => {
  ledger[day].events.push({ start, end, source });
  if (source === "study") {
    ledger[day].study += end - start;
  }
};

const buildFixedEvents = (
  courses: CourseInput[],
  commitments: ScheduleInput["commitments"],
): CalendarEvent[] => {
  const courseBlocks = courses.flatMap((course) =>
    course.meetings.map((meeting, index) => ({
      id: `${course.id}-class-${index}`,
      title: `${course.name} — class`,
      day: meeting.day,
      start: meeting.start,
      end: meeting.end,
      course: course.id,
      source: "class" as const,
      flexibility: "fixed" as const,
      type: "ROUTINE" as const,
    })),
  );

  const commitmentBlocks = commitments.map((commitment) => ({
    id: commitment.id,
    title: commitment.title,
    day: commitment.day,
    start: commitment.start,
    end: commitment.end,
    source: "commitment" as const,
    flexibility: (commitment.locked ? "fixed" : "medium") as Flexibility,
    type: "COMMITMENT" as const,
  }));

  return [...courseBlocks, ...commitmentBlocks];
};

const orderDaysForCourse = (
  course: CourseInput,
  ledger: DayLedger,
  mostlyFreeDay?: DayKey,
) => {
  const classDays = new Set(course.meetings.map((meeting) => meeting.day));
  return [...dayOrder].sort((a, b) => {
    const score = (day: DayKey) => {
      const base = ledger[day].study;
      const classBonus = classDays.has(day) ? -60 : 0;
      const freeDayPenalty = day === mostlyFreeDay ? 240 : 0;
      return base + classBonus + freeDayPenalty;
    };
    return score(a) - score(b);
  });
};

const pickSlots = (chrono: string) => [
  ...(chronoSlots[chrono] ?? []),
  ...fallbackSlots,
];

const placeStudyBlock = ({
  course,
  ledger,
  preferences,
  events,
  blockMinutes,
}: {
  course: CourseInput;
  ledger: DayLedger;
  preferences: ScheduleInput["preferences"];
  events: CalendarEvent[];
  blockMinutes: number;
}): boolean => {
  const quietStart = timeToMinutes(preferences.quietHours.start);
  const quietEnd = timeToMinutes(preferences.quietHours.end);
  const dailyLimit = preferences.maxDailyStudyHours * 60;
  const slots = pickSlots(preferences.chrono);
  const dayCandidates = orderDaysForCourse(
    course,
    ledger,
    preferences.mostlyFreeDay,
  );

  for (const day of dayCandidates) {
    if (ledger[day].study + blockMinutes > dailyLimit) continue;
    for (const slot of slots) {
      const start = timeToMinutes(slot);
      const end = start + blockMinutes;
      if (!withinQuietHours(start, end, quietStart, quietEnd)) continue;
      if (hasConflict(ledger, day, start, end)) continue;

      const studyEvent: CalendarEvent = {
        id: `${course.id}-study-${events.length}`,
        title: `${course.name} study`,
        day,
        start: minutesToTime(start),
        end: minutesToTime(end),
        source: "study",
        course: course.id,
        type: "STUDY",
        flexibility: "medium",
      };

      events.push(studyEvent);
      addEventToLedger(ledger, day, start, end, "study");
      return true;
    }
  }
  return false;
};

export const generateSchedule = (input: ScheduleInput): StudyPlan => {
  const baseEvents = buildFixedEvents(input.courses, input.commitments);
  const events: CalendarEvent[] = [...baseEvents];
  const ledger = createLedger();

  baseEvents.forEach((event) => {
    addEventToLedger(
      ledger,
      event.day,
      timeToMinutes(event.start),
      timeToMinutes(event.end),
      event.source,
    );
  });

  const referenceDate = new Date(input.weekOf);
  const notes: string[] = [];

  const courseUrgency = input.courses
    .map((course) => {
      const daysUntilExam = diffInDays(referenceDate, new Date(course.examDate));
      const urgency = Math.max(0.6, 21 / Math.max(7, daysUntilExam));
      return { ...course, daysUntilExam, urgency };
    })
    .sort((a, b) => b.urgency - a.urgency);

  for (const course of courseUrgency) {
    const targetMinutes = Math.max(180, course.expectedWeeklyHours * 60);
    const blocksNeeded = Math.max(2, Math.ceil(targetMinutes / studyBlockMinutes));
    let placed = 0;

    while (placed < blocksNeeded) {
      const ok = placeStudyBlock({
        course,
        ledger,
        preferences: input.preferences,
        events,
        blockMinutes: studyBlockMinutes,
      });

      if (!ok) break;
      placed += 1;
    }

    if (course.daysUntilExam <= 10) {
      notes.push(
        `${course.name}: pulled extra focus because the exam is in ${course.daysUntilExam} days.`,
      );
    }
  }

  notes.push(
    `Capped study to ${input.preferences.maxDailyStudyHours}h/day and respected quiet hours (${input.preferences.quietHours.end}–${input.preferences.quietHours.start}).`,
  );

  if (input.preferences.mostlyFreeDay) {
    notes.push(`Kept ${input.preferences.mostlyFreeDay} lighter per your request.`);
  }

  return { events, notes };
};

export const orderByStart = (a: CalendarEvent, b: CalendarEvent) =>
  timeToMinutes(a.start) - timeToMinutes(b.start);

export const dayNames = dayOrder;
