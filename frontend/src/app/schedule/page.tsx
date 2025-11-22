import { CalendarShell } from "@/components/CalendarShell";

export default function SchedulePage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-3 py-6 sm:px-5 lg:px-8 lg:py-10">
        <main>
          <CalendarShell />
        </main>
      </div>
    </div>
  );
}
