"use client";

import { useState, useEffect } from "react";
import { Play, Square, CheckCircle2, Clock, Plus } from "lucide-react";

// --- Types ---

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Session {
  id: string;
  title: string;
  tag: Tag;
  startTime: string;
  duration: string;
  checklist?: ChecklistItem[];
}

// --- Mock Data ---

const todaySessions: Session[] = [
  {
    id: "1",
    title: "Deep Work: Project Phoenix",
    tag: { id: "t1", name: "Work", color: "emerald" },
    startTime: "09:00 AM",
    duration: "90m",
    checklist: [
      { id: "c1", text: "Review architecture specs", completed: true },
      { id: "c2", text: "Draft core API endpoints", completed: false },
      { id: "c3", text: "Update documentation", completed: false },
    ],
  },
  {
    id: "2",
    title: "Linear Algebra Review",
    tag: { id: "t2", name: "Study", color: "emerald" },
    startTime: "11:00 AM",
    duration: "45m",
  },
  {
    id: "3",
    title: "Gym Session",
    tag: { id: "t3", name: "Personal", color: "emerald" },
    startTime: "12:00 PM",
    duration: "60m",
  },
  {
    id: "4",
    title: "Team Sync",
    tag: { id: "t4", name: "Meeting", color: "emerald" },
    startTime: "01:30 PM",
    duration: "30m",
  },
];

// --- Helper Functions ---

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const getDurationColor = (duration: string) => {
  // Use Pale Mint #D8F3DC for all durations, with dark text for contrast
  return "!bg-[#D8F3DC] !text-[var(--foreground)] !border-transparent";
};

// --- UI Components ---

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-[var(--card)] text-[var(--card-foreground)] rounded-xl border border-[var(--border)] shadow-sm ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`} style={style}>
    {children}
  </span>
);

const Button = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  className?: string;
  disabled?: boolean;
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2";

  const variants = {
    primary: "bg-[var(--primary)] text-[var(--primary-foreground)] shadow hover:bg-[var(--primary)]/90",
    secondary: "bg-[var(--secondary)] text-[var(--secondary-foreground)] shadow-sm hover:bg-[var(--secondary)]/80",
    outline: "border border-[var(--input)] bg-transparent shadow-sm hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
    ghost: "hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
    destructive: "bg-[var(--destructive)] text-[var(--destructive-foreground)] shadow-sm hover:bg-[var(--destructive)]/90",
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Checkbox = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    onClick={onChange}
    className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${checked
      ? "bg-[var(--primary)] border-[var(--primary)] text-[var(--primary-foreground)]"
      : "border-[var(--input)] bg-transparent hover:bg-[var(--accent)]"
      }`}
  >
    {checked && <CheckCircle2 className="h-3.5 w-3.5" />}
  </button>
);

// --- Main Component ---

export default function Home() {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [timer, setTimer] = useState(0); // in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize completed items from mock data
  useEffect(() => {
    const initialCompleted = new Set<string>();
    todaySessions.forEach((s) => {
      s.checklist?.forEach((c) => {
        if (c.completed) initialCompleted.add(c.id);
      });
    });
    setCompletedItems(initialCompleted);
  }, []);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && activeSession) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, activeSession]);

  const startSession = (session: Session) => {
    setActiveSession(session);
    // Parse duration "90m" -> 5400 seconds
    const minutes = parseInt(session.duration.replace("m", ""));
    setTimer(minutes * 60);
    setIsTimerRunning(true);
  };

  const completeSession = () => {
    setIsTimerRunning(false);
    setActiveSession(null);
    setTimer(0);
  };

  const toggleChecklistItem = (itemId: string) => {
    const newCompleted = new Set(completedItems);
    if (newCompleted.has(itemId)) {
      newCompleted.delete(itemId);
    } else {
      newCompleted.add(itemId);
    }
    setCompletedItems(newCompleted);
  };

  // Find the next session (first one that isn't active)
  // In a real app, this would filter by time/completion status
  const nextSession = todaySessions.find((s) => s.id !== activeSession?.id);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8 pb-24">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Good Morning, Ventura</h1>
            <p className="text-[var(--muted-foreground)] mt-1">Ready to seize the day?</p>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-2xl font-mono font-medium">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm text-[var(--muted-foreground)]">
              {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Active Session or Next Up */}
        {activeSession ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                Now Focus
              </h2>
              <Button variant="outline" onClick={completeSession} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20">
                <Square className="mr-2 h-4 w-4 fill-current" />
                End Session
              </Button>
            </div>

            <Card className="p-6 border-l-4 border-l-rose-500">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="space-y-4 flex-1">
                  <div>
                    <Badge
                      className="border-transparent shadow-sm font-semibold !bg-[#D8F3DC] !text-[var(--foreground)]"
                    >
                      {activeSession.tag.name}
                    </Badge>
                    <h3 className="text-2xl font-bold mt-2">{activeSession.title}</h3>
                    <p className="text-[var(--muted-foreground)] flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4" />
                      {activeSession.startTime} • {activeSession.duration}
                    </p>
                  </div>

                  {activeSession.checklist && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-sm font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Session Goals</h4>
                      <div className="space-y-2">
                        {activeSession.checklist.map((item) => (
                          <div key={item.id} className="flex items-start gap-3 group">
                            <Checkbox
                              checked={completedItems.has(item.id)}
                              onChange={() => toggleChecklistItem(item.id)}
                            />
                            <span className={`text-sm transition-all ${completedItems.has(item.id) ? "text-[var(--muted-foreground)] line-through" : ""}`}>
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center bg-[var(--secondary)]/50 rounded-xl p-6 min-w-[200px]">
                  <div className="text-5xl font-mono font-bold tracking-tighter tabular-nums">
                    {formatTime(timer)}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)] mt-2">remaining</div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="ghost"
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className="h-8 w-8 p-0 rounded-full"
                    >
                      {isTimerRunning ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </section>
        ) : (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Next Up</h2>
            {nextSession ? (
              <Card className="p-6 hover:shadow-md transition-shadow group cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Badge
                      className="border-transparent shadow-sm font-semibold !bg-[#D8F3DC] !text-[var(--foreground)]"
                    >
                      {nextSession.tag.name}
                    </Badge>
                    <h3 className="text-2xl font-bold">{nextSession.title}</h3>
                    <p className="text-[var(--muted-foreground)] flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {nextSession.startTime} • {nextSession.duration}
                    </p>
                  </div>
                  <Button onClick={() => startSession(nextSession)} className="shrink-0 transition-all group-hover:scale-105 group-hover:bg-[#a9c3a2] group-hover:text-[var(--foreground)] hover:!bg-[#D8F3DC]">
                    <Play className="mr-2 h-4 w-4 fill-current" />
                    Start Session
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center text-[var(--muted-foreground)]">
                <p>No more sessions scheduled for today!</p>
              </Card>
            )}
          </section>
        )}

        {/* Braindump Button (Moved) */}
        <div className="flex justify-center pt-0 pb-12 -mt-2">
          <Button className="w-full rounded-xl h-12 px-6 shadow-md text-base !bg-[#D8F3DC] text-[var(--foreground)] transition-all hover:!bg-[#a9c3a2]">
            <Plus className="mr-2 h-5 w-5" />
            Braindump
          </Button>
        </div>

        {/* Today's Schedule */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Today's Schedule</h2>
            <button className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:underline transition-colors">
              View Calendar
            </button>
          </div>

          <div className="relative space-y-0">
            {/* Vertical Line */}
            <div className="absolute left-6 top-4 bottom-4 w-px bg-[var(--border)]"></div>

            {todaySessions.map((session, index) => {
              const isActive = activeSession?.id === session.id;
              const isPast = !isActive && index < todaySessions.findIndex(s => s.id === activeSession?.id); // Simple past logic for demo

              return (
                <div key={session.id} className={`relative flex gap-6 p-4 rounded-lg transition-colors ${isActive ? "bg-[var(--accent)]/50" : "hover:bg-[var(--accent)]/20"}`}>
                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`w-4 h-4 rounded-full border-2 ${isActive ? "bg-rose-500 border-rose-500" : "bg-[var(--background)] border-[var(--muted-foreground)]"}`}></div>
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-[var(--muted-foreground)]">{session.startTime}</div>
                      <div className="font-semibold">{session.title}</div>
                    </div>
                    <Badge className={`${getDurationColor(session.duration)} shadow-sm`}>
                      {session.duration}
                    </Badge>
                  </div>
                  {isActive && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <span className="flex h-2 w-2 rounded-full bg-rose-500"></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
