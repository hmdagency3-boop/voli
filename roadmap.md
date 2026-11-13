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
# Video gifts
- [x] SQL 019: video_url on gifts, admin_set_gift_video, 5-argument admin_create_gift, admin_gifts returns video.
- [x] Panel: add gift with video, add/change/link/remove video, preview, filter, log labels, tests.
- [ ] Activate on Voli database: requires owner to run sql/019_gift_videos.sql.
- [ ] Play the video after sending a gift: requires the separate Voli app to read video_url.
# Store and backpack
- [x] SQL 023: items (frames, rides, styles, price, days, picture, video), backpack with day top-ups, buy and wear one per kind, admin grant/remove; 14 isolated database tests passed.
- [x] Panel: Store page (add, edit, hide, picture, video, sales) and member backpack with grant/remove; 6 rule tests; page checked with sample data.
- [ ] Activate on Voli database: requires owner to run sql/023_store.sql.
- [ ] Store and Backpack screens in the Voli app: separate project; request ready in sql/023_README.md.
# Soft video edges (store)
- [x] Editor before uploading store videos: live preview, softness slider, four-edges/oval shape, keeps sound; 5 rule tests; real browser run verified transparent edges.
- [x] Entrance pictures: always square (crop middle / whole picture) with soft edges, PNG; 4 rule tests; browser run verified.
- [ ] Transparent edges on iPhone: the Voli app plays WebM transparency only where the device supports it (separate app).
- [x] Picture from a video frame (gifts and entrances, new and existing), then adjust square/soft edges; browser run verified with a chosen file and an uploaded Cloudinary link.
# Animated frames from green-screen video (store frames)
- [x] Chroma key with key-colour pick, softness, green halo/spill removal, edge choke and feather.
- [x] Square crop: drag/size the exact frame area on the video, output size.
- [x] Seamless infinite motion: circular loop (with cross-fade) and ping-pong.
- [x] Effects: sparkles, shimmer, glow, pulse; live preview over an avatar.
- [x] Export light animated WebP with real transparency; preview the final file before approval.
- [x] Available when adding a frame and when changing an existing frame's picture.
- [x] Browser run with a sample green-screen video: 88-frame endless ping-pong WebP, transparent background, glow and sparkles; 11 rule tests.
- [ ] Show animated frames in the Voli app: the app must display animated WebP pictures (separate project).

# SVGA frame studio
- [x] Studio page: pieces as layers, order, drag, pivot, mirror copy, ready-made moves and recipes, glow, moving shine, sparkles, seamless loop, undo, autosave, project file.
- [x] Real SVGA 2.0 export, real-player preview, publish to store (SVGA + picture); 7 rule tests passed.
- [ ] Activate on Voli database: requires owner to run sql/024_store_svga.sql.
- [ ] Play SVGA frames in the Voli app: separate project; request in sql/024_README.md.
- [x] Store page: الحركة column with an SVGA badge and a play link that opens a modal running the real .svga file; the product picture carries an SVGA badge. Verified in a browser run with sample products.
- [ ] Store page: ready-made .svga upload/change/remove for existing items (functions ready in src/lib/store.ts).
- [ ] End-to-end check of the studio and publish while signed in as a real admin.
