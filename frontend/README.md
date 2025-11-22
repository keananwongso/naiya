# Frontend

Ownership: 🟦 Ven  
Scope: UI/UX for students; **do not modify anything in `/backend`**.

This folder houses the Next.js app (`src/app`) and all user-facing surfaces. Treat the backend as an API owned by another team and the `shared/` folder as the source of truth for types and generator behavior.

## Product context (MVP)

**One-liner**

Naiya helps overwhelmed students turn their timetable, exams, and life commitments into a realistic weekly calendar in a few minutes, and update it just by chatting.

**Core job-to-be-done**

> “Given everything on my plate, give me a single weekly calendar that actually fits my life, and make it easy to adjust when things change.”

We are NOT trying to optimize cognition or detect “learning style” in v0; we just need to become the single, trusted weekly plan.

### What v0 does (from the frontend’s point of view)

- **Inputs (via onboarding + chat UI)**
  - School + term.
  - Class timetable (days/times per course).
  - Upcoming exams / big deadlines.
  - Fixed weekly commitments (work, clubs, gym, religious, etc.).
  - Light preferences: morning/afternoon/night, max study hours per day, quiet hours.
  - Extra context via chat, e.g. “I have work every Tue 5–9”, “Don’t schedule past 10pm”, “I want Sundays mostly free”.

- **Core surfaces**
  - **Auto-generated weekly calendar**
    - Notion-style week view with:
      - Classes (fixed, locked).
      - Fixed commitments.
      - Suggested study blocks per course/exam, honoring quiet hours and max daily load.
  - **Interactive calendar editing**
    - Drag blocks to new times and (eventually) across days.
    - Resize blocks to change duration.
    - Create/delete basic events.
    - Edits become the new source of truth for Naiya.
  - **Chat-driven adjustments**
    - Right-side chat where users say things like:
      - “Move all my Friday evening study to Saturday morning.”
      - “I just joined a club: Wed 6–8, add it and re-balance.”
    - Frontend sends intents; backend/generator responds with diffs; calendar re-renders.

### Explicit v0 non-goals (frontend should not imply these exist)

Naiya v0 does **not** need to:

- Track productivity or whether the user actually completed a block.
- Detect learning style or deep cognitive patterns.
- Provide detailed study techniques or content.
- Sync with Google Calendar / Notion / Canvas.
- Run heavy analytics or dashboards on time usage.

The bar for v0: **students trust Naiya as the place where their real weekly plan lives, and it’s easier than doing it manually.**

## Frontend responsibilities

- Onboarding UI, “life dump” interface, and chat.
- Calendar rendering and interactions (drag/resize/create/delete).
- Showing Naiya’s explanations and notes alongside the schedule.
- Validating user input against shared schemas before sending to backend.

See `../docs/contracts.md` for data contracts and ownership, and `../README.md` for the high-level repo overview.
