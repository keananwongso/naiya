# Supabase Edge Functions

This directory contains Deno-based Edge Functions for Naiya's AI-powered backend.

## Functions

- **`naiya-process/`** - Main AI calendar processing using OpenAI GPT-5.1 Responses API
- **`brain-dump-audio/`** - Audio transcription using OpenAI Whisper

---

## 🚀 Local Development (Recommended)

### Prerequisites
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- Docker Desktop running
- OpenAI API key

### 1. Start Supabase Locally
```bash
# From project root
supabase start

# Wait for services to start (30-60 seconds)
# You'll see output with local URLs and keys
```

### 2. Set Function Secrets Locally
```bash
# Set OpenAI API key for local Edge Functions
supabase secrets set OPENAI_API_KEY=sk-proj-your-key-here

# Verify secrets are set
supabase secrets list

# Output should show:
# OPENAI_API_KEY
```

### 3. Serve Functions Locally
```bash
# Option A: Serve all functions
supabase functions serve

# Option B: Serve specific function
supabase functions serve naiya-process

# Functions will be available at:
# http://127.0.0.1:54321/functions/v1/naiya-process
# http://127.0.0.1:54321/functions/v1/brain-dump-audio
```

### 4. Test Functions
```bash
# Test naiya-process
curl -X POST http://127.0.0.1:54321/functions/v1/naiya-process \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -d '{"message":"Add lunch at 12pm Monday","calendar":[],"currentDate":"2025-01-06"}'

# Test brain-dump-audio
curl -X POST http://127.0.0.1:54321/functions/v1/brain-dump-audio \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -F "audio=@test.mp3"
```

### Frontend Integration
The Next.js app automatically targets local Supabase when `NEXT_PUBLIC_SUPABASE_URL` is set to `http://127.0.0.1:54321`.

See `frontend/.env.local.example` for configuration.

---

## 📦 Production Deployment

### Option A: Supabase CLI (Recommended)
```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy naiya-process

# Set production secrets
supabase secrets set --env-file .env OPENAI_API_KEY
```

### Option B: GitHub Integration
1. Push code to GitHub
2. In Supabase Dashboard → Edge Functions → Deploy from GitHub
3. Connect repository and select branch
4. Functions auto-deploy on git push

### Set Production Secrets
```bash
# Via CLI
supabase secrets set OPENAI_API_KEY=sk-proj-your-production-key

# Or via Dashboard
# Project Settings → Edge Functions → Secrets → Add Secret
```

### Production URLs
```
https://your-project-ref.supabase.co/functions/v1/naiya-process
https://your-project-ref.supabase.co/functions/v1/brain-dump-audio
```

---

## 🔒 Security

- **JWT Verification**: Disabled for local dev (`verify_jwt = false` in `config.toml`)
  - Enable in production by setting `verify_jwt = true`
- **CORS**: Configured for `*` in development
  - Restrict to your domain in production
- **API Keys**: Never commit `OPENAI_API_KEY` to git
  - Use `supabase secrets set` for local and production

---

## 🛠️ Function Details

### naiya-process
- **Purpose**: AI calendar processing with GPT-5.1
- **Input**: `{message, calendar, currentDate, conversationHistory?}`
- **Output**: `{events, deadlines, assistantMessage}`
- **Model**: OpenAI GPT-5.1 (Responses API)
- **Size**: ~942 lines, includes conflict resolution and RLS integration

### brain-dump-audio
- **Purpose**: Audio → text transcription
- **Input**: FormData with `audio` file (mp3, wav, m4a)
- **Output**: `{transcript}`
- **Model**: OpenAI Whisper-1
- **Max file size**: 25MB

---

## 📚 Architecture

Edge Functions act as a secure proxy between the frontend and OpenAI:

```
Frontend (Next.js)
    ↓
Next.js API Route (/api/naiya/process)
    ↓
Supabase Edge Function (Deno runtime)
    ↓
OpenAI API (GPT-5.1 / Whisper)
    ↓
Response → Frontend
```

**Why Edge Functions?**
- Hide OpenAI API keys from frontend
- Add business logic (conflict resolution, RLS)
- Deno runtime (secure, TypeScript-first)
- Scales automatically

---

## 🐛 Troubleshooting

### "OPENAI_API_KEY not configured"
```bash
supabase secrets set OPENAI_API_KEY=sk-proj-your-key
supabase functions serve  # Restart functions
```

### "Cannot connect to Edge Functions"
```bash
supabase status  # Check all services are running
docker ps  # Verify Docker containers

# Restart Supabase
supabase stop
supabase start
```

### "CORS error" in browser
- Check `corsHeaders` in function `index.ts`
- Verify frontend URL matches allowed origins
- For local dev, CORS should allow `http://localhost:3000`

---

## 📖 Learn More

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Runtime](https://deno.land/)
- [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses)
- [OpenAI Whisper](https://platform.openai.com/docs/guides/speech-to-text)
