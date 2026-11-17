# Update 026 — Lucky & Crazy gifts

1. Run `sql/026_lucky_gifts.sql` once in Voli's SQL Editor.
2. Voli Android app: when a member sends a gift whose kind is lucky/crazy, call
   `send_room_lucky_gift(p_room, p_gift, p_quantity, p_to)`. It charges the sender,
   pays the mic owner share (9.2%), platform cut (15.8%), feeds the prize pool (75%), rolls,
   and awards winnings from the locked pool.
3. Voli Admin: manage settings, inspect prize pools, and review lucky spins at `/lucky-gifts`.
