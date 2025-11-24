import { CalendarEvent } from "@shared/types";

// Stage 1: Intent Classification
export type IntentType =
    | "brain_dump"      // User dumping lots of info at once
    | "add_event"       // Adding new event(s)
    | "modify_event"    // Changing existing event(s)
    | "cancel_day"      // Blocking out a day (sick, travel, etc.)
    | "small_command"   // Quick change (move one thing, delete one thing)
    | "chat_only";      // Just chatting, no calendar changes

export interface IntentClassification {
    intent: IntentType;
    needsExtraction: boolean;
}

// Stage 2: Summary Extraction (Consolidated)
export interface ExtractedEvent {
    title: string;
    day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
    start: string;    // "HH:MM"
    end: string;      // "HH:MM"
    type: "class" | "personal" | "routine" | "other";
    flexibility: "fixed" | "strong" | "medium" | "low" | "high";
}

export interface ExtractedDeadline {
    title: string;
    date: string; // "YYYY-MM-DD"
    type: "exam" | "project" | "assignment";
    flexibility: "fixed";
}

export interface ExtractedTask {
    title: string;
    estimatedTimeHours: number;
    dueDate?: string; // "YYYY-MM-DD"
    flexibility: "medium" | "low" | "high";
}

export interface ExtractedPreferences {
    wake?: string; // "HH:MM"
    sleep?: string; // "HH:MM"
    studyStartAfter?: string; // "HH:MM"
    studyEndBy?: string; // "HH:MM"
}

export interface CalendarAction {
    type: "add" | "delete" | "modify" | "exclude_date";
    title: string;
    day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
    start?: string; // "HH:MM"
    end?: string; // "HH:MM"
    flexibility?: "fixed" | "strong" | "medium" | "low" | "high";
    date?: string; // For exclude_date action (YYYY-MM-DD)
}

export interface SummaryJSON {
    events?: ExtractedEvent[];
    deadlines?: ExtractedDeadline[];  // Deadlines with due dates, no specific times
    tasks?: ExtractedTask[];
    preferences?: ExtractedPreferences;
    actions?: CalendarAction[];  // Actions for time-based events only
    assistantMessage: string;

    // Internal fields (not from LLM)
    intent?: IntentType;
    rawMessage?: string;
}

// Stage 3: Reasoning / Decision-Making (Merged into SummaryJSON)
// The 'actions' field in SummaryJSON now serves the purpose of DecisionJSON

// Stage 4: Calendar Expansion
// Uses CalendarEvent[] from shared/types
