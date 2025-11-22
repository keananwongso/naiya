import {
  quickTodos,
  sampleWeek,
  upcomingEvents,
} from "shared/sampleData";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:py-16">
        <main className="mt-4 space-y-4">
          <section className="card rounded-3xl p-5 md:p-6">
            <div className="flex flex-col items-start gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              <span>Catch me up</span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[11px] font-semibold text-[var(--foreground)]">
                Week of {sampleWeek.label}
              </span>
            </div>
            <h1 className="text-3xl font-semibold leading-tight text-[var(--foreground)]">
              Your week at a glance
            </h1>
            <p className="text-sm text-[var(--muted)]">
              For logged-in students: a quick snapshot of what’s urgent and where to send new thoughts.
            </p>
          </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[0_16px_36px_rgba(45,71,57,0.12)]">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                  Todos
                </p>
                <ul className="mt-2 space-y-2 text-sm text-[var(--foreground)]">
                  {quickTodos.map((todo) => (
                    <li
                      key={todo.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[#fffaf2] px-3 py-2"
                    >
                      <span>{todo.text}</span>
                      <span className="text-xs font-semibold text-[var(--foreground)]">
                        {todo.due}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[0_16px_36px_rgba(45,71,57,0.12)]">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                  Upcoming
                </p>
                <ul className="mt-2 space-y-2 text-sm text-[var(--foreground)]">
                  {upcomingEvents.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[#fffaf2] px-3 py-2"
                    >
                      <div>
                        <p className="font-semibold">{item.title}</p>
                        <p className="text-xs text-[var(--muted)]">{item.type}</p>
                      </div>
                      <span className="text-xs font-semibold text-[var(--foreground)]">
                        {item.when}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-5 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--accent)] bg-[var(--accent-soft)] p-4 text-center md:flex-row md:text-left">
              <button className="w-full rounded-full bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-[var(--background)] shadow-[0_16px_40px_rgba(45,71,57,0.28)] transition hover:bg-[#243a2e] md:w-auto">
                Quick braindump
              </button>
              <button className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] shadow-[0_10px_24px_rgba(45,71,57,0.12)] transition hover:bg-[#f3efe7] md:w-auto">
                Quick chat with Naiya
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
