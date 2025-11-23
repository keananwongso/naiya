# Testing Naiya Backend

## Prerequisites
1. Ensure you are in the `backend` directory.
2. Create a `.env` file with your `OPENAI_API_KEY`.
3. Run the server:
   ```bash
   npm run dev
   ```
   You should see: `Server is running on port 3000`

## Using Thunder Client (VS Code Extension)

Create a **New Request** for each test below.

### 1. Parse Categories
**URL:** `POST http://localhost:3000/api/parse-categories`

**Body (JSON):**
```json
{
  "text": "I have a math class MWF at 10, a chem midterm next Friday, and gym Tue/Thu at 7."
}
```

**Expected Result:**
A JSON object with categorized items (routineSchedule, deadlines, etc.).

---

### 2. Plan Week
**URL:** `POST http://localhost:3000/api/plan-week`

**Body (JSON):**
*Copy the JSON output from the "Parse Categories" test and paste it here.*

Example:
```json
{
  "routineSchedule": [
    { "title": "Math Class", "days": ["Mon", "Wed", "Fri"], "start": "10:00", "end": "11:00" }
  ],
  "fixedCommitments": [],
  "deadlines": [
    { "title": "Chem Midterm", "date": "2025-11-28", "importance": "high" }
  ],
  "lockInSessions": [],
  "otherEvents": [],
  "preferences": {
    "wake": "08:00",
    "sleep": "23:00",
    "maxStudyHoursPerDay": 4
  }
}
```

**Expected Result:**
```json
{
  "assistant_message": "...",
  "calendar": {
    "events": [...]
  }
}
```

---

### 3. Update Calendar
**URL:** `POST http://localhost:3000/api/update-calendar`

**Body (JSON):**
```json
{
  "events": [
    { "id": "evt_1", "title": "Math Class", "start": "2025-11-24T10:00", "end": "2025-11-24T11:00", "locked": true, "type": "ROUTINE", "day": "Mon" }
  ],
  "message": "Move my Friday study session earlier."
}
```

**Expected Result:**
```json
{
  "assistant_message": "...",
  "calendar": {
    "events": [...]
  }
}
```
