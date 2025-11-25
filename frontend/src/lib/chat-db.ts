import { supabase } from "./supabase";

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

/**
 * Create a new chat session
 */
export async function createChatSession(): Promise<ChatSession | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No user logged in - cannot create chat session");
      return null;
    }

    const now = new Date().toISOString();
    const newSession: Omit<ChatSession, 'id'> = {
      user_id: user.id,
      title: "New Chat",
      messages: [],
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert(newSession)
      .select()
      .single();

    if (error) {
      console.error("Failed to create chat session:", error);
      return null;
    }

    return data as ChatSession;
  } catch (error) {
    console.error("Failed to create chat session:", error);
    return null;
  }
}

/**
 * Load all chat sessions for the current user
 */
export async function loadChatSessions(): Promise<ChatSession[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No user logged in - cannot load chat sessions");
      return [];
    }

    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to load chat sessions:", error);
      return [];
    }

    return (data as ChatSession[]) || [];
  } catch (error) {
    console.error("Failed to load chat sessions:", error);
    return [];
  }
}

/**
 * Load a specific chat session by ID
 */
export async function loadChatSession(sessionId: string): Promise<ChatSession | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No user logged in - cannot load chat session");
      return null;
    }

    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Failed to load chat session:", error);
      return null;
    }

    return data as ChatSession;
  } catch (error) {
    console.error("Failed to load chat session:", error);
    return null;
  }
}

/**
 * Save messages to a chat session
 */
export async function saveChatSession(
  sessionId: string,
  messages: ChatMessage[],
  title?: string
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No user logged in - cannot save chat session");
      return;
    }

    // Auto-generate title from first user message if not provided
    const sessionTitle = title || (messages.length > 0 && messages[0].role === "user"
      ? messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? "..." : "")
      : "New Chat");

    const { error } = await supabase
      .from("chat_sessions")
      .update({
        messages,
        title: sessionTitle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to save chat session:", error);
      return;
    }

    console.log("Chat session saved successfully");
  } catch (error) {
    console.error("Failed to save chat session:", error);
  }
}

/**
 * Delete a chat session
 */
export async function deleteChatSession(sessionId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No user logged in - cannot delete chat session");
      return;
    }

    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to delete chat session:", error);
      return;
    }

    console.log("Chat session deleted successfully");
  } catch (error) {
    console.error("Failed to delete chat session:", error);
  }
}
