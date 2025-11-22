# Naiya Collaboration Contracts

Separation of concerns so Ven (🟦 Frontend), Efe (🟩 LLM/backend), and You (🟪 Schema/Prompts) can ship without stepping on each other.

## Ownership
- 🟦 Frontend (Ven): UI/UX, interactions, state management, drag/resize, request/response handling. No prompt text or business rules beyond validation/shape enforcement.
- 🟩 Backend (Efe): LLM calls, validation, regeneration logic, routing (`/plan-week`, `/parse-life-dump`, `/update-plan`). No UI rendering. Must conform to schemas defined below.
- 🟪 Schema & Prompts (You): Event/onboarding JSON contracts, instruction hierarchy, prompt templates for onboarding → plan, life dump → structured data, update loop/regeneration rules.

## Canonical Data Contracts (JSON)
- **Event**  
  ```json
  {
    "id": "string",
    "title": "string",
    "day": "Mon|Tue|Wed|Thu|Fri|Sat|Sun",
    "start": "HH:MM",
    "end": "HH:MM",
    "source": "class|commitment|study|custom",
    "courseId": "string?",
    "locked": "boolean",
    "details": "string?",
    "accent": "string?"
  }
  ```
  Rules: `start < end`, no overlaps unless `locked` and explicitly allowed; quiet hours respected by backend; `locked` must never move during regeneration.

- **Onboarding payload (from UI to backend)**  
  ```json
  {
    "weekOf": "YYYY-MM-DD",
    "school": "string",
    "term": "string",
    "preferences": {
      "chrono": "morning|afternoon|night",
      "maxDailyStudyHours": "number",
      "quietHours": { "start": "HH:MM", "end": "HH:MM" },
      "mostlyFreeDay": "Mon|Tue|Wed|Thu|Fri|Sat|Sun",
      "notes": "string?"
    },
    "courses": [
      {
        "id": "string",
        "name": "string",
        "expectedWeeklyHours": "number",
        "examDate": "YYYY-MM-DD",
        "weight": "number?",
        "meetings": [{ "day": "Mon|...", "start": "HH:MM", "end": "HH:MM", "location": "string?" }]
      }
    ],
    "commitments": [
      { "id": "string", "title": "string", "day": "Mon|...", "start": "HH:MM", "end": "HH:MM", "type": "work|club|gym|social|other", "locked": "boolean?" }
    ]
  }
  ```

- **Life dump output (LLM → backend)**  
  ```json
  {
    "courses": [ { "name": "", "expectedWeeklyHours": 0, "examDate": "", "meetings": [] } ],
    "commitments": [ { "title": "", "day": "", "start": "", "end": "", "type": "" } ],
    "preferences": { "chrono": "", "maxDailyStudyHours": 0, "quietHours": { "start": "", "end": "" }, "mostlyFreeDay": "" },
    "notes": "string?"
  }
  ```
  Must conform to onboarding payload shape; backend will map names → IDs and merge with existing data.

- **Update payload (UI → backend)**  
  ```json
  {
    "weekOf": "YYYY-MM-DD",
    "events": [Event],
    "userMessage": "string",
    "context": {
      "preferences": { ...same as onboarding },
      "courses": [ { "id": "", "name": "", "examDate": "", "expectedWeeklyHours": 0 } ]
    }
  }
  ```

- **Update response (backend → UI)**  
  ```json
  {
    "events": [Event],    // includes locked + regenerated study blocks
    "notes": ["string"],  // what changed and why
    "diff": {
      "added": [Event],
      "updated": [Event],
      "deleted": ["eventId"]
    }
  }
  ```

## Prompt/Rule Guardrails (🟪)
- Always respect `locked: true` events; never move/delete them.
- Enforce `maxDailyStudyHours` and quiet hours.
- Prioritize nearer exams (`urgency = 1/days_until_exam` capped) and redistribute study if blocks are removed.
- Maintain buffers around long classes; prefer 60–90 minute study blocks.
- If the LLM cannot fit a request, return a note explaining the constraint rather than fabricating placements.

## API Surfaces (🟩 implements, 🟦 calls)
- `POST /plan-week` — input: onboarding payload; output: `{ events, notes }`.
- `POST /parse-life-dump` — input: `{ text, weekOf }`; output: life dump structured JSON.
- `POST /update-plan` — input: update payload; output: update response (events + diff + notes).

## Repository Layout (current split)
- `frontend/` — UI/UX (Next.js app lives here).
- `backend/` — API/LLM server code (stubbed; add handlers here).
- `shared/` — source of truth types, generator logic, sample data, and prompts.
- `docs/` — contracts and collaboration docs.

Authoritative contracts live in `shared/types.ts`; keep prompts/rules in `shared/prompts/*` when added.

## Workflow Guardrails
- Changes to schemas/prompts must update `src/lib/types.ts` and this doc; announce in PR summary.
- Frontend must validate against `src/lib/types.ts` shapes before sending requests.
- Backend must validate and reject non-conforming JSON; never silently coerce.
- Keep feature flags per surface (UI/LLM) to avoid breaking the other side mid-work.
