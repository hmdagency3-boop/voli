# Unified bans
- [x] Update both device-report SQL definitions with client IP fallback and a compatible six-argument overload; all 25 isolated PostgreSQL tests passed.
- [x] Add owner-run SQL for unified codes, existing account bans, device-linked account enforcement and ID/device history lookup.
- [x] Add dedicated bans page; keep device history separate and link member actions to bans.
- [x] Add and run rule tests; 21 tests passed, isolated SQL and UI fixtures verified. Real signed-out redirect verified.
- [x] Document external database/app activation requirements in sql/016_README.md.
- [ ] Activate on Voli database: requires owner to run sql/016_unified_bans.sql.
- [ ] Verify real member enforcement and device reports: requires the separate Voli app integration and real admin session; unavailable in this standalone console.
# Name / picture violations
- [x] SQL 017: remove name (voli+ID) or picture, Voli Helper warning, timed/permanent change locks enforced by trigger.
- [x] Member page buttons, lock removal, log labels, tests.
- [ ] Activate on Voli database: requires owner to run sql/017_profile_moderation.sql.
