"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Play, Square, Calendar as CalendarIcon, Mic, Send, X, CheckCircle2, Plus } from "lucide-react";
import { format } from "date-fns";
import { CalendarEvent } from "shared/types";
import { loadCalendar, saveCalendar } from "@/lib/calendar-db";
import { loadDeadlines, Deadline } from "@/lib/deadline-db";
import { processNaiya } from "@/lib/api";
import { supabase } from "@/lib/supabase";

// --- Helper Functions ---
// (None currently needed)

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
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [displayName, setDisplayName] = useState<string>("there");
  const router = useRouter();

  // Braindump state
  const [isBraindumpOpen, setIsBraindumpOpen] = useState(false);
  const [braindumpText, setBraindumpText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Load calendar events and deadlines from Supabase
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // Check for user session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }

        const [loadedEvents, loadedDeadlines] = await Promise.all([
          loadCalendar(),
          loadDeadlines()
        ]);

        const userMeta = session.user?.user_metadata || {};
        const emailName = session.user?.email ? session.user.email.split("@")[0] : "";
        const name = userMeta.full_name || userMeta.name || emailName || "there";

        if (isMounted) {
          setEvents(loadedEvents);
          setDeadlines(loadedDeadlines);
          setDisplayName(name);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [router]);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);



  // Get today's events
  const todayEvents = events.filter(event => {
    const today = format(currentTime, 'EEE');
    const todayDate = format(currentTime, 'yyyy-MM-dd');

    // Include recurring events that match today's day
    if (event.day && event.day === today) {
      // Check if today is excluded
      if (Array.isArray(event.excludedDates) && event.excludedDates.includes(todayDate)) {
        return false;
      }
      return true;
    }

    // Include one-time events that match today's date
    if (event.date && event.date === todayDate) {
      return true;
    }

    return false;
  });

  // Get upcoming deadlines
  const upcomingDeadlines = deadlines
    .filter(d => !d.completed)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3);



  // Braindump submit handler
  const handleBraindumpSubmit = async () => {
    if (!braindumpText.trim()) return;

    setIsProcessing(true);
    try {
      // Call the API to process the text
      const result = await processNaiya(events, braindumpText);

      // Update local state with new data
      if (result.events) {
        setEvents(result.events);
        // Save to Supabase
        saveCalendar(result.events).catch(err =>
          console.error("Failed to save calendar after braindump:", err)
        );
      }
      if (result.deadlines) setDeadlines(result.deadlines);

      // Clear and close
      setBraindumpText("");
      setIsBraindumpOpen(false);

      // Redirect to schedule page
      router.push("/schedule");
    } catch (error) {
      console.error("Failed to process braindump:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Voice Recording Logic
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribeAudio(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please ensure you have granted permission.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(true);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch(`/api/brain-dump/audio`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const data = await response.json();
      if (data.transcript) {
        setBraindumpText(prev => (prev ? `${prev} ${data.transcript}` : data.transcript));
      }
    } catch (error) {
      console.error("Transcription error:", error);
      alert("Failed to transcribe audio.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8 pb-24">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Hello, {displayName}</h1>
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
        {/* Next Up */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Next Up</h2>
          {todayEvents.length > 0 ? (
            <Card className="p-6 hover:shadow-md transition-shadow group cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Badge className="border-transparent shadow-sm font-semibold !bg-[#D8F3DC] !text-[var(--foreground)]">
                    {todayEvents[0].type || "Event"}
                  </Badge>
                  <h3 className="text-2xl font-bold">{todayEvents[0].title}</h3>
                  <p className="text-[var(--muted-foreground)] flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {todayEvents[0].start} - {todayEvents[0].end}
                  </p>
                </div>
                <Button className="shrink-0 transition-all group-hover:scale-105 group-hover:bg-[#a9c3a2] group-hover:text-[var(--foreground)] hover:!bg-[#D8F3DC]">
                  <Play className="mr-2 h-4 w-4 fill-current" />
                  Start
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center text-[var(--muted-foreground)]">
              <p>No events scheduled for today!</p>
            </Card>
          )}
        </section>

        {/* Upcoming Deadlines */}
        {upcomingDeadlines.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Upcoming Deadlines</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingDeadlines.map((deadline) => (
                <Card key={deadline.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <Badge className={deadline.importance === 'high' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                      {deadline.course || 'Task'}
                    </Badge>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {(() => {
                        try {
                          return format(new Date(deadline.dueDate), 'MMM d');
                        } catch (e) {
                          return 'No date';
                        }
                      })()}
                    </span>
                  </div>
                  <h3 className="font-semibold truncate">{deadline.title}</h3>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Braindump Popup */}
        <div className="flex justify-center pt-0 pb-12 -mt-2 relative z-50">
          <AnimatePresence mode="wait">
            {!isBraindumpOpen ? (
              <motion.div
                key="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full"
              >
                <Button
                  onClick={() => setIsBraindumpOpen(true)}
                  className="w-full rounded-xl h-12 px-6 shadow-md text-base !bg-[#D8F3DC] text-[var(--foreground)] transition-all hover:!bg-[#a9c3a2]"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Braindump
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="popup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full bg-[var(--card)] rounded-xl shadow-lg border border-[var(--border)] overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-[var(--muted-foreground)]">What's on your mind?</span>
                    <Button
                      variant="ghost"
                      onClick={() => setIsBraindumpOpen(false)}
                      className="h-6 w-6 p-0 hover:bg-transparent"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <textarea
                    value={braindumpText}
                    onChange={(e) => setBraindumpText(e.target.value)}
                    placeholder={isRecording ? "Listening..." : isTranscribing ? "Transcribing..." : "I have a meeting tomorrow at 10am..."}
                    className={`w-full min-h-[80px] bg-transparent resize-none outline-none text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 transition-colors ${isRecording ? "text-red-500 placeholder:text-red-400" : ""
                      }`}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleBraindumpSubmit();
                      }
                    }}
                  />

                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--border)]/50">
                    <Button
                      variant="ghost"
                      onClick={toggleRecording}
                      className={`text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]/50 transition-all ${isRecording ? "text-red-500 bg-red-50/10 hover:bg-red-50/20 animate-pulse" : ""
                        }`}
                      disabled={isProcessing || isTranscribing}
                    >
                      <Mic className={`h-4 w-4 mr-2 ${isRecording ? "fill-current" : ""}`} />
                      <span className="text-xs">{isRecording ? "Stop Recording" : isTranscribing ? "Transcribing..." : "Record"}</span>
                    </Button>

                    <Button
                      onClick={handleBraindumpSubmit}
                      disabled={!braindumpText.trim() || isProcessing}
                      className="h-8 px-4 bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 rounded-lg text-xs font-medium"
                    >
                      {isProcessing ? (
                        <span className="animate-pulse">Processing...</span>
                      ) : (
                        <>
                          Send <Send className="ml-2 h-3 w-3" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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

            {todayEvents.map((event, index) => {
              const isFirst = index === 0;

              return (
                <div key={event.id} className={`relative flex gap-6 p-4 rounded-lg transition-colors ${isFirst ? "bg-[var(--accent)]/50" : "hover:bg-[var(--accent)]/20"}`}>
                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`w-4 h-4 rounded-full border-2 ${isFirst ? "bg-rose-500 border-rose-500" : "bg-[var(--background)] border-[var(--muted-foreground)]"}`}></div>
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-[var(--muted-foreground)]">{event.start} - {event.end}</div>
                      <div className="font-semibold">{event.title}</div>
                    </div>
                    <Badge className="shadow-sm">
                      {event.type}
                    </Badge>
                  </div>
                  {isFirst && (
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
