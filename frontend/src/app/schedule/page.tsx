import { CalendarShell } from "@/components/CalendarShell";
import { Sidebar } from "@/components/Sidebar";
import { ChatPanel } from "@/components/ChatPanel";
import { sampleTranscript } from "shared/sampleData";

export default function SchedulePage() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--background)]">
      <Sidebar className="w-[280px] shrink-0" />
      <main className="flex-1 min-w-0 bg-[var(--surface)]">
        <CalendarShell />
      </main>
      <div className="w-[400px] shrink-0">
        <ChatPanel transcript={sampleTranscript} />
      </div>
    </div>
  );
}
