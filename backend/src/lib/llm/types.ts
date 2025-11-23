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

// Stage 2: Summary Extraction
export interface ExtractedEvent {
    title: string;
    day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";  // Single day per event
    date?: string;    // For specific date events: "2025-11-28"
    start: string;    // "10:00"
    end: string;      // "12:00"
    type?: "class" | "deadline" | "meeting" | "personal" | "study";
    flexibility?: "low" | "medium" | "high";
}

export interface ExtractedDeadline {
    title: string;
    date: string;
    course?: string;
    importance?: "low" | "medium" | "high";
}

export interface ExtractedConstraint {
    type: "sick" | "travel" | "blocked_day" | "busy";
    date?: string;
    days?: string[];
    reason?: string;
}

export interface ExtractedTask {
    title: string;
    hoursNeeded?: number;
    deadline?: string;
    priority?: "low" | "medium" | "high";
}

export interface ExtractedPreferences {
    wake?: string;
    sleep?: string;
    maxStudyHours?: number;
    preferredStudyTimes?: string[];
}

export interface SummaryJSON {
    intent: IntentType;
    events?: ExtractedEvent[];
    deadlines?: ExtractedDeadline[];
    constraints?: ExtractedConstraint[];
    tasks?: ExtractedTask[];
    preferences?: ExtractedPreferences;
    emotionalState?: "stressed" | "calm" | "overwhelmed" | "neutral";
    rawMessage: string;
}

// Stage 3: Reasoning / Decision-Making
export type ActionType = "add" | "move" | "delete" | "block_day" | "distribute_study";

export interface CalendarAction {
    type: ActionType;
    eventId?: string;           // For move/delete
    title?: string;             // For add
    day?: string;               // Single target day (e.g., "Mon")
    start?: string;             // "14:00"
    end?: string;               // "16:00"
    duration?: number;          // Hours (for study distribution)
    reason?: string;            // Why this action was taken
    flexibility?: "fixed" | "strong" | "medium" | "low";
}

export interface DecisionJSON {
    actions: CalendarAction[];
    reasoning: string;  // Brief explanation of the overall strategy
    protected: string[]; // IDs of events that were protected (fixed flexibility)
}

// Stage 4: Calendar Expansion
// Uses CalendarEvent[] from shared/types

// Stage 5: Chat Response
// Just a string, no special type needed
