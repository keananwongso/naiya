export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string; // Auto-generated from first message
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

const CHAT_SESSIONS_STORAGE_KEY = "naiya_chat_sessions";
const DEMO_USER_ID = "demo-user";

/**
 * Create a new chat session (localStorage for demo)
 */
export async function createChatSession(): Promise<ChatSession | null> {
  try {
    const now = new Date().toISOString();
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      user_id: DEMO_USER_ID,
      title: "New Chat",
      messages: [],
      created_at: now,
      updated_at: now,
    };

    const sessions = await loadChatSessions();
    const updated = [...sessions, newSession];

    if (typeof window !== "undefined") {
      localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    }

    return newSession;
  } catch (error) {
    console.error("Failed to create chat session:", error);
    return null;
  }
}

/**
 * Load all chat sessions (localStorage for demo)
 */
export async function loadChatSessions(): Promise<ChatSession[]> {
  try {
    if (typeof window === "undefined") return [];

    const stored = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
    if (!stored) return [];

    return JSON.parse(stored) as ChatSession[];
  } catch (error) {
    console.error("Failed to load chat sessions:", error);
    return [];
  }
}

/**
 * Load a specific chat session by ID (localStorage for demo)
 */
export async function loadChatSession(sessionId: string): Promise<ChatSession | null> {
  try {
    const sessions = await loadChatSessions();
    return sessions.find(s => s.id === sessionId) || null;
  } catch (error) {
    console.error("Failed to load chat session:", error);
    return null;
  }
}

/**
 * Save messages to a chat session (localStorage for demo)
 */
export async function saveChatSession(
  sessionId: string,
  messages: ChatMessage[],
  title?: string
): Promise<void> {
  try {
    const sessions = await loadChatSessions();

    // Auto-generate title from first user message if not provided
    const sessionTitle = title || (messages.length > 0 && messages[0].role === "user"
      ? messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? "..." : "")
      : "New Chat");

    const updated = sessions.map(s =>
      s.id === sessionId
        ? { ...s, messages, title: sessionTitle, updated_at: new Date().toISOString() }
        : s
    );

    if (typeof window !== "undefined") {
      localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    }

    console.log("Chat session saved successfully");
  } catch (error) {
    console.error("Failed to save chat session:", error);
  }
}

/**
 * Delete a chat session (localStorage for demo)
 */
export async function deleteChatSession(sessionId: string): Promise<void> {
  try {
    const sessions = await loadChatSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);

    if (typeof window !== "undefined") {
      localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(filtered));
    }

    console.log("Chat session deleted successfully");
  } catch (error) {
    console.error("Failed to delete chat session:", error);
  }
}
