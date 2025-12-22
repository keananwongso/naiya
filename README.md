# Naiya - Natural Intelligence for Your Agenda

> **Portfolio Project:** A full-stack AI scheduling application showcasing Next.js 16, Supabase (Auth + PostgreSQL + Edge Functions), Row Level Security, and OpenAI GPT-5.1 integration.

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Naiya transforms messy commitments into an organized weekly calendar using natural language processing. Say "I work 9-5 Mon-Fri, gym 3x/week, dinner Tuesday" and watch it intelligently schedule everything—handling conflicts, respecting preferences, and understanding temporal context.

---

## 🎯 Portfolio Highlights

This project demonstrates:

- **Next.js 16 App Router** with React 19 and TypeScript 5
- **Supabase** PostgreSQL with Row Level Security (RLS) policies
- **Deno Edge Functions** for serverless AI processing
- **OpenAI GPT-5.1** Responses API integration
- **Database Migrations** for reproducible local development
- **Authentication via Supabase** (Google OAuth in UI, extensible API)
- **Real-time conflict resolution** algorithm
- **Drag-and-drop calendar** with @dnd-kit
- **Local-first development** with Supabase CLI

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- **Docker Desktop** (for Supabase local)
- **Node.js 18+** and npm
- **Supabase CLI** ([install](https://supabase.com/docs/guides/cli))
- **OpenAI API key** ([get one](https://platform.openai.com/api-keys))

### Setup

```bash
# 1. Clone repository
git clone https://github.com/KeananWongso/naiya.git
cd naiya

# 2. Start Supabase
supabase start
supabase db reset

# 3. Create Edge Functions environment file
cat > supabase/.env.local <<'EOF'
OPENAI_API_KEY=sk-proj-your-openai-key-here
EOF

# 4. Start Edge Functions (in a separate terminal)
supabase functions serve --env-file supabase/.env.local

# 5. Install frontend dependencies and configure
cd frontend
npm install
cp .env.local.example .env.local  # Uses local Supabase defaults

# 6. Start development server
npm run dev
```

**Visit** [http://localhost:3000/schedule](http://localhost:3000/schedule) → Click "Try Naiya" → Start scheduling!

> **Note:** The demo uses localStorage for data persistence (no authentication required). Your calendar, deadlines, and chat history are stored locally in your browser.

📖 **Detailed setup guide:** [docs/SETUP.md](docs/SETUP.md)

---

## ✨ Key Features

### 🤖 AI-Powered Scheduling
- **Natural language input:** "Add gym Monday at 6pm" or "I work 9-5 Mon-Fri"
- **Temporal intelligence:** Understands "next week", "this Friday", "every Monday"
- **Multi-request parsing:** Processes complex sentences with multiple events
- **Context-aware:** Remembers conversation history for follow-ups

### 🗓️ Smart Conflict Resolution
- **Proactive detection:** Checks schedule before adding events
- **Flexible rescheduling:** Automatically moves flexible events around fixed commitments
- **Intelligent suggestions:** "I scheduled date night Thursday to avoid your meeting on Friday"
- **Preference windows:** Respects meal times (breakfast 7-10am, lunch 11-3pm, dinner 5-9pm)

### 🎨 Interactive Calendar
- **Drag-and-drop:** Move events across days and times
- **Resize events:** Click and drag to adjust duration
- **Recurring events:** Weekly patterns with exclusion support
- **Real-time updates:** Changes sync instantly

### 🎤 Voice Input
- **Audio transcription:** OpenAI Whisper converts speech to text
- **Brain dump mode:** Record thoughts and let AI organize them

---

## 🏗️ Architecture

### Tech Stack

**Frontend**
- Next.js 16 (App Router, React 19, TypeScript 5)
- Tailwind CSS 4 for styling
- Framer Motion for animations
- @dnd-kit for drag-and-drop
- date-fns for date handling

**Backend**
- Supabase Auth (Google OAuth, extensible to email/password via API)
- Supabase PostgreSQL with Row Level Security
- Supabase Edge Functions (Deno runtime)
- OpenAI GPT-5.1 Responses API
- OpenAI Whisper for transcription

**DevOps**
- Local development with Supabase CLI
- Database migrations (reproducible schema)
- Docker containers for local Supabase
- Environment variable management

### System Flow

```
┌─────────────────────┐
│   Next.js Frontend  │  User interacts via chat or calendar
│   (React 19)        │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   API Routes        │  Proxy to Edge Functions
│   (/api/naiya/*)    │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Supabase Edge      │  GPT-5.1 AI Processing
│  Functions (Deno)   │  - Conflict resolution
│                     │  - Natural language parsing
└──────────┬──────────┘  - Calendar generation
           │
           ↓
┌─────────────────────┐
│  OpenAI GPT-5.1     │  Natural language understanding
│  Responses API      │  1500+ token system prompt
└─────────────────────┘

           +

┌─────────────────────┐
│  Supabase           │  Data persistence
│  PostgreSQL + RLS   │  - calendars (JSONB)
│                     │  - deadlines
└─────────────────────┘  - chat_sessions
```

### Row Level Security (RLS)

All database tables enforce security at the row level:

```sql
-- Example: calendars table
CREATE POLICY "Users can update own calendar"
  ON public.calendars FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Benefits:**
- ✅ Users can only access their own data
- ✅ Enforced at database level (not application)
- ✅ Prevents data leaks even if application code has bugs

📖 **Full architecture documentation:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 🗄️ Database Schema

### Tables

**`calendars`** - One row per user storing events as JSONB
```typescript
{
  user_id: UUID (PK, FK → auth.users),
  events: JSONB[], // Array of CalendarEvent objects
  created_at: timestamp,
  updated_at: timestamp
}
```

**`deadlines`** - Assignment/project deadlines
```typescript
{
  id: UUID (PK),
  user_id: UUID (FK → auth.users),
  title: string,
  course: string,
  due_date: date,
  importance: 'low' | 'medium' | 'high',
  completed: boolean
}
```

**`chat_sessions`** - Conversation history with Naiya AI
```typescript
{
  id: UUID (PK),
  user_id: UUID (FK → auth.users),
  messages: JSONB[], // {role, content, timestamp}
  created_at: timestamp
}
```

**Security:** All tables have RLS enabled with `auth.uid() = user_id` policies.

**Migrations:** See [`supabase/migrations/`](supabase/migrations/)

---

## 🧠 AI Pipeline Deep Dive

### GPT-5.1 Integration

**Model:** OpenAI GPT-5.1 via Responses API
**System Prompt:** 1500+ tokens defining scheduling logic
**Key Features:**
- Multi-request parsing
- Temporal context detection ("next week" → specific dates)
- Recurring vs one-time event classification
- Conflict-aware event placement

### Example Processing

**User input:**
```
"I want to plan for next week. I work 9-5 Mon-Fri,
gym 3x/week, dinner Tuesday, date night Friday."
```

**AI processing:**
1. ✅ Detects "next week" → calculates specific dates
2. ✅ Recognizes "work 9-5 Mon-Fri" → recurring pattern
3. ✅ Creates one-time events: dinner (Tue), date night (Fri)
4. ✅ Distributes gym sessions: Mon, Wed, Fri
5. ✅ Checks for conflicts → suggests alternatives if needed

**Output:**
```json
{
  "actions": [
    {"type": "add", "title": "Work", "day": "Mon", "start": "09:00", "end": "17:00"},
    {"type": "add", "title": "Gym", "date": "2025-01-06", "start": "18:00", "end": "19:00"},
    ...
  ],
  "assistantMessage": "I've scheduled your week: work Mon-Fri 9-5, gym sessions on Mon/Wed/Fri, dinner Tuesday, and date night Friday."
}
```

**Edge Function:** [`supabase/functions/naiya-process/index.ts`](supabase/functions/naiya-process/index.ts) (942 lines)

---

## 📁 Project Structure

```
naiya/
├── frontend/                   # Next.js application
│   ├── src/
│   │   ├── app/               # App Router pages
│   │   │   ├── page.tsx       # Home (brain dump)
│   │   │   ├── schedule/      # Calendar view
│   │   │   ├── login/         # Multi-auth login
│   │   │   └── api/           # API routes (proxies)
│   │   ├── components/        # React components
│   │   │   ├── CalendarShell.tsx
│   │   │   ├── ScheduleGrid.tsx
│   │   │   └── DraggableEvent.tsx
│   │   └── lib/               # Utilities
│   │       ├── auth.ts        # Auth helpers
│   │       ├── supabase.ts    # Supabase client
│   │       └── api.ts         # API client
│   └── public/                # Static assets
├── supabase/
│   ├── migrations/            # Database migrations
│   │   └── 20250101000000_initial_schema.sql
│   ├── functions/             # Edge Functions (Deno)
│   │   ├── naiya-process/     # GPT-5.1 scheduler (942 lines)
│   │   └── brain-dump-audio/  # Whisper transcription
│   └── config.toml            # Local Supabase config
├── docs/
│   ├── SETUP.md               # Local development guide
│   └── ARCHITECTURE.md        # Technical deep-dive
├── shared/                    # Shared TypeScript types
└── scripts/                   # Utility scripts
    └── verify-no-secrets.sh   # Pre-commit secret check
```

---

## 🔒 Security

- **Row Level Security (RLS):** All database queries enforce user isolation
- **API Key Protection:** OpenAI key hidden in Edge Functions (never exposed to frontend)
- **Authentication:** Multi-provider via Supabase Auth
- **Input Validation:** TypeScript types + runtime validation in Edge Functions
- **Secret Management:** Via `supabase secrets set` (never committed)

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

---

## 🛠️ Development

### Local Development Workflow

```bash
# Terminal 1: Supabase services
supabase start
supabase status  # Verify all services running

# Terminal 2: Frontend dev server
cd frontend
npm run dev

# Terminal 3 (optional): Watch Edge Function logs
supabase functions serve --debug
```

### Available Scripts

```bash
# Frontend
npm run dev        # Start dev server
npm run build      # Production build
npm run lint       # ESLint

# Database
supabase db reset  # Apply migrations (wipes data)
supabase db diff   # Show schema changes

# Edge Functions
supabase functions serve            # Serve all functions locally
supabase functions deploy           # Deploy to production
supabase secrets set KEY=value      # Set function secrets
```

### Testing

```bash
# Run secret verification (pre-commit)
./scripts/verify-no-secrets.sh

# Test Edge Functions with curl
curl -X POST http://127.0.0.1:54321/functions/v1/naiya-process \
  -H "Authorization: Bearer ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":"Add lunch Monday 12pm","calendar":[],"currentDate":"2025-01-06"}'
```

---

## 📖 Documentation

- **[Setup Guide](docs/SETUP.md)** - Complete local development setup
- **[Architecture](docs/ARCHITECTURE.md)** - System design and data flow (970 lines)
- **[Contributing](CONTRIBUTING.md)** - Contribution guidelines
- **[Security](SECURITY.md)** - Security policy and reporting
- **[Edge Functions Guide](supabase/functions/README.md)** - Function development

---

## 🤝 Contributing

Contributions welcome! This is a portfolio project demonstrating full-stack development practices.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow [local setup guide](docs/SETUP.md)
4. Make your changes with tests
5. Run verification: `./scripts/verify-no-secrets.sh`
6. Commit with [conventional commits](https://www.conventionalcommits.org/)
7. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

**Why MIT?** Permissive license allowing others to learn from and build upon this portfolio project.

---

## 👤 Author

**Keanan Wongso**

- Portfolio: [keananwongso.com](https://keananwongso.com)
- LinkedIn: [linkedin.com/in/keananwongso](https://www.linkedin.com/in/keananwongso/)
- GitHub: [@KeananWongso](https://github.com/KeananWongso)

---

## 🙏 Acknowledgments

- **OpenAI** - GPT-5.1 and Whisper APIs
- **Supabase** - Backend infrastructure and Edge Functions
- **Vercel** - Next.js framework and hosting
- **Open Source Community** - All the amazing tools used in this project

---

## 📊 Project Stats

- **Lines of Code:** ~15,000+ (excluding node_modules)
- **Main AI Logic:** 942 lines (Edge Function)
- **Components:** 14 React components
- **Database Tables:** 3 (with RLS policies)
- **API Endpoints:** 3 Edge Functions
- **Documentation:** 8 comprehensive markdown files

---

**Built with ❤️ as a technical portfolio project showcasing modern full-stack development**
