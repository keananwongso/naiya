# Naiya

Naiya is an AI-powered weekly schedule planner that helps students and busy professionals turn messy commitments into an organized, actionable weekly calendar. Using natural language processing and intelligent scheduling algorithms, Naiya makes managing your time effortless.

## Features

- **Smart Scheduling**: AI-powered schedule generation using GPT-5.1 that understands your preferences and constraints
- **Voice-to-Calendar**: Record your thoughts and have them automatically transcribed and converted into calendar events
- **Interactive Calendar**: Drag-and-drop weekly grid with support for recurring events, one-time events, and flexible scheduling
- **Intelligent Conflict Resolution**: Automatically handles overlaps while respecting locked commitments and quiet hours
- **Deadline Management**: Track important deadlines with priority levels and integrate them into your schedule
- **Natural Language Editing**: Chat with Naiya to modify your schedule conversationally
- **Google OAuth**: Secure authentication with persistent sessions

## Tech Stack

**Frontend**
- Next.js 16 with React 19 and App Router
- TypeScript 5 for type safety
- Tailwind CSS 4 for styling
- Framer Motion for animations
- @dnd-kit for drag-and-drop interactions
- date-fns for date handling

**Backend**
- Supabase Edge Functions (Deno-based serverless)
- Supabase PostgreSQL for data persistence
- Supabase Auth for Google OAuth

**AI/ML**
- OpenAI GPT-5.1 for schedule processing and natural language understanding
- OpenAI Whisper for audio transcription

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- OpenAI API key
- Google OAuth credentials

### Environment Setup

Create a `.env.local` file in the `frontend/` directory:

```bash
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Installation

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Run production build
npm run lint     # Run ESLint
npm run dedupe   # Utility to deduplicate calendar events
```

## Project Structure

```
Naiya3/
├── frontend/                  # Next.js application
│   ├── src/
│   │   ├── app/              # App Router pages and API routes
│   │   ├── components/       # React components
│   │   └── lib/              # Utilities and database clients
│   └── public/               # Static assets
├── supabase/                  # Supabase configuration
│   └── functions/            # Edge functions
│       ├── naiya-process/    # GPT-5.1 schedule processor
│       └── brain-dump-audio/ # Audio transcription
├── shared/                    # Shared types and utilities
└── supabase-migrations/       # Database migrations
```

## How It Works

1. **Onboarding**: Users provide their schedule preferences, commitments, and study requirements
2. **Schedule Generation**: The AI analyzes your input and generates an optimized weekly schedule
3. **Interactive Editing**: Drag, drop, and resize events on the calendar or use natural language chat
4. **Voice Input**: Record audio to quickly add events without typing
5. **Smart Updates**: The AI re-balances your schedule when you make changes, respecting your constraints

## License

Private
