# Naiya — Weekly Plan MVP

Naiya turns a messy mix of classes, exams, and life commitments into one weekly calendar you can actually follow. This MVP shows the onboarding questions, a simple rules-based generator, and a chat-first editing loop.

## What is included
- **Onboarding questions**: school/term, classes, exams, commitments, chrono preference, quiet hours, and max daily study load.
- **Rules-based generator**: locks classes/commitments, weights study blocks by exam proximity and weekly hours, honors quiet hours and a max hours-per-day cap.
- **Interactive surfaces (static preview)**: a weekly grid ready for drag/resize, plus a chat panel that explains how Naiya would re-balance after commands.

## Run it locally
```bash
cd frontend
npm install
npm run dev
# open http://localhost:3000
```

## Repo layout (for collaboration)
- `frontend/` — UI/UX ownership (Ven); Next app lives here.
- `backend/` — API/LLM server code (Efe); stubbed.
- `shared/` — contracts, types, generator, sample data (authoritative).
- `docs/contracts.md` — data contracts, API surfaces, and ownership.

## How the generator works (v0)
1. Add fixed blocks (classes, commitments) as locked events.
2. Rank courses by urgency: closer exams get a higher weight.
3. Place 90-minute study blocks in chrono-preferred slots, avoiding quiet hours and days you asked to keep free.
4. Cap study at the requested hours per day. If an exam is <10 days away, log a note and add weight to that course.

## Next steps you might want
1) Swap the static sample data for real onboarding inputs and Supabase/Prisma models.  
2) Wire the grid for drag/resize/create/delete and persist changes as locked events.  
3) Add a chat intent parser that produces add/update/delete diffs, then re-run the generator on unlocked study blocks only.  
4) Keep a small revision history so users can undo regenerations safely.
