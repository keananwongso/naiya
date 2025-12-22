"use client";

import { Mic, Send, MessageSquarePlus, History, Trash2, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  ChatSession,
  ChatMessage as DBChatMessage,
  createChatSession,
  loadChatSessions,
  loadChatSession,
  saveChatSession,
  deleteChatSession,
} from "@/lib/chat-db";

type ChatMessage = {
  role: "user" | "naiya";
  text: string;
  tag?: string;
};

type Props = {
  onSubmit?: (message: string, conversationHistory?: Array<{ role: 'user' | 'assistant', content: string }>) => Promise<void>;
  assistantMessage?: string;
  isProcessing?: boolean;
};

export function ChatPanelWithSessions({
  onSubmit,
  assistantMessage,
  isProcessing = false
}: Props) {
  const [input, setInput] = useState("");
  const [localTranscript, setLocalTranscript] = useState<ChatMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [pastSessions, setPastSessions] = useState<ChatSession[]>([]);
  const [showPastConversations, setShowPastConversations] = useState(false);
  const [ignoreAssistantMessage, setIgnoreAssistantMessage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load past sessions on mount
  useEffect(() => {
    loadPastSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update local transcript when assistant message changes
  useEffect(() => {
    if (ignoreAssistantMessage) {
      setIgnoreAssistantMessage(false);
      return;
    }
    if (assistantMessage && assistantMessage !== localTranscript[localTranscript.length - 1]?.text) {
      const newTranscript = [...localTranscript, { role: "naiya" as const, text: assistantMessage }];
      setLocalTranscript(newTranscript);

      // Save to database
      if (currentSessionId) {
        const dbMessages: DBChatMessage[] = newTranscript.map(msg => ({
          role: msg.role === "naiya" ? "assistant" : "user",
          content: msg.text,
          timestamp: new Date().toISOString()
        }));
        saveChatSession(currentSessionId, dbMessages);
      }
    }
  }, [assistantMessage, currentSessionId]);

  const loadPastSessions = async (activeSessionId: string | null = currentSessionId) => {
    const sessions = await loadChatSessions();
    setPastSessions(sessions);

    // If we don't have an active session yet, pick the most recent existing one
    if (!activeSessionId && sessions.length > 0) {
      await loadSession(sessions[0].id);
    }

    return sessions;
  };

  const createNewSession = async () => {
    const newSession = await createChatSession();
    if (newSession) {
      setCurrentSessionId(newSession.id);
      setLocalTranscript([]);
      setIgnoreAssistantMessage(true);
      loadPastSessions(newSession.id); // Refresh the list
    }
    return newSession;
  };

  const loadSession = async (sessionId: string) => {
    const session = await loadChatSession(sessionId);
    if (session) {
      setCurrentSessionId(session.id);
      const transcript: ChatMessage[] = session.messages.map(msg => ({
        role: msg.role === "assistant" ? "naiya" : "user",
        text: msg.content
      }));
      setLocalTranscript(transcript);
      setShowPastConversations(false);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;

    await deleteChatSession(sessionId);

    if (sessionId === currentSessionId) {
      setCurrentSessionId(null);
      setLocalTranscript([]);
      await loadPastSessions(null);
    } else {
      loadPastSessions();
    }
  };

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
    const newTranscript = [...localTranscript, { role: "user" as const, text: userMessage }];
    setLocalTranscript(newTranscript);

    // Ensure we have a session; create one on first real message
    let sessionId = currentSessionId;
    if (!sessionId) {
      const newSession = await createNewSession();
      sessionId = newSession?.id || null;
      if (!sessionId) return;
    }

    // Save to database immediately
    const dbMessages: DBChatMessage[] = newTranscript.map(msg => ({
      role: msg.role === "naiya" ? "assistant" : "user",
      content: msg.text,
      timestamp: new Date().toISOString()
    }));
    await saveChatSession(sessionId, dbMessages);
    loadPastSessions(sessionId); // Refresh to update titles

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
    <section className="flex flex-col h-full bg-[var(--surface)] border-l border-[var(--border)] relative">
      {/* Header with New Chat and Past Conversations buttons */}
      <div className="px-4 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex flex-col leading-tight space-y-1">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Naiya</p>
          <h2 className="text-sm font-semibold text-[var(--foreground)] m-0 leading-snug">
            Brain-dump your week here.
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={createNewSession}
            className="relative p-2 rounded-lg hover:bg-[var(--accent)] transition-colors group"
            title="New Chat"
          >
            <MessageSquarePlus className="h-5 w-5" />
            <span className="pointer-events-none absolute top-full mt-2 right-0 left-auto translate-x-0 whitespace-nowrap rounded bg-[var(--foreground)] px-2 py-1 text-[11px] font-medium text-[var(--background)] opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
              New chat
            </span>
          </button>
          <button
            onClick={() => setShowPastConversations(!showPastConversations)}
            className="relative p-2 rounded-lg hover:bg-[var(--accent)] transition-colors group"
            title="Past Conversations"
          >
            <History className="h-5 w-5" />
            <span className="pointer-events-none absolute top-full mt-2 right-0 left-auto translate-x-0 whitespace-nowrap rounded bg-[var(--foreground)] px-2 py-1 text-[11px] font-medium text-[var(--background)] opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
              Past conversations
            </span>
          </button>
        </div>
      </div>

      {/* Past Conversations Sidebar */}
      {showPastConversations && (
        <div className="absolute top-16 right-0 w-full h-[calc(100%-4rem)] bg-[var(--surface)] border-l border-[var(--border)] z-10 flex flex-col">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="font-semibold">Past Conversations</h3>
            <button
              onClick={() => setShowPastConversations(false)}
              className="p-1 rounded-lg hover:bg-[var(--accent)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {pastSessions.length === 0 ? (
              <p className="text-center text-[var(--muted)] text-sm py-8">No past conversations</p>
            ) : (
              <div className="space-y-1">
                {pastSessions.map((session) => (
                  <div
                    key={session.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => loadSession(session.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        loadSession(session.id);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-lg hover:bg-[var(--accent)] transition-colors group flex items-center justify-between cursor-pointer ${session.id === currentSessionId ? "bg-[var(--accent)]" : ""
                      }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{session.title}</p>
                      <p className="text-xs text-[var(--muted)] truncate">
                        {new Date(session.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteSession(session.id, e)}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-[var(--destructive)]/10 rounded"
                    >
                      <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Messages */}
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
              </div>
              <p className="mt-1 whitespace-pre-line">{message.text}</p>
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
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Listening..." : isTranscribing ? "Transcribing..." : "Ask Naiya to change your schedule..."}
            className={`w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 pr-16 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none transition-colors max-h-[200px] overflow-y-auto ${isRecording ? "border-red-500 ring-1 ring-red-500 bg-red-50/10" : ""
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
