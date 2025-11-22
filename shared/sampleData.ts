import { generateSchedule } from "./generator";
import { ScheduleInput } from "./types";

const startOfWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // move to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const formatWeekLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const weekStart = startOfWeek();
const weekIso = weekStart.toISOString().split("T")[0];
const weekLabel = formatWeekLabel(weekStart);

export const sampleInput: ScheduleInput = {
  weekOf: weekIso,
  school: "UW",
  term: "Winter 2025",
  preferences: {
    chrono: "morning",
    maxDailyStudyHours: 5,
    quietHours: { start: "22:30", end: "07:00" },
    mostlyFreeDay: "Sun",
    notes: "Seattle campus",
  },
  courses: [
    {
      id: "econ201",
      name: "Econ 201",
      expectedWeeklyHours: 6,
      examDate: "2024-12-12",
      meetings: [
        { day: "Mon", start: "09:30", end: "10:45", location: "Bagley 241" },
        { day: "Wed", start: "09:30", end: "10:45", location: "Bagley 241" },
      ],
    },
    {
      id: "bio150",
      name: "Bio 150",
      expectedWeeklyHours: 5,
      examDate: "2024-12-19",
      meetings: [
        { day: "Tue", start: "12:30", end: "13:45", location: "Life Sci 105" },
        { day: "Thu", start: "12:30", end: "13:45", location: "Life Sci 105" },
      ],
    },
    {
      id: "cs180",
      name: "CS 180",
      expectedWeeklyHours: 7,
      examDate: "2024-12-09",
      meetings: [
        { day: "Mon", start: "14:00", end: "15:15", location: "Allen 301" },
        { day: "Wed", start: "14:00", end: "15:15", location: "Allen 301" },
      ],
    },
  ],
  commitments: [
    {
      id: "work-shift",
      title: "Campus job",
      day: "Tue",
      start: "17:00",
      end: "19:00",
      type: "work",
    },
    {
      id: "club",
      title: "Robotics club",
      day: "Wed",
      start: "18:00",
      end: "20:00",
      type: "club",
    },
    {
      id: "gym",
      title: "Gym",
      day: "Fri",
      start: "16:30",
      end: "17:30",
      type: "gym",
      locked: false,
    },
  ],
};

export const samplePlan = generateSchedule(sampleInput);
export const sampleWeek = { label: weekLabel, iso: weekIso };

export const sampleTranscript: { role: "user" | "naiya"; text: string }[] = [
  {
    role: "user",
    text: "I have CS class every Tue/Thu 1–3pm and want Sundays light.",
  },
  {
    role: "naiya",
    text:
      "Added the classes, protected Sunday, and shifted CS study to Thursday afternoon and Saturday morning.",
  },
  {
    role: "user",
    text: "Move Friday evening study to Saturday 9am and add gym Wed 6–7pm.",
  },
  {
    role: "naiya",
    text:
      "Done. Shifted the block, added gym, and kept daily study under 5h while boosting CS 180 ahead of its exam.",
  },
];

export const quickTodos = [
  { id: "todo-1", text: "Submit econ problem set 3", due: "Today" },
  { id: "todo-2", text: "Read ch.6 for Bio 150", due: "Tomorrow" },
  { id: "todo-3", text: "Book TA hours for CS 180", due: "This week" },
];

export const upcomingEvents = [
  { id: "up-1", title: "CS 180 midterm", when: "In 8 days", type: "Exam" },
  { id: "up-2", title: "Econ quiz", when: "In 3 days", type: "Quiz" },
  { id: "up-3", title: "Robotics club demo", when: "Tonight", type: "Commitment" },
];
