import { z } from "zod";

export const FlexibilitySchema = z.enum(["fixed", "strong", "medium", "low"]);

export const RoutineItemSchema = z.object({
    title: z.string(),
    days: z.array(z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])),
    start: z.string(),
    end: z.string(),
    flexibility: FlexibilitySchema.optional().default("strong"),
});

export const DeadlineItemSchema = z.object({
    title: z.string(),
    course: z.string().optional(),
    date: z.string(),
    importance: z.enum(["low", "medium", "high"]).optional(),
    flexibility: FlexibilitySchema.optional().default("fixed"),
});

export const LockInItemSchema = z.object({
    title: z.string(),
    days: z.array(z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])), // Assuming lock-ins can be recurring or specific day? Prompt implies user-created blocks. Let's stick to RoutineItem structure for recurring lock-ins or specific. Prompt says "For lock-in sessions: { title, day, start, end, flexibility: 'medium' }". Wait, prompt example shows "day" singular. But schema had RoutineItemSchema before. Let's make it flexible or stick to singular day if it's one-off? The prompt says "Self-created study blocks". Let's assume they can be recurring or single. But the prompt example for parseCategories says: "{ title, day, start, end, flexibility: 'medium' }". This implies single day. Let's update schema to match prompt example.
    day: z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
    start: z.string(),
    end: z.string(),
    flexibility: FlexibilitySchema.optional().default("medium"),
});

export const OtherEventItemSchema = z.object({
    title: z.string(),
    date: z.string(),
    start: z.string(),
    end: z.string(),
    flexibility: FlexibilitySchema.optional().default("medium"),
});

export const PreferencesSchema = z.object({
    wake: z.string(),
    sleep: z.string(),
    maxStudyHoursPerDay: z.number().optional(),
});

export const CategoryBucketsSchema = z.object({
    routineSchedule: z.array(RoutineItemSchema),
    deadlines: z.array(DeadlineItemSchema),
    lockInSessions: z.array(LockInItemSchema),
    otherEvents: z.array(OtherEventItemSchema),
    preferences: PreferencesSchema,
});

export const CalendarEventSchema = z.object({
    id: z.string(),
    title: z.string(),
    type: z.enum(["ROUTINE", "COMMITMENT", "STUDY", "LOCKIN", "OTHER"]),
    day: z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
    start: z.string(),
    end: z.string(),
    flexibility: FlexibilitySchema,
    course: z.string().optional(),
});

export const CalendarJSONSchema = z.object({
    events: z.array(CalendarEventSchema)
});

export const LLMResponseSchema = z.object({
    assistant_message: z.string(),
    calendar: CalendarJSONSchema
});

// New Schema for Plan Week Intent
export const StudyPlanItemSchema = z.object({
    deadlineTitle: z.string(),
    hoursNeeded: z.number(),
    dailyDistribution: z.object({
        Mon: z.number().optional(),
        Tue: z.number().optional(),
        Wed: z.number().optional(),
        Thu: z.number().optional(),
        Fri: z.number().optional(),
        Sat: z.number().optional(),
        Sun: z.number().optional(),
    })
});

export const PlanWeekIntentSchema = z.object({
    assistant_message: z.string(),
    plan: z.object({
        studyPlan: z.array(StudyPlanItemSchema)
    })
});

export const UpdateCalendarIntentSchema = z.object({
    assistant_message: z.string(),
    intent: z.object({
        type: z.enum(["move", "delete", "create", "unknown"]),
        targetEventId: z.string().nullable().optional(),
        explicitlyModifiesFixed: z.boolean(),
        newDate: z.string().nullable().optional(),
        newStart: z.string().nullable().optional(),
        newEnd: z.string().nullable().optional(),
        newTitle: z.string().nullable().optional(),
        flexibility: FlexibilitySchema.optional()
    })
});
