# Supabase Edge Functions Deployment

This directory contains Supabase Edge Functions for the Naiya backend.

## Functions

- `naiya-process/` - Main AI calendar processing endpoint
- `brain-dump-audio/` - Audio transcription using OpenAI Whisper

## Deployment via GitHub

Since the Supabase CLI requires updated Command Line Tools, we'll deploy via GitHub integration:

### 1. Push to GitHub

```bash
git add supabase/
git commit -m "Add Supabase Edge Functions"
git push
```

### 2. Enable GitHub Integration in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions**
3. Click **Deploy from GitHub**
4. Connect your GitHub repository
5. Select the branch (`main`)
6. Supabase will automatically deploy functions from `supabase/functions/`

### 3. Set Environment Variables

In Supabase Dashboard → Project Settings → Edge Functions → Environment Variables:

```
OPENAI_API_KEY=your-openai-api-key
```

### 4. Update Frontend Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_BACKEND_URL=https://your-project-ref.supabase.co
```

## Function URLs

After deployment, your functions will be available at:

```
https://your-project-ref.supabase.co/functions/v1/naiya-process
https://your-project-ref.supabase.co/functions/v1/brain-dump-audio
```

## Testing

Test the functions using curl:

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/naiya-process \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":"test","calendar":[]}'
```

## Note

These Edge Functions are simplified versions that call OpenAI directly. The full backend logic from `backend/src/` has been streamlined for Edge Functions compatibility.
