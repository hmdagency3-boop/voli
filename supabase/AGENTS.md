# Database updates

- Video gifts live in supabase/019_video_gifts.sql: room_gift_catalog.video_url (Cloudinary-only, set via admin_set_gift_video) and a closed room_gift_shows table filled by a statement trigger on room_coins, so send_room_gift stays unchanged; rooms poll room_gift_shows_since and nextGiftShows (src/lib/gifts.ts) skips videos sent before entering.
