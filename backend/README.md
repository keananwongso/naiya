# Backend

Ownership: 🟩 Efe

Place API routes, LLM call wrappers, and regeneration logic here.

Contracts:
- Accept onboarding payloads, life dump text, and update payloads (see ../docs/contracts.md).
- Return validated JSON matching the shared Event schema.

Recommended next steps:
- Add /plan-week, /parse-life-dump, /update-plan handlers.
- Validate requests against the shared TypeScript types.
