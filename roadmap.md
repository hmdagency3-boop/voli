# Remove fictional data
- [x] Remove sample streams, stories, events, and notifications.
- [x] Remove sample chats and online people.
- [x] Remove fabricated profile identity, stats, levels, and balances.
- [x] Remove sample photographs and review remaining pages.
- [x] Verify empty pages, navigation, and tests.

# Rename application
- [x] Change the application name to voli inside all pages and page titles.
- [x] Confirm no old application name remains in project source.

# Consistent screen sizes
- [x] Use a shared screen-sized layout across all pages.
- [x] Scroll long content inside the screen with stationary bottom navigation.
- [x] Verify page dimensions and scrolling on phone and desktop.

# External account setup
- [x] Prepare starter SQL with profiles, private sequential UIDs, random seven-digit public IDs, follows, streams, and direct messages.
- [x] Prepare sign-in and signup forms with display name and email, without a username field.
- [x] Verify form validation and SQL account rules.
- [x] Wire signup, sign-in, and sign-out to the user's external project.
- [ ] Apply sql/voli-starter.sql in the project's SQL Editor (needs the user).

# Re-runnable starter SQL
- [x] Make sql/voli-starter.sql safe to run repeatedly; add bio and updated_at to existing profiles.
- [x] Move account_uids to public (fully closed to clients) and use public.handle_new_user trigger.
- [x] Refresh follows, streams, messages policies; verify with PGlite tests (fresh, rerun, older schema).

# Levels
- [x] Charisma (diamonds received) and wealth (coins spent) levels, 100 each, placeholder totals in SQL.
- [x] Show both levels with progress on the profile.
- [ ] Run supabase/001_levels.sql in the SQL Editor (needs the user).
- [ ] Real per-level numbers (user will send later).
- [ ] Gifts that actually add points (not built yet).

# Level badges
- [x] Wealth badges (11) on the profile, with the level number written on each.
- [x] Charisma badges (11) on the levels page and profile.
