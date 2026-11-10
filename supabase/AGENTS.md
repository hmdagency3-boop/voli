# Database updates

- Video gifts live in supabase/019_video_gifts.sql: room_gift_catalog.video_url (Cloudinary-only, set via admin_set_gift_video) and a closed room_gift_shows table filled by a statement trigger on room_coins, so send_room_gift stays unchanged; rooms poll room_gift_shows_since and nextGiftShows (src/lib/gifts.ts) skips videos sent before entering.
- Gender and country live in supabase/020_gender_country.sql: a closed member_info table read through profile_info() (hides the country from others while hide_location is active) and written only by set_my_profile_info(); src/lib/profile-info.ts is the client entry point and ProfileInfoRow hides itself when the update has not been run.
