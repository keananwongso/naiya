-- Naiya Seed Data (Optional)
-- Provides minimal demo/test data for local development
-- Note: User-specific data requires auth.uid(), so this only seeds static reference data

-- Since our tables are user-specific (all reference auth.users),
-- we cannot pre-seed user data without valid UUIDs.
--
-- Instead, users should:
-- 1. Sign up via the app (email/password)
-- 2. Use the app to create calendar events and deadlines
--
-- OR implement a "Load Demo Data" button in the frontend that:
-- - Calls an API endpoint
-- - Creates sample events for the authenticated user

-- Future: Add seed data for lookup tables (tags, categories, etc.) if needed

-- Example of what we WOULD seed if we had static reference data:
-- INSERT INTO public.event_categories (name, color, icon)
-- VALUES
--   ('Work', '#3b82f6', 'briefcase'),
--   ('Personal', '#10b981', 'user'),
--   ('Study', '#8b5cf6', 'book-open');

-- For now, this file serves as documentation
SELECT 'No seed data - user-specific tables require authenticated context' AS notice;
