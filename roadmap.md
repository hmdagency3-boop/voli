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

# CP relationship card
- [x] Remove green background and use the supplied gold-and-purple card in account details.
- [x] Position the account avatar within the right frame and preserve the left chair and ruby heart.
- [x] Verify the card at phone and desktop sizes using an isolated visual fixture; real external-account access is unverified.
- [x] Always fill the right frame: the account avatar, or a first-letter fallback when there is none or the picture fails to load.

# VIP dragon system (8 tiers)
- [x] SQL update supabase/003_vip.sql: tiers table with every feature, grants (purchase/admin/gift/event) with expiry, coins balance, purchase function, admin grant/revoke, room moderation + immunity rules, invisible/hide-location settings.
- [x] Tests for VIP rules (PGlite).
- [x] VIP page listing the 8 tiers and features; own settings (hide location, invisible mode).
- [x] Placeholder frame, chat badge, chat bubble, name colour; special ID card picked by new tiers.
- [ ] Run supabase/003_vip.sql in the SQL Editor (needs the user).
- [x] VIP 1 chat badge and bronze entrance bar pictures (green background removed); entrance preview on the VIP page.
- [ ] Real artwork for the other badges, frames, bubbles, entrances, ID cards (user will send).
- [x] Upload the latest updates to GitHub (hmdagency3-boop/voli).
- [ ] Prices, durations, monthly salary amounts, friends-list sizes (user will decide).
- [ ] Stream rooms, entrances, join banner, system broadcast (rooms not built yet).
