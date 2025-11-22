import { dayNames, orderByStart } from "shared/generator";
import { CalendarEvent } from "shared/types";

type Props = {
  events: CalendarEvent[];
  title?: string;
};

const sourceStyles: Record<string, string> = {
  class:
    "border-emerald-200/70 bg-emerald-50 text-emerald-900 shadow-[0_14px_40px_rgba(16,185,129,0.12)]",
  commitment:
    "border-blue-200/70 bg-blue-50 text-blue-900 shadow-[0_14px_40px_rgba(59,130,246,0.12)]",
  study:
    "border-amber-200/70 bg-amber-50 text-amber-900 shadow-[0_14px_40px_rgba(251,191,36,0.12)]",
  custom: "border-slate-200 bg-white text-slate-900",
};

const sourceLabel: Record<string, string> = {
  class: "Class",
  commitment: "Commitment",
  study: "Study",
  custom: "Event",
};

export function ScheduleGrid({ events, title }: Props) {
  return (
    <section className="card rounded-3xl p-6">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Weekly calendar
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">
            {title ?? "One place for the week"}
          </h2>
          <p className="text-sm text-slate-600">
            Naiya blends classes, commitments, and suggested study blocks into a
            single source of truth. Drag to tweak later.
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800">
          Drag, resize, regenerate
        </div>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        {dayNames.slice(0, 5).map((day) => {
          const dayEvents = events
            .filter((event) => event.day === day)
            .sort(orderByStart);
          return (
            <div
              key={day}
              className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm"
            >
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                  <p className="text-sm font-semibold text-slate-900">{day}</p>
                </div>
                <span className="text-xs text-slate-500">
                  {dayEvents.length} items
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`rounded-xl border px-3 py-2 text-sm transition hover:-translate-y-0.5 ${sourceStyles[event.source] ?? sourceStyles.custom}`}
                  >
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em]">
                      <span>{sourceLabel[event.source] ?? "Event"}</span>
                      {event.locked && (
                        <span className="rounded-full border border-current px-2 py-0.5 text-[10px]">
                          Locked
                        </span>
                      )}
                    </div>
                    <p className="text-base font-semibold leading-tight text-slate-900">
                      {event.title}
                    </p>
                    <p className="text-sm text-slate-700">
                      {event.start} - {event.end}
                    </p>
                    {event.details && (
                      <p className="text-xs text-slate-600">{event.details}</p>
                    )}
                  </div>
                ))}
                {!dayEvents.length && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                    Free to schedule
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {dayNames.slice(5).map((day) => {
          const dayEvents = events
            .filter((event) => event.day === day)
            .sort(orderByStart);
          return (
            <div
              key={day}
              className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm"
            >
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold text-slate-900">{day}</p>
                <span className="text-xs text-slate-500">
                  {dayEvents.length} items
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`rounded-xl border px-3 py-2 text-sm transition hover:-translate-y-0.5 ${sourceStyles[event.source] ?? sourceStyles.custom}`}
                  >
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em]">
                      <span>{sourceLabel[event.source] ?? "Event"}</span>
                      {event.locked && (
                        <span className="rounded-full border border-current px-2 py-0.5 text-[10px]">
                          Locked
                        </span>
                      )}
                    </div>
                    <p className="text-base font-semibold leading-tight text-slate-900">
                      {event.title}
                    </p>
                    <p className="text-sm text-slate-700">
                      {event.start} - {event.end}
                    </p>
                  </div>
                ))}
                {!dayEvents.length && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                    Free to schedule
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
