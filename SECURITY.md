# Security Policy

## Supported Versions

This is an educational/portfolio project. Security updates are provided on a best-effort basis.

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Naiya, please report it responsibly:

### For Security Issues
**Do NOT open a public GitHub issue.**

Instead, email: **keananwongso7@gmail.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

I'll respond within 48 hours and work with you to address the issue.

### For Non-Security Bugs
Open a regular [GitHub Issue](https://github.com/KeananWongso/naiya/issues).

## Security Best Practices

### For Contributors

1. **Never commit secrets**
   ```bash
   # Always run before committing
   ./scripts/verify-no-secrets.sh
   ```

2. **Use environment variables**
   - API keys in `.env.local` (never commit)
   - See `.env.local.example` for template

3. **Respect RLS policies**
   - All database queries must respect Row Level Security
   - Test with different user accounts

4. **Validate input**
   - Sanitize user input in Edge Functions
   - Use TypeScript types for validation

### For Users/Deployers

1. **Rotate keys after setup**
   - Generate new Supabase keys for production
   - Use separate OpenAI keys for dev/prod

2. **Enable JWT verification in production**
   ```toml
   # supabase/config.toml
   [functions.naiya-process]
   verify_jwt = true  # Important for production!
   ```

3. **Restrict CORS in production**
   ```typescript
   // supabase/functions/*/index.ts
   const corsHeaders = {
     'Access-Control-Allow-Origin': 'https://yourdomain.com', // Not '*'
   }
   ```

4. **Use Supabase RLS**
   - Never disable Row Level Security on production tables
   - Review policies in `supabase/migrations/`

5. **Keep dependencies updated**
   ```bash
   npm audit
   npm update
   ```

## Known Security Considerations

### Edge Functions (Deno)
- **Local dev**: JWT verification disabled (`verify_jwt = false`)
  - **Production**: Enable `verify_jwt = true`
- **CORS**: Open for local dev (`*`)
  - **Production**: Restrict to your domain

### OpenAI API Keys
- **Never** expose `OPENAI_API_KEY` to frontend
- Use Edge Functions as a secure proxy
- Set via `supabase secrets set` (never in code)

### Row Level Security (RLS)
- All tables have RLS enabled
- Policies enforce `auth.uid() = user_id`
- UPDATE policies use both USING and WITH CHECK

### Authentication
- Email/password: Minimum 6 characters enforced
- Magic links: Requires email provider configuration
- Google OAuth: Optional, requires separate setup

## Disclosure Policy

- Reported vulnerabilities will be acknowledged within 48 hours
- Fixes will be developed and tested privately
- Security advisories will be published after fixes are deployed
- Credit will be given to reporters (if desired)

## Security Resources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/authentication)
- [OpenAI API Security](https://platform.openai.com/docs/guides/safety-best-practices)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Last Updated**: December 21, 2024
