import { ScheduleInput } from "shared/types";

type Props = {
  input: ScheduleInput;
};

const fieldClass =
  "flex flex-col gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 p-4 shadow-sm";

export function OnboardingCard({ input }: Props) {
  const weekDate = new Date(input.weekOf);
  const weekLabel = Number.isNaN(weekDate.getTime())
    ? input.weekOf
    : weekDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const questions = [
    "School and term",
    "Class times",
    "Exams and deadlines",
    "Fixed commitments",
    "Energy and max study load",
  ];

  return (
    <section className="card rounded-3xl p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Onboarding
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">
            Collect context once. Get a plan in minutes.
          </h2>
          <p className="text-sm text-slate-600">
            Naiya only asks what it needs and turns it into a weekly calendar
            that actually fits.
          </p>
        </div>
        <span className="accent-pill rounded-full px-3 py-2 text-xs font-semibold">
          Under 2 minutes
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className={fieldClass}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Profile
          </div>
          <div className="flex flex-wrap gap-2 text-sm font-medium text-slate-900">
            <span className="rounded-full bg-[var(--foreground)] text-[var(--background)] px-3 py-1">
              Week of {weekLabel}
            </span>
            <span className="rounded-full border border-slate-200 px-3 py-1">
              {input.school ?? "School TBD"}
            </span>
            <span className="rounded-full border border-slate-200 px-3 py-1">
              {input.term ?? "Term TBD"}
            </span>
            <span className="rounded-full border border-slate-200 px-3 py-1">
              Chrono: {input.preferences.chrono}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Quiet hours {input.preferences.quietHours.end} to{" "}
            {input.preferences.quietHours.start}; max{" "}
            {input.preferences.maxDailyStudyHours}h study per day.
          </p>
        </div>

        <div className={fieldClass}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Questions
          </div>
          <ul className="grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
            {questions.map((question) => (
              <li
                key={question}
                className="rounded-xl border border-dashed border-slate-200 px-3 py-2"
              >
                {question}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className={fieldClass}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              Courses and exams
            </p>
            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--foreground)]">
              {input.courses.length} courses
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {input.courses.map((course) => (
              <div
                key={course.id}
                className="rounded-xl border border-slate-200 bg-[var(--surface)] px-3 py-2 text-sm text-slate-800"
              >
                <div className="font-semibold">{course.name}</div>
                <div className="text-xs text-slate-600">
                  {course.expectedWeeklyHours}h/week · Exam {course.examDate}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={fieldClass}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              Fixed commitments
            </p>
            <span className="rounded-full bg-[var(--foreground)] px-2 py-1 text-xs font-semibold text-[var(--background)]">
              {input.commitments.length} saved
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {input.commitments.map((commitment) => (
              <span
                key={commitment.id}
                className="rounded-full border border-slate-200 bg-[var(--surface)] px-3 py-2 text-sm text-slate-800"
              >
                {commitment.title} · {commitment.day} {commitment.start}-
                {commitment.end}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
