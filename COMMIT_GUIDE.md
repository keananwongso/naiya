# Open-Source Preparation - Commit Guide

This document lists all commits to prepare Naiya for open-source release.

---

## 🚨 CRITICAL: Force Push Warning

**Git history was rewritten** with `git-filter-repo` to remove the 44MB archive.

Before pushing to GitHub:
1. Backup your work
2. Force push: `git push --force --all origin`
3. **All collaborators must re-clone the repository**

---

## 📋 Commit Sequence

Execute these commits in order:

### ✅ Commit 1: Security Cleanup
**Files staged:**
- `.gitignore` (updated)
- `.env.example` (new)
- `frontend/.env.local.example` (new)
- `supabase/.env.example` (new)
- `supabase/functions/.env.example` (new)
- `scripts/verify-no-secrets.sh` (new, executable)

**Command:**
```bash
git add .gitignore .env.example frontend/.env.local.example supabase/.env.example supabase/functions/.env.example scripts/verify-no-secrets.sh

git commit -m "chore: security cleanup and environment templates

- Add .env.example templates for all components
- Add secret verification script (scripts/verify-no-secrets.sh)
- Update .gitignore for Supabase local development
- Verified: no secrets in tracked files ✅

Note: Archive was purged from git history in previous step
Git history rewritten with git-filter-repo (26M -> 1.4M .git)"
```

**Verify:**
```bash
./scripts/verify-no-secrets.sh
# Should pass with ✅ VERIFICATION PASSED
```

---

### ✅ Commit 2: Supabase Migrations + RLS
**Files staged:**
- `supabase/migrations/20250101000000_initial_schema.sql` (new)
- `supabase/seed.sql` (new)
- `supabase/config.toml` (new)

**Command:**
```bash
git add supabase/migrations/ supabase/seed.sql supabase/config.toml

git commit -m "feat: add Supabase migrations with RLS policies

- Initial schema: calendars, deadlines, chat_sessions tables
- Row Level Security with USING + WITH CHECK on UPDATE policies
- Indexes on user_id and frequently queried columns
- pgcrypto extension for gen_random_uuid()
- Enables local development with 'supabase db reset'
- Config.toml for local Supabase services"
```

**Verify:**
```bash
# Test migration locally
supabase start
supabase db reset

# Should succeed with:
# "Applying migration 20250101000000_initial_schema.sql..."
# "Finished supabase db reset"
```

---

### ✅ Commit 3: Email/Password Auth
**Files staged:**
- `frontend/src/lib/auth.ts` (new)
- `frontend/src/app/login/page.tsx` (modified)

**Command:**
```bash
git add frontend/src/lib/auth.ts frontend/src/app/login/page.tsx

git commit -m "feat: add email/password auth alongside Google OAuth

- Add auth helper functions (email, password, magic link, Google)
- Update login page with tabbed interface
- Email/password as primary local dev auth method
- Magic link optional (requires email setup)
- Google OAuth optional (requires credentials setup)
- Clear local dev instructions in UI"
```

**Verify:**
```bash
cd frontend
npm run dev

# Visit http://localhost:3000/login
# Should see 3 tabs: Sign In, Sign Up, Magic Link
# Email/password should work without Google OAuth
```

---

### ✅ Commit 4: Edge Functions Documentation
**Files staged:**
- `supabase/functions/README.md` (modified)

**Command:**
```bash
git add supabase/functions/README.md

git commit -m "docs: update Edge Functions for local development

- Add local development instructions with Supabase CLI
- Document 'supabase secrets set' for local secrets
- Add function testing examples with curl
- Clarify production deployment options
- Add troubleshooting section"
```

---

### ✅ Commit 5: Comprehensive Documentation
**Files staged:**
- `docs/SETUP.md` (new)
- `docs/ARCHITECTURE.md` (moved from `CURRENT_ARCHITECTURE.md`)
- `LICENSE` (new)
- `CONTRIBUTING.md` (new)
- `SECURITY.md` (new)

**Command:**
```bash
git add docs/SETUP.md docs/ARCHITECTURE.md LICENSE CONTRIBUTING.md SECURITY.md
git rm CURRENT_ARCHITECTURE.md

git commit -m "docs: comprehensive documentation for portfolio presentation

- Add detailed SETUP.md with local quickstart
- Move architecture docs to docs/ARCHITECTURE.md
- Add MIT license
- Add CONTRIBUTING guidelines
- Add SECURITY policy
- Documentation optimized for technical reviewers"
```

---

### ✅ Commit 6 (Optional): Fix ESLint Warnings
**Files to check:**
```bash
cd frontend
npm run lint

# Fix the 2 critical errors in src/app/page.tsx:653,713
# (React unescaped apostrophes)
```

**Command (if fixes made):**
```bash
git add frontend/src/app/page.tsx

git commit -m "fix: resolve ESLint errors in page.tsx

- Fix unescaped apostrophes (lines 653, 713)
- Use &apos; instead of raw apostrophes in JSX"
```

---

### ✅ Commit 7: Update README (Final Step)
**Create new README.md** optimized for portfolio presentation.

**Key sections:**
1. Project overview with tech stack badges
2. Live demo link (if deployed)
3. Architecture diagram
4. Quick start (link to SETUP.md)
5. Key features
6. Tech stack details
7. Local development
8. License

**Command:**
```bash
git add README.md

git commit -m "docs: rewrite README for portfolio presentation

- Add tech stack overview and badges
- Include architecture highlights
- Link to comprehensive setup guide
- Emphasize learning value and technical decisions
- Add screenshots/demo (if available)"
```

---

## 🔄 Force Push to GitHub

After all commits:

```bash
# Verify all commits
git log --oneline | head -10

# Add remote (if not already added after filter-repo)
git remote add origin https://github.com/KeananWongso/naiya.git

# Force push (required due to history rewrite)
git push --force --all origin
git push --force --tags origin
```

---

## ⚠️ Post-Push Actions

### For You (Original Author)
1. **Rotate credentials** (exposed in local .env files):
   ```bash
   # Get new keys from:
   # - OpenAI Platform: platform.openai.com/api-keys
   # - Supabase Dashboard: Settings → API → Reset keys
   ```

2. **Update production environment** (if deployed):
   - Vercel: Update environment variables
   - Supabase Cloud: Rotate service role key

### For Contributors
**Important:** Anyone who had cloned the repo before must:
```bash
# Delete old clone
rm -rf naiya/

# Fresh clone
git clone https://github.com/KeananWongso/naiya.git
cd naiya
```

---

## ✅ Verification Checklist

After all commits and force push:

- [ ] No secrets in tracked files: `./scripts/verify-no-secrets.sh`
- [ ] Migrations work: `supabase db reset`
- [ ] Frontend builds: `cd frontend && npm run build`
- [ ] Frontend lints: `npm run lint` (0-2 errors acceptable)
- [ ] Local development works:
  - [ ] `supabase start` succeeds
  - [ ] `supabase secrets set OPENAI_API_KEY=...` works
  - [ ] `npm run dev` starts frontend
  - [ ] Can sign up with email/password
  - [ ] Can create calendar events
- [ ] Documentation is accurate:
  - [ ] README.md reflects current state
  - [ ] docs/SETUP.md instructions work
  - [ ] All links in docs work
- [ ] Git history is clean:
  - [ ] No archive/ directory in history
  - [ ] `.git` directory is ~1-2MB (not 26MB+)
  - [ ] `git log --all` shows clean commits

---

## 📊 Summary

**Total commits:** 6-7 (depending on ESLint fixes)
**Git history:** Rewritten (force push required)
**Repo size:** 26MB → 1.4MB (.git directory)
**Files added:** 11
**Files modified:** 4
**Files removed:** 1 archive directory

**Result:** Portfolio-ready open-source project!

---

## 🚀 Next Steps (Optional)

After making the repo public:

1. **Add to portfolio:** Include in resume, portfolio site
2. **Write blog post:** Technical deep-dive on architecture
3. **Create demo video:** Screen recording of features
4. **Deploy to production:**
   - Frontend: Vercel
   - Backend: Supabase Cloud
5. **Add GitHub badges:** Build status, license, etc.
6. **Enable GitHub Discussions:** For Q&A
7. **Create project board:** Track future enhancements

---

**Questions?** Check:
- [docs/SETUP.md](./docs/SETUP.md) for local development
- [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for system design

**Good luck with your portfolio project!** 🎉
