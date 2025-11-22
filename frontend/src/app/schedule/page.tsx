import { CalendarCanvas } from "@/components/CalendarCanvas";
import { sampleInput, samplePlan, sampleTranscript } from "shared/sampleData";

export default function SchedulePage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-3 py-6 sm:px-5 lg:px-8 lg:py-10">
        <main>
          <CalendarCanvas
            weekStart={sampleInput.weekOf}
            events={samplePlan.events.filter((event) =>
              ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(event.day),
            )}
            transcript={sampleTranscript}
            startHour={9}
            endHour={21}
          />
        </main>
      </div>
    </div>
  );
}
