# Naiya - Local Development Setup

Complete guide to running Naiya locally with Supabase CLI.

## Prerequisites

- **Node.js** 18+ and npm
- **Docker Desktop** (for Supabase local)
- **Supabase CLI** ([install guide](https://supabase.com/docs/guides/cli))
- **OpenAI API Key** ([get one](https://platform.openai.com/api-keys))

### Install Supabase CLI

**Option A: Direct Install (Recommended - no Xcode tools needed)**
```bash
# Install via official script
curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | bash

# Add to PATH (if not auto-added)
echo 'export PATH=$PATH:~/.supabase/bin' >> ~/.zshrc
source ~/.zshrc

# Verify installation
supabase --version
```

**Option B: Homebrew (requires updated Command Line Tools)**
```bash
brew install supabase/tap/supabase

# If you get "Command Line Tools are too outdated" error:
# 1. Update: sudo rm -rf /Library/Developer/CommandLineTools && sudo xcode-select --install
# 2. OR use Option A above

# Verify installation
supabase --version
```

**Windows:**
```powershell
scoop install supabase
```

---

## 🚀 Quick Start (5 minutes)

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/naiya.git
cd naiya

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Start Supabase
```bash
# Start local Supabase (Docker required)
supabase start

# Wait ~60 seconds for all services to initialize
# You'll see output like:
# API URL: http://127.0.0.1:54321
# DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
# Studio URL: http://127.0.0.1:54323
# Anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Run Migrations
```bash
# Apply database schema and RLS policies
supabase db reset

# Verify tables were created
supabase db diff  # Should show no changes
```

### 4. Set OpenAI API Key (Local Development)

**For local development, use environment variables:**

```bash
# Option A: Set in your current terminal session
export OPENAI_API_KEY=sk-proj-your-openai-key-here

# Verify it's set
echo $OPENAI_API_KEY

# Option B: Add to your shell profile (persists across sessions)
echo 'export OPENAI_API_KEY=sk-proj-your-openai-key-here' >> ~/.zshrc
source ~/.zshrc

# Option C: Create a local .env file (recommended)
cat > supabase/.env.local <<'EOF'
OPENAI_API_KEY=sk-proj-your-openai-key-here
EOF
```

**Note:** The `supabase secrets set` command is for **production deployments only**. For local dev, Edge Functions automatically pick up environment variables.

### 5. Configure Frontend
```bash
cd frontend

# Copy environment template
cp .env.local.example .env.local

# Edit .env.local with your editor
# The default values for local Supabase should work:
# NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

### 6. Start Frontend
```bash
# From frontend/ directory
npm run dev

# App will be available at http://localhost:3000
```

### 7. Start Using Naiya
1. Navigate to http://localhost:3000/login
2. Click "Try Naiya" button
3. Start scheduling!

**Note:** The demo mode uses **localStorage** for data persistence (no authentication required). Your calendar, deadlines, and chat history are stored locally in your browser. This makes it easy to test the app without setting up OAuth credentials.

---

## 📊 Architecture Overview

```
┌─────────────────┐
│  Next.js App    │  http://localhost:3000
│  (Frontend)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Supabase Local │  http://127.0.0.1:54321
│  - Auth         │
│  - PostgreSQL   │
│  - Edge Functions│
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  OpenAI API     │
│  - GPT-5.1      │
│  - Whisper      │
└─────────────────┘
```

---

## 🗄️ Database Schema

### Tables Created by Migrations

**`calendars`** - User calendar events (JSONB)
- `user_id` (PK, references auth.users)
- `events` (JSONB array of CalendarEvent objects)
- `created_at`, `updated_at`

**`deadlines`** - Assignment/project deadlines
- `id` (PK, UUID)
- `user_id` (FK to auth.users)
- `title`, `course`, `due_date`, `importance`, `completed`
- `created_at`

**`chat_sessions`** - Conversation history with Naiya AI
- `id` (PK, UUID)
- `user_id` (FK to auth.users)
- `messages` (JSONB array)
- `created_at`

### Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- ✅ Users can only SELECT/INSERT/UPDATE/DELETE their own data
- ✅ `auth.uid() = user_id` enforced on all operations
- ✅ UPDATE policies use both USING and WITH CHECK clauses

**Example Policy** (calendars table):
```sql
CREATE POLICY "Users can update own calendar"
  ON public.calendars FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## 🔧 Development Workflow

### Daily Development
```bash
# Terminal 1: Keep Supabase running
supabase start
supabase status  # Check all services are up

# Terminal 2: Frontend dev server
cd frontend
npm run dev

# Terminal 3 (Optional): Watch Edge Function logs
supabase functions serve --debug
```

### Reset Database
```bash
# Wipe all data and reapply migrations
supabase db reset

# Note: You'll need to sign up again after reset
```

### View Database in Supabase Studio
```bash
# Open Studio UI
open http://127.0.0.1:54323

# Or get URL from:
supabase status
```

### Check Logs
```bash
# Edge Function logs
supabase functions serve --debug

# Database logs
supabase db logs

# All logs
docker logs supabase_db_naiya
```

---

## 🧪 Testing Edge Functions

### Test naiya-process (Calendar AI)
```bash
curl -X POST http://127.0.0.1:54321/functions/v1/naiya-process \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Add gym Monday at 6pm for 1 hour",
    "calendar": [],
    "currentDate": "2025-01-06"
  }'
```

### Test brain-dump-audio (Transcription)
```bash
# Record a test audio file or use sample
curl -X POST http://127.0.0.1:54321/functions/v1/brain-dump-audio \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -F "audio=@test.mp3"
```

---

## 🚨 Troubleshooting

### "Supabase is not running"
```bash
# Check Docker is running
docker ps

# Start Supabase
supabase start

# If issues persist, restart Docker Desktop
```

### "OPENAI_API_KEY not configured"
```bash
# Set environment variable
export OPENAI_API_KEY=sk-proj-your-key

# OR create supabase/.env.local file
echo 'OPENAI_API_KEY=sk-proj-your-key' > supabase/.env.local

# Restart Supabase to pick up new env vars
supabase stop
supabase start
```

### "Cannot connect to database"
```bash
# Check Supabase status
supabase status

# All services should show as "healthy"
# If not, restart:
supabase stop
supabase start
```

### "Email confirmation required" on signup
This shouldn't happen locally. Check `supabase/config.toml`:
```toml
[auth.email]
enable_confirmations = false  # Should be false
```

### Build errors in frontend
```bash
cd frontend
rm -rf node_modules .next
npm install
npm run dev
```

---

## 🌐 Production Deployment (Optional)

See [docs/DEPLOYMENT.md](./DEPLOYMENT.md) for deploying to:
- Supabase Cloud (database + Edge Functions)
- Vercel (Next.js frontend)

---

## 📚 Additional Resources

- [Architecture Documentation](./ARCHITECTURE.md)
- [Edge Functions README](../supabase/functions/README.md)
- [Supabase Local Development Docs](https://supabase.com/docs/guides/cli/local-development)
- [Next.js 16 Documentation](https://nextjs.org/docs)

---

## ❓ Getting Help

- Check [GitHub Issues](https://github.com/yourusername/naiya/issues)
- Review [Troubleshooting](#-troubleshooting) section above
- Read the [Architecture docs](./ARCHITECTURE.md) to understand the system

---

**Ready to Build?** 🚀

```bash
# One-command start (from project root)
export OPENAI_API_KEY=sk-proj-your-key && \
supabase start && \
supabase db reset && \
cd frontend && npm run dev
```

Then visit **http://localhost:3000** and sign up!
