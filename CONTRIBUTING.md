# Contributing to Naiya

Thank you for considering contributing to Naiya! This is a portfolio project showcasing modern full-stack development with Next.js, Supabase, and OpenAI.

## 🎯 Project Goals

Naiya serves as a **technical reference implementation** demonstrating:
- Next.js 16 App Router + React 19
- Supabase Auth, PostgreSQL, Row Level Security (RLS)
- Supabase Edge Functions (Deno runtime)
- OpenAI GPT-5.1 Responses API integration
- TypeScript throughout the stack
- Local-first development with Supabase CLI

## 🤝 How to Contribute

### Reporting Bugs
- Check existing [GitHub Issues](https://github.com/KeananWongso/naiya/issues) first
- Include steps to reproduce
- Specify your environment (OS, Node version, Supabase CLI version)
- Include relevant error messages or logs

### Suggesting Features
- Open an issue with the `enhancement` label
- Explain the use case and proposed solution
- Consider whether it aligns with the project's educational goals

### Submitting Pull Requests

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Set up local development**
   ```bash
   # Follow docs/SETUP.md
   supabase start
   supabase db reset
   supabase secrets set OPENAI_API_KEY=sk-proj-your-key
   cd frontend && npm install && npm run dev
   ```

4. **Make your changes**
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation if needed

5. **Test locally**
   ```bash
   # Frontend
   cd frontend
   npm run build  # Should succeed
   npm run lint   # Should pass (or only minor warnings)

   # Verify no secrets exposed
   cd ..
   ./scripts/verify-no-secrets.sh
   ```

6. **Commit with clear messages**
   ```bash
   git commit -m "feat: add calendar export functionality"
   # or
   git commit -m "fix: resolve RLS policy issue on deadlines table"
   # or
   git commit -m "docs: clarify Edge Functions setup"
   ```

7. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a Pull Request on GitHub

### Code Style
- **TypeScript**: Strict mode, explicit types preferred
- **React**: Functional components, hooks
- **Formatting**: Prettier (configured in Next.js)
- **Naming**:
  - camelCase for variables/functions
  - PascalCase for components
  - kebab-case for file names

### Commit Message Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `style:` Code style (formatting, semicolons, etc.)
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `perf:` Performance improvement
- `test:` Adding tests
- `chore:` Maintenance tasks

## 🔒 Security

**Never commit secrets!** Before committing:
```bash
./scripts/verify-no-secrets.sh
```

If you discover a security vulnerability, see [SECURITY.md](./SECURITY.md).

## 📚 Development Resources

- [Setup Guide](./docs/SETUP.md)
- [Architecture Documentation](./docs/ARCHITECTURE.md)
- [Edge Functions Guide](./supabase/functions/README.md)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)

## 🧪 Testing Checklist

Before submitting a PR:
- [ ] Code builds successfully (`npm run build`)
- [ ] No TypeScript errors
- [ ] ESLint passes (or only minor warnings)
- [ ] No secrets in tracked files (`./scripts/verify-no-secrets.sh`)
- [ ] Migrations work (`supabase db reset` succeeds)
- [ ] Changes tested locally with Supabase
- [ ] Documentation updated if needed

## 💬 Questions?

- Open a [GitHub Discussion](https://github.com/KeananWongso/naiya/discussions)
- Check existing issues
- Read the [SETUP guide](./docs/SETUP.md)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License (see [LICENSE](./LICENSE)).

---

**Thank you for helping improve Naiya!** 🚀
