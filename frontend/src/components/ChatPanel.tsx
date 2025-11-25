"use client";

import { Mic, Send } from "lucide-react";
import { useState, useRef, useEffect } from "react";

type ChatMessage = {
  role: "user" | "naiya";
  text: string;
  tag?: string;
};

type Props = {
  transcript?: ChatMessage[];
  notes?: string[];
  onSubmit?: (message: string, conversationHistory?: Array<{ role: 'user' | 'assistant', content: string }>) => Promise<void>;
  assistantMessage?: string;
  isProcessing?: boolean;
};

export function ChatPanel({
  transcript = [],
  notes = [],
  onSubmit,
  assistantMessage,
  isProcessing = false
}: Props) {
  const [input, setInput] = useState("");
  const [localTranscript, setLocalTranscript] = useState<ChatMessage[]>(transcript);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update local transcript when assistant message changes
  useEffect(() => {
    if (assistantMessage && assistantMessage !== localTranscript[localTranscript.length - 1]?.text) {
      setLocalTranscript(prev => [...prev, { role: "naiya", text: assistantMessage }]);
    }
  }, [assistantMessage]);

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput("");

    // Build conversation history from current transcript (before adding new message)
    const conversationHistory = localTranscript.map(msg => ({
      role: msg.role === "naiya" ? "assistant" as const : "user" as const,
      content: msg.text
    }));

    // Add user message to transcript
    setLocalTranscript(prev => [...prev, { role: "user", text: userMessage }]);

    // Call backend with conversation history
    if (onSubmit) {
      await onSubmit(userMessage, conversationHistory);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

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

      // Use relative path to Next.js API route
      const response = await fetch("/api/brain-dump/audio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const data = await response.json();
      if (data.transcript) {
        setInput(prev => (prev ? `${prev} ${data.transcript}` : data.transcript));
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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  return (
    <section className="flex flex-col h-full bg-[var(--surface)] border-l border-[var(--border)]">
      <div className="px-4 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex flex-col leading-tight space-y-1">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Naiya</p>
          <h2 className="text-sm font-semibold text-[var(--foreground)] m-0 leading-snug">
            Brain-dump your week here.
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-6 flex flex-col gap-3">
        {localTranscript.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === "naiya" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm ${message.role === "naiya"
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)]"
                : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                <span>{message.role === "naiya" ? "Naiya" : "You"}</span>
                {message.tag && (
                  <span className="rounded-full border border-current px-2 py-0.5 text-[10px]">
                    {message.tag}
                  </span>
                )}
              </div>
              <p className="mt-1">{message.text}</p>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-[var(--muted)]">Naiya is thinking...</span>
              </div>
            </div>
          </div>
        )}

        {notes.length > 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/70 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">
              What Naiya considered
            </p>
            <ul className="mt-2 space-y-1 text-sm text-[var(--foreground)]">
              {notes.map((note, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Listening..." : isTranscribing ? "Transcribing..." : "Ask Naiya to change your schedule..."}
            className={`w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 pr-20 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none transition-colors max-h-[200px] overflow-y-auto ${isRecording ? "border-red-500 ring-1 ring-red-500 bg-red-50/10" : ""
              }`}
            rows={1}
            disabled={isProcessing || isTranscribing}
          />
          <div className="absolute right-2 bottom-2 flex gap-1">
            <button
              onClick={toggleRecording}
              className={`rounded-lg p-1.5 transition-all ${isRecording
                ? "text-red-500 bg-red-100 hover:bg-red-200 animate-pulse"
                : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)]"
                }`}
              disabled={isProcessing || isTranscribing}
            >
              <Mic className={`h-4 w-4 ${isRecording ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={handleSubmit}
              disabled={isProcessing || !input.trim()}
              className="rounded-lg p-1.5 text-[var(--foreground)] hover:bg-[var(--accent-soft)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
